// Copyright 2021 99cloud
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  backupTargets,
  getVolumeTypeDc,
  getDefaultBackupTarget,
  getBackupContainer,
} from './backup';

describe('getVolumeTypeDc', () => {
  it('extracts the dc suffix from a volume type', () => {
    expect(getVolumeTypeDc('be.5000.dc1')).toBe('dc1');
    expect(getVolumeTypeDc('be.5000.dc2')).toBe('dc2');
    expect(getVolumeTypeDc('BE.5000.DC2')).toBe('dc2');
  });

  it('does NOT match ".dcN.old" suffixes - only an exact ".dcN" counts', () => {
    expect(getVolumeTypeDc('be.5000.dc1.old')).toBeNull();
    expect(getVolumeTypeDc('be.5000.dc2.old')).toBeNull();
    expect(getVolumeTypeDc('BE.5000.DC1.OLD')).toBeNull();
  });

  it('returns null when there is no dc suffix', () => {
    expect(getVolumeTypeDc('powerstore-nfs-5000')).toBeNull();
    expect(getVolumeTypeDc('')).toBeNull();
    expect(getVolumeTypeDc()).toBeNull();
    // the suffix only counts at the end of the name
    expect(getVolumeTypeDc('be.dc1.5000')).toBeNull();
  });
});

describe('getDefaultBackupTarget', () => {
  it('defaults to the opposite data center', () => {
    expect(getDefaultBackupTarget('be.5000.dc1')).toBe('dc2');
    expect(getDefaultBackupTarget('be.5000.dc2')).toBe('dc1');
  });

  it('falls back to "other" for ".old" volume types', () => {
    expect(getDefaultBackupTarget('be.5000.dc1.old')).toBe('other');
    expect(getDefaultBackupTarget('be.5000.dc2.old')).toBe('other');
  });

  it('falls back to "other" when the data center cannot be derived', () => {
    expect(getDefaultBackupTarget('powerstore-nfs-5000')).toBe('other');
    expect(getDefaultBackupTarget('')).toBe('other');
  });
});

describe('backupTargets', () => {
  it('exposes the three share targets', () => {
    expect(backupTargets.map((it) => it.value)).toEqual([
      'dc1',
      'dc2',
      'other',
    ]);
  });
});

describe('getBackupContainer', () => {
  const uuidPath = /^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f-]{36}$/;

  it('builds a sharded path below the matching share', () => {
    backupTargets.forEach(({ value, share }) => {
      const container = getBackupContainer(value);
      expect(container.startsWith(`${share}/`)).toBe(true);
      expect(container.slice(share.length + 1)).toMatch(uuidPath);
    });
  });

  it('falls back to the "other" share for an unknown target', () => {
    const other = backupTargets.find((it) => it.value === 'other');
    expect(getBackupContainer('nope').startsWith(`${other.share}/`)).toBe(true);
  });

  it('returns a new container on every call', () => {
    expect(getBackupContainer('dc1')).not.toBe(getBackupContainer('dc1'));
  });
});

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
} from './backup';

describe('getVolumeTypeDc', () => {
  it('extracts the dc suffix from a volume type', () => {
    expect(getVolumeTypeDc('be.5000.dc1')).toBe('dc1');
    expect(getVolumeTypeDc('be.5000.dc2')).toBe('dc2');
    expect(getVolumeTypeDc('BE.5000.DC2')).toBe('dc2');
  });

  it('treats ".dcN.old" suffixes the same as ".dcN"', () => {
    expect(getVolumeTypeDc('be.5000.dc1.old')).toBe('dc1');
    expect(getVolumeTypeDc('be.5000.dc2.old')).toBe('dc2');
    expect(getVolumeTypeDc('BE.5000.DC1.OLD')).toBe('dc1');
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
  it('preselects the first dummy option in the opposite data center', () => {
    expect(getDefaultBackupTarget('be.5000.dc1')).toBe('dummy3');
    expect(getDefaultBackupTarget('be.5000.dc2')).toBe('dummy1');
  });

  it('works the same for ".old" volume types', () => {
    expect(getDefaultBackupTarget('be.5000.dc1.old')).toBe('dummy3');
    expect(getDefaultBackupTarget('be.5000.dc2.old')).toBe('dummy1');
  });

  it('returns null when the data center cannot be derived', () => {
    expect(getDefaultBackupTarget('powerstore-nfs-5000')).toBeNull();
    expect(getDefaultBackupTarget('')).toBeNull();
  });
});

describe('backupTargets', () => {
  it('exposes the dummy options grouped by data center', () => {
    expect(backupTargets.map((it) => it.value)).toEqual([
      'dummy1',
      'dummy2',
      'dummy3',
      'dummy4',
    ]);
    expect(backupTargets.filter((it) => it.dc === 'dc1')).toHaveLength(2);
    expect(backupTargets.filter((it) => it.dc === 'dc2')).toHaveLength(2);
  });
});

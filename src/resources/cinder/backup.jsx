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

import React from 'react';
import globalProjectStore from 'stores/keystone/project';
import globalBackupStore from 'stores/cinder/backup';

export const backupStatus = {
  available: t('Available'),
  error: t('Error'),
  updating: t('Updating'),
  deleting: t('Deleting'),
  error_deleting: t('Error Deleting'),
  restoring: t('Restoring'),
  creating: t('Creating'),
};

export const createTip = (
  <span>
    <span style={{ fontWeight: 600 }}>
      {t(
        'When you do online backup of the volume that has been bound, you need to pay attention to the following points:'
      )}
    </span>
    <p>
      {t(
        '1. The backup can only capture the data that has been written to the volume at the beginning of the backup task, excluding the data in the cache at that time.'
      )}
    </p>
    <p>
      {t(
        '2. To ensure the integrity of the data, it is recommended that you suspend the write operation of all files when creating a backup.'
      )}
    </p>
  </span>
);

export const backupModeList = [
  { value: false, label: t('Full Backup') },
  { value: true, label: t('Incremental Backup') },
];

export const modeTip = t(
  'Create a full backup, the system will automatically create a new backup chain, the full backup name is the backup chain name; Create an incremental backup, the system will automatically create an incremental backup under the newly created backup chain.'
);

// ---------------------------------------------------------------------------
// Backup target ("container") selection
//
// SCAFFOLDING ONLY: this is a placeholder UI for choosing where a backup
// should be stored. The options below are dummy values - they do not
// correspond to real shares/containers yet. Selecting one currently has no
// effect on the request sent to Cinder: `container` is intentionally left
// empty/omitted, exactly like before this feature existed, so Cinder falls
// back to its own default placement.
//
// Once real backup destinations exist, replace `backupTargets` with the real
// values (and reinstate building an actual `container` value, e.g. via a
// helper like the previous `getBackupContainer`).
// ---------------------------------------------------------------------------
export const backupTargets = [
  { value: 'dummy1', label: t('dummy1 (DC1)'), dc: 'dc1' },
  { value: 'dummy2', label: t('dummy2 (DC1)'), dc: 'dc1' },
  { value: 'dummy3', label: t('dummy3 (DC2)'), dc: 'dc2' },
  { value: 'dummy4', label: t('dummy4 (DC2)'), dc: 'dc2' },
];

// Where a volume of a given DC should be backed up to. Backups are stored in
// the *other* data center so that a DC outage does not take out the volume and
// its backup at the same time.
export const dcBackupTargetMap = {
  dc1: 'dc2',
  dc2: 'dc1',
};

/**
 * Extract the data center suffix from a volume type name, e.g.
 * "be.5000.dc1" -> "dc1". Volume types may also end in ".dc1.old" /
 * ".dc2.old" (treated the same as ".dc1" / ".dc2"). Returns null when there
 * is no recognizable suffix.
 */
export const getVolumeTypeDc = (volumeType = '') => {
  const match = /\.(dc\d+)(?:\.old)?$/i.exec(volumeType || '');
  return match ? match[1].toLowerCase() : null;
};

/**
 * Default backup target for a volume: the first dummy option belonging to
 * the data center opposite to the one hosting the volume.
 */
export const getDefaultBackupTarget = (volumeType) => {
  const dc = getVolumeTypeDc(volumeType);
  const targetDc = dc ? dcBackupTargetMap[dc] : null;
  const match = backupTargets.find((it) => it.dc === targetDc);
  return match ? match.value : null;
};

export const backupTargetTip = t(
  'The data center the backup will be stored in. By default a backup is placed in the data center opposite to the one hosting the volume.'
);

export const restoreTip = (
  <span>
    <span style={{ fontWeight: 600 }}>
      {t(
        'When you restore a backup, you need to meet one of the following conditions:'
      )}
    </span>
    <p>{t('1. The volume associated with the backup is available.')}</p>
    <p>
      {t(
        '2. The volume associated with the backup has been mounted, and the instance is shut down.'
      )}
    </p>
  </span>
);

// deal with quota
export async function fetchQuota(self) {
  self.setState({
    quota: {},
    quotaLoading: true,
  });
  const result = await globalProjectStore.fetchProjectCinderQuota();
  self.setState({
    quota: result,
    quotaLoading: false,
  });
}

export const getQuota = (cinderQuota) => {
  const { backups = {}, backup_gigabytes: gigabytes = {} } = cinderQuota || {};
  return {
    backups,
    gigabytes,
  };
};

export const getAdd = (cinderQuota) => {
  const { backups, gigabytes } = getQuota(cinderQuota);
  const { left = 0 } = backups || {};
  const { left: sizeLeft = 0, limit } = gigabytes || {};
  const { currentVolumeSize = 0 } = globalBackupStore;
  const leftOk = left !== 0;
  const sizeOk =
    sizeLeft !== 0 && (limit === -1 || sizeLeft >= currentVolumeSize);
  const add = leftOk && sizeOk ? 1 : 0;
  return {
    add,
    addSize: add === 1 ? currentVolumeSize : 0,
  };
};

export const getQuotaInfo = (self) => {
  const { quota = {}, quotaLoading } = self.state;
  if (quotaLoading) {
    return [];
  }
  const { backups = {}, gigabytes = {} } = getQuota(quota);
  const { add, addSize } = getAdd(quota);
  const backupData = {
    ...backups,
    add,
    name: 'backup',
    title: t('Volume Backup'),
  };
  const sizeData = {
    ...gigabytes,
    add: addSize,
    name: 'gigabytes',
    title: t('Volume Backup Capacity (GiB)'),
    type: 'line',
  };
  return [backupData, sizeData];
};

export const checkQuotaDisable = () => {
  const { cinderQuota = {} } = globalProjectStore;
  const { add } = getAdd(cinderQuota);
  return add === 0;
};

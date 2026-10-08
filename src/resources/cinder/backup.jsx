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
import { v4 as uuidv4 } from 'uuid';
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
// Volume types ending in exactly ".dc1" are backed up to the stg09b_dc2_1
// share, and volume types ending in exactly ".dc2" are backed up to the
// stg09a_dc1_1 share - the backup always lands in the data center opposite to
// the one hosting the volume. Any other volume type - including those ending
// in ".dc1.old" / ".dc2.old" - falls back to the shared stg09c_dc2_2 share.
//
// Each backup gets its own directory below the chosen share, using the
// sharded layout `<share>/<uuid[0:2]>/<uuid[2:4]>/<uuid>` (see
// `getBackupContainer`), so the `container` sent to Cinder always starts with
// one of the three share names below.
// ---------------------------------------------------------------------------
export const backupTargets = [
  {
    value: 'dc1',
    label: `${t('Data Center 1')} (stg09a_dc1_1)`,
    share: 'stg09a_dc1_1',
  },
  {
    value: 'dc2',
    label: `${t('Data Center 2')} (stg09b_dc2_1)`,
    share: 'stg09b_dc2_1',
  },
  {
    value: 'other',
    label: `${t('Other')} (stg09c_dc2_2)`,
    share: 'stg09c_dc2_2',
  },
];

// Where a volume of a given DC should be backed up to. Backups are stored in
// the *other* data center so that a DC outage does not take out the volume and
// its backup at the same time. Volume types without a recognizable DC suffix
// fall back to 'other'.
export const dcBackupTargetMap = {
  dc1: 'dc2',
  dc2: 'dc1',
};

/**
 * Extract the data center suffix from a volume type name, e.g.
 * "be.5000.dc1" -> "dc1". Only an exact ".dc1" / ".dc2" suffix matches -
 * variants like ".dc1.old" do NOT match and are treated as having no
 * recognizable suffix (null).
 */
export const getVolumeTypeDc = (volumeType = '') => {
  const match = /\.(dc\d+)$/i.exec(volumeType || '');
  return match ? match[1].toLowerCase() : null;
};

/**
 * Default backup target for a volume: the data center opposite to the one
 * hosting the volume, or 'other' when the volume type has no recognizable
 * DC suffix.
 */
export const getDefaultBackupTarget = (volumeType) => {
  const dc = getVolumeTypeDc(volumeType);
  const targetValue = dc ? dcBackupTargetMap[dc] : 'other';
  const match = backupTargets.find((it) => it.value === targetValue);
  return match ? match.value : 'other';
};

/**
 * Build the `container` value sent to Cinder for the selected target.
 * A new UUID is generated on every call, so each backup lands in its own
 * directory: `<share>/<uuid[0:2]>/<uuid[2:4]>/<uuid>`.
 * Falls back to the 'other' share when the target is unrecognized.
 */
export const getBackupContainer = (target) => {
  const match =
    backupTargets.find((it) => it.value === target) ||
    backupTargets.find((it) => it.value === 'other');
  const id = uuidv4();
  return `${match.share}/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}`;
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

import * as migration_20260610_190438_initial from './20260610_190438_initial';

export const migrations = [
  {
    up: migration_20260610_190438_initial.up,
    down: migration_20260610_190438_initial.down,
    name: '20260610_190438_initial'
  },
];

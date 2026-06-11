import * as migration_20260611_042311_initial from './20260611_042311_initial';

export const migrations = [
  {
    up: migration_20260611_042311_initial.up,
    down: migration_20260611_042311_initial.down,
    name: '20260611_042311_initial'
  },
];

import * as migration_20260611_042311_initial from './20260611_042311_initial';
import * as migration_20260612_132704 from './20260612_132704';
import * as migration_20260612_133823_update_nigeria_grades from './20260612_133823_update_nigeria_grades';

export const migrations = [
  {
    up: migration_20260611_042311_initial.up,
    down: migration_20260611_042311_initial.down,
    name: '20260611_042311_initial',
  },
  {
    up: migration_20260612_132704.up,
    down: migration_20260612_132704.down,
    name: '20260612_132704',
  },
  {
    up: migration_20260612_133823_update_nigeria_grades.up,
    down: migration_20260612_133823_update_nigeria_grades.down,
    name: '20260612_133823_update_nigeria_grades'
  },
];

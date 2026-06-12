import * as migration_20260611_042311_initial from './20260611_042311_initial';
import * as migration_20260612_132704 from './20260612_132704';
import * as migration_20260612_133823_update_nigeria_grades from './20260612_133823_update_nigeria_grades';
import * as migration_20260612_135240_update_grade_levels_k12 from './20260612_135240_update_grade_levels_k12';

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
    name: '20260612_133823_update_nigeria_grades',
  },
  {
    up: migration_20260612_135240_update_grade_levels_k12.up,
    down: migration_20260612_135240_update_grade_levels_k12.down,
    name: '20260612_135240_update_grade_levels_k12'
  },
];

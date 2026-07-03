import * as migration_20260611_042311_initial from './20260611_042311_initial';
import * as migration_20260612_132704 from './20260612_132704';
import * as migration_20260612_133823_update_nigeria_grades from './20260612_133823_update_nigeria_grades';
import * as migration_20260612_135240_update_grade_levels_k12 from './20260612_135240_update_grade_levels_k12';
import * as migration_20260612_150356_seed_subject_categories from './20260612_150356_seed_subject_categories';
import * as migration_20260701_000000_live_session_unique_live_index from './20260701_000000_live_session_unique_live_index';
import * as migration_20260703_131950_live_session_messages from './20260703_131950_live_session_messages';

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
    name: '20260612_135240_update_grade_levels_k12',
  },
  {
    up: migration_20260612_150356_seed_subject_categories.up,
    down: migration_20260612_150356_seed_subject_categories.down,
    name: '20260612_150356_seed_subject_categories',
  },
  {
    up: migration_20260701_000000_live_session_unique_live_index.up,
    down: migration_20260701_000000_live_session_unique_live_index.down,
    name: '20260701_000000_live_session_unique_live_index',
  },
  {
    up: migration_20260703_131950_live_session_messages.up,
    down: migration_20260703_131950_live_session_messages.down,
    name: '20260703_131950_live_session_messages'
  },
];

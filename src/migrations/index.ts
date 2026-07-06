import * as migration_20260611_042311_initial from './20260611_042311_initial';
import * as migration_20260612_132704 from './20260612_132704';
import * as migration_20260612_133823_update_nigeria_grades from './20260612_133823_update_nigeria_grades';
import * as migration_20260612_135240_update_grade_levels_k12 from './20260612_135240_update_grade_levels_k12';
import * as migration_20260612_150356_seed_subject_categories from './20260612_150356_seed_subject_categories';
import * as migration_20260701_000000_live_session_unique_live_index from './20260701_000000_live_session_unique_live_index';
import * as migration_20260703_131950_live_session_messages from './20260703_131950_live_session_messages';
import * as migration_20260705_000000_live_session_whiteboard_writable from './20260705_000000_live_session_whiteboard_writable';
import * as migration_20260706_000000_assessment_results_pending_manual_grading from './20260706_000000_assessment_results_pending_manual_grading';
import * as migration_20260706_000001_tutor_weekly_availability from './20260706_000001_tutor_weekly_availability';
import * as migration_20260706_000002_booking_class_link from './20260706_000002_booking_class_link';
import * as migration_20260706_000003_class_booking_unique from './20260706_000003_class_booking_unique';
import * as migration_20260706_185822_payout_requests from './20260706_185822_payout_requests';
import * as migration_20260706_190000_reviews_booking_unique from './20260706_190000_reviews_booking_unique';
import * as migration_20260706_200000_disputes from './20260706_200000_disputes';

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
    name: '20260703_131950_live_session_messages',
  },
  {
    up: migration_20260705_000000_live_session_whiteboard_writable.up,
    down: migration_20260705_000000_live_session_whiteboard_writable.down,
    name: '20260705_000000_live_session_whiteboard_writable',
  },
  {
    up: migration_20260706_000000_assessment_results_pending_manual_grading.up,
    down: migration_20260706_000000_assessment_results_pending_manual_grading.down,
    name: '20260706_000000_assessment_results_pending_manual_grading',
  },
  {
    up: migration_20260706_000001_tutor_weekly_availability.up,
    down: migration_20260706_000001_tutor_weekly_availability.down,
    name: '20260706_000001_tutor_weekly_availability',
  },
  {
    up: migration_20260706_000002_booking_class_link.up,
    down: migration_20260706_000002_booking_class_link.down,
    name: '20260706_000002_booking_class_link',
  },
  {
    up: migration_20260706_000003_class_booking_unique.up,
    down: migration_20260706_000003_class_booking_unique.down,
    name: '20260706_000003_class_booking_unique',
  },
  {
    up: migration_20260706_185822_payout_requests.up,
    down: migration_20260706_185822_payout_requests.down,
    name: '20260706_185822_payout_requests'
  },
  {
    up: migration_20260706_190000_reviews_booking_unique.up,
    down: migration_20260706_190000_reviews_booking_unique.down,
    name: '20260706_190000_reviews_booking_unique'
  },
  {
    up: migration_20260706_200000_disputes.up,
    down: migration_20260706_200000_disputes.down,
    name: '20260706_200000_disputes'
  },
];

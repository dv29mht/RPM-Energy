/**
 * RPM.ENERGY — Data Model Definitions
 * Source of truth: spec Section 4 (Data Model)
 *
 * This file defines enums (as frozen objects) and JSDoc typedefs for all
 * core entities. These are used throughout the app for consistency and
 * for IDE autocompletion on the dummy data objects.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** @readonly */
export const OperatingType = Object.freeze({
  INDEPENDENT: 'independent',
  GYM_BASED:   'gym_based',
  BOTH:        'both',
});

/** @readonly */
export const Classification = Object.freeze({
  SERIOUS:  'serious',
  ACTIVE:   'active',
  CASUAL:   'casual',
  INACTIVE: 'inactive',
});

/** @readonly */
export const LogType = Object.freeze({
  WEIGHT:  'weight',
  MEAL:    'meal',
  WORKOUT: 'workout',
});

/** @readonly */
export const LogSource = Object.freeze({
  WHATSAPP_BOT: 'whatsapp_bot',
  MANUAL:       'manual',
  DUMMY:        'dummy',
});

/** @readonly */
export const MoodState = Object.freeze({
  THRIVING:   'thriving',    // 80–100  #16A34A
  ON_TRACK:   'on_track',    // 60–79   #4ADE80
  NEUTRAL:    'neutral',     // 40–59   #F59E0B
  LOW_ENERGY: 'low_energy',  // 20–39   #F97316
  STRUGGLING: 'struggling',  // 0–19    #EF4444
});

/** @readonly */
export const SessionStatus = Object.freeze({
  COMPLETED:  'completed',
  NO_SHOW:    'no_show',
  CANCELLED:  'cancelled',
});

/** @readonly */
export const SessionType = Object.freeze({
  IN_PERSON: 'in_person',
  ONLINE:    'online',
});

// ---------------------------------------------------------------------------
// Classification scoring thresholds (Section 5.2)
// ---------------------------------------------------------------------------

export const CLASSIFICATION_THRESHOLDS = Object.freeze({
  [Classification.SERIOUS]:  { min: 80, max: 100 },
  [Classification.ACTIVE]:   { min: 50, max: 79  },
  [Classification.CASUAL]:   { min: 20, max: 49  },
  [Classification.INACTIVE]: { min: 0,  max: 19  },
});

// ---------------------------------------------------------------------------
// Mood state thresholds and colours (Section 5.3.1)
// ---------------------------------------------------------------------------

export const MOOD_STATE_CONFIG = Object.freeze({
  [MoodState.THRIVING]:   { min: 80, max: 100, colour: '#16A34A', label: 'Thriving'    },
  [MoodState.ON_TRACK]:   { min: 60, max: 79,  colour: '#4ADE80', label: 'On Track'    },
  [MoodState.NEUTRAL]:    { min: 40, max: 59,  colour: '#F59E0B', label: 'Neutral'     },
  [MoodState.LOW_ENERGY]: { min: 20, max: 39,  colour: '#F97316', label: 'Low Energy'  },
  [MoodState.STRUGGLING]: { min: 0,  max: 19,  colour: '#EF4444', label: 'Struggling'  },
});

// ---------------------------------------------------------------------------
// JSDoc type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Trainer
 * @property {string}                          trainer_id       - UUID primary key
 * @property {string}                          name             - Display name
 * @property {string}                          email            - Login identifier
 * @property {string|null}                     gym_affiliation  - Optional gym name
 * @property {'independent'|'gym_based'|'both'} operating_type
 * @property {string}                          created_at       - ISO 8601 timestamp
 */

/**
 * @typedef {Object} Client
 * @property {string}                                        client_id              - UUID primary key
 * @property {string}                                        trainer_id             - FK → Trainer
 * @property {string}                                        name                   - Full name
 * @property {string}                                        phone                  - E.164 format (for WhatsApp deep link)
 * @property {string}                                        start_date             - ISO 8601 date (YYYY-MM-DD)
 * @property {string}                                        goal                   - e.g. "Fat loss", "Muscle gain"
 * @property {'serious'|'active'|'casual'|'inactive'}        classification
 * @property {boolean}                                       classification_override - True if trainer manually set the tag
 * @property {string|null}                                   assigned_plan_id       - FK → WorkoutPlan
 * @property {string}                                        notes                  - Private trainer notes
 * @property {boolean}                                       is_dummy               - True for seeded sample data
 */

/**
 * @typedef {Object} LogEntry
 * Represents a single data point — weight reading, meal count, or workout completion.
 * In V1 these are dummy-seeded; in V2 they will arrive from the WhatsApp bot.
 *
 * @property {string}                            log_id     - UUID primary key
 * @property {string}                            client_id  - FK → Client
 * @property {'weight'|'meal'|'workout'}         log_type
 * @property {number}                            value      - kg for weight, count for meals, 1 for workout done
 * @property {string}                            logged_at  - ISO 8601 timestamp
 * @property {'whatsapp_bot'|'manual'|'dummy'}   source
 */

/**
 * @typedef {Object} DashboardScreenshot
 * One daily dashboard screenshot uploaded by the trainer, plus OCR-extracted values
 * and the computed Mood Score for that day.
 *
 * @property {string}                                                                    screenshot_id      - UUID primary key
 * @property {string}                                                                    client_id          - FK → Client
 * @property {string|null}                                                               image_url          - Storage path (Supabase / S3)
 * @property {string}                                                                    date               - ISO date (YYYY-MM-DD) this screenshot represents
 * @property {Object|null}                                                               ocr_raw            - Raw key-value pairs from OCR
 * @property {number|null}                                                               meals_logged       - Extracted meal count
 * @property {number|null}                                                               water_ml           - Extracted water intake in ml
 * @property {boolean|null}                                                              workout_done       - Extracted workout flag
 * @property {number|null}                                                               steps              - Extracted step count
 * @property {number|null}                                                               sleep_hours        - Extracted sleep duration
 * @property {number|null}                                                               mood_score         - Computed 0–100 score (Section 5.3)
 * @property {'thriving'|'on_track'|'neutral'|'low_energy'|'struggling'|null}           mood_state
 * @property {boolean}                                                                   ocr_success        - False if OCR failed to parse
 * @property {boolean}                                                                   manually_overridden - True if trainer entered values by hand
 * @property {string|null}                                                               nudge_sent_at      - ISO timestamp of last nudge
 */

/**
 * @typedef {Object} WorkoutPlan
 * @property {string}       plan_id        - UUID primary key
 * @property {string}       trainer_id     - FK → Trainer
 * @property {string}       name           - e.g. "Beginner Fat Loss 3-Day"
 * @property {string}       description
 * @property {WorkoutDay[]} days           - Day-by-day exercises
 * @property {string[]}     assigned_to    - Array of client_ids
 * @property {string}       created_at     - ISO 8601 timestamp
 */

/**
 * @typedef {Object} WorkoutDay
 * @property {number}      day_number  - 1-indexed
 * @property {string}      label       - e.g. "Day 1 — Push"
 * @property {Exercise[]}  exercises
 */

/**
 * @typedef {Object} Exercise
 * @property {string}      name
 * @property {number}      sets
 * @property {string}      reps   - e.g. "12" or "8-12" or "To failure"
 * @property {string}      notes  - Optional cue
 */

/**
 * @typedef {Object} Session
 * @property {string}                                  session_id    - UUID primary key
 * @property {string}                                  client_id     - FK → Client
 * @property {string}                                  trainer_id    - FK → Trainer
 * @property {string}                                  date          - ISO 8601 date
 * @property {string}                                  time          - HH:MM (24h)
 * @property {'in_person'|'online'}                    session_type
 * @property {'completed'|'no_show'|'cancelled'|null}  status        - Null if not yet logged
 * @property {string}                                  notes
 */

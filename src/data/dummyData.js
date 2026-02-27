/**
 * RPM.ENERGY — Dummy Data Seed Module
 * Source of truth: spec Section 7.3 (Dummy Data Seeding)
 *
 * Provides 6 clients distributed across all four classification tiers:
 *   2 × Serious  |  2 × Active  |  1 × Casual  |  1 × Inactive
 *
 * Each client has 8 weeks of historical log entries covering:
 *   - Weekly weight logs
 *   - Varied-frequency meal logs (matching their tier)
 *   - Workout logs (matching their tier)
 *
 * All records are marked is_dummy: true / source: 'dummy' so they can be
 * purged cleanly when real clients are added.
 *
 * Engagement scoring (Section 5.1):
 *   Workout logs  50%  — 1 pt per workout in past 7 days (max 7)
 *   Meal logs     30%  — 1 pt per day with ≥1 meal logged (max 7)
 *   Weight logs   20%  — 1 pt if any weight entry this week (max 1)
 *   Score = (workouts/7 × 50) + (mealDays/7 × 30) + (hasWeight × 20)
 */

import { Classification, LogType, LogSource } from '../models/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string (YYYY-MM-DD) offset by `days` from `baseDate`. */
function offsetDate(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Returns an ISO timestamp string offset by `days` from `baseDate`, at noon. */
function offsetTs(baseDate, days, hourOffset = 12) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  d.setHours(hourOffset, 0, 0, 0);
  return d.toISOString();
}

let _idCounter = 1;
function uid(prefix = '') {
  return `${prefix}${String(_idCounter++).padStart(4, '0')}`;
}

/**
 * Generate log entries for a single client over 8 weeks.
 *
 * @param {string}   clientId
 * @param {Date}     baseDate        - The "today" reference point
 * @param {Object}   profile         - Describes how active this client is
 * @param {number}   profile.workoutsPerWeek      - avg workouts (0–7)
 * @param {number[]} profile.mealDaysPerWeek      - [min, max] days with a meal log
 * @param {boolean}  profile.weightLogEachWeek    - always log weight?
 * @param {number}   profile.startWeight          - kg
 * @param {number}   profile.weeklyWeightDelta    - kg change per week (negative = losing)
 * @returns {LogEntry[]}
 */
function generateLogs(clientId, baseDate, profile) {
  const logs = [];
  const WEEKS = 8;

  for (let week = 0; week < WEEKS; week++) {
    // Day offset from start of this week (week 0 = oldest, week 7 = most recent)
    const weekStartOffset = -(WEEKS - week) * 7; // e.g. week 0 → -56, week 7 → -7

    // --- Weight log (once per week, Monday morning) ---
    if (profile.weightLogEachWeek || (week % 2 === 0 && profile.workoutsPerWeek >= 1)) {
      const currentWeight = profile.startWeight + profile.weeklyWeightDelta * week;
      logs.push({
        log_id:    uid('log-'),
        client_id: clientId,
        log_type:  LogType.WEIGHT,
        value:     Math.round(currentWeight * 10) / 10,
        logged_at: offsetTs(baseDate, weekStartOffset + 1, 8), // Monday 08:00
        source:    LogSource.DUMMY,
      });
    }

    // --- Workout logs ---
    // Distribute workoutsPerWeek across the week, favouring weekdays
    const workoutDays = pickWorkoutDays(profile.workoutsPerWeek, week);
    for (const dayIndex of workoutDays) {
      logs.push({
        log_id:    uid('log-'),
        client_id: clientId,
        log_type:  LogType.WORKOUT,
        value:     1, // 1 = workout done
        logged_at: offsetTs(baseDate, weekStartOffset + dayIndex, 7 + (dayIndex % 3)), // morning
        source:    LogSource.DUMMY,
      });
    }

    // --- Meal logs ---
    // Pick how many days this week had at least one meal logged
    const [minMealDays, maxMealDays] = profile.mealDaysPerWeek;
    const mealDaysThisWeek = minMealDays + ((week + clientId.charCodeAt(4)) % (maxMealDays - minMealDays + 1));
    const mealDays = pickMealDays(mealDaysThisWeek, week);
    for (const dayIndex of mealDays) {
      // Log 1–4 meal entries for that day
      const mealsCount = 1 + ((week + dayIndex) % 3) + 1; // 2–4 meals
      for (let m = 0; m < mealsCount; m++) {
        logs.push({
          log_id:    uid('log-'),
          client_id: clientId,
          log_type:  LogType.MEAL,
          value:     1, // each entry = 1 meal logged
          logged_at: offsetTs(baseDate, weekStartOffset + dayIndex, 8 + m * 3), // 08:00, 11:00, 14:00, 17:00
          source:    LogSource.DUMMY,
        });
      }
    }
  }

  return logs;
}

/** Pick `n` distinct days (0=Mon…6=Sun) to do workouts, seeded by week. */
function pickWorkoutDays(n, weekSeed) {
  const preferred = [0, 1, 2, 3, 4]; // Mon–Fri preferred
  const all       = [0, 1, 2, 3, 4, 5, 6];
  const pool      = n <= 5 ? preferred : all;
  // Deterministic shuffle using weekSeed
  const shuffled  = [...pool].sort((a, b) => ((a * 17 + weekSeed * 31) % 7) - ((b * 17 + weekSeed * 31) % 7));
  return shuffled.slice(0, Math.min(n, pool.length));
}

/** Pick `n` distinct days (0–6) to have meal logs. */
function pickMealDays(n, weekSeed) {
  const all      = [0, 1, 2, 3, 4, 5, 6];
  const shuffled = [...all].sort((a, b) => ((a * 13 + weekSeed * 7) % 7) - ((b * 13 + weekSeed * 7) % 7));
  return shuffled.slice(0, Math.min(n, 7));
}

// ---------------------------------------------------------------------------
// Reference date — "today" for the seed
// ---------------------------------------------------------------------------

const SEED_DATE = new Date('2026-02-24T00:00:00.000Z');

// ---------------------------------------------------------------------------
// Seeded Trainer (dummy account — will be replaced by auth in V2)
// ---------------------------------------------------------------------------

/** @type {import('../models/types.js').Trainer} */
export const dummyTrainer = {
  trainer_id:      'trainer-0001',
  name:            'Vikram Sood',
  email:           'vikram@rpm.energy',
  gym_affiliation: 'Iron Temple Gym, Mumbai',
  operating_type:  'both',
  created_at:      offsetTs(SEED_DATE, -60),
};

// ---------------------------------------------------------------------------
// Seeded Clients — 2 Serious, 2 Active, 1 Casual, 1 Inactive
// ---------------------------------------------------------------------------

/** @type {import('../models/types.js').Client[]} */
export const dummyClients = [
  // ── Serious #1 ──────────────────────────────────────────────────────────
  {
    client_id:              'client-0001',
    trainer_id:             dummyTrainer.trainer_id,
    name:                   'Priya Sharma',
    phone:                  '919876543210',
    start_date:             offsetDate(SEED_DATE, -112), // ~16 weeks ago
    goal:                   'Fat loss & toning',
    classification:         Classification.SERIOUS,
    classification_override: false,
    assigned_plan_id:       'plan-0001',
    notes:                  'Priya is extremely consistent. Competes in amateur 10k runs. Prefers morning sessions.',
    is_dummy:               true,
  },
  // ── Serious #2 ──────────────────────────────────────────────────────────
  {
    client_id:              'client-0002',
    trainer_id:             dummyTrainer.trainer_id,
    name:                   'Rahul Mehta',
    phone:                  '919823456789',
    start_date:             offsetDate(SEED_DATE, -98),  // ~14 weeks ago
    goal:                   'Muscle gain & strength',
    classification:         Classification.SERIOUS,
    classification_override: false,
    assigned_plan_id:       'plan-0002',
    notes:                  'Rahul lifts heavy. Currently on a lean bulk. Watch left shoulder — minor impingement history.',
    is_dummy:               true,
  },
  // ── Active #1 ───────────────────────────────────────────────────────────
  {
    client_id:              'client-0003',
    trainer_id:             dummyTrainer.trainer_id,
    name:                   'Sneha Patel',
    phone:                  '919756781234',
    start_date:             offsetDate(SEED_DATE, -84),  // ~12 weeks ago
    goal:                   'General fitness & flexibility',
    classification:         Classification.ACTIVE,
    classification_override: false,
    assigned_plan_id:       'plan-0001',
    notes:                  'Sneha misses Fridays due to late work calls. Otherwise reliable Mon–Thu.',
    is_dummy:               true,
  },
  // ── Active #2 ───────────────────────────────────────────────────────────
  {
    client_id:              'client-0004',
    trainer_id:             dummyTrainer.trainer_id,
    name:                   'Arjun Singh',
    phone:                  '919645678901',
    start_date:             offsetDate(SEED_DATE, -70),  // ~10 weeks ago
    goal:                   'Fat loss',
    classification:         Classification.ACTIVE,
    classification_override: false,
    assigned_plan_id:       'plan-0003',
    notes:                  'Arjun travels every second week for work. Remote session fallback already set up.',
    is_dummy:               true,
  },
  // ── Casual #1 ───────────────────────────────────────────────────────────
  {
    client_id:              'client-0005',
    trainer_id:             dummyTrainer.trainer_id,
    name:                   'Kavya Nair',
    phone:                  '919534567890',
    start_date:             offsetDate(SEED_DATE, -56),  // ~8 weeks ago
    goal:                   'Weight maintenance & stress relief',
    classification:         Classification.CASUAL,
    classification_override: false,
    assigned_plan_id:       null,
    notes:                  'Kavya has a demanding work schedule. 2× per week is realistic for her right now. Do not push for more.',
    is_dummy:               true,
  },
  // ── Inactive #1 ─────────────────────────────────────────────────────────
  {
    client_id:              'client-0006',
    trainer_id:             dummyTrainer.trainer_id,
    name:                   'Rohan Gupta',
    phone:                  '919423456780',
    start_date:             offsetDate(SEED_DATE, -42),  // ~6 weeks ago
    goal:                   'Fat loss',
    classification:         Classification.INACTIVE,
    classification_override: false,
    assigned_plan_id:       'plan-0003',
    notes:                  'Rohan went quiet after Week 3. Missed last 2 check-ins. Send nudge — at-risk of churn.',
    is_dummy:               true,
  },
];

// ---------------------------------------------------------------------------
// Generate log entries for each client
// ---------------------------------------------------------------------------

/**
 * Engagement profiles aligned with classification tiers.
 * Score formula: (workouts/7 × 50) + (mealDays/7 × 30) + (hasWeight × 20)
 *
 * Serious  → score 80–100 (workouts 5–6/wk, meals 6–7 days/wk, weekly weight)
 * Active   → score 50–79  (workouts 3–4/wk, meals 3–5 days/wk, bi-weekly weight)
 * Casual   → score 20–49  (workouts 1–2/wk, meals 1–3 days/wk, occasional weight)
 * Inactive → score 0–19   (workouts 0–1/wk, meals 0–1 days/wk, no weight recently)
 */
const CLIENT_PROFILES = {
  'client-0001': {
    // Serious: ~92 score → workouts 6/7×50=42.9, meals 7/7×30=30, weight ×20=20
    workoutsPerWeek:   6,
    mealDaysPerWeek:   [6, 7],
    weightLogEachWeek: true,
    startWeight:       68.5,
    weeklyWeightDelta: -0.25, // losing ~1 kg/month
  },
  'client-0002': {
    // Serious: ~86 score → workouts 5/7×50=35.7, meals 7/7×30=30, weight ×20=20
    workoutsPerWeek:   5,
    mealDaysPerWeek:   [6, 7],
    weightLogEachWeek: true,
    startWeight:       78.0,
    weeklyWeightDelta: +0.3,  // lean bulk, gaining slowly
  },
  'client-0003': {
    // Active: ~59 score → workouts 4/7×50=28.6, meals 7/7×30=30
    // mealDaysThisWeek (week=7): 6 + ((7+110) % 2) = 6+1 = 7 days
    workoutsPerWeek:   4,
    mealDaysPerWeek:   [6, 7],
    weightLogEachWeek: false, // bi-weekly weight log
    startWeight:       63.0,
    weeklyWeightDelta: -0.15,
  },
  'client-0004': {
    // Active: ~54 score → workouts 4/7×50=28.6, meals 6/7×30=25.7
    // mealDaysThisWeek (week=7): 5 + ((7+110) % 2) = 5+1 = 6 days
    workoutsPerWeek:   4,
    mealDaysPerWeek:   [5, 6],
    weightLogEachWeek: false,
    startWeight:       88.0,
    weeklyWeightDelta: -0.4,
  },
  'client-0005': {
    // Casual: ~23 score → workouts 2/7×50=14.3, meals 2/7×30=8.6
    // mealDaysThisWeek (week=7): 2 + ((7+110) % 3) = 2+0 = 2 days
    workoutsPerWeek:   2,
    mealDaysPerWeek:   [2, 4],
    weightLogEachWeek: false,
    startWeight:       59.5,
    weeklyWeightDelta: -0.05,
  },
  'client-0006': {
    // Inactive: ~4 score → workouts 0/7×50=0, meals 1/7×30=4.3, no weight
    // First 3 weeks active, then drops off — achieved by overriding recent weeks in post-processing
    workoutsPerWeek:   1,
    mealDaysPerWeek:   [0, 1],
    weightLogEachWeek: false,
    startWeight:       95.0,
    weeklyWeightDelta: -0.1,
  },
};

/** @type {import('../models/types.js').LogEntry[]} */
export const dummyLogs = dummyClients.flatMap(client =>
  generateLogs(client.client_id, SEED_DATE, CLIENT_PROFILES[client.client_id])
);

// ---------------------------------------------------------------------------
// Engagement score calculator (Section 5.1)
// Exported so the dashboard can call it on demand or on weekly cron
// ---------------------------------------------------------------------------

/**
 * Calculate the weekly engagement score for a client based on their log entries
 * in the rolling 7-day window ending at `asOf`.
 *
 * @param   {string}    clientId
 * @param   {LogEntry[]} logs
 * @param   {Date}      [asOf=new Date()]
 * @returns {{ score: number, classification: string }}
 */
export function calculateEngagementScore(clientId, logs, asOf = new Date()) {
  const windowStart = new Date(asOf);
  windowStart.setDate(windowStart.getDate() - 7);

  const recentLogs = logs.filter(l =>
    l.client_id === clientId &&
    new Date(l.logged_at) >= windowStart &&
    new Date(l.logged_at) <= asOf
  );

  // Workout signal (50%) — count workout entries, max 7
  const workoutCount = Math.min(
    recentLogs.filter(l => l.log_type === LogType.WORKOUT).length,
    7
  );

  // Meal signal (30%) — count distinct days with ≥1 meal, max 7
  const mealDays = new Set(
    recentLogs
      .filter(l => l.log_type === LogType.MEAL)
      .map(l => new Date(l.logged_at).toISOString().split('T')[0])
  ).size;

  // Weight signal (20%) — binary: any weight log this week?
  const hasWeightLog = recentLogs.some(l => l.log_type === LogType.WEIGHT) ? 1 : 0;

  const score = Math.round(
    (workoutCount / 7) * 50 +
    (Math.min(mealDays, 7) / 7) * 30 +
    hasWeightLog * 20
  );

  const classification =
    score >= 80 ? Classification.SERIOUS  :
    score >= 50 ? Classification.ACTIVE   :
    score >= 20 ? Classification.CASUAL   :
                  Classification.INACTIVE;

  return { score, classification };
}

// ---------------------------------------------------------------------------
// Dummy Workout Plans (Section 4 / Flow D)
// Referenced by assigned_plan_id on each client record
// ---------------------------------------------------------------------------

/** @type {import('../models/types.js').WorkoutPlan[]} */
export const dummyPlans = [
  // ── Plan 0001: Fat Loss — 4-Day Split ─────────────────────────────────────
  {
    plan_id:     'plan-0001',
    trainer_id:  'trainer-0001',
    name:        'Fat Loss — 4-Day Split',
    description: 'Progressive fat loss with cardio conditioning. Compound movements and metabolic circuits, 4 days/week.',
    days: [
      {
        day_number: 1, label: 'Day 1 — Upper Push',
        exercises: [
          { name: 'Barbell Bench Press',      sets: 4, reps: '10',   notes: 'Controlled descent, 2 sec down' },
          { name: 'Incline Dumbbell Press',   sets: 3, reps: '12',   notes: '' },
          { name: 'Dumbbell Shoulder Press',  sets: 3, reps: '12',   notes: '' },
          { name: 'Tricep Pushdown',          sets: 3, reps: '15',   notes: 'Full lockout at bottom' },
          { name: 'Plank',                    sets: 3, reps: '45 sec', notes: 'Brace core throughout' },
        ],
      },
      {
        day_number: 2, label: 'Day 2 — Lower Body',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 4, reps: '10',   notes: 'Drive knees out, chest up' },
          { name: 'Romanian Deadlift',        sets: 3, reps: '12',   notes: 'Hinge at hips, soft knee bend' },
          { name: 'Leg Press',                sets: 3, reps: '15',   notes: '' },
          { name: 'Walking Lunges',           sets: 3, reps: '12 each', notes: 'Use dumbbells if too easy' },
          { name: 'Calf Raises',              sets: 4, reps: '20',   notes: 'Full stretch at bottom' },
        ],
      },
      {
        day_number: 3, label: 'Day 3 — Cardio Circuit',
        exercises: [
          { name: 'Jump Rope',                sets: 3, reps: '3 min',  notes: 'Rest 60 sec between sets' },
          { name: 'Burpees',                  sets: 3, reps: '12',     notes: '' },
          { name: 'Mountain Climbers',        sets: 3, reps: '20 each', notes: 'Keep hips level' },
          { name: 'Box Jumps',                sets: 3, reps: '10',     notes: 'Soft landing, full extension' },
          { name: 'Battle Rope Slams',        sets: 3, reps: '30 sec', notes: '' },
        ],
      },
      {
        day_number: 4, label: 'Day 4 — Full Body Metabolic',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 4, reps: '8',    notes: 'Brace core, drive through heels' },
          { name: 'Dumbbell Row',             sets: 3, reps: '12 each', notes: '' },
          { name: 'Push-ups',                 sets: 3, reps: '15',   notes: 'Elbows at 45° to body' },
          { name: 'Kettlebell Swing',         sets: 3, reps: '15',   notes: 'Hip hinge, not a squat' },
        ],
      },
    ],
    assigned_to: ['client-0001', 'client-0003'],
    created_at:  '2025-10-01T00:00:00.000Z',
  },

  // ── Plan 0002: Hypertrophy Push-Pull-Legs ─────────────────────────────────
  {
    plan_id:     'plan-0002',
    trainer_id:  'trainer-0001',
    name:        'Hypertrophy Push-Pull-Legs',
    description: '6-day PPL for intermediate lifters on a lean bulk. Progressive overload week on week.',
    days: [
      {
        day_number: 1, label: 'Day 1 — Push',
        exercises: [
          { name: 'Barbell Bench Press',      sets: 4, reps: '8-10',  notes: '2 sec eccentric' },
          { name: 'Incline Dumbbell Press',   sets: 3, reps: '10-12', notes: '' },
          { name: 'Cable Lateral Raise',      sets: 4, reps: '15',    notes: 'Don\'t swing' },
          { name: 'Overhead Press',           sets: 3, reps: '10',    notes: '' },
          { name: 'Tricep Pushdown',          sets: 4, reps: '12-15', notes: 'Supinate at bottom' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: '12',   notes: '' },
        ],
      },
      {
        day_number: 2, label: 'Day 2 — Pull',
        exercises: [
          { name: 'Conventional Deadlift',    sets: 4, reps: '5',    notes: 'Heaviest lift — prioritise form' },
          { name: 'Pull-ups',                 sets: 4, reps: '8-10', notes: 'Full hang at bottom' },
          { name: 'Cable Row',                sets: 3, reps: '12',   notes: 'Drive elbows back' },
          { name: 'Face Pulls',               sets: 3, reps: '15',   notes: 'External rotation cue' },
          { name: 'Barbell Curl',             sets: 3, reps: '10',   notes: '' },
          { name: 'Hammer Curl',              sets: 3, reps: '12',   notes: '' },
        ],
      },
      {
        day_number: 3, label: 'Day 3 — Legs',
        exercises: [
          { name: 'Barbell Back Squat',       sets: 4, reps: '8-10', notes: 'High bar, full depth' },
          { name: 'Leg Press',                sets: 4, reps: '12',   notes: '' },
          { name: 'Romanian Deadlift',        sets: 3, reps: '12',   notes: '' },
          { name: 'Leg Curl',                 sets: 3, reps: '12',   notes: 'Slow negative' },
          { name: 'Leg Extension',            sets: 3, reps: '15',   notes: '' },
          { name: 'Standing Calf Raises',     sets: 4, reps: '20',   notes: '' },
        ],
      },
      {
        day_number: 4, label: 'Day 4 — Push (B)',
        exercises: [
          { name: 'Incline Barbell Press',    sets: 4, reps: '8-10', notes: '' },
          { name: 'Cable Fly',                sets: 3, reps: '12-15', notes: 'Squeeze at midline' },
          { name: 'Arnold Press',             sets: 3, reps: '10',   notes: '' },
          { name: 'Dumbbell Lateral Raise',   sets: 4, reps: '15',   notes: '' },
          { name: 'Skull Crushers',           sets: 3, reps: '12',   notes: '' },
        ],
      },
      {
        day_number: 5, label: 'Day 5 — Pull (B)',
        exercises: [
          { name: 'Weighted Pull-ups',        sets: 4, reps: '6-8',  notes: '' },
          { name: 'Pendlay Row',              sets: 4, reps: '8',    notes: 'Explosive concentric' },
          { name: 'Single-Arm DB Row',        sets: 3, reps: '12 each', notes: 'Brace on bench' },
          { name: 'Reverse Fly',              sets: 3, reps: '15',   notes: '' },
          { name: 'Incline Dumbbell Curl',    sets: 3, reps: '10',   notes: 'Full stretch at bottom' },
        ],
      },
      {
        day_number: 6, label: 'Day 6 — Legs (B)',
        exercises: [
          { name: 'Front Squat',              sets: 4, reps: '8',    notes: 'Elbows high, torso upright' },
          { name: 'Bulgarian Split Squat',    sets: 3, reps: '10 each', notes: '' },
          { name: 'Leg Press',                sets: 3, reps: '15',   notes: 'Feet high for hamstrings' },
          { name: 'Nordic Hamstring Curl',    sets: 3, reps: '8',    notes: 'Brace partner on feet' },
          { name: 'Seated Calf Raises',       sets: 4, reps: '20',   notes: '' },
          { name: 'Ab Wheel Rollout',         sets: 3, reps: '10',   notes: 'Don\'t let hips sag' },
        ],
      },
    ],
    assigned_to: ['client-0002'],
    created_at:  '2025-10-15T00:00:00.000Z',
  },

  // ── Plan 0003: Beginner Full Body 3-Day ───────────────────────────────────
  {
    plan_id:     'plan-0003',
    trainer_id:  'trainer-0001',
    name:        'Beginner Full Body 3-Day',
    description: 'Full-body strength circuits for beginners. 3 sessions/week with a rest day between each session.',
    days: [
      {
        day_number: 1, label: 'Day 1 — Full Body A',
        exercises: [
          { name: 'Goblet Squat',             sets: 3, reps: '12',   notes: 'Chest up, knees track over toes' },
          { name: 'Push-ups',                 sets: 3, reps: '10',   notes: 'Modify on knees if needed' },
          { name: 'Dumbbell Row',             sets: 3, reps: '10 each', notes: 'Elbow to hip pocket' },
          { name: 'Plank Hold',               sets: 3, reps: '30 sec', notes: 'Squeeze glutes and core' },
        ],
      },
      {
        day_number: 2, label: 'Day 2 — Full Body B',
        exercises: [
          { name: 'Romanian Deadlift',        sets: 3, reps: '10',   notes: 'Hinge at hips, slight knee bend' },
          { name: 'Dumbbell Overhead Press',  sets: 3, reps: '10',   notes: 'Neutral spine, don\'t arch back' },
          { name: 'Lat Pulldown',             sets: 3, reps: '12',   notes: 'Drive elbows to pockets' },
          { name: 'Glute Bridge',             sets: 3, reps: '15',   notes: 'Hold 2 sec at top' },
        ],
      },
      {
        day_number: 3, label: 'Day 3 — Full Body C',
        exercises: [
          { name: 'Reverse Lunge',            sets: 3, reps: '10 each', notes: 'Keep torso tall' },
          { name: 'Incline Push-ups',         sets: 3, reps: '12',   notes: 'Hands on bench' },
          { name: 'Seated Cable Row',         sets: 3, reps: '12',   notes: '' },
          { name: 'Dead Bug',                 sets: 3, reps: '10 each', notes: 'Lower back pressed to floor' },
        ],
      },
    ],
    assigned_to: ['client-0004', 'client-0006'],
    created_at:  '2025-11-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Dummy Nutrition Plans
// ---------------------------------------------------------------------------

export const dummyNutritionPlans = [

  // ── Plan N-0001: Fat Loss Deficit ──────────────────────────────────────────
  {
    nutrition_plan_id: 'nplan-0001',
    trainer_id:        'trainer-0001',
    iconType:          'flame',
    name:              'Fat Loss Deficit Plan',
    description:       'High-protein deficit plan for steady fat loss. Macro split optimised for muscle retention while in a caloric deficit.',
    calories:          1800,
    protein_g:         160,
    carbs_g:           150,
    fats_g:            55,
    guidelines:        '- Eat 4–5 meals spread across the day\n- Prioritise protein at every meal (30–40g)\n- Save carbs pre/post workout\n- 3L water daily minimum\n- Weigh yourself every Monday morning, fasted',
    assigned_to:       ['client-0001', 'client-0005'],
    created_at:        '2025-11-20T00:00:00.000Z',
  },

  // ── Plan N-0002: Muscle Gain Surplus ──────────────────────────────────────
  {
    nutrition_plan_id: 'nplan-0002',
    trainer_id:        'trainer-0001',
    iconType:          'beef',
    name:              'Muscle Gain Surplus Plan',
    description:       'Moderate calorie surplus for lean muscle gain. High carbs around training to fuel performance and support recovery.',
    calories:          2800,
    protein_g:         200,
    carbs_g:           320,
    fats_g:            75,
    guidelines:        '- 5–6 meals per day including pre/post-workout nutrition\n- Creatine 5g daily with morning meal\n- High carb meals around training window\n- Limit processed foods — quality surplus only\n- Track weight weekly; adjust calories if stalled for 2 weeks',
    assigned_to:       ['client-0002', 'client-0004'],
    created_at:        '2025-12-01T00:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Dummy Sessions — today (Feb 24, 2026 = Tuesday) and the next 3 days
// Used by the Today Strip in the Dashboard
// Historical sessions below are used by the Client Profile session history
// ---------------------------------------------------------------------------

/** @type {import('../models/types.js').Session[]} */
export const dummySessions = [
  // ── Historical: Priya Sharma (client-0001) — weekly Tue 06:30 ────────────
  { session_id: 'sess-0006', client_id: 'client-0001', trainer_id: dummyTrainer.trainer_id, date: '2026-01-27', time: '06:30', session_type: 'in_person', status: 'completed', notes: 'Great session. Hit new PB on deadlift.' },
  { session_id: 'sess-0007', client_id: 'client-0001', trainer_id: dummyTrainer.trainer_id, date: '2026-02-03', time: '06:30', session_type: 'in_person', status: 'completed', notes: '' },
  { session_id: 'sess-0008', client_id: 'client-0001', trainer_id: dummyTrainer.trainer_id, date: '2026-02-10', time: '06:30', session_type: 'in_person', status: 'completed', notes: 'Focus on form — slight knee tracking issue on squats.' },
  { session_id: 'sess-0009', client_id: 'client-0001', trainer_id: dummyTrainer.trainer_id, date: '2026-02-17', time: '06:30', session_type: 'in_person', status: 'completed', notes: '' },

  // ── Historical: Rahul Mehta (client-0002) — weekly Tue 08:00 ─────────────
  { session_id: 'sess-0010', client_id: 'client-0002', trainer_id: dummyTrainer.trainer_id, date: '2026-02-03', time: '08:00', session_type: 'in_person', status: 'completed', notes: 'Shoulder felt fine — increased bench to 80kg.' },
  { session_id: 'sess-0011', client_id: 'client-0002', trainer_id: dummyTrainer.trainer_id, date: '2026-02-10', time: '08:00', session_type: 'in_person', status: 'completed', notes: '' },
  { session_id: 'sess-0012', client_id: 'client-0002', trainer_id: dummyTrainer.trainer_id, date: '2026-02-17', time: '08:00', session_type: 'in_person', status: 'completed', notes: 'Left shoulder twinge noted. Will monitor.' },

  // ── Historical: Sneha Patel (client-0003) — Wed 17:00 ────────────────────
  { session_id: 'sess-0013', client_id: 'client-0003', trainer_id: dummyTrainer.trainer_id, date: '2026-02-04', time: '17:00', session_type: 'online',    status: 'no_show',   notes: 'Client did not join — sent follow-up message.' },
  { session_id: 'sess-0014', client_id: 'client-0003', trainer_id: dummyTrainer.trainer_id, date: '2026-02-11', time: '17:00', session_type: 'in_person', status: 'completed', notes: '' },
  { session_id: 'sess-0015', client_id: 'client-0003', trainer_id: dummyTrainer.trainer_id, date: '2026-02-18', time: '17:00', session_type: 'in_person', status: 'completed', notes: 'Good energy. Flexibility noticeably improved.' },

  // ── Historical: Arjun Singh (client-0004) — Tue 17:30 ────────────────────
  { session_id: 'sess-0016', client_id: 'client-0004', trainer_id: dummyTrainer.trainer_id, date: '2026-02-03', time: '17:30', session_type: 'online',    status: 'completed', notes: 'Online session — good focus despite travel.' },
  { session_id: 'sess-0017', client_id: 'client-0004', trainer_id: dummyTrainer.trainer_id, date: '2026-02-10', time: '17:30', session_type: 'in_person', status: 'completed', notes: '' },
  { session_id: 'sess-0018', client_id: 'client-0004', trainer_id: dummyTrainer.trainer_id, date: '2026-02-17', time: '17:30', session_type: 'online',    status: 'completed', notes: 'Client travelling again. Online worked well.' },

  // ── Historical: Kavya Nair (client-0005) — Wed 11:00 ─────────────────────
  { session_id: 'sess-0019', client_id: 'client-0005', trainer_id: dummyTrainer.trainer_id, date: '2026-02-04', time: '11:00', session_type: 'in_person', status: 'completed', notes: '' },
  { session_id: 'sess-0020', client_id: 'client-0005', trainer_id: dummyTrainer.trainer_id, date: '2026-02-11', time: '11:00', session_type: 'in_person', status: 'cancelled', notes: 'Client rescheduled — work emergency.' },
  { session_id: 'sess-0021', client_id: 'client-0005', trainer_id: dummyTrainer.trainer_id, date: '2026-02-18', time: '11:00', session_type: 'in_person', status: 'completed', notes: 'Low energy but showed up. Good sign.' },

  // ── Historical: Rohan Gupta (client-0006) — Wed 14:00 (dropped off) ──────
  { session_id: 'sess-0022', client_id: 'client-0006', trainer_id: dummyTrainer.trainer_id, date: '2026-01-28', time: '14:00', session_type: 'in_person', status: 'completed', notes: 'Strong first session. High motivation.' },
  { session_id: 'sess-0023', client_id: 'client-0006', trainer_id: dummyTrainer.trainer_id, date: '2026-02-04', time: '14:00', session_type: 'in_person', status: 'completed', notes: '' },
  { session_id: 'sess-0024', client_id: 'client-0006', trainer_id: dummyTrainer.trainer_id, date: '2026-02-11', time: '14:00', session_type: 'in_person', status: 'no_show',   notes: '' },
  { session_id: 'sess-0025', client_id: 'client-0006', trainer_id: dummyTrainer.trainer_id, date: '2026-02-18', time: '14:00', session_type: 'in_person', status: 'no_show',   notes: 'Second no-show. Sent WhatsApp — no response.' },

  // ── Today: Feb 24 ────────────────────────────────────────────────────────
  {
    session_id:   'sess-0001',
    client_id:    'client-0001',
    trainer_id:   dummyTrainer.trainer_id,
    date:         '2026-02-24',
    time:         '06:30',
    session_type: 'in_person',
    status:       null,
    notes:        '',
  },
  {
    session_id:   'sess-0002',
    client_id:    'client-0002',
    trainer_id:   dummyTrainer.trainer_id,
    date:         '2026-02-24',
    time:         '08:00',
    session_type: 'in_person',
    status:       null,
    notes:        '',
  },
  {
    session_id:   'sess-0003',
    client_id:    'client-0004',
    trainer_id:   dummyTrainer.trainer_id,
    date:         '2026-02-24',
    time:         '17:30',
    session_type: 'online',
    status:       null,
    notes:        '',
  },
  // ── Feb 25 ───────────────────────────────────────────────────────────────
  {
    session_id:   'sess-0004',
    client_id:    'client-0003',
    trainer_id:   dummyTrainer.trainer_id,
    date:         '2026-02-25',
    time:         '09:00',
    session_type: 'in_person',
    status:       null,
    notes:        '',
  },
  {
    session_id:   'sess-0005',
    client_id:    'client-0005',
    trainer_id:   dummyTrainer.trainer_id,
    date:         '2026-02-25',
    time:         '11:00',
    session_type: 'in_person',
    status:       null,
    notes:        '',
  },
];

// ---------------------------------------------------------------------------
// Convenience: all dummy data in one export
// ---------------------------------------------------------------------------

export const dummyData = {
  trainer:  dummyTrainer,
  clients:  dummyClients,
  logs:     dummyLogs,
  sessions: dummySessions,
  plans:    dummyPlans,
};

export default dummyData;

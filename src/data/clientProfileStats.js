/**
 * RPM.ENERGY — Client Profile Computation Module
 *
 * Pure functions that derive display-ready data for the /clients/:id page.
 * All windows are anchored to SEED_DATE (2026-02-24) so output is stable
 * against the static dummy corpus.
 *
 * Heatmap window: 4 complete Mon–Sun calendar weeks ending Feb 22
 *   → Jan 26 (Mon) … Feb 22 (Sun) = 28 cells
 *
 * Meal log window: same 28-day window (consistent with heatmap)
 *
 * Weight chart: full history — all available weight log entries
 */

import { LogType } from '../models/types.js';
import { dummyLogs, dummySessions, dummyPlans, calculateEngagementScore } from './dummyData.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SEED_DATE   = new Date('2026-02-24T23:59:59.000Z');
export const TODAY_STR   = '2026-02-24';

// 4 complete calendar weeks (Mon–Sun), ending the Sunday before today
const HEATMAP_START = new Date('2026-01-26T00:00:00.000Z'); // Mon
const HEATMAP_DAYS  = 28;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function addDays(base, n) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// ---------------------------------------------------------------------------
// Weight History  (Section 3.3 — Weight Chart)
// ---------------------------------------------------------------------------

/**
 * All weight log entries for a client, sorted oldest → newest.
 * Returns chart-ready data plus the start/current/change summary stats.
 *
 * @param {string} clientId
 * @returns {{ chartData: Array, startWeight: number, currentWeight: number,
 *             change: number, changePct: number } | null}
 */
export function getWeightHistory(clientId) {
  const entries = dummyLogs
    .filter(l => l.client_id === clientId && l.log_type === LogType.WEIGHT)
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));

  if (!entries.length) return null;

  const startWeight   = entries[0].value;
  const currentWeight = entries[entries.length - 1].value;
  const change        = Math.round((currentWeight - startWeight) * 10) / 10;
  const changePct     = Math.round((change / startWeight) * 1000) / 10; // 1 dp

  const chartData = entries.map(e => ({
    label:  new Date(e.logged_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    weight: e.value,
  }));

  return { chartData, startWeight, currentWeight, change, changePct };
}

// ---------------------------------------------------------------------------
// Workout Heatmap  (Section 3.3 — Workout Completion)
// ---------------------------------------------------------------------------

/**
 * Returns 4 week-rows × 7 day-cells for the heatmap calendar.
 * Each cell: { date, dayLabel, hasWorkout, isToday }
 *
 * @param {string} clientId
 * @returns {Array<{ weekLabel: string, cells: Array }>}
 */
export function getWorkoutHeatmap(clientId) {
  // Build a fast-lookup set of dates that have a workout log
  const workoutDates = new Set(
    dummyLogs
      .filter(l => l.client_id === clientId && l.log_type === LogType.WORKOUT)
      .map(l => isoDate(new Date(l.logged_at)))
  );

  const weeks = [];

  for (let w = 0; w < 4; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const dayObj  = addDays(HEATMAP_START, w * 7 + d);
      const dateStr = isoDate(dayObj);
      cells.push({
        date:       dateStr,
        dayLabel:   DAY_LABELS[d],
        hasWorkout: workoutDates.has(dateStr),
        isToday:    dateStr === TODAY_STR,
      });
    }
    const weekLabel = addDays(HEATMAP_START, w * 7)
      .toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    weeks.push({ weekLabel, cells });
  }

  return weeks; // [oldest … newest]
}

// ---------------------------------------------------------------------------
// Meal Log Summary  (Section 3.3 — Meal Log Summary, 4-week bar chart)
// ---------------------------------------------------------------------------

/**
 * Returns 28 daily data points (Jan 26 – Feb 22) with meal log counts.
 * x-axis label is abbreviated date, value is total meal entries that day.
 *
 * @param {string} clientId
 * @returns {Array<{ date: string, label: string, meals: number }>}
 */
export function getMealLogSummary(clientId) {
  // Index all meal logs by date for O(1) lookup
  const mealsByDate = {};
  dummyLogs
    .filter(l => l.client_id === clientId && l.log_type === LogType.MEAL)
    .forEach(l => {
      const d = isoDate(new Date(l.logged_at));
      mealsByDate[d] = (mealsByDate[d] ?? 0) + 1;
    });

  const data = [];
  for (let i = 0; i < HEATMAP_DAYS; i++) {
    const dayObj  = addDays(HEATMAP_START, i);
    const dateStr = isoDate(dayObj);
    data.push({
      date:     dateStr,
      label:    dayObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      dayShort: DAY_LABELS[i % 7].slice(0, 1),
      meals:    mealsByDate[dateStr] ?? 0,
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Session History  (Section 3.3 — Session History)
// ---------------------------------------------------------------------------

/**
 * Returns all sessions for a client, sorted newest → oldest (desc by date+time).
 * Adds a derived `displayStatus` field for the UI badge.
 *
 * @param {string} clientId
 * @returns {Array}
 */
export function getClientSessions(clientId) {
  return [...dummySessions]
    .filter(s => s.client_id === clientId)
    .sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      return dateDiff !== 0 ? dateDiff : b.time.localeCompare(a.time);
    })
    .map(s => ({
      ...s,
      displayStatus: deriveDisplayStatus(s),
    }));
}

function deriveDisplayStatus(session) {
  if (session.date === TODAY_STR && !session.status) return 'today';
  if (session.date > TODAY_STR  && !session.status) return 'upcoming';
  return session.status ?? 'upcoming';
}

// ---------------------------------------------------------------------------
// Assigned Plan  (Section 3.3 — Assigned Plan Card)
// ---------------------------------------------------------------------------

/**
 * Returns the plan object assigned to this client, or null.
 *
 * @param {string|null} assignedPlanId
 * @returns {Object|null}
 */
export function getAssignedPlan(assignedPlanId) {
  if (!assignedPlanId) return null;
  return dummyPlans.find(p => p.plan_id === assignedPlanId) ?? null;
}

// ---------------------------------------------------------------------------
// Helpers used by the Clients list (/clients)
// ---------------------------------------------------------------------------

/**
 * ISO date string of the most recent log entry of any type for a client.
 * Used as "Last Active" in the client card grid.
 *
 * @param {string} clientId
 * @returns {string|null}
 */
export function getLastActiveDate(clientId) {
  const latest = dummyLogs
    .filter(l => l.client_id === clientId)
    .reduce((best, l) =>
      !best || l.logged_at > best ? l.logged_at : best, null);
  return latest ? isoDate(new Date(latest)) : null;
}

/**
 * Most recent weight value for a client. Used in the client card grid.
 *
 * @param {string} clientId
 * @returns {number|null}
 */
export function getCurrentWeight(clientId) {
  const entries = dummyLogs
    .filter(l => l.client_id === clientId && l.log_type === LogType.WEIGHT)
    .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
  return entries.length ? entries[0].value : null;
}

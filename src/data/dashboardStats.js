/**
 * RPM.ENERGY — Dashboard Computation Module
 *
 * Pure functions that derive display-ready data from the dummy log corpus.
 * No React imports — these can be called in useMemo hooks or at module level.
 *
 * All functions use SEED_DATE (2026-02-24) as the "now" reference point
 * so the dashboard always renders consistently against the dummy data.
 */

import { LogType, Classification } from '../models/types.js';
import { dummyClients, dummyLogs, calculateEngagementScore } from './dummyData.js';

// "Now" for all computations — aligns with the dummy data seed date
export const SEED_DATE = new Date('2026-02-24T23:59:59.000Z');
// Rolling 7-day window
export const THIS_WEEK_START = new Date('2026-02-17T00:00:00.000Z');

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function logsInRange(clientId, logType, start, end) {
  return dummyLogs.filter(l => {
    if (l.client_id !== clientId) return false;
    if (logType !== null && l.log_type !== logType) return false;
    const t = new Date(l.logged_at);
    return t >= start && t <= end;
  });
}

// ---------------------------------------------------------------------------
// Stat Cards (Section 3.1 / Flow B1)
// ---------------------------------------------------------------------------

/**
 * Returns the four values needed by the weekly snapshot stat cards.
 * @returns {{ activeClients: number, avgMeals: number, avgCheckIns: number, starClient: Object }}
 */
export function getThisWeekStats() {
  const start = THIS_WEEK_START;
  const end   = SEED_DATE;

  // Total Clients — everyone on the roster regardless of engagement tier
  const totalClients = dummyClients.length;

  // Avg Meals — total meal log entries this week ÷ total client count
  const totalMeals = dummyClients.reduce(
    (sum, c) => sum + logsInRange(c.client_id, LogType.MEAL, start, end).length,
    0
  );
  const avgMeals = Math.round((totalMeals / totalClients) * 10) / 10;

  // Avg Check-ins — total workout logs this week ÷ total client count
  const totalWorkouts = dummyClients.reduce(
    (sum, c) => sum + logsInRange(c.client_id, LogType.WORKOUT, start, end).length,
    0
  );
  const avgCheckIns = Math.round((totalWorkouts / totalClients) * 10) / 10;

  // Star Client — highest engagement score this week
  const scored = dummyClients.map(c => ({
    client: c,
    ...calculateEngagementScore(c.client_id, dummyLogs, SEED_DATE),
  }));
  const starClient = scored.reduce((best, cur) => cur.score > best.score ? cur : best);

  return { totalClients, avgMeals, avgCheckIns, starClient };
}

// ---------------------------------------------------------------------------
// Engagement Bar Chart — 4-week view (Section 3.1 / Flow B2)
// ---------------------------------------------------------------------------

/**
 * Returns 4 data points (most recent 4 complete weeks) in Recharts BarChart format.
 * Each point: { week: 'Feb 3', 'client-0001': 24, 'client-0002': 19, ... }
 * The value is total log entries (all types) — a measure of overall logging frequency.
 */
export function getEngagementChartData() {
  const points = [];

  // Week bucket boundaries — walk back from Feb 23 (last full day before seed date)
  // Week 0 in array = oldest (4 weeks ago), Week 3 = most recent
  for (let w = 3; w >= 0; w--) {
    const end   = new Date('2026-02-23T23:59:59.000Z');
    end.setDate(end.getDate() - w * 7);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const label = start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const point = { week: label };

    dummyClients.forEach(c => {
      point[c.client_id] = logsInRange(c.client_id, null, start, end).length;
    });

    points.push(point);
  }

  return points; // [oldest … newest]
}

// ---------------------------------------------------------------------------
// Weight Trend Chart (Section 3.1 / Flow B3)
// ---------------------------------------------------------------------------

/**
 * Returns all weight log data points in Recharts LineChart format.
 * Each point: { date: 'YYYY-MM-DD', label: 'Jan 6', 'client-0001': 68.5, ... }
 * Only clients with a weight log on that date have a value — others are undefined
 * (Recharts `connectNulls` handles the gaps).
 */
export function getWeightTrendData() {
  const weightLogs = dummyLogs
    .filter(l => l.log_type === LogType.WEIGHT)
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));

  // Collect all unique dates that have at least one weight entry
  const dateSet = new Set(
    weightLogs.map(l => new Date(l.logged_at).toISOString().split('T')[0])
  );
  const dates = [...dateSet].sort();

  return dates.map(date => {
    const point = {
      date,
      label: new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', {
        month: 'short',
        day:   'numeric',
      }),
    };
    // For each log on this date, assign the weight value keyed by client_id
    weightLogs
      .filter(l => new Date(l.logged_at).toISOString().split('T')[0] === date)
      .forEach(l => { point[l.client_id] = l.value; });
    return point;
  });
}

// ---------------------------------------------------------------------------
// Classification Panel (Section 3.1 / Flow B4)
// ---------------------------------------------------------------------------

/**
 * Returns clients grouped by their classification tier, each enriched with
 * their current computed engagement score.
 *
 * @returns {{ serious: Client[], active: Client[], casual: Client[], inactive: Client[] }}
 */
export function getClassificationGroups() {
  const withScores = dummyClients.map(c => ({
    ...c,
    score: calculateEngagementScore(c.client_id, dummyLogs, SEED_DATE).score,
  }));

  return {
    serious:  withScores.filter(c => c.classification === Classification.SERIOUS),
    active:   withScores.filter(c => c.classification === Classification.ACTIVE),
    casual:   withScores.filter(c => c.classification === Classification.CASUAL),
    inactive: withScores.filter(c => c.classification === Classification.INACTIVE),
  };
}

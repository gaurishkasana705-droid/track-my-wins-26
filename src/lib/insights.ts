import { daysAgo, isoDate } from "./format";

export type StudyRow = { session_date: string; duration_minutes: number };
export type WorkoutRow = { workout_date: string; duration_minutes: number };
export type TrackerEntryRow = { entry_date: string; tracker_id: string; value: number };
export type TrackerRow = { id: string; name: string; tracker_type: string; target_value: number | null };

function rangeDates(start: number, end: number): string[] {
  const out: string[] = [];
  for (let i = start; i >= end; i--) out.push(isoDate(daysAgo(i)));
  return out;
}

function activeDays(dates: string[], values: Map<string, number>): number {
  return dates.reduce((a, d) => a + ((values.get(d) ?? 0) > 0 ? 1 : 0), 0);
}

function sumMap<T extends { duration_minutes: number }>(rows: T[], dateKey: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(dateKey(r), (m.get(dateKey(r)) ?? 0) + r.duration_minutes);
  return m;
}

export type DisciplineBreakdown = {
  study: number;       // 0..100
  workout: number;
  habit: number;
  volume: number;
  weights: { study: number; workout: number; habit: number; volume: number };
};

export type Insights = {
  disciplineScore: number;
  disciplineDelta: number;
  breakdown: DisciplineBreakdown;
  consistencyScore: number;
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  insights: string[];
  biggestWin: string;
  biggestWeakness: string;
  recommendation: string;
  bestDayName: string;
  bestDayMinutes: number;
  patterns: string[];
};

export type WeekStats = {
  studyMinutes: number;
  studyDays: number;
  workoutCount: number;
  workoutDays: number;
  habitCompletionRate: number;
};

function computeWeek(
  dates: string[],
  studyByDay: Map<string, number>,
  workoutByDay: Map<string, number>,
  workoutCountByDay: Map<string, number>,
  habitRate: number,
): WeekStats {
  const studyMinutes = dates.reduce((a, d) => a + (studyByDay.get(d) ?? 0), 0);
  const studyDays = activeDays(dates, studyByDay);
  const workoutCount = dates.reduce((a, d) => a + (workoutCountByDay.get(d) ?? 0), 0);
  const workoutDays = activeDays(dates, workoutByDay);
  return { studyMinutes, studyDays, workoutCount, workoutDays, habitCompletionRate: habitRate };
}

function habitCompletion(dates: string[], trackers: TrackerRow[], entries: TrackerEntryRow[]): number {
  if (trackers.length === 0) return 1;
  const byTracker = new Map<string, Map<string, number>>();
  for (const e of entries) {
    if (!byTracker.has(e.tracker_id)) byTracker.set(e.tracker_id, new Map());
    const m = byTracker.get(e.tracker_id)!;
    m.set(e.entry_date, (m.get(e.entry_date) ?? 0) + Number(e.value));
  }
  let total = 0, met = 0;
  for (const t of trackers) {
    const target = t.target_value ? Number(t.target_value) : 1;
    const m = byTracker.get(t.id) ?? new Map();
    for (const d of dates) {
      total++;
      if ((m.get(d) ?? 0) >= target) met++;
    }
  }
  return total === 0 ? 1 : met / total;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeInsights(
  study: StudyRow[],
  workouts: WorkoutRow[],
  trackers: TrackerRow[],
  entries: TrackerEntryRow[],
): Insights {
  const thisWeekDates = rangeDates(6, 0);
  const lastWeekDates = rangeDates(13, 7);

  const studyByDay = sumMap(study, (s) => s.session_date);
  const workoutByDay = sumMap(workouts, (w) => w.workout_date);
  const workoutCountByDay = new Map<string, number>();
  for (const w of workouts) workoutCountByDay.set(w.workout_date, (workoutCountByDay.get(w.workout_date) ?? 0) + 1);

  const habitThis = habitCompletion(thisWeekDates, trackers, entries);
  const habitLast = habitCompletion(lastWeekDates, trackers, entries);

  const thisWeek = computeWeek(thisWeekDates, studyByDay, workoutByDay, workoutCountByDay, habitThis);
  const lastWeek = computeWeek(lastWeekDates, studyByDay, workoutByDay, workoutCountByDay, habitLast);

  const studyConsistencyThis = thisWeek.studyDays / 7;
  const workoutConsistencyThis = Math.min(1, thisWeek.workoutDays / 4);
  const consistencyScore = Math.round(((studyConsistencyThis + workoutConsistencyThis + thisWeek.habitCompletionRate) / 3) * 100);

  const studyConsistencyLast = lastWeek.studyDays / 7;
  const workoutConsistencyLast = Math.min(1, lastWeek.workoutDays / 4);
  const lastConsistency = Math.round(((studyConsistencyLast + workoutConsistencyLast + lastWeek.habitCompletionRate) / 3) * 100);

  // Discipline breakdown — explicit weights, each shown as a 0..100 contribution
  const weights = { study: 30, workout: 25, habit: 25, volume: 20 };
  const studyScore = Math.round(studyConsistencyThis * 100);
  const workoutScore = Math.round(workoutConsistencyThis * 100);
  const habitScore = Math.round(thisWeek.habitCompletionRate * 100);
  const volumeRaw = Math.min(1, thisWeek.studyMinutes / (120 * 5)) * 0.5 + Math.min(1, thisWeek.workoutCount / 4) * 0.5;
  const volumeScore = Math.round(volumeRaw * 100);
  const disciplineScore = Math.round(
    (studyScore * weights.study + workoutScore * weights.workout + habitScore * weights.habit + volumeScore * weights.volume) / 100,
  );

  // Last week discipline for delta
  const volumeRawLast = Math.min(1, lastWeek.studyMinutes / (120 * 5)) * 0.5 + Math.min(1, lastWeek.workoutCount / 4) * 0.5;
  const disciplineLast = Math.round(
    (Math.round(studyConsistencyLast * 100) * weights.study +
      Math.round(workoutConsistencyLast * 100) * weights.workout +
      Math.round(lastWeek.habitCompletionRate * 100) * weights.habit +
      Math.round(volumeRawLast * 100) * weights.volume) / 100,
  );
  const disciplineDelta = disciplineScore - disciplineLast;

  // Best day of week (last 14 days, all activity in minutes)
  const dayTotals = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);
  for (const d of [...thisWeekDates, ...lastWeekDates]) {
    const idx = new Date(d).getDay();
    dayTotals[idx] += (studyByDay.get(d) ?? 0) + (workoutByDay.get(d) ?? 0);
    dayCounts[idx]++;
  }
  const dayAvg = dayTotals.map((t, i) => (dayCounts[i] ? t / dayCounts[i] : 0));
  let bestIdx = 0;
  for (let i = 1; i < 7; i++) if (dayAvg[i] > dayAvg[bestIdx]) bestIdx = i;
  const bestDayName = WEEKDAYS[bestIdx];
  const bestDayMinutes = Math.round(dayAvg[bestIdx]);

  // Smart insights
  const insights: string[] = [];
  const studyDelta = thisWeek.studyMinutes - lastWeek.studyMinutes;
  const dayDelta = thisWeek.studyDays - lastWeek.studyDays;
  if (Math.abs(studyDelta) >= 30) {
    if (studyDelta > 0 && dayDelta < 0) insights.push("You studied more this week, but consistency decreased.");
    else if (studyDelta > 0) insights.push(`Study time up ${Math.round(studyDelta / 60 * 10) / 10}h this week — keep the momentum.`);
    else insights.push(`Study time dropped ${Math.round(-studyDelta / 60 * 10) / 10}h. Block focused time tomorrow.`);
  }
  if (thisWeek.workoutCount > lastWeek.workoutCount) insights.push("Workout activity improved this week.");
  else if (thisWeek.workoutCount < lastWeek.workoutCount && lastWeek.workoutCount > 0) {
    insights.push(`Workouts down ${lastWeek.workoutCount - thisWeek.workoutCount} from last week.`);
  }
  if (trackers.length > 0) {
    if (thisWeek.habitCompletionRate > lastWeek.habitCompletionRate + 0.05) insights.push("You completed habits more consistently than last week.");
    else if (thisWeek.habitCompletionRate < lastWeek.habitCompletionRate - 0.05) insights.push("Habit consistency slipped — try to hit at least one daily tracker.");
  }
  if (thisWeek.studyDays >= 6) insights.push("Near-perfect study streak this week. Outstanding.");
  if (thisWeek.studyDays === 0 && thisWeek.workoutDays === 0 && thisWeek.habitCompletionRate === 0) {
    insights.push("No activity logged this week. Start with one small win today.");
  }
  if (insights.length === 0) insights.push("Steady week. Small, consistent action compounds.");

  // Productivity patterns
  const patterns: string[] = [];
  if (bestDayMinutes > 0) patterns.push(`${bestDayName} is your strongest day — average ${Math.round(bestDayMinutes)} min of activity.`);
  // workout-on-study-day overlap
  let bothDays = 0, studyOnly = 0;
  for (const d of [...thisWeekDates, ...lastWeekDates]) {
    const s = (studyByDay.get(d) ?? 0) > 0;
    const w = (workoutByDay.get(d) ?? 0) > 0;
    if (s && w) bothDays++;
    if (s && !w) studyOnly++;
  }
  if (bothDays >= 3) patterns.push("Days where you work out tend to include focused study too — exercise primes your focus.");
  // habit drop-off
  if (trackers.length > 0 && thisWeek.habitCompletionRate < 0.4 && lastWeek.habitCompletionRate > 0.7) {
    patterns.push("Habit completion dropped sharply — possible motivation slump. Pick one keystone habit to anchor the week.");
  }

  const metrics = [
    { name: "Study consistency", this: studyConsistencyThis, last: studyConsistencyLast },
    { name: "Workout consistency", this: workoutConsistencyThis, last: workoutConsistencyLast },
    { name: "Habit completion", this: thisWeek.habitCompletionRate, last: lastWeek.habitCompletionRate },
  ];
  const deltas = metrics.map((m) => ({ name: m.name, delta: m.this - m.last, value: m.this }));
  const best = [...deltas].sort((a, b) => b.delta - a.delta)[0];
  const worst = [...deltas].sort((a, b) => a.delta - b.delta)[0];
  const biggestWin = best.delta > 0.01 ? `${best.name} improved` : `Strongest area: ${[...metrics].sort((a, b) => b.this - a.this)[0].name}`;
  const biggestWeakness = worst.delta < -0.01 ? `${worst.name} declined` : `Weakest area: ${[...metrics].sort((a, b) => a.this - b.this)[0].name}`;

  let recommendation = "Keep the rhythm — log every day, even small wins.";
  const weakest = [...metrics].sort((a, b) => a.this - b.this)[0];
  if (weakest.this < 0.5) {
    if (weakest.name.includes("Study")) recommendation = "Block two 45-minute study sessions next week — pick the time and protect it.";
    else if (weakest.name.includes("Workout")) recommendation = "Schedule three short workouts next week — 20 minutes is enough to count.";
    else recommendation = "Pick one habit and aim for a 7-day streak next week.";
  }

  return {
    disciplineScore: Math.max(0, Math.min(100, disciplineScore)),
    disciplineDelta,
    breakdown: { study: studyScore, workout: workoutScore, habit: habitScore, volume: volumeScore, weights },
    consistencyScore,
    thisWeek,
    lastWeek,
    insights,
    biggestWin,
    biggestWeakness,
    recommendation,
    bestDayName,
    bestDayMinutes,
    patterns,
  };
}

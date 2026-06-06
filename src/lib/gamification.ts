export type Badge = {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  icon: string; // lucide icon name
  progress?: number; // 0-100, how close to earning
};

export function computeLevel(xp: number): { level: number; current: number; needed: number; pct: number } {
  // Level n requires 100 * n^1.5 total XP (cumulative)
  let level = 1;
  while (xp >= Math.floor(100 * Math.pow(level, 1.5))) level++;
  const thisCap = Math.floor(100 * Math.pow(level, 1.5));
  const prevCap = level === 1 ? 0 : Math.floor(100 * Math.pow(level - 1, 1.5));
  const current = xp - prevCap;
  const needed = thisCap - prevCap;
  return { level, current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

export function computeXP({ studyMin, workoutCount, goalsDone, streak, habitsHit, focusMin = 0 }: {
  studyMin: number; workoutCount: number; goalsDone: number; streak: number; habitsHit: number; focusMin?: number;
}) {
  return Math.round(studyMin * 1 + focusMin * 1.5 + workoutCount * 20 + goalsDone * 50 + streak * 10 + habitsHit * 5);
}

export type BadgeInputs = {
  studyMin: number;
  workoutCount: number;
  goalsDone: number;
  streak: number;
  bestStreak: number;
  sessionsCount: number;
  focusMin: number;
  focusCount: number;
  level: number;
};

function pct(v: number, target: number) {
  return Math.min(100, Math.round((v / target) * 100));
}

export function computeBadges(i: BadgeInputs): Badge[] {
  return [
    { id: "first_step", name: "First Step", description: "Log your first activity", earned: i.sessionsCount > 0 || i.workoutCount > 0 || i.focusCount > 0, icon: "Sparkles", progress: i.sessionsCount + i.workoutCount + i.focusCount > 0 ? 100 : 0 },
    { id: "first_goal", name: "Goal Setter", description: "Complete your first goal", earned: i.goalsDone >= 1, icon: "Target", progress: pct(i.goalsDone, 1) },
    { id: "first_focus", name: "Deep Diver", description: "Finish a focus session", earned: i.focusCount >= 1, icon: "Brain", progress: pct(i.focusCount, 1) },
    { id: "week_warrior", name: "Week Warrior", description: "Reach a 7-day streak", earned: i.bestStreak >= 7, icon: "Flame", progress: pct(i.bestStreak, 7) },
    { id: "month_master", name: "Month Master", description: "Reach a 30-day streak", earned: i.bestStreak >= 30, icon: "Trophy", progress: pct(i.bestStreak, 30) },
    { id: "scholar", name: "Scholar", description: "10 hours of study", earned: i.studyMin >= 600, icon: "BookOpen", progress: pct(i.studyMin, 600) },
    { id: "deep_focus", name: "Deep Focus", description: "50 hours of study", earned: i.studyMin >= 3000, icon: "GraduationCap", progress: pct(i.studyMin, 3000) },
    { id: "focus_master", name: "Focus Master", description: "10 hours of focus time", earned: i.focusMin >= 600, icon: "Brain", progress: pct(i.focusMin, 600) },
    { id: "athlete", name: "Athlete", description: "10 workouts logged", earned: i.workoutCount >= 10, icon: "Dumbbell", progress: pct(i.workoutCount, 10) },
    { id: "iron", name: "Iron Discipline", description: "50 workouts logged", earned: i.workoutCount >= 50, icon: "Medal", progress: pct(i.workoutCount, 50) },
    { id: "achiever", name: "Achiever", description: "Complete 3 goals", earned: i.goalsDone >= 3, icon: "Target", progress: pct(i.goalsDone, 3) },
    { id: "champion", name: "Champion", description: "Complete 10 goals", earned: i.goalsDone >= 10, icon: "Trophy", progress: pct(i.goalsDone, 10) },
    { id: "centurion", name: "Centurion", description: "100 logged sessions", earned: i.sessionsCount >= 100, icon: "Award", progress: pct(i.sessionsCount, 100) },
    { id: "level_5", name: "Rising Star", description: "Reach Level 5", earned: i.level >= 5, icon: "Sparkles", progress: pct(i.level, 5) },
    { id: "level_10", name: "Veteran", description: "Reach Level 10", earned: i.level >= 10, icon: "Medal", progress: pct(i.level, 10) },
    { id: "level_25", name: "Legend", description: "Reach Level 25", earned: i.level >= 25, icon: "Trophy", progress: pct(i.level, 25) },
  ];
}

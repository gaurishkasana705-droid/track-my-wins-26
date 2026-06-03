export type Badge = {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  icon: string; // lucide icon name
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

export function computeXP({ studyMin, workoutCount, goalsDone, streak, habitsHit }: {
  studyMin: number; workoutCount: number; goalsDone: number; streak: number; habitsHit: number;
}) {
  return Math.round(studyMin * 1 + workoutCount * 20 + goalsDone * 50 + streak * 10 + habitsHit * 5);
}

export function computeBadges({
  studyMin, workoutCount, goalsDone, streak, sessionsCount,
}: {
  studyMin: number; workoutCount: number; goalsDone: number; streak: number; sessionsCount: number;
}): Badge[] {
  return [
    { id: "first_step", name: "First Step", description: "Log your first activity", earned: sessionsCount > 0 || workoutCount > 0, icon: "Sparkles" },
    { id: "week_warrior", name: "Week Warrior", description: "7-day activity streak", earned: streak >= 7, icon: "Flame" },
    { id: "month_master", name: "Month Master", description: "30-day streak", earned: streak >= 30, icon: "Trophy" },
    { id: "scholar", name: "Scholar", description: "10 hours of study", earned: studyMin >= 600, icon: "BookOpen" },
    { id: "deep_focus", name: "Deep Focus", description: "50 hours of study", earned: studyMin >= 3000, icon: "GraduationCap" },
    { id: "athlete", name: "Athlete", description: "10 workouts logged", earned: workoutCount >= 10, icon: "Dumbbell" },
    { id: "iron", name: "Iron Discipline", description: "50 workouts logged", earned: workoutCount >= 50, icon: "Medal" },
    { id: "achiever", name: "Achiever", description: "Complete 3 goals", earned: goalsDone >= 3, icon: "Target" },
    { id: "centurion", name: "Centurion", description: "100 logged sessions", earned: sessionsCount >= 100, icon: "Award" },
  ];
}

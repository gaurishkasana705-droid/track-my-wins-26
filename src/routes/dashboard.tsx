import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Dumbbell, Target, Flame, CalendarDays, Sparkles } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { usePreferences } from "@/hooks/use-preferences";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatRing } from "@/components/ui/stat-ring";
import { formatMinutes, isoDate, daysAgo } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Dashboard">
        <DashboardView />
      </AppShell>
    </ProtectedRoute>
  ),
});

const STUDY_DAILY_TARGET = 120; // 2h
const WORKOUT_WEEKLY_TARGET = 5;

function DashboardView() {
  const { user } = useAuth();
  const { prefs } = usePreferences();
  const uid = user!.id;
  const vis = prefs.widget_visibility;

  const { data } = useQuery({
    queryKey: ["dashboard", uid],
    queryFn: async () => {
      const since7 = isoDate(daysAgo(6));
      const since30 = isoDate(daysAgo(29));
      const today = isoDate(new Date());

      const [study, workouts, goals] = await Promise.all([
        supabase.from("study_sessions").select("duration_minutes, subject, session_date").gte("session_date", since30),
        supabase.from("workouts").select("duration_minutes, workout_type, workout_date").gte("workout_date", since30),
        supabase.from("goals").select("id, title, progress, completed, deadline").order("created_at", { ascending: false }),
      ]);

      return {
        study: study.data ?? [],
        workouts: workouts.data ?? [],
        goals: goals.data ?? [],
        today, since7,
      };
    },
  });

  const study = data?.study ?? [];
  const workouts = data?.workouts ?? [];
  const goals = data?.goals ?? [];

  const todayStudy = study.filter((s) => s.session_date === data?.today).reduce((a, b) => a + b.duration_minutes, 0);
  const weekStudy = study.filter((s) => s.session_date >= (data?.since7 ?? "")).reduce((a, b) => a + b.duration_minutes, 0);
  const monthStudy = study.reduce((a, b) => a + b.duration_minutes, 0);

  const weekWorkouts = workouts.filter((w) => w.workout_date >= (data?.since7 ?? "")).length;

  const activeGoals = goals.filter((g) => !g.completed).length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const avgProgress = goals.length ? Math.round(goals.reduce((a, b) => a + b.progress, 0) / goals.length) : 0;

  // streak: consecutive days with any activity
  const allDates = new Set([...study.map((s) => s.session_date), ...workouts.map((w) => w.workout_date)]);
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    if (allDates.has(isoDate(daysAgo(i)))) streak++;
    else if (i > 0) break;
  }

  const chart = Array.from({ length: 7 }).map((_, i) => {
    const d = isoDate(daysAgo(6 - i));
    const label = new Date(d).toLocaleDateString(undefined, { weekday: "short" });
    return {
      day: label,
      study: study.filter((s) => s.session_date === d).reduce((a, b) => a + b.duration_minutes, 0) / 60,
      workout: workouts.filter((w) => w.workout_date === d).reduce((a, b) => a + b.duration_minutes, 0) / 60,
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome back<span className="text-gradient">.</span>
        </h2>
      </div>

      {vis.stats !== false && <StatsRow
        style={prefs.progress_style}
        studyToday={todayStudy}
        studyTarget={STUDY_DAILY_TARGET}
        weekWorkouts={weekWorkouts}
        workoutTarget={WORKOUT_WEEKLY_TARGET}
        avgGoal={avgProgress}
        activeGoals={activeGoals}
        completedGoals={completedGoals}
        weekStudy={weekStudy}
      />}

      <div className="grid gap-4 lg:grid-cols-3">
        {vis.chart !== false && (
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" />Last 7 days</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <defs>
                    <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.19 258)" stopOpacity={1} />
                      <stop offset="100%" stopColor="oklch(0.72 0.17 250)" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="workoutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.68 0.17 155)" stopOpacity={1} />
                      <stop offset="100%" stopColor="oklch(0.78 0.15 150)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => `${v.toFixed(1)}h`}
                  />
                  <Bar dataKey="study" fill="url(#studyGrad)" radius={[8, 8, 0, 0]} name="Study" />
                  <Bar dataKey="workout" fill="url(#workoutGrad)" radius={[8, 8, 0, 0]} name="Workout" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {vis.streak !== false && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Flame className="h-4 w-4 text-warning" />Streak & summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-glow">
                <p className="text-xs uppercase tracking-wider opacity-80">Current streak</p>
                <p className="mt-1 font-display text-4xl font-bold">{streak}<span className="text-xl opacity-80"> days</span></p>
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-sm ${i < streak ? "bg-primary-foreground/90" : "bg-primary-foreground/20"}`} />
                  ))}
                </div>
              </div>
              <SummaryRow label="Study (30d)" value={formatMinutes(monthStudy)} />
              <SummaryRow label="Workouts (30d)" value={String(workouts.length)} />
              <SummaryRow label="Completed goals" value={`${completedGoals}/${goals.length}`} />
            </CardContent>
          </Card>
        )}
      </div>

      {vis.goals !== false && goals.filter((g) => !g.completed).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />Active goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.filter((g) => !g.completed).slice(0, 4).map((g) => (
              <div key={g.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-muted-foreground tabular-nums">{g.progress}%</span>
                </div>
                <Progress value={g.progress} className="h-2.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatsRow({
  style, studyToday, studyTarget, weekWorkouts, workoutTarget, avgGoal,
  activeGoals, completedGoals, weekStudy,
}: {
  style: "ring" | "bar" | "card";
  studyToday: number; studyTarget: number;
  weekWorkouts: number; workoutTarget: number;
  avgGoal: number; activeGoals: number; completedGoals: number; weekStudy: number;
}) {
  if (style === "ring") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <RingCard icon={BookOpen} label="Study today" value={studyToday} max={studyTarget} display={formatMinutes(studyToday)} sub={`of ${formatMinutes(studyTarget)}`} />
        <RingCard icon={Dumbbell} label="Workouts (week)" value={weekWorkouts} max={workoutTarget} display={`${weekWorkouts}/${workoutTarget}`} sub="this week" />
        <RingCard icon={Target} label="Avg. goal progress" value={avgGoal} max={100} display={`${avgGoal}%`} sub={`${completedGoals} done`} />
      </div>
    );
  }
  if (style === "bar") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <BarCard icon={BookOpen} label="Study today" value={studyToday} max={studyTarget} display={formatMinutes(studyToday)} />
        <BarCard icon={Dumbbell} label="Workouts (week)" value={weekWorkouts} max={workoutTarget} display={`${weekWorkouts}/${workoutTarget}`} />
        <BarCard icon={Target} label="Avg. goal progress" value={avgGoal} max={100} display={`${avgGoal}%`} />
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SimpleCard icon={BookOpen} label="Study today" value={formatMinutes(studyToday)} hint={`${formatMinutes(weekStudy)} / week`} />
      <SimpleCard icon={Dumbbell} label="Workouts week" value={String(weekWorkouts)} hint={`target ${workoutTarget}`} />
      <SimpleCard icon={Target} label="Active goals" value={String(activeGoals)} hint={`${completedGoals} done`} />
      <SimpleCard icon={Flame} label="Avg progress" value={`${avgGoal}%`} hint="All goals" />
    </div>
  );
}

function RingCard({ icon: Icon, label, value, max, display, sub }: { icon: React.ElementType; label: string; value: number; max: number; display: string; sub: string }) {
  return (
    <Card className="hover-lift">
      <CardContent className="flex flex-col items-center gap-3 pt-6">
        <div className="flex w-full items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" /></div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
        <StatRing value={value} max={max} size={140} label={display} sub={sub} />
      </CardContent>
    </Card>
  );
}

function BarCard({ icon: Icon, label, value, max, display }: { icon: React.ElementType; label: string; value: number; max: number; display: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <Card className="hover-lift">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Icon className="h-4 w-4" /></div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        </div>
        <p className="mt-4 font-display text-3xl font-bold">{display}</p>
        <Progress value={pct} className="mt-3 h-2.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">{pct}% of target</p>
      </CardContent>
    </Card>
  );
}

function SimpleCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint: string }) {
  return (
    <Card className="hover-lift">
      <CardContent className="pt-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Icon className="h-4 w-4" /></div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

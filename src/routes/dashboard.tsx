import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Dumbbell, Target, TrendingUp, Flame, CalendarDays } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

function DashboardView() {
  const { user } = useAuth();
  const uid = user!.id;

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

  const todayWorkouts = workouts.filter((w) => w.workout_date === data?.today).length;
  const weekWorkouts = workouts.filter((w) => w.workout_date >= (data?.since7 ?? "")).length;

  const activeGoals = goals.filter((g) => !g.completed).length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const avgProgress = goals.length ? Math.round(goals.reduce((a, b) => a + b.progress, 0) / goals.length) : 0;

  // 7-day chart data
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
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Today's progress</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Study today" value={formatMinutes(todayStudy)} hint={`${formatMinutes(weekStudy)} this week`} />
        <StatCard icon={Dumbbell} label="Workouts today" value={String(todayWorkouts)} hint={`${weekWorkouts} this week`} />
        <StatCard icon={Target} label="Active goals" value={String(activeGoals)} hint={`${completedGoals} completed`} />
        <StatCard icon={TrendingUp} label="Avg. goal progress" value={`${avgProgress}%`} hint="All goals" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" />Last 7 days (hours)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 250)" vertical={false} />
                <XAxis dataKey="day" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => `${v.toFixed(1)}h`}
                />
                <Bar dataKey="study" fill="oklch(0.62 0.19 258)" radius={[6, 6, 0, 0]} name="Study" />
                <Bar dataKey="workout" fill="oklch(0.68 0.17 155)" radius={[6, 6, 0, 0]} name="Workout" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Flame className="h-4 w-4 text-warning" />Monthly summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow label="Study (30d)" value={formatMinutes(monthStudy)} />
            <SummaryRow label="Workouts (30d)" value={String(workouts.length)} />
            <SummaryRow label="Total goals" value={String(goals.length)} />
            <div className="pt-2">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Goal completion</span>
                <span className="font-medium">{goals.length ? Math.round((completedGoals / goals.length) * 100) : 0}%</span>
              </div>
              <Progress value={goals.length ? (completedGoals / goals.length) * 100 : 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      {goals.filter((g) => !g.completed).slice(0, 3).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Active goals</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {goals.filter((g) => !g.completed).slice(0, 3).map((g) => (
              <div key={g.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-muted-foreground">{g.progress}%</span>
                </div>
                <Progress value={g.progress} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <Card className="transition-all hover:shadow-elegant">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, TrendingDown, Trophy, AlertTriangle, Lightbulb, Activity, Minus } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatRing } from "@/components/ui/stat-ring";
import { computeInsights } from "@/lib/insights";
import { daysAgo, isoDate, formatMinutes } from "@/lib/format";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "Insights — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Insights">
        <InsightsView />
      </AppShell>
    </ProtectedRoute>
  ),
});

function InsightsView() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["insights", user!.id],
    queryFn: async () => {
      const since = isoDate(daysAgo(13));
      const [study, workouts, trackers, entries] = await Promise.all([
        supabase.from("study_sessions").select("session_date, duration_minutes").gte("session_date", since),
        supabase.from("workouts").select("workout_date, duration_minutes").gte("workout_date", since),
        supabase.from("custom_trackers").select("id, name, tracker_type, target_value"),
        supabase.from("custom_tracker_entries").select("entry_date, tracker_id, value").gte("entry_date", since),
      ]);
      return computeInsights(
        study.data ?? [],
        workouts.data ?? [],
        trackers.data ?? [],
        entries.data ?? [],
      );
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Analyzing your week…</p>;

  const trendIcon = data.disciplineDelta > 0 ? TrendingUp : data.disciplineDelta < 0 ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendClass = data.disciplineDelta > 0 ? "text-success" : data.disciplineDelta < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Weekly reality check</p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          How was your week<span className="text-gradient">?</span>
        </h2>
      </div>

      {/* Discipline score */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Discipline Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-6">
            <StatRing value={data.disciplineScore} max={100} size={160} stroke={12} label={`${data.disciplineScore}`} sub="out of 100" />
            <div className={`flex items-center gap-1.5 text-sm font-medium ${trendClass}`}>
              <TrendIcon className="h-4 w-4" />
              {data.disciplineDelta > 0 ? "+" : ""}{data.disciplineDelta} vs last week
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Smart insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.insights.map((line, i) => (
              <div key={i} className="flex gap-3 rounded-xl border bg-secondary/30 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed">{line}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Discipline breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What goes into your discipline score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Study consistency", value: data.breakdown.study, weight: data.breakdown.weights.study, hint: "Days you studied this week" },
            { label: "Workout consistency", value: data.breakdown.workout, weight: data.breakdown.weights.workout, hint: "Days you trained (target 4/wk)" },
            { label: "Habit completion", value: data.breakdown.habit, weight: data.breakdown.weights.habit, hint: "Custom trackers hit vs target" },
            { label: "Volume vs target", value: data.breakdown.volume, weight: data.breakdown.weights.volume, hint: "Total study minutes and workouts" },
          ].map((r) => (
            <div key={r.label} className="rounded-xl border bg-secondary/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">{r.value}% · weight {r.weight}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.hint}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${r.value}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Productivity patterns */}
      {data.patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />Productivity patterns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.patterns.map((p, i) => (
              <div key={i} className="flex gap-3 rounded-xl border bg-card p-3 text-sm leading-relaxed">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary text-primary text-[10px] font-bold">{i + 1}</span>
                {p}
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      {/* Reality check */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-success">
              <Trophy className="h-3.5 w-3.5" /> Biggest win
            </div>
            <p className="mt-2 font-display text-lg font-semibold">{data.biggestWin}</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> Biggest weakness
            </div>
            <p className="mt-2 font-display text-lg font-semibold">{data.biggestWeakness}</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
              <Lightbulb className="h-3.5 w-3.5" /> Recommendation
            </div>
            <p className="mt-2 text-sm leading-relaxed">{data.recommendation}</p>
          </CardContent>
        </Card>
      </div>

      {/* This vs last week */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This week vs last week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Compare label="Study time" current={formatMinutes(data.thisWeek.studyMinutes)} prev={formatMinutes(data.lastWeek.studyMinutes)} delta={data.thisWeek.studyMinutes - data.lastWeek.studyMinutes} unit="m" />
            <Compare label="Study days" current={`${data.thisWeek.studyDays}/7`} prev={`${data.lastWeek.studyDays}/7`} delta={data.thisWeek.studyDays - data.lastWeek.studyDays} />
            <Compare label="Workouts" current={String(data.thisWeek.workoutCount)} prev={String(data.lastWeek.workoutCount)} delta={data.thisWeek.workoutCount - data.lastWeek.workoutCount} />
            <Compare label="Habit rate" current={`${Math.round(data.thisWeek.habitCompletionRate * 100)}%`} prev={`${Math.round(data.lastWeek.habitCompletionRate * 100)}%`} delta={Math.round((data.thisWeek.habitCompletionRate - data.lastWeek.habitCompletionRate) * 100)} unit="%" />
          </div>
          <div className="mt-6 rounded-xl border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Consistency score</p>
            <p className="mt-1 font-display text-2xl font-bold">{data.consistencyScore}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Average of study, workout, and habit consistency this week.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Compare({ label, current, prev, delta, unit = "" }: { label: string; current: string; prev: string; delta: number; unit?: string }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls = delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{current}</p>
      <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${cls}`}>
        <Icon className="h-3 w-3" />
        {delta > 0 ? "+" : ""}{delta}{unit} from {prev}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, Activity, Minus, ChevronDown, ArrowRight } from "lucide-react";
import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatRing } from "@/components/ui/stat-ring";
import { computeInsights } from "@/lib/insights";
import { daysAgo, isoDate, formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["insights", user!.id],
    queryFn: async () => {
      const since = isoDate(daysAgo(13));
      const [study, workouts, trackers, entries] = await Promise.all([
        db.from("study_sessions").select("session_date, duration_minutes").gte("session_date", since),
        db.from("workouts").select("workout_date, duration_minutes").gte("workout_date", since),
        db.from("custom_trackers").select("id, name, tracker_type, target_value"),
        db.from("custom_tracker_entries").select("entry_date, tracker_id, value").gte("entry_date", since),
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

  const TrendIcon = data.disciplineDelta > 0 ? TrendingUp : data.disciplineDelta < 0 ? TrendingDown : Minus;
  const trendClass = data.disciplineDelta > 0 ? "text-success" : data.disciplineDelta < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Weekly check-in</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">How was your week?</h2>
      </div>

      {/* Hero insight — the one thing to know */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-aurora p-6 text-primary-foreground shadow-elegant sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <p className="text-xs uppercase tracking-[0.2em] opacity-80">This week's insight</p>
        <p className="mt-2 font-display text-2xl font-bold leading-snug sm:text-3xl">
          {data.insights[0] ?? "Steady week. Small steps compound."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            <Activity className="h-3 w-3" /> Discipline {data.disciplineScore}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur")}>
            <TrendIcon className="h-3 w-3" />{data.disciplineDelta > 0 ? "+" : ""}{data.disciplineDelta} vs last week
          </span>
        </div>
      </div>

      {/* Key stats — three at a glance */}
      <div className="grid grid-cols-3 gap-3">
        <KeyStat label="Discipline" value={`${data.disciplineScore}`} sub="out of 100" />
        <KeyStat label="Study" value={formatMinutes(data.thisWeek.studyMinutes)} sub={`${data.thisWeek.studyDays}/7 days`} />
        <KeyStat label="Workouts" value={`${data.thisWeek.workoutCount}`} sub="this week" />
      </div>

      {/* One recommended action */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-primary">Try this next</p>
              <p className="mt-1 font-medium leading-snug">{data.recommendation}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/dashboard">
              Start now <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* See more breakdown */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border bg-card py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? "Hide details" : "See breakdown"}
        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6">
              <StatRing value={data.disciplineScore} max={100} size={140} stroke={11} label={`${data.disciplineScore}`} sub="discipline" />
              <div className={`flex items-center gap-1.5 text-sm font-medium ${trendClass}`}>
                <TrendIcon className="h-4 w-4" />
                {data.disciplineDelta > 0 ? "+" : ""}{data.disciplineDelta} vs last week
              </div>
            </CardContent>
          </Card>

          {data.insights.length > 1 && (
            <Card>
              <CardContent className="space-y-2.5 pt-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> More insights
                </div>
                {data.insights.slice(1).map((line, i) => (
                  <p key={i} className="rounded-xl border bg-secondary/30 p-3 text-sm leading-relaxed">{line}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">This vs last week</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Compare label="Study time" current={formatMinutes(data.thisWeek.studyMinutes)} delta={data.thisWeek.studyMinutes - data.lastWeek.studyMinutes} unit="m" />
                <Compare label="Study days" current={`${data.thisWeek.studyDays}/7`} delta={data.thisWeek.studyDays - data.lastWeek.studyDays} />
                <Compare label="Workouts" current={String(data.thisWeek.workoutCount)} delta={data.thisWeek.workoutCount - data.lastWeek.workoutCount} />
                <Compare label="Habit rate" current={`${Math.round(data.thisWeek.habitCompletionRate * 100)}%`} delta={Math.round((data.thisWeek.habitCompletionRate - data.lastWeek.habitCompletionRate) * 100)} unit="%" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function KeyStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Compare({ label, current, delta, unit = "" }: { label: string; current: string; delta: number; unit?: string }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls = delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">{current}</p>
      <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${cls}`}>
        <Icon className="h-3 w-3" />
        {delta > 0 ? "+" : ""}{delta}{unit}
      </div>
    </div>
  );
}

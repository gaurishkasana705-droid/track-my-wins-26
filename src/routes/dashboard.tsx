import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Dumbbell, Target, Flame, CalendarDays, Activity, GripVertical, MoreVertical, RotateCcw, Pencil, Check, ArrowRight, Brain, ListChecks } from "lucide-react";
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { usePreferences, DEFAULT_LAYOUT, type WidgetShape, type WidgetSize } from "@/hooks/use-preferences";
import { db } from "@/lib/db";
import { Progress } from "@/components/ui/progress";
import { StatRing } from "@/components/ui/stat-ring";

import { formatMinutes, isoDate, daysAgo } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { computeInsights } from "@/lib/insights";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WelcomeHero } from "@/components/welcome-hero";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const STUDY_DAILY_TARGET = 120;
const WORKOUT_WEEKLY_TARGET = 5;

const WIDGET_LABELS: Record<string, string> = {
  welcome: "Welcome",
  todayFocus: "Today's focus",
  focusTime: "Focus time",
  todayInsight: "Today's insight",
  quickProgress: "Quick progress",
  stats: "Summary stats",
  chart: "7-day chart",
  upcomingGoals: "Upcoming goals",
  recentActivity: "Recent activity",
  streak: "Streak",
  goals: "Active goals",
  discipline: "Discipline breakdown",
  dailySummary: "Daily summary",
};

const SHAPE_OPTIONS: { value: WidgetShape; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "rectangle", label: "Rectangle" },
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
];
const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

const SHAPE_CLASSES: Record<WidgetShape, string> = {
  rounded: "rounded-3xl",
  rectangle: "rounded-md",
  square: "rounded-2xl",
  circle: "rounded-full",
};
const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "col-span-6 sm:col-span-3 md:col-span-2",
  md: "col-span-6 md:col-span-3",
  lg: "col-span-6",
};

function defaultShape(_key: string): WidgetShape {
  return "rounded";
}
function defaultSize(key: string): WidgetSize {
  if (key === "welcome" || key === "chart" || key === "goals" || key === "discipline" || key === "todayFocus") return "lg";
  if (key === "todayInsight" || key === "recentActivity" || key === "upcomingGoals" || key === "dailySummary") return "lg";
  if (key === "focusTime" || key === "quickProgress") return "md";
  return "md";
}

function DashboardView() {
  const { user } = useAuth();
  const { prefs, setPrefs, loading: prefsLoading } = usePreferences();
  const uid = user!.id;
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();

  // First-time user: route to onboarding wizard.
  useEffect(() => {
    if (!prefsLoading && !prefs.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [prefsLoading, prefs.onboarding_completed, navigate]);

  const { data } = useQuery({
    queryKey: ["dashboard", uid],
    queryFn: async () => {
      const since14 = isoDate(daysAgo(13));
      const since30 = isoDate(daysAgo(29));
      const today = isoDate(new Date());
      const since7 = isoDate(daysAgo(6));

      const [study, workouts, goals, trackers, entries, focus] = await Promise.all([
        db.from("study_sessions").select("duration_minutes, subject, session_date, created_at").gte("session_date", since30),
        db.from("workouts").select("duration_minutes, workout_type, workout_date, created_at").gte("workout_date", since30),
        db.from("goals").select("id, title, progress, completed, deadline, created_at").order("created_at", { ascending: false }),
        db.from("custom_trackers").select("id, name, tracker_type, target_value"),
        db.from("custom_tracker_entries").select("entry_date, tracker_id, value").gte("entry_date", since14),
        db.from("focus_sessions").select("duration_minutes, session_date, label, created_at").gte("session_date", since30),
      ]);

      return {
        study: study.data ?? [],
        workouts: workouts.data ?? [],
        goals: goals.data ?? [],
        trackers: trackers.data ?? [],
        entries: entries.data ?? [],
        focus: focus.data ?? [],
        today, since7,
      };
    },
  });

  const study = data?.study ?? [];
  const workouts = data?.workouts ?? [];
  const goals = data?.goals ?? [];
  const focus = data?.focus ?? [];

  const todayStudy = study.filter((s) => s.session_date === data?.today).reduce((a, b) => a + b.duration_minutes, 0);
  const weekStudy = study.filter((s) => s.session_date >= (data?.since7 ?? "")).reduce((a, b) => a + b.duration_minutes, 0);
  const monthStudy = study.reduce((a, b) => a + b.duration_minutes, 0);
  const weekWorkouts = workouts.filter((w) => w.workout_date >= (data?.since7 ?? "")).length;
  const activeGoals = goals.filter((g) => !g.completed).length;
  const completedGoals = goals.filter((g) => g.completed).length;
  const avgProgress = goals.length ? Math.round(goals.reduce((a, b) => a + b.progress, 0) / goals.length) : 0;

  const allDates = new Set([...study.map((s) => s.session_date), ...workouts.map((w) => w.workout_date)]);
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    if (allDates.has(isoDate(daysAgo(i)))) streak++;
    else if (i > 0) break;
  }

  const todayFocus = focus.filter((f) => f.session_date === data?.today).reduce((a, b) => a + b.duration_minutes, 0);
  const weekFocus = focus.filter((f) => f.session_date >= (data?.since7 ?? "")).reduce((a, b) => a + b.duration_minutes, 0);
  const monthFocus = focus.reduce((a, b) => a + b.duration_minutes, 0);

  const chart = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
    const d = isoDate(daysAgo(6 - i));
    const label = new Date(d).toLocaleDateString(undefined, { weekday: "short" });
    return {
      day: label,
      study: study.filter((s) => s.session_date === d).reduce((a, b) => a + b.duration_minutes, 0) / 60,
      workout: workouts.filter((w) => w.workout_date === d).reduce((a, b) => a + b.duration_minutes, 0) / 60,
    };
  }), [study, workouts]);

  // Recent activity feed (last 10 events across study/workout/focus/goals)
  type Event = { kind: "study" | "workout" | "focus" | "goal"; title: string; meta: string; at: string };
  const recent: Event[] = useMemo(() => {
    const ev: Event[] = [];
    for (const s of study) ev.push({ kind: "study", title: s.subject || "Study", meta: formatMinutes(s.duration_minutes), at: s.created_at ?? s.session_date });
    for (const w of workouts) ev.push({ kind: "workout", title: w.workout_type, meta: formatMinutes(w.duration_minutes), at: w.created_at ?? w.workout_date });
    for (const f of focus) ev.push({ kind: "focus", title: f.label || "Focus session", meta: formatMinutes(f.duration_minutes), at: f.created_at ?? f.session_date });
    for (const g of goals.filter((g) => g.completed)) ev.push({ kind: "goal", title: g.title, meta: "Completed", at: g.created_at ?? "" });
    return ev.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  }, [study, workouts, focus, goals]);

  const insights = useMemo(() => computeInsights(
    study.map((s) => ({ session_date: s.session_date, duration_minutes: s.duration_minutes })),
    workouts.map((w) => ({ workout_date: w.workout_date, duration_minutes: w.duration_minutes })),
    data?.trackers ?? [],
    data?.entries ?? [],
  ), [study, workouts, data?.trackers, data?.entries]);

  // Visible widgets in saved order; missing keys fall back to defaults.
  const layout = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of prefs.dashboard_layout) {
      if (prefs.widget_visibility[k] !== false && !seen.has(k) && WIDGET_LABELS[k]) {
        out.push(k); seen.add(k);
      }
    }
    for (const k of DEFAULT_LAYOUT) {
      if (!seen.has(k) && prefs.widget_visibility[k] !== false) {
        out.push(k); seen.add(k);
      }
    }
    return out;
  }, [prefs.dashboard_layout, prefs.widget_visibility]);

  const sensors = useSensors(
    // Desktop: small drag distance threshold. Mobile gets TouchSensor below.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Long-press to drag on touch devices — prevents accidental drags while scrolling.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = layout.indexOf(String(e.active.id));
    const newIdx = layout.indexOf(String(e.over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(layout, oldIdx, newIdx);
    // merge with hidden widgets at the end so they're preserved
    const hidden = prefs.dashboard_layout.filter((k) => !next.includes(k));
    setPrefs({ dashboard_layout: [...next, ...hidden] });
  };

  const move = (key: string, dir: -1 | 1) => {
    const idx = layout.indexOf(key);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= layout.length) return;
    const next = arrayMove(layout, idx, to);
    const hidden = prefs.dashboard_layout.filter((k) => !next.includes(k));
    setPrefs({ dashboard_layout: [...next, ...hidden] });
  };

  const setShape = (key: string, shape: WidgetShape) =>
    setPrefs({ widget_shapes: { ...prefs.widget_shapes, [key]: shape } });
  const setSize = (key: string, size: WidgetSize) =>
    setPrefs({ widget_sizes: { ...prefs.widget_sizes, [key]: size } });
  const hide = (key: string) =>
    setPrefs({ widget_visibility: { ...prefs.widget_visibility, [key]: false } });

  const resetLayout = () => {
    setPrefs({
      dashboard_layout: DEFAULT_LAYOUT,
      widget_shapes: {},
      widget_sizes: {},
      widget_visibility: { welcome: true, todayFocus: true, focusTime: true, todayInsight: true, quickProgress: true, stats: true, chart: true, upcomingGoals: true, recentActivity: true, goals: true, streak: true, discipline: true, dailySummary: true, customTrackers: true },
    });
    toast.success("Layout reset to default");
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your day</p>
        <div className="flex items-center gap-2">
          {editMode && (
            <Button variant="ghost" size="sm" onClick={resetLayout}><RotateCcw className="mr-1.5 h-4 w-4" />Reset</Button>
          )}
          <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode((v) => !v)}>
            {editMode ? <><Check className="mr-1.5 h-4 w-4" />Done</> : <><Pencil className="mr-1.5 h-4 w-4" />Edit layout</>}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={layout} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-6 gap-4">
            {layout.map((key) => {
              const shape = prefs.widget_shapes[key] ?? defaultShape(key);
              const size = prefs.widget_sizes[key] ?? defaultSize(key);
              return (
                <SortableWidget
                  key={key}
                  id={key}
                  shape={shape}
                  size={size}
                  editMode={editMode}
                  onMoveUp={() => move(key, -1)}
                  onMoveDown={() => move(key, 1)}
                  onShape={(s) => setShape(key, s)}
                  onSize={(s) => setSize(key, s)}
                  onHide={() => hide(key)}
                >
                  <RenderWidget
                    widget={key}
                    shape={shape}
                    streak={streak}
                    studyToday={todayStudy}
                    weekStudy={weekStudy}
                    monthStudy={monthStudy}
                    weekWorkouts={weekWorkouts}
                    workoutsTotal={workouts.length}
                    activeGoals={activeGoals}
                    completedGoals={completedGoals}
                    avgProgress={avgProgress}
                    goals={goals}
                    chart={chart}
                    insights={insights}
                    todayFocus={todayFocus}
                    weekFocus={weekFocus}
                    monthFocus={monthFocus}
                    recent={recent}
                  />
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {editMode && (
        <div className="rounded-2xl border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
          Drag widgets to reorder. Use the menu to change shape, size, or hide. Toggle widgets back in Settings.
        </div>
      )}
    </div>
  );
}

// ───────────── Sortable wrapper ─────────────

function SortableWidget({
  id, shape, size, editMode, children,
  onMoveUp, onMoveDown, onShape, onSize, onHide,
}: {
  id: string; shape: WidgetShape; size: WidgetSize; editMode: boolean;
  children: React.ReactNode;
  onMoveUp: () => void; onMoveDown: () => void;
  onShape: (s: WidgetShape) => void; onSize: (s: WidgetSize) => void; onHide: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editMode });
  const round = shape === "circle" || shape === "square";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        SIZE_CLASSES[size],
        "min-w-0",
        isDragging && "z-10 opacity-80",
      )}
    >
      <div
        className={cn(
          "group relative h-full overflow-hidden border bg-card text-card-foreground shadow-card transition-all",
          SHAPE_CLASSES[shape],
          round && "aspect-square",
          !editMode && "hover:shadow-elegant",
          editMode && "ring-2 ring-primary/30",
        )}
      >
        {editMode && (
          <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
            <button
              {...attributes}
              {...listeners}
              aria-label="Drag"
              className="grid h-7 w-7 cursor-grab place-items-center rounded-md bg-background/80 text-muted-foreground shadow-card hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Widget options" className="grid h-7 w-7 place-items-center rounded-md bg-background/80 text-muted-foreground shadow-card hover:text-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">Move</DropdownMenuLabel>
                <DropdownMenuItem onClick={onMoveUp}>Move up</DropdownMenuItem>
                <DropdownMenuItem onClick={onMoveDown}>Move down</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Shape</DropdownMenuLabel>
                {SHAPE_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => onShape(s.value)}>
                    {s.label}{shape === s.value && " ✓"}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Size</DropdownMenuLabel>
                {SIZE_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => onSize(s.value)}>
                    {s.label}{size === s.value && " ✓"}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onHide} className="text-destructive">Hide widget</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div className={cn("h-full w-full", round ? "grid place-items-center p-4 text-center" : "p-5")}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ───────────── Widget bodies ─────────────

type RecentEvent = { kind: "study" | "workout" | "focus" | "goal"; title: string; meta: string; at: string };
type RenderProps = {
  widget: string;
  shape: WidgetShape;
  streak: number;
  studyToday: number; weekStudy: number; monthStudy: number;
  weekWorkouts: number; workoutsTotal: number;
  activeGoals: number; completedGoals: number; avgProgress: number;
  goals: Array<{ id: string; title: string; progress: number; completed: boolean; deadline?: string | null }>;
  chart: Array<{ day: string; study: number; workout: number }>;
  insights: ReturnType<typeof computeInsights>;
  todayFocus: number; weekFocus: number; monthFocus: number;
  recent: RecentEvent[];
};

function RenderWidget(p: RenderProps) {
  const compact = p.shape === "circle" || p.shape === "square";
  switch (p.widget) {
    case "welcome":
      return (
        <div className="-m-5">
          <WelcomeHero
            streak={p.streak}
            disciplineScore={p.insights.disciplineScore}
            disciplineDelta={p.insights.disciplineDelta}
            insight={p.insights.insights[0] ?? "Steady steps. Make today count."}
            consistencyScore={p.insights.consistencyScore}
          />
        </div>
      );
    case "todayFocus": {
      const active = p.goals.filter((g) => !g.completed);
      const withDeadline = active.filter((g) => g.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
      const focus = withDeadline[0] ?? active[0];
      if (!focus) {
        return (
          <Link to="/goals" className="block h-full">
            <Header icon={Target} label="Today's focus" />
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 text-center">
              <p className="text-sm font-medium">No goal to focus on</p>
              <p className="text-xs text-muted-foreground">Tap to add your first goal</p>
            </div>
          </Link>
        );
      }
      return (
        <Link to="/goals" className="block h-full">
          <div className="flex items-center justify-between">
            <Header icon={Target} label="Today's focus" />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 rounded-2xl bg-gradient-aurora p-5 text-primary-foreground shadow-glow">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Most important</p>
            <p className="mt-1.5 font-display text-2xl font-bold leading-tight line-clamp-2">{focus.title}</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="opacity-90">{focus.progress}% complete</span>
              {focus.deadline && <span className="opacity-90">Due {new Date(focus.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${focus.progress}%` }} />
            </div>
          </div>
        </Link>
      );
    }
    case "chart":
      if (compact) return (
        <StatRing value={p.weekStudy} max={STUDY_DAILY_TARGET * 7} size={140} label={`${Math.round(p.weekStudy / 60)}h`} sub="this week" />
      );
      return (
        <div className="h-full">
          <Header icon={CalendarDays} label="Last 7 days" />
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.chart}>
                <defs>
                  <linearGradient id="dStudy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.19 258)" />
                    <stop offset="100%" stopColor="oklch(0.72 0.17 250)" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="dWk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.17 155)" />
                    <stop offset="100%" stopColor="oklch(0.78 0.15 150)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} className="text-muted-foreground" />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `${v.toFixed(1)}h`} />
                <Bar dataKey="study" fill="url(#dStudy)" radius={[6, 6, 0, 0]} name="Study" />
                <Bar dataKey="workout" fill="url(#dWk)" radius={[6, 6, 0, 0]} name="Workout" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    case "streak":
      if (compact) return (
        <div className="grid place-items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"><Flame className="h-6 w-6" /></div>
          <p className="mt-2 font-display text-3xl font-bold">{p.streak}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">day streak</p>
        </div>
      );
      return (
        <div>
          <Header icon={Flame} label="Streak & summary" iconClass="text-warning" />
          <div className="mt-4 rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-glow">
            <p className="text-xs uppercase tracking-wider opacity-80">Current streak</p>
            <p className="mt-1 font-display text-3xl font-bold">{p.streak}<span className="text-base opacity-80"> days</span></p>
            <div className="mt-3 flex gap-0.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-sm ${i < p.streak ? "bg-primary-foreground/90" : "bg-primary-foreground/20"}`} />
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Study (30d)" value={formatMinutes(p.monthStudy)} />
            <Row label="Workouts (30d)" value={String(p.workoutsTotal)} />
            <Row label="Goals done" value={`${p.completedGoals}`} />
          </div>
        </div>
      );
    case "goals":
      if (compact) return (
        <StatRing value={p.avgProgress} max={100} size={140} label={`${p.avgProgress}%`} sub="goal avg" />
      );
      return (
        <div>
          <Header icon={Target} label="Active goals" />
          <div className="mt-4 space-y-3">
            {p.goals.filter((g) => !g.completed).slice(0, 4).map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{g.title}</span>
                  <span className="tabular-nums text-muted-foreground">{g.progress}%</span>
                </div>
                <Progress value={g.progress} className="h-2" />
              </div>
            ))}
            {p.goals.filter((g) => !g.completed).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No active goals. Add one to get going.</p>
            )}
          </div>
        </div>
      );
    case "discipline": {
      const b = p.insights.breakdown;
      if (compact) return (
        <StatRing value={p.insights.disciplineScore} max={100} size={140} label={`${p.insights.disciplineScore}`} sub="discipline" />
      );
      return (
        <div>
          <Header icon={Activity} label="Discipline breakdown" />
          <div className="mt-3 flex items-center gap-5">
            <StatRing value={p.insights.disciplineScore} max={100} size={104} stroke={9} label={`${p.insights.disciplineScore}`} sub="score" />
            <div className="flex-1 space-y-2">
              <BreakRow label="Study consistency" value={b.study} weight={b.weights.study} />
              <BreakRow label="Workout consistency" value={b.workout} weight={b.weights.workout} />
              <BreakRow label="Habit completion" value={b.habit} weight={b.weights.habit} />
              <BreakRow label="Volume vs target" value={b.volume} weight={b.weights.volume} />
            </div>
          </div>
        </div>
      );
    }
    case "focusTime":
      if (compact) return (
        <StatRing value={p.todayFocus} max={120} size={140} label={formatMinutes(p.todayFocus)} sub="focus today" />
      );
      return (
        <Link to="/focus" className="block h-full">
          <div className="flex items-center justify-between">
            <Header icon={Brain} label="Focus time" />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <FocusStat label="Today" value={formatMinutes(p.todayFocus)} accent />
            <FocusStat label="Week" value={formatMinutes(p.weekFocus)} />
            <FocusStat label="30d" value={formatMinutes(p.monthFocus)} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center">Tap to start a focus session</p>
        </Link>
      );
    case "quickProgress":
      if (compact) return (
        <StatRing value={p.insights.consistencyScore} max={100} size={140} label={`${p.insights.consistencyScore}%`} sub="consistency" />
      );
      return (
        <div>
          <Header icon={TrendingUp} label="Quick progress" />
          <div className="mt-4 space-y-3">
            <ProgressRow label="Study (today)" value={p.studyToday} max={STUDY_DAILY_TARGET} display={formatMinutes(p.studyToday)} />
            <ProgressRow label="Workouts (week)" value={p.weekWorkouts} max={WORKOUT_WEEKLY_TARGET} display={`${p.weekWorkouts}/${WORKOUT_WEEKLY_TARGET}`} />
            <ProgressRow label="Focus (today)" value={p.todayFocus} max={120} display={formatMinutes(p.todayFocus)} />
            <ProgressRow label="Goals avg" value={p.avgProgress} max={100} display={`${p.avgProgress}%`} />
          </div>
        </div>
      );
    case "upcomingGoals": {
      const upcoming = [...p.goals.filter((g) => !g.completed && g.deadline)]
        .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
        .slice(0, 4);
      return (
        <Link to="/goals" className="block h-full">
          <div className="flex items-center justify-between">
            <Header icon={CalendarDays} label="Upcoming goals" />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 rounded-2xl border-2 border-dashed py-6 text-center text-xs text-muted-foreground">
              No goals with deadlines yet
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map((g) => {
                const days = Math.ceil((new Date(g.deadline!).getTime() - Date.now()) / 86400000);
                return (
                  <li key={g.id} className="flex items-center justify-between gap-3 rounded-xl border bg-secondary/30 px-3 py-2">
                    <span className="truncate text-sm font-medium">{g.title}</span>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      days < 0 ? "bg-destructive/15 text-destructive" :
                      days <= 3 ? "bg-warning/15 text-warning" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {days < 0 ? `${-days}d late` : days === 0 ? "today" : `${days}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Link>
      );
    }
    case "recentActivity":
      return (
        <div>
          <Header icon={Activity} label="Recent activity" />
          {p.recent.length === 0 ? (
            <p className="mt-4 rounded-2xl border-2 border-dashed py-6 text-center text-xs text-muted-foreground">
              No activity yet — log something to start your streak
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {p.recent.slice(0, 6).map((e, i) => {
                const Icon = e.kind === "study" ? BookOpen : e.kind === "workout" ? Dumbbell : e.kind === "focus" ? Brain : Target;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="text-[11px] text-muted-foreground">{e.kind} · {e.meta}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
    case "dailySummary":
      return (
        <div>
          <Header icon={ListChecks} label="Today" />
          <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryTile icon={BookOpen} label="Study" value={formatMinutes(p.studyToday)} />
            <SummaryTile icon={Brain} label="Focus" value={formatMinutes(p.todayFocus)} />
            <SummaryTile icon={Dumbbell} label="Week" value={`${p.weekWorkouts} workouts`} />
            <SummaryTile icon={Flame} label="Streak" value={`${p.streak} days`} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function ProgressRow({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{display}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function FocusStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3", accent ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary/40")}>
      <p className="font-display text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className={cn("mt-1 text-[10px] uppercase tracking-wider", accent ? "opacity-80" : "text-muted-foreground")}>{label}</p>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 font-display text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Header({ icon: Icon, label, iconClass = "text-primary" }: { icon: React.ElementType; label: string; iconClass?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Icon className={cn("h-4 w-4", iconClass)} /> {label}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium tabular-nums">{value}</span></div>;
}
function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-secondary/40 p-3">
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-card text-primary"><Icon className="h-3.5 w-3.5" /></div>
      <p className="mt-2 font-display text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
function BreakRow({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}% · {weight}wt</span>
      </div>
      <Progress value={value} className="mt-1 h-1.5" />
    </div>
  );
}

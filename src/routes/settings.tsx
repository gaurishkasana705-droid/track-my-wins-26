import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferences, type FontFamily, type ThemeMode, type ProgressStyle } from "@/hooks/use-preferences";
import {
  Palette, Type, LayoutGrid, Eye, RotateCcw, Sun, Moon,
  Sparkles, Brain, Lightbulb, ListChecks, Activity, BarChart3,
  Flame, Target, PieChart, CalendarDays, TrendingUp, Zap, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ElementType } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Settings">
        <SettingsView />
      </AppShell>
    </ProtectedRoute>
  ),
});

type WidgetMeta = {
  key: string;
  label: string;
  desc: string;
  icon: ElementType;
  accent: string; // tailwind gradient classes
};

type WidgetGroup = { title: string; items: WidgetMeta[] };

const WIDGET_GROUPS: WidgetGroup[] = [
  {
    title: "Overview",
    items: [
      { key: "welcome", label: "Welcome", desc: "Greeting, streak & consistency", icon: Sparkles, accent: "from-slate-400 to-slate-500" },
      { key: "dailySummary", label: "Daily summary", desc: "Today at a glance", icon: CalendarDays, accent: "from-slate-400 to-slate-500" },
      { key: "todayFocus", label: "Today's focus", desc: "What matters right now", icon: Brain, accent: "from-slate-400 to-slate-500" },
    ],
  },
  {
    title: "Progress",
    items: [
      { key: "chart", label: "7-day chart", desc: "Hours over the last week", icon: TrendingUp, accent: "from-slate-400 to-slate-500" },
      { key: "streak", label: "Streak", desc: "Consecutive active days", icon: Flame, accent: "from-slate-400 to-slate-500" },
    ],
  },
  {
    title: "Planning",
    items: [
      { key: "goals", label: "Active goals", desc: "Live goal progress", icon: Target, accent: "from-slate-400 to-slate-500" },
      { key: "upcomingGoals", label: "Upcoming goals", desc: "Next deadlines", icon: CalendarDays, accent: "from-slate-400 to-slate-500" },
    ],
  },
  {
    title: "Activity",
    items: [
      { key: "focusTime", label: "Focus time", desc: "Deep work minutes", icon: Zap, accent: "from-slate-400 to-slate-500" },
      { key: "recentActivity", label: "Recent activity", desc: "Latest logged events", icon: Activity, accent: "from-slate-400 to-slate-500" },
      { key: "customTrackers", label: "Custom trackers", desc: "Your habits & metrics", icon: ListChecks, accent: "from-slate-400 to-slate-500" },
    ],
  },
];


const ALL_WIDGET_KEYS = WIDGET_GROUPS.flatMap((g) => g.items.map((i) => i.key));

function SettingsView() {
  const { prefs, setPrefs } = usePreferences();

  const enabledCount = ALL_WIDGET_KEYS.filter((k) => prefs.widget_visibility?.[k] !== false).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Customize</h2>
        <p className="mt-1 text-sm text-muted-foreground">Make LifeTrack look and feel like yours.</p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-primary" />Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {([
              { v: "light", label: "Light", icon: Sun },
              { v: "dark", label: "Dark", icon: Moon },
            ] as const).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setPrefs({ theme: v as ThemeMode })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all hover-lift",
                  prefs.theme === v ? "border-primary bg-secondary shadow-glow" : "border-border bg-card",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Type className="h-4 w-4 text-primary" />Typography</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Font family</Label>
            <Select value={prefs.font_family} onValueChange={(v) => setPrefs({ font_family: v as FontFamily })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="space-grotesk">Space Grotesk (default)</SelectItem>
                <SelectItem value="inter">Inter</SelectItem>
                <SelectItem value="manrope">Manrope</SelectItem>
                <SelectItem value="dm-sans">DM Sans</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Font size</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{Math.round(prefs.font_scale * 100)}%</span>
            </div>
            <Slider
              value={[prefs.font_scale * 100]}
              min={85} max={120} step={5}
              onValueChange={(v) => setPrefs({ font_scale: v[0] / 100 })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dashboard style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><LayoutGrid className="h-4 w-4 text-primary" />Dashboard style</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {([
              { v: "ring", label: "Rings" },
              { v: "bar", label: "Bars" },
              { v: "card", label: "Cards" },
            ] as const).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setPrefs({ progress_style: v as ProgressStyle })}
                className={cn(
                  "rounded-2xl border-2 p-4 text-sm font-medium transition-all hover-lift",
                  prefs.progress_style === v ? "border-primary bg-secondary shadow-glow" : "border-border bg-card",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Widgets — visual picker */}
      <Card>
        <CardHeader className="pb-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-primary" />Widgets</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap a card to show or hide it on your dashboard.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold tabular-nums text-secondary-foreground">
              {enabledCount}/{ALL_WIDGET_KEYS.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {WIDGET_GROUPS.map((group) => (
            <section key={group.title} className="space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.items.map((w) => {
                  const enabled = prefs.widget_visibility?.[w.key] !== false;
                  return (
                    <WidgetCard
                      key={w.key}
                      meta={w}
                      enabled={enabled}
                      onToggle={() =>
                        setPrefs({
                          widget_visibility: { ...prefs.widget_visibility, [w.key]: !enabled },
                        })
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </CardContent>
      </Card>

      {/* Reset */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={() =>
              setPrefs({
                theme: "light",
                font_family: "space-grotesk",
                font_scale: 1,
                progress_style: "ring",
                widget_visibility: Object.fromEntries(ALL_WIDGET_KEYS.map((k) => [k, true])),
                widget_shapes: {},
                widget_sizes: {},
                dashboard_layout: [
                  "welcome", "todayFocus", "focusTime", "todayInsight", "quickProgress",
                  "stats", "chart", "upcomingGoals", "recentActivity", "streak",
                  "goals", "discipline", "dailySummary",
                ],
              })
            }
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />Reset to defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function WidgetCard({
  meta,
  enabled,
  onToggle,
}: {
  meta: WidgetMeta;
  enabled: boolean;
  onToggle: () => void;
}) {
  const { icon: Icon, label, desc, accent } = meta;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={cn(
        "group relative flex h-full flex-col items-start gap-3 overflow-hidden rounded-2xl border-2 bg-card p-3 text-left transition-all hover-lift",
        enabled
          ? "border-primary/70 shadow-glow"
          : "border-border opacity-70 hover:opacity-100",
      )}
    >
      {/* future drag handle affordance (visual only for now) */}
      <span
        aria-hidden
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md bg-background/70 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      {/* preview tile */}
      <div
        className={cn(
          "relative grid h-16 w-full place-items-center overflow-hidden rounded-xl bg-gradient-to-br text-white",
          accent,
          !enabled && "grayscale",
        )}
      >
        <Icon className="h-6 w-6 drop-shadow" />
        <span className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/20 blur-xl" />
      </div>

      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold">{label}</p>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{desc}</p>
      </div>

      <div className="mt-auto flex w-full items-center justify-between pt-1">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            enabled ? "text-primary" : "text-muted-foreground",
          )}
        >
          {enabled ? "On" : "Off"}
        </span>
        {/* Non-interactive switch — the whole card toggles */}
        <Switch checked={enabled} tabIndex={-1} className="pointer-events-none" />
      </div>
    </button>
  );
}

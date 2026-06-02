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
import { Palette, Type, LayoutGrid, Eye, RotateCcw, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

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

const WIDGETS = [
  { key: "stats", label: "Summary stats" },
  { key: "chart", label: "7-day chart" },
  { key: "streak", label: "Streak panel" },
  { key: "goals", label: "Active goals" },
  { key: "customTrackers", label: "Custom trackers" },
];

function SettingsView() {
  const { prefs, setPrefs } = usePreferences();

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Customize</h2>
        <p className="mt-1 text-sm text-muted-foreground">Make LifeTrack look and feel like yours.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-primary" />Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {([
              { v: "light", label: "Light", icon: Sun },
              { v: "dark", label: "Dark", icon: Moon },
              { v: "system", label: "System", icon: Monitor },
            ] as const).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setPrefs({ theme: v as ThemeMode })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all hover-lift",
                  prefs.theme === v ? "border-primary bg-secondary shadow-glow" : "border-border bg-card"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
                  prefs.progress_style === v ? "border-primary bg-secondary shadow-glow" : "border-border bg-card"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4 text-primary" />Widgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {WIDGETS.map((w) => (
            <div key={w.key} className="flex items-center justify-between rounded-xl border bg-card p-3">
              <span className="text-sm font-medium">{w.label}</span>
              <Switch
                checked={prefs.widget_visibility?.[w.key] !== false}
                onCheckedChange={(c) => setPrefs({ widget_visibility: { ...prefs.widget_visibility, [w.key]: c } })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button variant="outline" onClick={() => setPrefs({
            theme: "system", font_family: "space-grotesk", font_scale: 1, progress_style: "ring",
            widget_visibility: { stats: true, chart: true, goals: true, streak: true, customTrackers: true },
          })}>
            <RotateCcw className="mr-1.5 h-4 w-4" />Reset to defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

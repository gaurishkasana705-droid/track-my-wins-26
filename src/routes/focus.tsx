import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RotateCcw, Coffee, Brain, Plus, Minus, Trash2 } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMinutes, isoDate, daysAgo } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/focus")({
  head: () => ({ meta: [{ title: "Focus Timer — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Focus Timer">
        <FocusView />
      </AppShell>
    </ProtectedRoute>
  ),
});

type Mode = "focus" | "break";

function FocusView() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>("focus");
  const [targetMin, setTargetMin] = useState(25);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [label, setLabel] = useState("");
  const startedAtRef = useRef<number | null>(null);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!running) setRemaining(targetMin * 60);
  }, [targetMin, mode, running]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const logSession = async (minutes: number) => {
    if (minutes < 1 || mode !== "focus") return;
    const { error } = await db.from("focus_sessions").insert({
      user_id: uid,
      duration_minutes: minutes,
      session_date: isoDate(new Date()),
      label: label.trim() || null,
      mode,
    });
    if (error) return toast.error(error.message);
    toast.success(`Logged ${minutes}m of focus`);
    qc.invalidateQueries({ queryKey: ["focus"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  // auto-log when timer completes
  useEffect(() => {
    if (running && remaining === 0 && !loggedRef.current) {
      loggedRef.current = true;
      setRunning(false);
      if (mode === "focus") {
        void logSession(targetMin);
        // vibrate on mobile
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
      } else {
        toast.success("Break complete — back to focus");
      }
    }
  }, [remaining, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (remaining === 0) setRemaining(targetMin * 60);
    startedAtRef.current = Date.now();
    loggedRef.current = false;
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setRemaining(targetMin * 60);
    loggedRef.current = false;
  };
  const stopAndLog = () => {
    const elapsed = targetMin * 60 - remaining;
    const minutes = Math.round(elapsed / 60);
    setRunning(false);
    reset();
    if (minutes >= 1) void logSession(minutes);
    else toast.info("Less than a minute — not logged");
  };

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const pct = 1 - remaining / (targetMin * 60);

  const { data: sessions = [] } = useQuery({
    queryKey: ["focus", uid],
    queryFn: async () => {
      const since = isoDate(daysAgo(29));
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .gte("session_date", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = isoDate(new Date());
  const since7 = isoDate(daysAgo(6));
  const todayMin = sessions.filter((s) => s.session_date === today).reduce((a, b) => a + b.duration_minutes, 0);
  const weekMin = sessions.filter((s) => s.session_date >= since7).reduce((a, b) => a + b.duration_minutes, 0);
  const monthMin = sessions.reduce((a, b) => a + b.duration_minutes, 0);

  const removeSession = async (id: string) => {
    const { error } = await db.from("focus_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["focus"] });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Deep work</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Focus timer</h2>
      </div>

      {/* Timer */}
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          {/* Mode toggle */}
          <div className="mx-auto mb-6 grid w-full max-w-xs grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-sm">
            <button
              onClick={() => { if (!running) { setMode("focus"); setTargetMin(25); } }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-full py-1.5 font-medium transition-all",
                mode === "focus" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              )}
            >
              <Brain className="h-3.5 w-3.5" /> Focus
            </button>
            <button
              onClick={() => { if (!running) { setMode("break"); setTargetMin(5); } }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-full py-1.5 font-medium transition-all",
                mode === "break" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              )}
            >
              <Coffee className="h-3.5 w-3.5" /> Break
            </button>
          </div>

          {/* Ring */}
          <div className="mx-auto grid place-items-center" style={{ width: 260, height: 260 }}>
            <Ring pct={pct} mode={mode}>
              <p className="font-display text-6xl font-bold tabular-nums tracking-tight">
                {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {mode === "focus" ? "Focus" : "Break"}
              </p>
            </Ring>
          </div>

          {/* Duration adjust */}
          {!running && (
            <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setTargetMin((m) => Math.max(1, m - 5))}>
                <Minus className="h-4 w-4" />
              </Button>
              <div className="min-w-[100px] text-center">
                <p className="font-display text-2xl font-bold tabular-nums">{targetMin} min</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">duration</p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setTargetMin((m) => Math.min(180, m + 5))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Label */}
          {mode === "focus" && !running && (
            <div className="mx-auto mt-4 max-w-xs">
              <Input
                placeholder="What are you focusing on? (optional)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
              />
            </div>
          )}

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {!running ? (
              <Button size="lg" onClick={start} className="shadow-glow">
                <Play className="mr-1.5 h-4 w-4" /> Start
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={pause}>
                <Pause className="mr-1.5 h-4 w-4" /> Pause
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={reset}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
            {(running || remaining < targetMin * 60) && mode === "focus" && (
              <Button size="lg" variant="ghost" onClick={stopAndLog}>
                Stop & log
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Today" value={formatMinutes(todayMin)} />
        <Stat label="This week" value={formatMinutes(weekMin)} />
        <Stat label="Last 30 days" value={formatMinutes(monthMin)} />
      </div>

      {/* History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No focus sessions yet — start one above.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.slice(0, 12).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.label || (s.mode === "focus" ? "Focus session" : "Break")}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.session_date).toLocaleDateString()} · {formatMinutes(s.duration_minutes)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSession(s.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Ring({ pct, mode, children }: { pct: number; mode: Mode; children: React.ReactNode }) {
  const size = 260;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-secondary)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={mode === "focus" ? "url(#focusGrad)" : "url(#breakGrad)"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.62 0.19 258)" />
            <stop offset="100%" stopColor="oklch(0.72 0.17 200)" />
          </linearGradient>
          <linearGradient id="breakGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.15 155)" />
            <stop offset="100%" stopColor="oklch(0.78 0.13 180)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

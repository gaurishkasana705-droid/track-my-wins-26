import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Dumbbell, Clock, Flame, Play, Pause, Square } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMinutes, isoDate, daysAgo } from "@/lib/format";
import { toast } from "sonner";

const WORKOUT_TYPES = ["Strength", "Running", "Cycling", "Yoga", "Swimming", "HIIT", "Walking", "Other"];

export const Route = createFileRoute("/workouts")({
  head: () => ({ meta: [{ title: "Workout Tracker — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Workout Tracker">
        <WorkoutsView />
      </AppShell>
    </ProtectedRoute>
  ),
});

function WorkoutsView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts", user!.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("workouts")
        .select("*")
        .order("workout_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["workouts"] });

  const total = workouts.length;
  const totalMin = workouts.reduce((a, b) => a + b.duration_minutes, 0);
  const week = workouts.filter((w) => w.workout_date >= isoDate(daysAgo(6))).length;

  const byType = workouts.reduce<Record<string, number>>((acc, w) => {
    acc[w.workout_type] = (acc[w.workout_type] ?? 0) + 1;
    return acc;
  }, {});
  const typeList = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  const handleDelete = async (id: string) => {
    const { error } = await db.from("workouts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Workout deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Workouts</h2>
          <p className="text-sm text-muted-foreground">Log every session, build the habit.</p>
        </div>
        <AddWorkoutDialog open={open} onOpenChange={setOpen} userId={user!.id} onAdded={refresh} />
      </div>

      <WorkoutStopwatch userId={user!.id} onLogged={refresh} />

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat icon={Dumbbell} label="Total workouts" value={String(total)} />
        <MiniStat icon={Clock} label="Total time" value={formatMinutes(totalMin)} />
        <MiniStat icon={Flame} label="This week" value={String(week)} />
      </div>

      {typeList.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">By type</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {typeList.map(([type, count]) => (
              <span key={type} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                {type} <span className="text-muted-foreground">· {count}</span>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No workouts logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {workouts.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{w.workout_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.workout_date).toLocaleDateString()} · {formatMinutes(w.duration_minutes)}
                      {w.notes && ` · ${w.notes}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)} aria-label="Delete">
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

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddWorkoutDialog({ open, onOpenChange, userId, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onAdded: () => void }) {
  const [type, setType] = useState("Strength");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(duration, 10);
    if (!mins || mins <= 0) return toast.error("Enter a valid duration.");
    setLoading(true);
    const { error } = await db.from("workouts").insert({
      user_id: userId, workout_type: type, duration_minutes: mins, workout_date: date, notes: notes.trim() || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Workout logged");
    setDuration(""); setNotes(""); setDate(isoDate(new Date()));
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-elegant"><Plus className="mr-1.5 h-4 w-4" />Log workout</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New workout</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKOUT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? "Saving..." : "Save workout"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutStopwatch({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [type, setType] = useState("Strength");
  const [notes, setNotes] = useState("");
  const startedAt = useRef<number | null>(null);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(baseRef.current + Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  const start = () => { startedAt.current = Date.now(); baseRef.current = elapsed; setRunning(true); };
  const pause = () => { setRunning(false); };
  const reset = () => { setRunning(false); setElapsed(0); baseRef.current = 0; };

  const stop = async () => {
    setRunning(false);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    const { error } = await db.from("workouts").insert({
      user_id: userId, workout_type: type, duration_minutes: minutes,
      workout_date: isoDate(new Date()), notes: notes.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Logged ${minutes}m ${type}`);
    reset(); setNotes("");
    onLogged();
  };

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Workout timer</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <p className="font-display text-5xl font-bold tabular-nums tracking-tight">
            {h > 0 && `${String(h).padStart(2, "0")}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!running ? (
              <Button onClick={start} className="shadow-glow"><Play className="mr-1.5 h-4 w-4" />Start</Button>
            ) : (
              <Button onClick={pause} variant="secondary"><Pause className="mr-1.5 h-4 w-4" />Pause</Button>
            )}
            <Button onClick={stop} variant="outline" disabled={elapsed < 30}>
              <Square className="mr-1.5 h-4 w-4" />Stop & log
            </Button>
            {elapsed > 0 && !running && (
              <Button onClick={reset} variant="ghost">Reset</Button>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Quick note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}


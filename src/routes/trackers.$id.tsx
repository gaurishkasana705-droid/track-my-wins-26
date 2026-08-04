import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { StatRing } from "@/components/ui/stat-ring";
import { downloadCsv } from "@/lib/csv";
import { isoDate } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Download, RotateCcw, Target, Repeat, Clock, Hash, TrendingUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ICONS: Record<string, React.ElementType> = { Target, Repeat, Clock, Hash, TrendingUp };

export const Route = createFileRoute("/trackers/$id")({
  head: () => ({ meta: [{ title: "Tracker — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Tracker">
        <TrackerDetail />
      </AppShell>
    </ProtectedRoute>
  ),
});

function TrackerDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const { data: tracker } = useQuery({
    queryKey: ["tracker", id],
    queryFn: async () => {
      const { data, error } = await db.from("custom_trackers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["tracker-entries", id],
    queryFn: async () => {
      const { data, error } = await db.from("custom_tracker_entries").select("*").eq("tracker_id", id)
        .order("entry_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!tracker) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const Icon = ICONS[tracker.icon] ?? Target;

  const today = isoDate(new Date());
  const todayValue = entries.filter((e) => e.entry_date === today).reduce((a, b) => a + Number(b.value), 0);
  const total = entries.reduce((a, b) => a + Number(b.value), 0);
  const target = tracker.target_value ? Number(tracker.target_value) : 0;

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(value);
    if (isNaN(v)) return toast.error("Enter a number");
    const { error } = await db.from("custom_tracker_entries").insert({
      tracker_id: id, user_id: user!.id, value: v, entry_date: today,
    });
    if (error) return toast.error(error.message);
    setValue("");
    toast.success("Entry added");
    qc.invalidateQueries({ queryKey: ["tracker-entries", id] });
  };

  const removeEntry = async (entryId: string) => {
    const { error } = await db.from("custom_tracker_entries").delete().eq("id", entryId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tracker-entries", id] });
  };

  const resetAll = async () => {
    const { error } = await db.from("custom_tracker_entries").delete().eq("tracker_id", id);
    if (error) return toast.error(error.message);
    toast.success("Tracker reset");
    qc.invalidateQueries({ queryKey: ["tracker-entries", id] });
  };

  const deleteTracker = async () => {
    const { error } = await db.from("custom_trackers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tracker deleted");
    navigate({ to: "/trackers" });
  };

  const exportData = () => {
    downloadCsv(`${tracker.name.replace(/\s+/g, "_")}.csv`, entries.map((e) => ({
      date: e.entry_date, value: e.value, note: e.note ?? "",
    })));
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/trackers" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />All trackers
      </Button>

      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-3xl font-bold tracking-tight">{tracker.name}</h2>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {tracker.tracker_type}{tracker.unit ? ` · ${tracker.unit}` : ""}{target ? ` · target ${target}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover-lift sm:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            {target > 0 ? (
              <StatRing value={todayValue} max={target} size={140} label={`${todayValue}`} sub={`of ${target}${tracker.unit ? " " + tracker.unit : ""}`} />
            ) : (
              <div className="py-4 text-center">
                <p className="font-display text-4xl font-bold">{todayValue}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">today</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="mt-1 font-display text-3xl font-bold">{total.toFixed(total % 1 === 0 ? 0 : 2)}{tracker.unit ? ` ${tracker.unit}` : ""}</p>
            <p className="mt-1 text-xs text-muted-foreground">{entries.length} entries</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Average / day</p>
            <p className="mt-1 font-display text-3xl font-bold">
              {(() => {
                const days = new Set(entries.map((e) => e.entry_date)).size || 1;
                return (total / days).toFixed(1);
              })()}
            </p>
            {target > 0 && <Progress value={Math.min(100, (todayValue / target) * 100)} className="mt-3 h-2" />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addEntry} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px] space-y-1.5">
              <Label htmlFor="v">Value{tracker.unit ? ` (${tracker.unit})` : ""}</Label>
              <Input id="v" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" required />
            </div>
            <Button type="submit"><Plus className="mr-1.5 h-4 w-4" />Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">History</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportData}><Download className="mr-1.5 h-3 w-3" />CSV</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm"><RotateCcw className="mr-1.5 h-3 w-3" />Reset</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset this tracker?</AlertDialogTitle>
                    <AlertDialogDescription>Deletes all entries. The tracker itself stays.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetAll}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="mr-1.5 h-3 w-3" />Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete tracker?</AlertDialogTitle>
                    <AlertDialogDescription>This deletes the tracker and all its entries permanently.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteTracker} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium tabular-nums">{Number(e.value)}{tracker.unit ? ` ${tracker.unit}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.entry_date).toLocaleDateString()}{e.note && ` · ${e.note}`}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeEntry(e.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

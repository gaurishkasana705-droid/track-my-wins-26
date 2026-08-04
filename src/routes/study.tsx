import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, BookOpen, Clock, TrendingUp } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMinutes, isoDate, daysAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/study")({
  head: () => ({ meta: [{ title: "Study Tracker — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Study Tracker">
        <StudyView />
      </AppShell>
    </ProtectedRoute>
  ),
});

function StudyView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["study", user!.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("study_sessions")
        .select("*")
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["study"] });

  const total = sessions.reduce((a, b) => a + b.duration_minutes, 0);
  const week = sessions.filter((s) => s.session_date >= isoDate(daysAgo(6))).reduce((a, b) => a + b.duration_minutes, 0);

  const bySubject = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.subject] = (acc[s.subject] ?? 0) + s.duration_minutes;
    return acc;
  }, {});
  const subjectList = Object.entries(bySubject).sort((a, b) => b[1] - a[1]);
  const maxSubject = subjectList[0]?.[1] ?? 1;

  const handleDelete = async (id: string) => {
    const { error } = await db.from("study_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Session deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Study sessions</h2>
          <p className="text-sm text-muted-foreground">Track focused work by subject.</p>
        </div>
        <AddSessionDialog open={open} onOpenChange={setOpen} userId={user!.id} onAdded={refresh} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat icon={Clock} label="Total time" value={formatMinutes(total)} />
        <MiniStat icon={TrendingUp} label="This week" value={formatMinutes(week)} />
        <MiniStat icon={BookOpen} label="Sessions" value={String(sessions.length)} />
      </div>

      {subjectList.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Time by subject</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {subjectList.map(([subject, mins]) => (
              <div key={subject}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{subject}</span>
                  <span className="text-muted-foreground">{formatMinutes(mins)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${(mins / maxSubject) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sessions yet. Add your first one!</p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.session_date).toLocaleDateString()} · {formatMinutes(s.duration_minutes)}
                      {s.notes && ` · ${s.notes}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} aria-label="Delete">
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

function AddSessionDialog({ open, onOpenChange, userId, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onAdded: () => void }) {
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(duration, 10);
    if (!subject.trim() || !mins || mins <= 0) return toast.error("Add subject and a valid duration.");
    setLoading(true);
    const { error } = await db.from("study_sessions").insert({
      user_id: userId, subject: subject.trim(), duration_minutes: mins, session_date: date, notes: notes.trim() || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Session added");
    setSubject(""); setDuration(""); setNotes(""); setDate(isoDate(new Date()));
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-elegant"><Plus className="mr-1.5 h-4 w-4" />Add session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New study session</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" required />
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
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? "Saving..." : "Save session"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

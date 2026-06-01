import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Check, Target, CheckCircle2, Calendar } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/goals")({
  head: () => ({ meta: [{ title: "Goals — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Goal Tracker">
        <GoalsView />
      </AppShell>
    </ProtectedRoute>
  ),
});

function GoalsView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("completed").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["goals"] });

  const updateProgress = async (id: string, progress: number) => {
    const completed = progress >= 100;
    const { error } = await supabase.from("goals").update({ progress, completed, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase.from("goals").update({ completed: !completed, progress: !completed ? 100 : 0, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!completed ? "Goal completed! 🎉" : "Marked active");
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const active = goals.filter((g) => !g.completed);
  const done = goals.filter((g) => g.completed);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Your goals</h2>
          <p className="text-sm text-muted-foreground">Set deadlines, track progress, celebrate wins.</p>
        </div>
        <AddGoalDialog open={open} onOpenChange={setOpen} userId={user!.id} onAdded={refresh} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat icon={Target} label="Active" value={String(active.length)} />
        <MiniStat icon={CheckCircle2} label="Completed" value={String(done.length)} />
        <MiniStat icon={Calendar} label="Total" value={String(goals.length)} />
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No goals yet. Create your first one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id} className={cn("transition-all hover:shadow-elegant", g.completed && "opacity-60")}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className={cn("text-base", g.completed && "line-through")}>{g.title}</CardTitle>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleComplete(g.id, g.completed)} aria-label="Toggle complete">
                      <Check className={cn("h-4 w-4", g.completed ? "text-success" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(g.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{g.progress}%</span>
                  </div>
                  <Progress value={g.progress} />
                </div>
                {!g.completed && (
                  <Slider value={[g.progress]} max={100} step={5} onValueChange={(v) => updateProgress(g.id, v[0])} />
                )}
                {g.deadline && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Due {new Date(g.deadline).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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

function AddGoalDialog({ open, onOpenChange, userId, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Add a title.");
    setLoading(true);
    const { error } = await supabase.from("goals").insert({
      user_id: userId, title: title.trim(), description: description.trim() || null, deadline: deadline || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Goal created");
    setTitle(""); setDescription(""); setDeadline("");
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-elegant"><Plus className="mr-1.5 h-4 w-4" />New goal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a new goal</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 12 books this year" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? "Saving..." : "Create goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

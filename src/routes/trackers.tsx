import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Target, Repeat, Clock, Hash, TrendingUp, ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trackers")({
  head: () => ({ meta: [{ title: "Custom Trackers — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Custom Trackers">
        <TrackersView />
      </AppShell>
    </ProtectedRoute>
  ),
});

const ICONS = { Target, Repeat, Clock, Hash, TrendingUp, ListChecks };
const TYPES = [
  { v: "habit", label: "Habit" },
  { v: "goal", label: "Goal" },
  { v: "time", label: "Time" },
  { v: "number", label: "Number" },
  { v: "progress", label: "Progress" },
];

function TrackersView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: trackers = [] } = useQuery({
    queryKey: ["trackers", user!.id],
    queryFn: async () => {
      const { data, error } = await db.from("custom_trackers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Build your own.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track anything — habits, water, books, screen time. Up to you.</p>
        </div>
        <NewTrackerDialog open={open} onOpenChange={setOpen} userId={user!.id} onCreated={() => qc.invalidateQueries({ queryKey: ["trackers"] })} />
      </div>

      {trackers.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <ListChecks className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No custom trackers yet.</p>
            <Button className="mt-4" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Create your first</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trackers.map((t) => {
            const Icon = (ICONS as Record<string, React.ElementType>)[t.icon] ?? Target;
            return (
              <Link key={t.id} to="/trackers/$id" params={{ id: t.id }}>
                <Card className="hover-lift h-full cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold">{t.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {t.tracker_type}{t.unit ? ` · ${t.unit}` : ""}{t.target_value ? ` · target ${t.target_value}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewTrackerDialog({ open, onOpenChange, userId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Target");
  const [type, setType] = useState("number");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Add a name.");
    setSaving(true);
    const { error } = await db.from("custom_trackers").insert({
      user_id: userId, name: name.trim(), icon, tracker_type: type,
      unit: unit.trim() || null, target_value: target ? Number(target) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tracker created");
    setName(""); setIcon("Target"); setType("number"); setUnit(""); setTarget("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-elegant"><Plus className="mr-1.5 h-4 w-4" />New tracker</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a tracker</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Water intake" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(ICONS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit (optional)</Label>
              <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="ml, pages, mins" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target (optional)</Label>
              <Input id="target" type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="2000" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? "Creating..." : "Create tracker"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

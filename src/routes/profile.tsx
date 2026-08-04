import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/avatar";
import { formatMinutes, isoDate, daysAgo } from "@/lib/format";
import { downloadJson } from "@/lib/csv";
import { Download, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — LifeTrack" },
      { name: "description", content: "Edit your LifeTrack profile and review your essential tracking stats." },
      { property: "og:title", content: "Profile — LifeTrack" },
      { property: "og:description", content: "Edit your LifeTrack profile and review your essential tracking stats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppShell title="Profile">
        <ProfileView />
      </AppShell>
    </ProtectedRoute>
  ),
});

function ProfileView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user!.id;

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data } = await db.from("profiles").select("*").eq("user_id", uid).maybeSingle();
      if (!data) {
        await db.from("profiles").insert({ user_id: uid });
        return null;
      }
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", uid],
    queryFn: async () => {
      const [s, w, g, focus] = await Promise.all([
        db.from("study_sessions").select("duration_minutes, session_date"),
        db.from("workouts").select("duration_minutes, workout_date"),
        db.from("goals").select("completed"),
        db.from("focus_sessions").select("duration_minutes, session_date"),
      ]);
      const studyRows = s.data ?? [];
      const workoutRows = w.data ?? [];
      const focusRows = focus.data ?? [];
      const allDates = new Set<string>([
        ...studyRows.map((r) => r.session_date),
        ...workoutRows.map((r) => r.workout_date),
        ...focusRows.map((r) => r.session_date),
      ]);
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        if (allDates.has(isoDate(daysAgo(i)))) streak++;
        else if (i > 0) break;
      }
      let best = 0, run = 0;
      for (let i = 364; i >= 0; i--) {
        if (allDates.has(isoDate(daysAgo(i)))) { run++; best = Math.max(best, run); } else run = 0;
      }
      return {
        studyMin: studyRows.reduce((a: number, b) => a + b.duration_minutes, 0),
        workoutCount: workoutRows.length,
        goalsDone: (g.data ?? []).filter((x) => x.completed).length,
        goalsTotal: (g.data ?? []).length,
        focusMin: focusRows.reduce((a: number, b) => a + b.duration_minutes, 0),
        streak,
        bestStreak: Math.max(best, streak),
      };
    },
  });

  const save = async () => {
    setSaving(true);
    const { error } = await db.from("profiles").upsert(
      { user_id: uid, display_name: displayName || null, avatar_url: avatarUrl || null, bio: bio || null },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    refetch();
  };

  const exportAll = async () => {
    const [s, w, g, t, e] = await Promise.all([
      db.from("study_sessions").select("*"),
      db.from("workouts").select("*"),
      db.from("goals").select("*"),
      db.from("custom_trackers").select("*"),
      db.from("custom_tracker_entries").select("*"),
    ]);
    downloadJson(`lifetrack-export-${new Date().toISOString().slice(0, 10)}.json`, {
      profile, study: s.data, workouts: w.data, goals: g.data, custom_trackers: t.data, custom_tracker_entries: e.data,
    });
    toast.success("Export ready");
  };

  const deleteAccount = async () => {
    await Promise.all([
      db.from("study_sessions").delete().eq("user_id", uid),
      db.from("workouts").delete().eq("user_id", uid),
      db.from("goals").delete().eq("user_id", uid),
      db.from("custom_tracker_entries").delete().eq("user_id", uid),
      db.from("custom_trackers").delete().eq("user_id", uid),
      db.from("focus_sessions").delete().eq("user_id", uid),
      db.from("profiles").delete().eq("user_id", uid),
      db.from("user_preferences").delete().eq("user_id", uid),
    ]);
    await db.auth.signOut();
    toast.success("Account data deleted");
    navigate({ to: "/", replace: true });
  };

  const name = displayName || user?.email?.split("@")[0] || "You";

  return (
    <div className="space-y-8">
      {/* Edit profile — first thing on the page */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Edit profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary font-display text-lg font-semibold">
                {initials(name, user?.email)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">{name}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar_url">Avatar URL (optional)</Label>
            <Input id="avatar_url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="What are you working toward?" />
          </div>
          <Button onClick={save} disabled={saving}><Save className="mr-1.5 h-4 w-4" />{saving ? "Saving..." : "Save changes"}</Button>
        </CardContent>
      </Card>

      {/* Essential stats only */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Your tracking</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border p-5 sm:grid-cols-3">
          <Stat label="Current streak" value={`${stats?.streak ?? 0} d`} />
          <Stat label="Best streak" value={`${stats?.bestStreak ?? 0} d`} />
          <Stat label="Focus time" value={formatMinutes(stats?.focusMin ?? 0)} />
          <Stat label="Study time" value={formatMinutes(stats?.studyMin ?? 0)} />
          <Stat label="Workouts" value={String(stats?.workoutCount ?? 0)} />
          <Stat label="Goals done" value={`${stats?.goalsDone ?? 0}/${stats?.goalsTotal ?? 0}`} />
        </div>
      </section>

      {/* Data */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Data</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportAll}><Download className="mr-1.5 h-4 w-4" />Export all data</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive"><Trash2 className="mr-1.5 h-4 w-4" />Delete account data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes all your trackers, sessions, goals, and preferences. You'll be signed out. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

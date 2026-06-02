import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/avatar";
import { formatMinutes } from "@/lib/format";
import { downloadJson } from "@/lib/csv";
import { Download, Trash2, BookOpen, Dumbbell, Target, Save } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — LifeTrack" }] }),
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
      const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
      if (!data) {
        await supabase.from("profiles").insert({ user_id: uid });
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
      const [s, w, g] = await Promise.all([
        supabase.from("study_sessions").select("duration_minutes"),
        supabase.from("workouts").select("duration_minutes"),
        supabase.from("goals").select("completed"),
      ]);
      return {
        studyMin: (s.data ?? []).reduce((a, b) => a + b.duration_minutes, 0),
        workoutCount: (w.data ?? []).length,
        workoutMin: (w.data ?? []).reduce((a, b) => a + b.duration_minutes, 0),
        goalsDone: (g.data ?? []).filter((x) => x.completed).length,
        goalsTotal: (g.data ?? []).length,
      };
    },
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
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
      supabase.from("study_sessions").select("*"),
      supabase.from("workouts").select("*"),
      supabase.from("goals").select("*"),
      supabase.from("custom_trackers").select("*"),
      supabase.from("custom_tracker_entries").select("*"),
    ]);
    downloadJson(`lifetrack-export-${new Date().toISOString().slice(0, 10)}.json`, {
      profile, study: s.data, workouts: w.data, goals: g.data, custom_trackers: t.data, custom_tracker_entries: e.data,
    });
    toast.success("Export ready");
  };

  const deleteAccount = async () => {
    // best-effort: delete user data then sign out (admin delete needs server fn)
    await Promise.all([
      supabase.from("study_sessions").delete().eq("user_id", uid),
      supabase.from("workouts").delete().eq("user_id", uid),
      supabase.from("goals").delete().eq("user_id", uid),
      supabase.from("custom_tracker_entries").delete().eq("user_id", uid),
      supabase.from("custom_trackers").delete().eq("user_id", uid),
      supabase.from("profiles").delete().eq("user_id", uid),
      supabase.from("user_preferences").delete().eq("user_id", uid),
    ]);
    await supabase.auth.signOut();
    toast.success("Account data deleted");
    navigate({ to: "/", replace: true });
  };

  const name = displayName || user?.email?.split("@")[0] || "You";

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-aurora" />
        <CardContent className="-mt-12 space-y-4 pt-0">
          <div className="flex items-end gap-4">
            <Avatar url={avatarUrl} name={name} email={user?.email} large />
            <div className="pb-2">
              <h2 className="font-display text-2xl font-bold">{name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={BookOpen} label="Total study" value={formatMinutes(stats?.studyMin ?? 0)} />
        <StatTile icon={Dumbbell} label="Workouts" value={`${stats?.workoutCount ?? 0} · ${formatMinutes(stats?.workoutMin ?? 0)}`} />
        <StatTile icon={Target} label="Goals done" value={`${stats?.goalsDone ?? 0}/${stats?.goalsTotal ?? 0}`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Edit profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell yourself what you're building toward." />
          </div>
          <Button onClick={save} disabled={saving}><Save className="mr-1.5 h-4 w-4" />{saving ? "Saving..." : "Save changes"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Data</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportAll}><Download className="mr-1.5 h-4 w-4" />Export all data</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="mr-1.5 h-4 w-4" />Delete account data</Button>
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
        </CardContent>
      </Card>
    </div>
  );
}

function Avatar({ url, name, email, large }: { url?: string; name?: string; email?: string | null; large?: boolean }) {
  const size = large ? "h-24 w-24 text-2xl" : "h-10 w-10 text-sm";
  if (url) return <img src={url} alt={name} className={`${size} rounded-full border-4 border-card object-cover shadow-card`} />;
  return (
    <div className={`${size} grid place-items-center rounded-full border-4 border-card bg-gradient-primary font-display font-bold text-primary-foreground shadow-card`}>
      {initials(name, email)}
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="hover-lift">
      <CardContent className="pt-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Icon className="h-4 w-4" /></div>
        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

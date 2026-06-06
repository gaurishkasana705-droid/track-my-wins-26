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
import { Progress } from "@/components/ui/progress";
import { initials } from "@/lib/avatar";
import { formatMinutes, isoDate, daysAgo } from "@/lib/format";
import { downloadJson } from "@/lib/csv";
import {
  Download, Trash2, BookOpen, Dumbbell, Target, Save, Flame,
  Sparkles, Trophy, GraduationCap, Medal, Award, Lock, Zap, Brain,
  Activity, TrendingUp, TrendingDown, Minus, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { computeBadges, computeLevel, computeXP, type Badge } from "@/lib/gamification";
import { computeInsights } from "@/lib/insights";
import { cn } from "@/lib/utils";

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

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, Flame, Trophy, BookOpen, GraduationCap, Dumbbell, Medal, Target, Award, Brain,
};

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
      const since14 = isoDate(daysAgo(13));
      const [s, w, g, entries, trackers, focus] = await Promise.all([
        supabase.from("study_sessions").select("duration_minutes, session_date"),
        supabase.from("workouts").select("duration_minutes, workout_date"),
        supabase.from("goals").select("completed"),
        supabase.from("custom_tracker_entries").select("entry_date, tracker_id, value").gte("entry_date", since14),
        supabase.from("custom_trackers").select("id, name, tracker_type, target_value"),
        supabase.from("focus_sessions").select("duration_minutes, session_date"),
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
      const insights = computeInsights(
        studyRows.map((r) => ({ session_date: r.session_date, duration_minutes: r.duration_minutes })),
        workoutRows.map((r) => ({ workout_date: r.workout_date, duration_minutes: r.duration_minutes })),
        trackers.data ?? [], entries.data ?? [],
      );
      return {
        studyMin: studyRows.reduce((a, b) => a + b.duration_minutes, 0),
        workoutCount: workoutRows.length,
        workoutMin: workoutRows.reduce((a, b) => a + b.duration_minutes, 0),
        goalsDone: (g.data ?? []).filter((x) => x.completed).length,
        goalsTotal: (g.data ?? []).length,
        sessionsCount: studyRows.length,
        habitsHit: (entries.data ?? []).filter((e) => Number(e.value) > 0).length,
        focusMin: focusRows.reduce((a, b) => a + b.duration_minutes, 0),
        focusCount: focusRows.length,
        streak,
        bestStreak: Math.max(best, streak),
        insights,
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
    await Promise.all([
      supabase.from("study_sessions").delete().eq("user_id", uid),
      supabase.from("workouts").delete().eq("user_id", uid),
      supabase.from("goals").delete().eq("user_id", uid),
      supabase.from("custom_tracker_entries").delete().eq("user_id", uid),
      supabase.from("custom_trackers").delete().eq("user_id", uid),
      supabase.from("focus_sessions").delete().eq("user_id", uid),
      supabase.from("profiles").delete().eq("user_id", uid),
      supabase.from("user_preferences").delete().eq("user_id", uid),
    ]);
    await supabase.auth.signOut();
    toast.success("Account data deleted");
    navigate({ to: "/", replace: true });
  };

  const name = displayName || user?.email?.split("@")[0] || "You";
  const xp = computeXP({
    studyMin: stats?.studyMin ?? 0,
    workoutCount: stats?.workoutCount ?? 0,
    goalsDone: stats?.goalsDone ?? 0,
    streak: stats?.streak ?? 0,
    habitsHit: stats?.habitsHit ?? 0,
    focusMin: stats?.focusMin ?? 0,
  });
  const level = computeLevel(xp);
  const badges = computeBadges({
    studyMin: stats?.studyMin ?? 0,
    workoutCount: stats?.workoutCount ?? 0,
    goalsDone: stats?.goalsDone ?? 0,
    streak: stats?.streak ?? 0,
    bestStreak: stats?.bestStreak ?? 0,
    sessionsCount: stats?.sessionsCount ?? 0,
    focusMin: stats?.focusMin ?? 0,
    focusCount: stats?.focusCount ?? 0,
    level: level.level,
  });
  const earned = badges.filter((b) => b.earned).length;
  const achievementPct = Math.round((earned / badges.length) * 100);
  const joined = (profile?.created_at || user?.created_at) ? new Date(profile?.created_at || user!.created_at) : null;

  const ins = stats?.insights;
  const trendIcon = (d: number) => d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  const trendClass = (d: number) => d > 0 ? "text-success" : d < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="relative h-32 bg-gradient-aurora">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.25),transparent_60%)]" />
        </div>
        <CardContent className="-mt-14 space-y-4 pt-0">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <Avatar url={avatarUrl} name={name} email={user?.email} large />
            <div className="flex-1 pb-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="font-display text-2xl font-bold">{name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-glow">
                  <Zap className="h-3 w-3" /> Lv {level.level}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {joined && <p className="mt-0.5 text-xs text-muted-foreground">Joined {joined.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm">
              <Flame className="h-4 w-4 text-warning" /><span className="font-bold tabular-nums">{stats?.streak ?? 0}</span><span className="text-xs text-muted-foreground">day streak</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium">{xp.toLocaleString()} XP</span>
              <span className="text-muted-foreground">{level.current}/{level.needed} to Lv {level.level + 1}</span>
            </div>
            <Progress value={level.pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Progress hub stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Activity} label="Discipline" value={`${ins?.disciplineScore ?? 0}`} hint="this week" />
        <StatTile icon={Flame} label="Best streak" value={`${stats?.bestStreak ?? 0}d`} hint={`current ${stats?.streak ?? 0}d`} />
        <StatTile icon={Brain} label="Total focus" value={formatMinutes(stats?.focusMin ?? 0)} hint={`${stats?.focusCount ?? 0} sessions`} />
        <StatTile icon={BookOpen} label="Total study" value={formatMinutes(stats?.studyMin ?? 0)} />
        <StatTile icon={Dumbbell} label="Workouts" value={`${stats?.workoutCount ?? 0}`} hint={formatMinutes(stats?.workoutMin ?? 0)} />
        <StatTile icon={Target} label="Goals done" value={`${stats?.goalsDone ?? 0}/${stats?.goalsTotal ?? 0}`} />
        <StatTile icon={Trophy} label="Achievements" value={`${earned}/${badges.length}`} hint={`${achievementPct}%`} />
        <StatTile icon={Zap} label="Total XP" value={xp.toLocaleString()} hint={`Lv ${level.level}`} />
      </div>

      {/* Weekly review */}
      {ins && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" />Weekly review</CardTitle>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", trendClass(ins.disciplineDelta))}>
                {(() => { const I = trendIcon(ins.disciplineDelta); return <I className="h-3 w-3" />; })()}
                {ins.disciplineDelta > 0 ? "+" : ""}{ins.disciplineDelta} discipline
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-2xl bg-gradient-aurora p-4 font-display text-base font-semibold leading-snug text-primary-foreground shadow-glow">
              {ins.insights[0] ?? "Quiet week — your next action sets the tone."}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReviewTile icon={Brain} label="Focus time" current={formatMinutes(ins.thisWeek.studyMinutes)} delta={ins.thisWeek.studyMinutes - ins.lastWeek.studyMinutes} unit="m" />
              <ReviewTile icon={Target} label="Study days" current={`${ins.thisWeek.studyDays}/7`} delta={ins.thisWeek.studyDays - ins.lastWeek.studyDays} />
              <ReviewTile icon={Dumbbell} label="Workouts" current={String(ins.thisWeek.workoutCount)} delta={ins.thisWeek.workoutCount - ins.lastWeek.workoutCount} />
              <ReviewTile icon={Activity} label="Habits" current={`${Math.round(ins.thisWeek.habitCompletionRate * 100)}%`} delta={Math.round((ins.thisWeek.habitCompletionRate - ins.lastWeek.habitCompletionRate) * 100)} unit="%" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" />Achievements</CardTitle>
            <span className="text-xs text-muted-foreground">{earned}/{badges.length} unlocked · {achievementPct}%</span>
          </div>
          <Progress value={achievementPct} className="mt-2 h-1.5" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((b) => <BadgeTile key={b.id} badge={b} />)}
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
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

function StatTile({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <Card className="hover-lift">
      <CardContent className="pt-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Icon className="h-4 w-4" /></div>
        <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-xl font-bold tabular-nums">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ReviewTile({ icon: Icon, label, current, delta, unit = "" }: { icon: React.ElementType; label: string; current: string; delta: number; unit?: string }) {
  const TrendI = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls = delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="rounded-2xl border bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />{label}
      </div>
      <p className="mt-1 font-display text-base font-bold tabular-nums">{current}</p>
      <div className={cn("mt-0.5 flex items-center gap-1 text-[11px] font-medium", cls)}>
        <TrendI className="h-3 w-3" />{delta > 0 ? "+" : ""}{delta}{unit}
      </div>
    </div>
  );
}

function BadgeTile({ badge }: { badge: Badge }) {
  const Icon = ICON_MAP[badge.icon] ?? Sparkles;
  return (
    <div
      title={`${badge.name}: ${badge.description}`}
      className={cn(
        "relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-3 text-center transition-all",
        badge.earned ? "bg-gradient-to-br from-secondary to-card shadow-card hover-lift" : "bg-card"
      )}
    >
      <div className={cn("grid h-11 w-11 place-items-center rounded-full", badge.earned ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground")}>
        {badge.earned ? <Icon className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
      </div>
      <p className={cn("text-[11px] font-semibold leading-tight", !badge.earned && "text-muted-foreground")}>{badge.name}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{badge.description}</p>
      {!badge.earned && typeof badge.progress === "number" && badge.progress > 0 && (
        <div className="mt-1 w-full">
          <div className="h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${badge.progress}%` }} />
          </div>
          <p className="mt-0.5 text-[9px] text-muted-foreground">{badge.progress}%</p>
        </div>
      )}
    </div>
  );
}

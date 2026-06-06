import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, Zap, Settings, LogOut, User, Activity } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/avatar";
import { isoDate, daysAgo, formatMinutes } from "@/lib/format";
import { computeBadges, computeLevel, computeXP } from "@/lib/gamification";
import { computeInsights } from "@/lib/insights";

export function ProfileDrawer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile-mini", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data } = useQuery({
    queryKey: ["profile-drawer", user!.id],
    queryFn: async () => {
      const since14 = isoDate(daysAgo(13));
      const [s, w, g, t, e, f] = await Promise.all([
        supabase.from("study_sessions").select("duration_minutes, session_date"),
        supabase.from("workouts").select("duration_minutes, workout_date"),
        supabase.from("goals").select("completed"),
        supabase.from("custom_trackers").select("id, name, tracker_type, target_value"),
        supabase.from("custom_tracker_entries").select("entry_date, tracker_id, value").gte("entry_date", since14),
        supabase.from("focus_sessions").select("duration_minutes, session_date"),
      ]);
      const studyRows = s.data ?? [];
      const workoutRows = w.data ?? [];
      const focusRows = f.data ?? [];
      const allDates = new Set<string>([...studyRows.map((r) => r.session_date), ...workoutRows.map((r) => r.workout_date), ...focusRows.map((r) => r.session_date)]);
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
        t.data ?? [], e.data ?? [],
      );
      return {
        studyMin: studyRows.reduce((a, b) => a + b.duration_minutes, 0),
        workoutCount: workoutRows.length,
        goalsDone: (g.data ?? []).filter((x) => x.completed).length,
        habitsHit: (e.data ?? []).filter((x) => Number(x.value) > 0).length,
        focusMin: focusRows.reduce((a, b) => a + b.duration_minutes, 0),
        focusCount: focusRows.length,
        sessionsCount: studyRows.length,
        streak, bestStreak: Math.max(best, streak), insights,
      };
    },
  });

  const name = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
  const xp = computeXP({
    studyMin: data?.studyMin ?? 0, workoutCount: data?.workoutCount ?? 0,
    goalsDone: data?.goalsDone ?? 0, streak: data?.streak ?? 0, habitsHit: data?.habitsHit ?? 0,
    focusMin: data?.focusMin ?? 0,
  });
  const level = computeLevel(xp);
  const badges = computeBadges({
    studyMin: data?.studyMin ?? 0, workoutCount: data?.workoutCount ?? 0,
    goalsDone: data?.goalsDone ?? 0, streak: data?.streak ?? 0,
    bestStreak: data?.bestStreak ?? 0,
    sessionsCount: data?.sessionsCount ?? 0,
    focusMin: data?.focusMin ?? 0,
    focusCount: data?.focusCount ?? 0,
    level: level.level,
  });
  const earned = badges.filter((b) => b.earned).length;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open profile"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary font-display text-xs font-bold text-primary-foreground shadow-glow ring-2 ring-background transition-transform hover:scale-105"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            initials(name, user?.email)
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-0">
        <div className="bg-gradient-aurora p-6 text-primary-foreground">
          <SheetHeader>
            <SheetTitle className="sr-only">Profile</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={name} className="h-14 w-14 rounded-full border-2 border-white/40 object-cover" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/40 bg-white/15 font-display text-lg font-bold backdrop-blur">
                {initials(name, user?.email)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{name}</p>
              <p className="truncate text-xs opacity-80">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur"><Zap className="h-3 w-3" />Lv {level.level}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur"><Flame className="h-3 w-3" />{data?.streak ?? 0}d</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur"><Activity className="h-3 w-3" />{data?.insights.disciplineScore ?? 0}</span>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider opacity-80">
              <span>{xp.toLocaleString()} XP</span>
              <span>Lv {level.level + 1}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${level.pct}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Study" value={formatMinutes(data?.studyMin ?? 0)} />
            <Mini label="Workouts" value={String(data?.workoutCount ?? 0)} />
            <Mini label="Goals" value={String(data?.goalsDone ?? 0)} />
          </div>

          <div className="rounded-xl border bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              Badges <span className="text-muted-foreground">· {earned}/{badges.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.slice(0, 6).map((b) => (
                <span key={b.id} title={b.name}
                  className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${b.earned ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-muted-foreground/60"}`}>
                  {b.name[0]}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-4">
            <DrawerLink to="/profile" icon={User} label="Profile" />
            <DrawerLink to="/settings" icon={Settings} label="Settings & Theme" />
            <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-2">
      <p className="font-display text-sm font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function DrawerLink({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary">
      <Icon className="h-4 w-4 text-muted-foreground" /> {label}
    </Link>
  );
}

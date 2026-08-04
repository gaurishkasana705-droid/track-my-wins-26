import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Settings, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/avatar";
import { isoDate, daysAgo, formatMinutes } from "@/lib/format";

export function ProfileDrawer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile-mini", user!.id],
    queryFn: async () => {
      const { data } = await db.from("profiles").select("display_name, avatar_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data } = useQuery({
    queryKey: ["profile-drawer", user!.id],
    queryFn: async () => {
      const [s, w, g, f] = await Promise.all([
        db.from("study_sessions").select("duration_minutes, session_date"),
        db.from("workouts").select("duration_minutes, workout_date"),
        db.from("goals").select("completed"),
        db.from("focus_sessions").select("duration_minutes, session_date"),
      ]);
      const studyRows = s.data ?? [];
      const workoutRows = w.data ?? [];
      const focusRows = f.data ?? [];
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
      return {
        studyMin: studyRows.reduce((a: number, b) => a + b.duration_minutes, 0),
        workoutCount: workoutRows.length,
        goalsDone: (g.data ?? []).filter((x) => x.completed).length,
        streak,
      };
    },
  });

  const name = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";

  const signOut = async () => {
    await db.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open profile"
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            initials(name, user?.email)
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Profile</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary font-display text-base font-semibold">
              {initials(name, user?.email)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Flame className="h-4 w-4" />
          <span className="font-semibold tabular-nums text-foreground">{data?.streak ?? 0}</span> day streak
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-y py-4 text-center">
          <Mini label="Study" value={formatMinutes(data?.studyMin ?? 0)} />
          <Mini label="Workouts" value={String(data?.workoutCount ?? 0)} />
          <Mini label="Goals" value={String(data?.goalsDone ?? 0)} />
        </div>

        <div className="mt-4 space-y-1">
          <DrawerLink to="/profile" icon={User} label="Profile" />
          <DrawerLink to="/settings" icon={Settings} label="Settings" />
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-base font-semibold tabular-nums">{value}</p>
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

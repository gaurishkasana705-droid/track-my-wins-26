import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, Dumbbell, Target, LogOut, Sparkles, Settings, User, ListChecks, Activity, Brain } from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ProfileDrawer } from "@/components/profile-drawer";

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/insights", label: "Insights", icon: Activity },
  { to: "/focus", label: "Focus", icon: Brain },
  { to: "/study", label: "Study", icon: BookOpen },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/trackers", label: "Trackers", icon: ListChecks },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/focus", label: "Focus", icon: Brain },
  { to: "/trackers", label: "Trackers", icon: ListChecks },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/insights", label: "Insights", icon: Activity },
] as const;

const SECONDARY_NAV = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-gradient-subtle">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-sidebar md:flex md:flex-col">
        <SidebarContent path={path} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/70 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <ProfileDrawer />
            <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="hidden sm:inline-flex">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-8 sm:pt-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 gap-1 border-t bg-background/85 px-2 py-1.5 backdrop-blur-lg md:hidden">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to || path.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SidebarContent({ path }: { path: string }) {
  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4 font-display text-base font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-4 w-4" />
        </span>
        LifeTrack
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tracking</p>
        {PRIMARY_NAV.map((item) => <NavLink key={item.to} {...item} active={path === item.to || path.startsWith(item.to + "/")} />)}
        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
        {SECONDARY_NAV.map((item) => <NavLink key={item.to} {...item} active={path === item.to} />)}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        <p>Small steps. Every single day.</p>
      </div>
    </>
  );
}

function NavLink({ to, label, icon: Icon, active }: { to: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-glow"
          : "text-sidebar-foreground hover:bg-sidebar-accent/70"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

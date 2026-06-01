import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Dumbbell, Target, Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeTrack — Personal Productivity Dashboard" },
      { name: "description", content: "Track study sessions, workouts and goals in one calm, beautiful dashboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { theme, toggle } = useTheme();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
            <Sparkles className="h-4 w-4" />
          </span>
          LifeTrack
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
          <Button asChild><Link to="/signup">Get started</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Built for daily focus
          </div>
          <h1 className="mt-6 text-balance font-display text-5xl font-bold leading-[1.05] sm:text-6xl">
            Study deeper. Train harder.
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">Reach every goal.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            LifeTrack is your personal dashboard for study sessions, workouts and goals — calm,
            fast, and always with you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-elegant">
              <Link to="/signup">
                Create your free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-5 sm:grid-cols-3">
          {[
            { icon: BookOpen, title: "Study Tracker", desc: "Log sessions by subject, watch your hours grow." },
            { icon: Dumbbell, title: "Workout Tracker", desc: "Capture every set, run, and rep with one tap." },
            { icon: Target, title: "Goal Tracker", desc: "Set deadlines, track progress, celebrate wins." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border bg-card p-6 shadow-card transition-all hover:shadow-elegant">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

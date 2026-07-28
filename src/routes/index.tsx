import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Dumbbell, Target, Sparkles, ListChecks, BarChart3, Palette, ShieldCheck, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { StatRing } from "@/components/ui/stat-ring";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeTrack — Your Premium Personal Dashboard" },
      { name: "description", content: "Track study, workouts, goals, and custom habits in one beautiful dashboard. Fully customizable, mobile-first, and built for daily focus." },
      { property: "og:title", content: "LifeTrack — Your Premium Personal Dashboard" },
      { property: "og:description", content: "Track study, workouts, goals, and custom habits in one beautiful dashboard. Fully customizable, mobile-first, and built for daily focus." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" />
            </span>
            LifeTrack
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
            <Button asChild className="shadow-elegant"><Link to="/signup">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center sm:pt-24">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-card backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          Built for daily focus · 100% customizable
        </div>
        <h1 className="animate-fade-up mt-6 text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: "0.1s" }}>
          Your life,
          <br />
          <span className="text-gradient-aurora">beautifully tracked.</span>
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg" style={{ animationDelay: "0.2s" }}>
          The premium personal dashboard for study, fitness, goals, and any habit you can dream up.
          Fully personalized. Mobile-first. Cloud-synced.
        </p>
        <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.3s" }}>
          <Button asChild size="lg" className="h-12 px-6 text-base shadow-elegant">
            <Link to="/signup">
              Start tracking free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
            <Link to="/login">I have an account</Link>
          </Button>
        </div>

        {/* Showcase preview */}
        <div className="animate-fade-up relative mx-auto mt-20 max-w-4xl" style={{ animationDelay: "0.4s" }}>
          <div className="absolute -inset-4 -z-10 bg-gradient-aurora opacity-20 blur-3xl" />
          <div className="glass-strong overflow-hidden rounded-3xl border p-6 shadow-elegant sm:p-10">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center rounded-2xl bg-secondary/50 p-6">
                <StatRing value={72} size={130} label="72%" sub="Study goal" />
              </div>
              <div className="flex flex-col items-center rounded-2xl bg-secondary/50 p-6">
                <StatRing value={5} max={6} size={130} label="5/6" sub="Workouts" />
              </div>
              <div className="flex flex-col items-center rounded-2xl bg-secondary/50 p-6">
                <StatRing value={89} size={130} label="89%" sub="Goals" />
              </div>
            </div>
            <div className="mt-6 flex items-end justify-between gap-2 rounded-2xl bg-secondary/50 p-6">
              {[40, 65, 50, 80, 55, 90, 75].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-gradient-primary opacity-80" style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything in one place</h2>
          <p className="mt-3 text-muted-foreground">Five trackers out of the box. Build your own. Customize the look.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: BookOpen, title: "Study Tracker", desc: "Log sessions by subject. Watch your hours stack up." },
            { icon: Dumbbell, title: "Workout Tracker", desc: "Strength, runs, yoga — every session counted." },
            { icon: Target, title: "Goal Tracker", desc: "Set deadlines, track progress, celebrate wins." },
            { icon: ListChecks, title: "Custom Trackers", desc: "Build any habit, number, or progress tracker." },
            { icon: Palette, title: "Total customization", desc: "Themes, fonts, sizes, layouts — your call." },
            { icon: ShieldCheck, title: "Secure & private", desc: "Your data is yours. Encrypted and synced." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="hover-lift group rounded-2xl border bg-card p-6 shadow-card animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Progress showcase */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid items-center gap-10 rounded-3xl border bg-card p-8 shadow-card sm:p-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              <Zap className="h-3 w-3 text-primary" /> Built for momentum
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">See progress, every single day.</h2>
            <p className="mt-3 text-muted-foreground">Animated rings, charts, streaks — the visuals that make showing up feel rewarding.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Daily, weekly & monthly stats", "Switch between rings, bars or cards", "Export your data anytime", "Dark mode that actually looks great"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 bg-gradient-aurora opacity-15 blur-3xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background p-5 hover-lift">
                <BarChart3 className="h-5 w-5 text-primary" />
                <p className="mt-3 text-2xl font-bold font-display">42h</p>
                <p className="text-xs text-muted-foreground">Study this month</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-3/4 rounded-full bg-gradient-primary" />
                </div>
              </div>
              <div className="rounded-2xl border bg-background p-5 hover-lift">
                <Dumbbell className="h-5 w-5 text-success" />
                <p className="mt-3 text-2xl font-bold font-display">18</p>
                <p className="text-xs text-muted-foreground">Workouts this month</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-4/5 rounded-full" style={{ background: "var(--color-success)" }} />
                </div>
              </div>
              <div className="rounded-2xl border bg-background p-5 hover-lift">
                <Target className="h-5 w-5 text-warning" />
                <p className="mt-3 text-2xl font-bold font-display">7/10</p>
                <p className="text-xs text-muted-foreground">Goals completed</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[70%] rounded-full" style={{ background: "var(--color-warning)" }} />
                </div>
              </div>
              <div className="rounded-2xl border bg-background p-5 hover-lift">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="mt-3 text-2xl font-bold font-display">14d</p>
                <p className="text-xs text-muted-foreground">Current streak</p>
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="h-3 w-1.5 rounded-sm bg-gradient-primary" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 text-primary-foreground shadow-elegant sm:p-16">
          <div className="absolute inset-0 bg-gradient-aurora opacity-30" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to track your best year?</h2>
            <p className="mt-3 text-primary-foreground/85">Free forever. No credit card. Set up in under a minute.</p>
            <Button asChild size="lg" variant="secondary" className="mt-6 h-12 px-6 text-base shadow-card">
              <Link to="/signup">Create your free account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-background/40 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} LifeTrack</span>
          <span>Made for focus.</span>
        </div>
      </footer>
    </div>
  );
}

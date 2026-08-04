import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Dumbbell, Brain, ListChecks, Moon, Activity, Target, Zap, Lightbulb, LayoutDashboard, Sparkles, ArrowRight, Check, SkipForward } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePreferences, type FocusArea } from "@/hooks/use-preferences";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — LifeTrack" }] }),
  component: () => (
    <ProtectedRoute>
      <OnboardingView />
    </ProtectedRoute>
  ),
});

const CONCEPTS = [
  { icon: Activity, title: "Discipline Score", desc: "A weekly score (0–100) measuring how consistent you've been. The more days you show up, the higher it climbs." },
  { icon: Zap, title: "XP & Levels", desc: "Every action — studying, working out, finishing goals — earns XP. Level up as you build the habit." },
  { icon: Target, title: "Goals", desc: "Set deadlines, slide to update progress, and celebrate every completion." },
  { icon: Brain, title: "Focus Sessions", desc: "A built-in Pomodoro timer. Deep work hours are auto-tracked toward your progress." },
  { icon: Lightbulb, title: "Smart Insights", desc: "Weekly summaries tell you what's working, what's slipping, and what to try next." },
  { icon: LayoutDashboard, title: "Your Dashboard", desc: "Drag, resize, and reshape widgets. Make it look exactly how you like." },
];

const FOCUS_OPTIONS: { id: FocusArea; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "study", label: "Study", desc: "Build a daily study habit", icon: BookOpen },
  { id: "fitness", label: "Fitness", desc: "Move more, train consistently", icon: Dumbbell },
  { id: "productivity", label: "Productivity", desc: "Deep work, less distraction", icon: Brain },
  { id: "habits", label: "Habits", desc: "Track daily routines", icon: ListChecks },
  { id: "sleep", label: "Sleep", desc: "Wind down on time", icon: Moon },
];

const STARTER_GOALS: Record<FocusArea, { title: string; description: string }[]> = {
  study: [{ title: "Study 5 days this week", description: "Sit down for at least 30 focused minutes." }],
  fitness: [{ title: "Complete 3 workouts this week", description: "Any type — strength, cardio, or mobility." }],
  productivity: [{ title: "Log 10 focus sessions this week", description: "Use the Pomodoro timer to stay on task." }],
  habits: [{ title: "Hit your habits 5 days in a row", description: "Open trackers daily and tick them off." }],
  sleep: [{ title: "Sleep before midnight 5 nights this week", description: "Consistent rest fuels every other goal." }],
};

function OnboardingView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setPrefs } = usePreferences();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<FocusArea[]>([]);
  const [saving, setSaving] = useState(false);

  const totalSteps = 3; // welcome, concepts, focus picker
  const toggle = (id: FocusArea) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const finish = async (skip = false) => {
    setSaving(true);
    const focus = skip ? [] : selected;
    await setPrefs({ onboarding_completed: true, onboarding_focus: focus });
    if (!skip && focus.length && user) {
      const goals = focus.flatMap((f) => STARTER_GOALS[f].map((g) => ({ ...g, user_id: user.id })));
      if (goals.length) await db.from("goals").insert(goals);
    }
    setSaving(false);
    toast.success(skip ? "You're all set." : "Starter goals added. Let's go!");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" />
            </span>
            LifeTrack
          </div>
          <button onClick={() => finish(true)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <SkipForward className="h-3.5 w-3.5" /> Skip
          </button>
        </header>

        {/* Progress dots */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/60" : "w-4 bg-secondary")} />
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center py-8 animate-fade-up">
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-9 w-9" />
              </div>
              <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">Welcome to LifeTrack</h1>
              <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
                Your personal growth dashboard. Track what matters, see real progress, and build the habits that change everything.
              </p>
              <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">Takes 30 seconds</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Here's how it works</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Six simple ideas. You'll pick them up as you go.</p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {CONCEPTS.map((c) => (
                  <div key={c.title} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                        <c.icon className="h-4 w-4" />
                      </div>
                      <p className="font-display text-sm font-bold">{c.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">What do you want to improve?</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Pick one or more. We'll seed your dashboard with starter goals.</p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {FOCUS_OPTIONS.map((o) => {
                  const active = selected.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(o.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        active ? "border-primary bg-gradient-to-br from-primary/10 to-transparent shadow-glow" : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-foreground")}>
                        <o.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold">{o.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{o.desc}</p>
                      </div>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pb-6">
          <Button variant="ghost" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0} className="text-muted-foreground">
            Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="shadow-elegant">
              {step === 0 ? "Get started" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => finish(false)} disabled={saving} className="shadow-elegant">
              {saving ? "Setting up..." : selected.length ? "Create my dashboard" : "Continue"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { Flame, Sparkles, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { StatRing } from "@/components/ui/stat-ring";
import { CountUp } from "@/components/count-up";
import { useAuth } from "@/hooks/use-auth";

export function WelcomeHero({
  streak,
  disciplineScore,
  disciplineDelta,
  insight,
  consistencyScore,
}: {
  streak: number;
  disciplineScore: number;
  disciplineDelta: number;
  insight: string;
  consistencyScore: number;
}) {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] || user?.email?.split("@")[0] || "friend";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const Trend = disciplineDelta > 0 ? TrendingUp : disciplineDelta < 0 ? TrendingDown : Minus;
  const trendCls = disciplineDelta > 0 ? "text-success" : disciplineDelta < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-aurora p-6 text-primary-foreground sm:p-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative grid items-center gap-8 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4 text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/75">{dateLabel}</p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
            {greet}, <span className="opacity-90">{name}.</span>
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-primary-foreground/85 sm:mx-0 sm:text-base">
            {insight}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Chip icon={Flame} label={<span><CountUp value={streak} /> day streak</span>} />
            <Chip icon={Activity} label={<span><CountUp value={consistencyScore} />% consistent</span>} />
            <Chip icon={Sparkles} label={<span className="inline-flex items-center gap-1"><Trend className={`h-3 w-3 ${trendCls === "text-muted-foreground" ? "" : ""}`} />{disciplineDelta > 0 ? "+" : ""}{disciplineDelta} vs last wk</span>} />
          </div>
        </div>

        <div className="mx-auto rounded-full bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20">
          <div className="text-foreground">
            <StatRing value={disciplineScore} max={100} size={150} stroke={12} label={`${disciplineScore}`} sub="Discipline" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: React.ElementType; label: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md ring-1 ring-white/20">
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

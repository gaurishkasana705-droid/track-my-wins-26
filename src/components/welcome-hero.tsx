import { Flame, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const Trend = disciplineDelta > 0 ? TrendingUp : disciplineDelta < 0 ? TrendingDown : Minus;

  return (
    <div className="w-full p-6 sm:p-8">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{dateLabel}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{greet}.</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{insight}</p>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-5">
        <Stat icon={Flame} label="Day streak" value={String(streak)} />
        <Stat icon={Activity} label="Consistency" value={`${consistencyScore}%`} />
        <Stat
          icon={Trend}
          label="Discipline"
          value={String(disciplineScore)}
          hint={`${disciplineDelta > 0 ? "+" : ""}${disciplineDelta} vs last week`}
        />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

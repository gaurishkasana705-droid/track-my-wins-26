import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  to?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, to, onAction, className, children }: Props) {
  return (
    <div className={cn("rounded-3xl border-2 border-dashed bg-secondary/20 px-6 py-12 text-center", className)}>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {(actionLabel && (to || onAction)) && (
        <div className="mt-5">
          {to ? (
            <Button asChild className="shadow-elegant"><Link to={to}>{actionLabel}</Link></Button>
          ) : (
            <Button onClick={onAction} className="shadow-elegant">{actionLabel}</Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

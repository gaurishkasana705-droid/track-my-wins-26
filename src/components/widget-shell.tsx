import type { WidgetShape, WidgetSize } from "@/hooks/use-preferences";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SHAPE_CLASSES: Record<WidgetShape, string> = {
  rounded: "rounded-3xl",
  rectangle: "rounded-md",
  square: "rounded-2xl aspect-square",
  circle: "rounded-full aspect-square",
};

const SIZE_COLS: Record<WidgetSize, string> = {
  sm: "col-span-6 md:col-span-2",
  md: "col-span-6 md:col-span-3",
  lg: "col-span-6",
};

export function WidgetShell({
  shape = "rounded",
  size = "md",
  className,
  innerClassName,
  children,
  dragHandle,
}: {
  shape?: WidgetShape;
  size?: WidgetSize;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  dragHandle?: ReactNode;
}) {
  const round = shape === "circle" || shape === "square";
  return (
    <div className={cn(SIZE_COLS[size], "min-w-0", className)}>
      <div
        className={cn(
          "group relative h-full overflow-hidden border bg-card text-card-foreground shadow-card transition-all hover:shadow-elegant",
          SHAPE_CLASSES[shape],
        )}
      >
        {dragHandle}
        <div
          className={cn(
            "h-full w-full",
            round ? "grid place-items-center p-4 text-center" : "p-5",
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

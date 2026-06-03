import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";

type Props = {
  children: ReactNode;
  onComplete?: () => void;
  onSkip?: () => void;
  onEdit?: () => void;
  className?: string;
  disabled?: boolean;
};

const THRESHOLD = 80;
const LONG_PRESS_MS = 500;

export function SwipeRow({ children, onComplete, onSkip, onEdit, className, disabled }: Props) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);

  const cancelLongPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    tracking.current = true;
    moved.current = false;
    setAnimating(false);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (onEdit) {
      pressTimer.current = setTimeout(() => {
        if (!moved.current) {
          tracking.current = false;
          onEdit();
        }
      }, LONG_PRESS_MS);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!tracking.current) return;
    const dxRaw = e.clientX - startX.current;
    const dyRaw = e.clientY - startY.current;
    if (Math.abs(dxRaw) > 6 || Math.abs(dyRaw) > 6) {
      moved.current = true;
      cancelLongPress();
    }
    if (Math.abs(dyRaw) > Math.abs(dxRaw)) return; // vertical scroll
    e.preventDefault?.();
    setDx(dxRaw);
  };

  const finish = () => {
    cancelLongPress();
    tracking.current = false;
    setAnimating(true);
    if (dx > THRESHOLD && onComplete) {
      setDx(400);
      setTimeout(() => { onComplete(); setDx(0); }, 180);
    } else if (dx < -THRESHOLD && onSkip) {
      setDx(-400);
      setTimeout(() => { onSkip(); setDx(0); }, 180);
    } else {
      setDx(0);
    }
  };

  const showRight = dx > 8;
  const showLeft = dx < -8;

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <div className={cn("pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 px-4 text-sm font-medium text-success-foreground transition-opacity",
        showRight ? "opacity-100" : "opacity-0")}
        style={{ background: "var(--color-success, oklch(0.68 0.17 155))" }}
      >
        <Check className="h-4 w-4" /> Complete
      </div>
      <div className={cn("pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 px-4 text-sm font-medium text-destructive-foreground transition-opacity",
        showLeft ? "opacity-100" : "opacity-0")}
        style={{ background: "var(--color-destructive)" }}
      >
        <X className="h-4 w-4" /> Skip
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{ transform: `translateX(${dx}px)`, transition: animating ? "transform 180ms ease-out" : "none", touchAction: "pan-y" }}
        className="relative z-10 select-none bg-card"
      >
        {children}
      </div>
      {onEdit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-muted-foreground/60 sm:hidden">
          <Pencil className="inline h-3 w-3" />
        </span>
      )}
    </div>
  );
}

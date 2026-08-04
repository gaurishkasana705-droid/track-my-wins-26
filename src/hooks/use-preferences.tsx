import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

export type ProgressStyle = "ring" | "bar" | "card";
export type FontFamily = "space-grotesk" | "inter" | "manrope" | "dm-sans";
export type ThemeMode = "light" | "dark" | "system";
export type WidgetShape = "rounded" | "rectangle" | "square" | "circle";
export type WidgetSize = "sm" | "md" | "lg";
export type FocusArea = "study" | "fitness" | "productivity" | "habits" | "sleep";

export type Prefs = {
  theme: ThemeMode;
  font_family: FontFamily;
  font_scale: number;
  progress_style: ProgressStyle;
  dashboard_layout: string[];
  widget_visibility: Record<string, boolean>;
  widget_shapes: Record<string, WidgetShape>;
  widget_sizes: Record<string, WidgetSize>;
  onboarding_completed: boolean;
  onboarding_focus: FocusArea[];
};

export const DEFAULT_LAYOUT = ["welcome", "dailySummary", "todayFocus", "focusTime", "chart", "goals", "upcomingGoals", "streak", "recentActivity"];

const DEFAULTS: Prefs = {
  theme: "light",
  font_family: "space-grotesk",
  font_scale: 1,
  progress_style: "ring",
  dashboard_layout: DEFAULT_LAYOUT,
  widget_visibility: { welcome: true, dailySummary: true, todayFocus: true, focusTime: true, chart: true, goals: true, upcomingGoals: true, streak: true, recentActivity: true, customTrackers: true },
  widget_shapes: {},
  widget_sizes: {},
  onboarding_completed: false,
  onboarding_focus: [],
};

const FONT_MAP: Record<FontFamily, { sans: string; display: string }> = {
  "space-grotesk": { sans: "DM Sans", display: "Space Grotesk" },
  "inter": { sans: "Inter", display: "Inter" },
  "manrope": { sans: "Manrope", display: "Manrope" },
  "dm-sans": { sans: "DM Sans", display: "DM Sans" },
};

type Ctx = {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => Promise<void>;
  loading: boolean;
};

const PrefCtx = createContext<Ctx>({ prefs: DEFAULTS, setPrefs: async () => {}, loading: true });

function applyPrefs(p: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = p.theme === "dark" || (p.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  const f = FONT_MAP[p.font_family] ?? FONT_MAP["space-grotesk"];
  root.style.setProperty("--app-font-sans", `"${f.sans}"`);
  root.style.setProperty("--app-font-display", `"${f.display}"`);
  root.style.setProperty("--app-font-scale", String(p.font_scale));
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [prefs, setLocal] = useState<Prefs>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem("prefs");
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { applyPrefs(prefs); }, [prefs]);

  // Live-track OS theme when user picked "system"
  useEffect(() => {
    if (prefs.theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyPrefs(prefs);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [prefs]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await db.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const layout = (data.dashboard_layout as string[]) ?? DEFAULTS.dashboard_layout;
        const merged_layout = [...layout];
        for (const k of DEFAULT_LAYOUT) if (!merged_layout.includes(k)) merged_layout.push(k);
        const row = data as typeof data & { onboarding_completed?: boolean; onboarding_focus?: FocusArea[] };
        const merged: Prefs = {
          theme: (data.theme as ThemeMode) ?? DEFAULTS.theme,
          font_family: (data.font_family as FontFamily) ?? DEFAULTS.font_family,
          font_scale: Number(data.font_scale) || 1,
          progress_style: (data.progress_style as ProgressStyle) ?? DEFAULTS.progress_style,
          dashboard_layout: merged_layout,
          widget_visibility: { ...DEFAULTS.widget_visibility, ...((data.widget_visibility as Record<string, boolean>) ?? {}) },
          widget_shapes: (data.widget_shapes as Record<string, WidgetShape>) ?? {},
          widget_sizes: (data.widget_sizes as Record<string, WidgetSize>) ?? {},
          onboarding_completed: row.onboarding_completed ?? false,
          onboarding_focus: (row.onboarding_focus as FocusArea[]) ?? [],
        };
        setLocal(merged);
        localStorage.setItem("prefs", JSON.stringify(merged));
      } else {
        await db.from("user_preferences").insert({ user_id: user.id });
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  useEffect(() => {
    if (prefs.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyPrefs(prefs);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [prefs]);

  const setPrefs = useCallback(async (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setLocal(next);
    try { localStorage.setItem("prefs", JSON.stringify(next)); } catch {}
    if (user) {
      await db.from("user_preferences").upsert(
        { user_id: user.id, ...next },
        { onConflict: "user_id" }
      );
    }
  }, [prefs, user]);

  return <PrefCtx.Provider value={{ prefs, setPrefs, loading }}>{children}</PrefCtx.Provider>;
}

export const usePreferences = () => useContext(PrefCtx);

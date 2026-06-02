- LifeTrack Premium Upgrade Plan

This is a large scope. I'll deliver it in focused phases so each ships working. Confirm and I'll start with Phase 1; later phases continue automatically unless you want to pause.

## Phase 1 — Premium Visual Foundation

- Refine `src/styles.css`: richer Cloud White tokens, gradient + glass utilities, elevation scale, smooth transitions, focus rings.
- New shared UI primitives: `StatRing` (circular progress SVG), `AnimatedProgress`, `GlassCard`, `SectionHeader`.
- Add page transitions and card hover/scale micro-interactions (Tailwind + existing keyframes).

## Phase 2 — Landing Page

- Rebuild `src/routes/index.tsx`: hero with gradient headline, glass nav, large CTAs, features grid, "progress showcase" mock dashboard preview, testimonials strip, footer.
- Mobile-first layout, animated entrance.

Phase 3 — Dashboard Redesign

- Replace text-heavy summary with: 3 circular ring stats (Study / Workouts / Goals %), animated bar chart, streak card, today's quick-add card, active goals list with animated progress.
- Grid is widget-based — each widget is a self-contained component (prep for Phase 4).

## Phase 4 — Customization System

New table `user_preferences` (user_id, theme, font_family, font_scale, dashboard_layout jsonb, widget_visibility jsonb, progress_style enum).

- Settings page `/settings` with sections: Appearance (theme light/dark/system, font family from 3 presets, font size slider), Dashboard (toggle widgets, drag-and-drop reorder via `@dnd-kit/sortable`, progress style: bar | ring | card).
- Preferences applied via a `PreferencesProvider` that sets CSS variables on `<html>`.

## Phase 5 — User Profile

New table `profiles` (user_id, display_name, avatar_url, bio). Storage bucket `avatars` (public) with RLS.

- `/profile` page: edit info, upload avatar, lifetime stats (total study hrs, total workouts, goals completed, streak), change password, delete account (calls server fn using admin client).

## Phase 6 — Data Management

- Edit/delete already partly exists; add inline edit dialogs on Study & Workout rows, "Reset tracker" (delete all rows of one type, confirm dialog), "Export CSV" buttons per tracker and a bulk JSON export on Profile.

## Phase 7 — Custom Tracker Builder

New tables:

- `custom_trackers` (id, user_id, name, icon, type: habit|goal|time|number|progress, unit, target_value, color, created_at)
- `custom_tracker_entries` (id, tracker_id, user_id, value, note, entry_date)
RLS scoped to `auth.uid()`.
- `/trackers` page: list + "New tracker" wizard (name, icon picker from lucide, type, unit, target).
- `/trackers/$id` page: log entry, history, progress visual that matches the tracker type.
- Custom trackers also appear as optional widgets on the dashboard.

## Phase 8 — Mobile polish

- Bottom nav bar on small screens replacing drawer for primary nav, larger tap targets, safe-area padding, swipe-friendly cards.

## Technical notes

- Stack: TanStack Start + Lovable Cloud (already wired). New deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `papaparse` (CSV).
- All new tables include GRANTs + RLS scoped to `auth.uid()`.
- Avatar deletion + account deletion run in `createServerFn` with `supabaseAdmin`.
- Preferences are cached in React Query, persisted to DB, and hydrated on app load.

## What I'd like to confirm

1. OK to ship in the above phase order, one after another, in this single run?
2. Account deletion: hard delete (auth user + all rows) — confirm OK.
3. Avatars stored in a public `avatars` bucket — confirm OK.

Reply "go" and I'll start with Phase 1 and continue straight through.
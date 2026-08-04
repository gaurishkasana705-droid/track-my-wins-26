// ⚠️ TEMPORARY DEMO MODE — AUTHENTICATION BYPASS ⚠️
//
// When VITE_DEMO_MODE === "true" the app skips the login screen entirely and
// treats every visitor as one local demo user. All data is stored in the
// browser (localStorage) through `src/lib/local-db.ts` instead of the cloud
// backend, so nothing depends on a real session.
//
// TODO(auth): set VITE_DEMO_MODE="false" in `.env` to restore production auth.
// Nothing in the real authentication codebase has been removed:
//   - src/routes/login.tsx / signup.tsx  → real email+password + Google OAuth
//   - src/hooks/use-auth.tsx             → real Supabase session listener
//   - src/components/protected-route.tsx → real route guard
// They all reactivate automatically once the flag is off.

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";

/** Stable fake user id used everywhere auth was previously required. */
export const DEMO_USER_ID = "demo-user-local";

export const DEMO_USER = {
  id: DEMO_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "demo@lifetrack.local",
  app_metadata: { provider: "demo-mode" },
  user_metadata: { full_name: "Demo User" },
  created_at: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

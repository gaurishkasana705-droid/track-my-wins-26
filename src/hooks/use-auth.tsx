import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true });

// ⚠️ DEV-ONLY AUTH BYPASS ⚠️
// Enabled when VITE_DEV_BYPASS_AUTH === "true". Provides a fake session so the
// app renders without a real login. This is TEMPORARY for local development.
// REMOVE (or set the env var to "false") before shipping to production.
// A proper production auth flow (Supabase email/password + Google OAuth) is
// already wired in `/login` and `/signup`; disabling the flag restores it.
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const FAKE_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  aud: "authenticated",
  role: "authenticated",
  email: "dev@lifetrack.local",
  app_metadata: { provider: "dev-bypass" },
  user_metadata: { full_name: "Dev User" },
  created_at: new Date().toISOString(),
} as unknown as User;

const FAKE_SESSION = {
  access_token: "dev-bypass",
  refresh_token: "dev-bypass",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: FAKE_USER,
} as unknown as Session;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(DEV_BYPASS ? FAKE_SESSION : null);
  const [loading, setLoading] = useState(!DEV_BYPASS);

  useEffect(() => {
    if (DEV_BYPASS) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);


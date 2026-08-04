import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo-mode";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true });

// ⚠️ TEMPORARY AUTH BYPASS ⚠️
// When DEMO_MODE is on (VITE_DEMO_MODE !== "false") we hand every visitor the
// same local demo user so no screen depends on a real session. All real auth
// code below stays intact and takes over the moment the flag is "false".
// TODO(auth): remove the DEMO_MODE branches to restore production auth.
const DEMO_SESSION = {
  access_token: "demo-mode",
  refresh_token: "demo-mode",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: DEMO_USER,
} as unknown as Session;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(DEMO_MODE ? DEMO_SESSION : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return; // TODO(auth): demo bypass — skips real session wiring
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

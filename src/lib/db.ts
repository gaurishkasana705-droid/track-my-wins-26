// Data access layer.
//
// ⚠️ TEMPORARY: while VITE_DEMO_MODE is on (see src/lib/demo-mode.ts), `db` is a
// localStorage-backed mock so the app works with a single demo user and no auth.
// TODO(auth): flip VITE_DEMO_MODE to "false" and this exports the real cloud
// client again — no call sites need to change.
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "./demo-mode";
import { localDb } from "./local-db";

export const db = (DEMO_MODE ? localDb : supabase) as typeof supabase;

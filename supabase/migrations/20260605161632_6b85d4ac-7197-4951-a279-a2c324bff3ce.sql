CREATE TABLE public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  duration_minutes integer NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  label text,
  mode text NOT NULL DEFAULT 'focus',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_sessions TO authenticated;
GRANT ALL ON public.focus_sessions TO service_role;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fs select own" ON public.focus_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fs insert own" ON public.focus_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fs update own" ON public.focus_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "fs delete own" ON public.focus_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX focus_sessions_user_date_idx ON public.focus_sessions (user_id, session_date DESC);

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles delete own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  theme TEXT NOT NULL DEFAULT 'system',
  font_family TEXT NOT NULL DEFAULT 'space-grotesk',
  font_scale NUMERIC NOT NULL DEFAULT 1.0,
  progress_style TEXT NOT NULL DEFAULT 'ring',
  dashboard_layout JSONB NOT NULL DEFAULT '["stats","chart","goals","streak"]'::jsonb,
  widget_visibility JSONB NOT NULL DEFAULT '{"stats":true,"chart":true,"goals":true,"streak":true,"customTrackers":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs select own" ON public.user_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "prefs insert own" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs update own" ON public.user_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "prefs delete own" ON public.user_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- custom_trackers
CREATE TABLE public.custom_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Target',
  tracker_type TEXT NOT NULL DEFAULT 'number',
  unit TEXT,
  target_value NUMERIC,
  color TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_trackers TO authenticated;
GRANT ALL ON public.custom_trackers TO service_role;
ALTER TABLE public.custom_trackers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct select own" ON public.custom_trackers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ct insert own" ON public.custom_trackers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ct update own" ON public.custom_trackers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ct delete own" ON public.custom_trackers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- custom_tracker_entries
CREATE TABLE public.custom_tracker_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES public.custom_trackers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_tracker_entries TO authenticated;
GRANT ALL ON public.custom_tracker_entries TO service_role;
ALTER TABLE public.custom_tracker_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cte select own" ON public.custom_tracker_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cte insert own" ON public.custom_tracker_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cte update own" ON public.custom_tracker_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cte delete own" ON public.custom_tracker_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_cte_tracker ON public.custom_tracker_entries(tracker_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ct_updated BEFORE UPDATE ON public.custom_trackers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS widget_shapes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS widget_sizes jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.training_lessons
  ADD COLUMN IF NOT EXISTS minutes INTEGER NOT NULL DEFAULT 5;

ALTER TABLE public.training_challenges
  ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT '';

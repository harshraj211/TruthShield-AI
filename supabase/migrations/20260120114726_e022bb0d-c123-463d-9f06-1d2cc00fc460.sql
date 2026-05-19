-- Training lessons
CREATE TABLE IF NOT EXISTS public.training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training challenges
CREATE TABLE IF NOT EXISTS public.training_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  question TEXT NOT NULL,
  media JSONB,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic constraints (immutable-safe)
ALTER TABLE public.training_lessons
  ADD CONSTRAINT training_lessons_difficulty_chk
  CHECK (difficulty IN ('beginner','intermediate','advanced'));

ALTER TABLE public.training_challenges
  ADD CONSTRAINT training_challenges_type_chk
  CHECK (type IN ('text','image','audio','video'));

-- Enable RLS
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_challenges ENABLE ROW LEVEL SECURITY;

-- Timestamp trigger fn (shared)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_training_lessons_updated_at ON public.training_lessons;
CREATE TRIGGER update_training_lessons_updated_at
BEFORE UPDATE ON public.training_lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_challenges_updated_at ON public.training_challenges;
CREATE TRIGGER update_training_challenges_updated_at
BEFORE UPDATE ON public.training_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_lessons_published_updated
  ON public.training_lessons (published, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_challenges_published_updated
  ON public.training_challenges (published, updated_at DESC);

-- Policies: everyone can read published content; admins can read/manage all

-- Lessons
DROP POLICY IF EXISTS "Anyone can read published lessons" ON public.training_lessons;
CREATE POLICY "Anyone can read published lessons"
ON public.training_lessons
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Admins can read all lessons" ON public.training_lessons;
CREATE POLICY "Admins can read all lessons"
ON public.training_lessons
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.training_lessons;
CREATE POLICY "Admins can manage lessons"
ON public.training_lessons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Challenges
DROP POLICY IF EXISTS "Anyone can read published challenges" ON public.training_challenges;
CREATE POLICY "Anyone can read published challenges"
ON public.training_challenges
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Admins can read all challenges" ON public.training_challenges;
CREATE POLICY "Admins can read all challenges"
ON public.training_challenges
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage challenges" ON public.training_challenges;
CREATE POLICY "Admins can manage challenges"
ON public.training_challenges
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

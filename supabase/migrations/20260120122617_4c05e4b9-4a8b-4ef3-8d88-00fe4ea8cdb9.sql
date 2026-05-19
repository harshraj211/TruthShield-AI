-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'highly-likely', 'suspected')),
  year INTEGER NOT NULL,
  attack_type TEXT NOT NULL CHECK (attack_type IN ('audio', 'video', 'text', 'image')),
  target_type TEXT NOT NULL CHECK (target_type IN ('individual', 'organization', 'general-public', 'political')),
  impact TEXT NOT NULL,
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attack_patterns table
CREATE TABLE public.attack_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  techniques JSONB NOT NULL DEFAULT '[]'::jsonb,
  indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
  mitigations JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incidents
CREATE POLICY "Anyone can read published incidents"
  ON public.incidents
  FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can read all incidents"
  ON public.incidents
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage incidents"
  ON public.incidents
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for attack_patterns
CREATE POLICY "Anyone can read published patterns"
  ON public.attack_patterns
  FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can read all patterns"
  ON public.attack_patterns
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage patterns"
  ON public.attack_patterns
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attack_patterns_updated_at
  BEFORE UPDATE ON public.attack_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
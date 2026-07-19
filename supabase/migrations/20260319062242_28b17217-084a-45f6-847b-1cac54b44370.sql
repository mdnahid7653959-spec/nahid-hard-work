CREATE TABLE public.theme_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.layout_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL DEFAULT 'homepage',
  sections jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page)
);

CREATE TABLE public.theme_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  theme_config jsonb NOT NULL DEFAULT '{}',
  layout_config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.theme_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read theme" ON public.theme_config FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can read layout" ON public.layout_config FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can read versions" ON public.theme_versions FOR SELECT TO public USING (true);
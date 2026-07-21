
-- ============================================================
-- Theme Studio Slice 1: Unified Versioning Core
-- Non-breaking. Storefront continues reading theme_config/layout_config.
-- Publish action (added in Slice 2) will copy a version into those tables.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.studio_theme_status AS ENUM ('draft','preview','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.studio_theme_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status public.studio_theme_status NOT NULL DEFAULT 'draft',
  version_number integer NOT NULL DEFAULT 1,

  -- Snapshotted configuration bundle (theme + layout + bento together)
  theme_config  jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  bento_config  jsonb NOT NULL DEFAULT '{}'::jsonb,

  parent_version_id uuid REFERENCES public.studio_theme_versions(id) ON DELETE SET NULL,

  created_by   uuid,
  published_at timestamptz,
  published_by uuid,
  archived_at  timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Exactly one published version at a time
CREATE UNIQUE INDEX IF NOT EXISTS studio_theme_versions_one_published
  ON public.studio_theme_versions ((status))
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS studio_theme_versions_status_idx
  ON public.studio_theme_versions (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS studio_theme_versions_parent_idx
  ON public.studio_theme_versions (parent_version_id);

-- Grants
GRANT SELECT ON public.studio_theme_versions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_theme_versions TO authenticated;
GRANT ALL ON public.studio_theme_versions TO service_role;

-- RLS
ALTER TABLE public.studio_theme_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published or preview versions" ON public.studio_theme_versions;
CREATE POLICY "Public can read published or preview versions"
  ON public.studio_theme_versions
  FOR SELECT
  USING (status IN ('published','preview'));

DROP POLICY IF EXISTS "Admins manage all theme versions" ON public.studio_theme_versions;
CREATE POLICY "Admins manage all theme versions"
  ON public.studio_theme_versions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_studio_theme_versions_updated_at ON public.studio_theme_versions;
CREATE TRIGGER trg_studio_theme_versions_updated_at
  BEFORE UPDATE ON public.studio_theme_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial "Production v1" from currently active configs (safe: read-only from existing tables)
INSERT INTO public.studio_theme_versions (name, description, status, version_number, theme_config, layout_config, published_at)
SELECT
  'Production v1',
  'Initial snapshot of the currently live theme.',
  'published',
  1,
  COALESCE((SELECT config FROM public.theme_config WHERE is_active = true LIMIT 1), '{}'::jsonb),
  COALESCE((SELECT sections FROM public.layout_config WHERE page = 'homepage' LIMIT 1), '[]'::jsonb),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.studio_theme_versions WHERE status = 'published');

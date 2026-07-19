
-- Add show_on_homepage column to cj_settings for controlling homepage visibility
ALTER TABLE public.cj_settings ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.cj_settings.show_on_homepage IS 'Controls whether CJ Trending Products section appears on the homepage';

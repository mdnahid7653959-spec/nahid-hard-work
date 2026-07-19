ALTER TABLE public.cms_banners 
ADD COLUMN image_fit text NOT NULL DEFAULT 'cover',
ADD COLUMN image_position text NOT NULL DEFAULT 'center';
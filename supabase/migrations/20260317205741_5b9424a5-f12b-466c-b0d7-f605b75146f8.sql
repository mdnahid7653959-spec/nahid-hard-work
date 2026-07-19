DROP POLICY IF EXISTS "Anyone can view seller profile user_id" ON public.profiles;

CREATE OR REPLACE FUNCTION public.resolve_product_seller(_product_seller_id uuid)
RETURNS TABLE (
  seller_id uuid,
  user_id uuid,
  shop_name text,
  shop_logo text,
  shop_description text,
  rating_average numeric,
  rating_count integer,
  total_products integer,
  is_featured boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.user_id,
    sp.shop_name,
    sp.shop_logo,
    sp.shop_description,
    sp.rating_average,
    sp.rating_count,
    sp.total_products,
    sp.is_featured,
    sp.created_at
  FROM public.sellers_public sp
  WHERE sp.id = _product_seller_id
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.user_id,
    sp.shop_name,
    sp.shop_logo,
    sp.shop_description,
    sp.rating_average,
    sp.rating_count,
    sp.total_products,
    sp.is_featured,
    sp.created_at
  FROM public.profiles p
  JOIN public.sellers_public sp ON sp.user_id = p.user_id
  WHERE p.id = _product_seller_id
  LIMIT 1;
END;
$$;
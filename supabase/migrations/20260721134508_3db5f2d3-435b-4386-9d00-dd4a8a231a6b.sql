UPDATE public.staff_roles
SET default_permissions = (
  SELECT to_jsonb(array(SELECT DISTINCT unnest(
    ARRAY(SELECT jsonb_array_elements_text(default_permissions))
    || ARRAY['products.view','products.approve']
  )))
)
WHERE name = 'Seller Center Hub Staff';
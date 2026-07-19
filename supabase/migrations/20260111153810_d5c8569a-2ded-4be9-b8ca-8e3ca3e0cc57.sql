-- Strengthen the is_admin function with additional null checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  user_role text;
BEGIN
  -- Get current authenticated user ID
  current_user_id := auth.uid();
  
  -- Return false if no user is authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has admin role
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE user_id = current_user_id
  LIMIT 1;
  
  -- Return true only if role is exactly 'admin'
  RETURN COALESCE(user_role = 'admin', false);
END;
$function$;

-- Strengthen is_seller_or_admin function similarly
CREATE OR REPLACE FUNCTION public.is_seller_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  user_role text;
BEGIN
  -- Get current authenticated user ID
  current_user_id := auth.uid();
  
  -- Return false if no user is authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has admin or seller role
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE user_id = current_user_id
  LIMIT 1;
  
  -- Return true only if role is 'admin' or 'seller'
  RETURN COALESCE(user_role IN ('admin', 'seller'), false);
END;
$function$;

-- Create a trigger function to prevent role escalation
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow if the current user is an admin
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on profiles table to prevent role escalation
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
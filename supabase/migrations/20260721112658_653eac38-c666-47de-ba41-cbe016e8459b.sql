
REVOKE UPDATE, DELETE, TRUNCATE ON public.admin_activity_logs FROM anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.staff_audit_logs FROM anon, authenticated;
-- Keep INSERT for authenticated (policies still restrict), keep SELECT.

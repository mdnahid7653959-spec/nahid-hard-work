-- 1) Add explicit RLS policies (deny-all) to satisfy linter and prevent any client access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cj_api_tokens' AND policyname = 'deny_all_cj_tokens'
  ) THEN
    CREATE POLICY deny_all_cj_tokens
    ON public.cj_api_tokens
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- 2) Add a cooldown/lock column to avoid repeated auth attempts when rate-limited
ALTER TABLE public.cj_api_tokens
  ADD COLUMN IF NOT EXISTS last_auth_attempt_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_cj_api_tokens_last_auth_attempt_at
  ON public.cj_api_tokens (last_auth_attempt_at);

-- Ensure updated_at auto-maintenance (trigger function exists already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cj_api_tokens_updated_at'
  ) THEN
    CREATE TRIGGER trg_cj_api_tokens_updated_at
    BEFORE UPDATE ON public.cj_api_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
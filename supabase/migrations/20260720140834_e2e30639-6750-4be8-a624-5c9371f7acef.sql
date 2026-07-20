
-- Extend role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname='app_role' AND e.enumlabel='staff') THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.staff_status AS ENUM ('invited','active','suspended','deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.staff_task_status AS ENUM ('todo','in_progress','done','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Departments
CREATE TABLE IF NOT EXISTS public.staff_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_departments TO authenticated;
GRANT ALL ON public.staff_departments TO service_role;
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage departments" ON public.staff_departments FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read departments" ON public.staff_departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Roles
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.staff_departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  default_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  dashboard_key text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id, name)
);
GRANT SELECT ON public.staff_roles TO authenticated;
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff roles" ON public.staff_roles FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read staff roles" ON public.staff_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Staff members
CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  department_id uuid REFERENCES public.staff_departments(id) ON DELETE SET NULL,
  role_id uuid REFERENCES public.staff_roles(id) ON DELETE SET NULL,
  monthly_salary numeric(12,2) DEFAULT 0,
  joining_date date,
  status public.staff_status NOT NULL DEFAULT 'invited',
  invited_by uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff" ON public.staff_members FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff view own record" ON public.staff_members FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Staff update own profile fields" ON public.staff_members FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extra permission grants per staff
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, permission_key)
);
GRANT SELECT ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff perms" ON public.staff_permissions FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff view own perms" ON public.staff_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_permissions.staff_id AND sm.user_id = auth.uid()));

-- Invitations
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_invitations TO service_role;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service only invitations" ON public.staff_invitations FOR ALL
  USING (false) WITH CHECK (false);

-- Tasks
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  assigned_by uuid,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  status public.staff_task_status NOT NULL DEFAULT 'todo',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.staff_tasks TO authenticated;
GRANT ALL ON public.staff_tasks TO service_role;
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tasks" ON public.staff_tasks FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff view own tasks" ON public.staff_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_tasks.staff_id AND sm.user_id = auth.uid()));
CREATE POLICY "Staff update own tasks" ON public.staff_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_tasks.staff_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_tasks.staff_id AND sm.user_id = auth.uid()));

-- Messages
CREATE TABLE IF NOT EXISTS public.staff_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_admin_id uuid,
  to_staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.staff_messages TO authenticated;
GRANT ALL ON public.staff_messages TO service_role;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff messages" ON public.staff_messages FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff view own messages" ON public.staff_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_messages.to_staff_id AND sm.user_id = auth.uid()));
CREATE POLICY "Staff mark own messages read" ON public.staff_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_messages.to_staff_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_messages.to_staff_id AND sm.user_id = auth.uid()));

-- Audit
CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
  actor_user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_audit_logs TO authenticated;
GRANT ALL ON public.staff_audit_logs TO service_role;
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit" ON public.staff_audit_logs FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff view own audit" ON public.staff_audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.id = staff_audit_logs.staff_id AND sm.user_id = auth.uid()));

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_members WHERE user_id=_user_id AND status='active')
$$;

CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM public.staff_members WHERE user_id=auth.uid() AND status='active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.staff_effective_permissions(_staff_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT ARRAY(
    SELECT DISTINCT p FROM (
      SELECT jsonb_array_elements_text(COALESCE(r.default_permissions,'[]'::jsonb)) AS p
        FROM public.staff_members sm
        LEFT JOIN public.staff_roles r ON r.id = sm.role_id
        WHERE sm.id = _staff_id
      UNION
      SELECT permission_key FROM public.staff_permissions WHERE staff_id = _staff_id
    ) x WHERE p IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.staff_has_permission(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_members sm
    LEFT JOIN public.staff_roles r ON r.id = sm.role_id
    WHERE sm.user_id = _user_id
      AND sm.status = 'active'
      AND (
        COALESCE(r.default_permissions,'[]'::jsonb) ? _key
        OR EXISTS (SELECT 1 FROM public.staff_permissions sp WHERE sp.staff_id = sm.id AND sp.permission_key = _key)
      )
  )
$$;

-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER trg_staff_departments_updated BEFORE UPDATE ON public.staff_departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_staff_roles_updated BEFORE UPDATE ON public.staff_roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_staff_members_updated BEFORE UPDATE ON public.staff_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_staff_tasks_updated BEFORE UPDATE ON public.staff_tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed departments + default roles
INSERT INTO public.staff_departments (name, description) VALUES
  ('Sellers','Seller onboarding, approval, and support'),
  ('Products','Product catalog moderation and management'),
  ('Finance','Payouts, commissions, and financial reporting'),
  ('Marketing','Campaigns, coupons, and promotions'),
  ('Support','Customer support and messaging'),
  ('Delivery','Order fulfillment and delivery coordination')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.staff_roles (department_id, name, dashboard_key, default_permissions)
SELECT id, 'Seller Center Hub Staff', 'seller',
  '["sellers.view","sellers.approve","sellers.suspend","tasks.view","messages.view"]'::jsonb
FROM public.staff_departments WHERE name='Sellers'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_roles (department_id, name, dashboard_key, default_permissions)
SELECT id, 'Product Manager', 'product',
  '["products.view","products.edit","products.approve","categories.manage","tasks.view","messages.view"]'::jsonb
FROM public.staff_departments WHERE name='Products'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_roles (department_id, name, dashboard_key, default_permissions)
SELECT id, 'Finance Manager', 'finance',
  '["finance.view_reports","finance.process_payouts","commissions.manage","tasks.view","messages.view"]'::jsonb
FROM public.staff_departments WHERE name='Finance'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_roles (department_id, name, dashboard_key, default_permissions)
SELECT id, 'Marketing Manager', 'marketing',
  '["marketing.campaigns","marketing.coupons","marketing.banners","tasks.view","messages.view"]'::jsonb
FROM public.staff_departments WHERE name='Marketing'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_roles (department_id, name, dashboard_key, default_permissions)
SELECT id, 'Customer Support', 'support',
  '["support.tickets","support.messages","orders.view","tasks.view","messages.view"]'::jsonb
FROM public.staff_departments WHERE name='Support'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_roles (department_id, name, dashboard_key, default_permissions)
SELECT id, 'Order & Delivery Manager', 'delivery',
  '["orders.view","orders.update_status","delivery.assign","consignments.view","tasks.view","messages.view"]'::jsonb
FROM public.staff_departments WHERE name='Delivery'
ON CONFLICT DO NOTHING;

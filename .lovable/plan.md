# Enterprise Staff Management System

Integrated into the existing marketplace — no separate site, no separate subdomain. Super Admin manages everything from the current Admin Panel; staff log in through a dedicated staff route and are auto-routed to a dashboard scoped to their role and permissions.

## 1. Data Model (Lovable Cloud)

New tables (all with RLS + GRANTs + updated_at trigger):

- `staff_departments` — id, name (unique), description, is_active
- `staff_roles` — id, department_id (FK), name, description, default_permissions (jsonb array), dashboard_key (e.g. `seller`, `product`, `finance`, `marketing`, `support`, `delivery`), is_active
- `staff_members` — id, user_id (FK auth.users, unique, nullable until verified), full_name, email (unique, citext), phone, department_id, role_id, monthly_salary numeric, joining_date, status enum(`invited`,`active`,`suspended`,`deleted`), invited_by (admin id), invited_at, activated_at
- `staff_permissions` — id, staff_id (FK), permission_key text, granted_by, granted_at. Effective permissions = role.default_permissions ∪ staff_permissions rows.
- `staff_invitations` — id, staff_id, token_hash, expires_at, consumed_at
- `staff_tasks` — id, staff_id, assigned_by, title, description, priority, status(`todo`,`in_progress`,`done`,`cancelled`), due_date, completed_at
- `staff_messages` — id, from_admin_id, to_staff_id, subject, body, read_at
- `staff_audit_logs` — id, staff_id, action, target_type, target_id, metadata jsonb, ip, user_agent, created_at

Enum `app_role` extended with `staff`. Existing `user_roles` gets a `staff` row on activation.

Helper security-definer fns:
- `public.is_staff(uuid)` — boolean
- `public.staff_has_permission(uuid, text)` — boolean (checks role defaults + overrides + status='active')
- `public.current_staff()` — returns staff_members row for auth.uid()

RLS:
- staff_members: staff can read own row; admins full access.
- staff_tasks/messages: staff read/update rows where `staff_id = current_staff().id`; admins full access.
- Everything else: admin-only.

## 2. Edge Functions

- `staff-admin` (verify_jwt, admin-only): create/update/suspend/delete staff, assign tasks, send messages, resend invitations. Uses service role. Sends invite email via existing email infra (`send-transactional-email`) with a template `staff-invitation` linking to `/staff/activate?token=…`.
- `staff-activate`: validate token, create auth user (or link), set password, mark staff `active`, insert `user_roles` row.
- `staff-audit`: append-only logger called from the above.

New app email template `staff-invitation.tsx` in `_shared/transactional-email-templates/`.

## 3. Frontend Routes (inside existing app)

Public / auth:
- `/staff/login` — dedicated staff login (email+password against Supabase auth, but only allowed if `staff_members.status='active'`).
- `/staff/activate` — set password from invite token.

Protected (wrapped in `<StaffProtectedRoute>` that requires `is_staff` + status active, else redirect to `/staff/login`; blocks any `/admin/*` navigation):
- `/staff` — auto-redirects to the dashboard for the role's `dashboard_key`.
- `/staff/dashboard/seller|product|finance|marketing|support|delivery` — 6 dashboards, each rendering only cards/modules for which `staff_has_permission` is true.
- `/staff/tasks`, `/staff/messages`, `/staff/profile`, `/staff/notifications`.

Shared `StaffLayout` with dynamic sidebar built from effective permissions (no hardcoded per-role menus — permission keys drive visibility).

Admin panel additions (existing `/admin/*`):
- `/admin/staff` — list, filter by department/role/status, invite button, suspend/delete, resend invite.
- `/admin/staff/new` and `/admin/staff/:id` — create/edit form (name, email, phone, department, role, salary, permissions checkbox tree, joining date).
- `/admin/staff/departments` — manage departments + roles + default permissions.
- `/admin/staff/tasks` — assign/track tasks per staff.

## 4. Permissions Catalog

Central `src/lib/staffPermissions.ts` exporting grouped keys, e.g.:
`sellers.view`, `sellers.approve`, `products.view`, `products.edit`, `products.approve`, `orders.view`, `orders.update_status`, `delivery.assign`, `finance.view_reports`, `finance.process_payouts`, `marketing.campaigns`, `marketing.coupons`, `support.tickets`, `support.messages`, `analytics.view`.

Sidebar and dashboard cards check these keys via a `useStaffPermissions()` hook.

## 5. Security & Audit

- `StaffProtectedRoute` calls `getUser()` + fetches staff row; on any admin route attempt, redirect to `/staff`.
- `AdminProtectedRoute` explicitly rejects users whose only role is `staff`.
- Every write via `staff-admin` inserts a `staff_audit_logs` row.
- Session enforcement: on login, if `status != 'active'` → sign out immediately with clear error.
- Rate-limit login attempts client-side + rely on Supabase auth defaults.

## 6. Daily Work Dashboard

Header shows: today's tasks (due_date=today), pending count, completed today, unread notifications, unread admin messages, weekly completion rate. Below: quick-action cards filtered by permissions. Built once in `StaffDashboardHome`, then role-specific dashboards embed extra widgets.

## 7. Delivery Order

1. Migration: enums, tables, GRANTs, RLS, helper functions, triggers, seed departments/roles/permissions.
2. Edge functions + email template + deploy.
3. Staff frontend: routes, layout, protected route, login, activate, dashboards, tasks, messages, profile.
4. Admin frontend: staff CRUD, departments/roles, task assignment, message composer, audit log viewer.
5. Wire `AdminProtectedRoute` to block staff-only users; add `/staff` link from admin sidebar.
6. Smoke test: invite → email → activate → login → auto-redirect → permission-gated sidebar → admin URL blocked → task complete → audit log entry.

## Technical Notes

- Uses existing Supabase auth (no parallel auth system) — staff are `auth.users` with `user_roles.role='staff'` plus a `staff_members` profile row. This keeps one identity system while separating admin and staff surfaces via route guards.
- Permissions are data, not code: adding a new module = new permission key + sidebar entry gated on that key. Reassigning responsibilities = toggling checkboxes in `/admin/staff/:id`, no deploy.
- Email uses the existing Lovable email infra already scaffolded in the project.

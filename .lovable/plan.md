
# Multi-Vendor Admin Command Center — Activation & Completion Plan

Project e already ekta bishal admin panel er code ache (30+ admin pages + edge functions + migrations). Kintu backend connect na thakay kichui kaj korche na. Ei plan ta 2 phase e kaj shesh korbe: (1) existing code ke live korbo, (2) missing/weak areas gulo ke production-grade command hub e upgrade korbo.

## Phase 1 — Backend Activation (Foundation)

1. **Lovable Cloud enable** — automatic Postgres + Auth + Storage + Edge Functions provision.
2. **Migrations run** — 40+ existing SQL migrations apply hobe (admin_credentials, products, categories, brands, orders, users, coupons, reviews, sellers, shipping, commissions, inventory, loyalty, CMS, etc.)
3. **Edge functions deploy** — `admin-auth` (login/session/password), plus supporting functions.
4. **Default admin seed verify** —
   - Admin ID: `HI Admin`
   - Password: `MegaMart@Admin#2026!`
   - First login er por force password change.
5. **Storage buckets** — product images, brand logos, category icons, CMS media, user avatars.

## Phase 2 — Command Hub Feature Completion

Existing admin routes gulo audit kore missing wiring, real data, ebong bulk-actions add korbo:

| Module | Capabilities |
|---|---|
| **Dashboard** | Real-time KPIs (revenue, orders, GMV, active users, top vendors), charts, alerts |
| **Users** | List/search/filter, ban/unban, role assign, impersonate, delete, export CSV |
| **Vendors/Sellers** | Approve/reject applications, KYC docs, commission tier, payout status, suspend |
| **Products** | CRUD, bulk import/export, approval queue, feature toggle, stock sync, CJ dropship |
| **Categories & Brands** | Tree editor, drag-reorder, icon upload, SEO fields |
| **Orders** | Full lifecycle (pending → delivered → refund), invoice PDF, tracking, split-vendor orders |
| **Inventory** | Stock alerts, low-stock threshold, warehouse view |
| **Coupons & Marketing** | Percentage/fixed/BOGO, usage caps, campaign scheduler, push notifications |
| **Reviews** | Moderate, flag spam, reply as admin |
| **Shipping** | Zone/rate matrix, courier integrations, free-delivery rules |
| **Commissions** | Per-vendor % or flat, auto-calc on order, payout ledger |
| **Loyalty** | Points rules, tiers, redemption |
| **Reports** | Sales, vendor performance, tax, exportable |
| **CMS** | Banners, pages, homepage sections, theme builder |
| **Security** | Audit log, session list, 2FA toggle, IP allow-list |
| **Settings** | Store info, payments, taxes, CJ dropship API, email templates |

## Phase 3 — Role & Permission Layer

- `app_role` enum: `super_admin`, `admin`, `manager`, `support`, `vendor`.
- `user_roles` table (separate — never on profiles).
- `has_role()` security-definer function powers RLS on every admin-facing table.
- Granular per-module permissions matrix editable from Admin → Security → Roles.

## Phase 4 — Polish

- Global command palette (⌘K) for jump-to-anything.
- Consistent orange/white theme match with storefront.
- Mobile-responsive admin (works on tablet + phone).
- Toast + audit-log on every destructive action.

## Technical Notes

- Roles table pattern (per platform standard) prevents privilege escalation.
- All admin tables get RLS + `has_role(auth.uid(), 'admin')` policies.
- Edge functions handle password hashing (bcrypt) and session token issuance.
- Storage RLS: admins full, vendors scoped to own bucket path.

## What I need from you

Just confirm: **"go ahead"** — ami Cloud enable kore migrations chalabo, then modules ek ek kore live korbo. Prothom login er por default password change korte hobe.

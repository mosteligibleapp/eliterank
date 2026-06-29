-- 103_restrict_anon_pii_columns
--
-- SECURITY HARDENING: stop the public (anon) Supabase key from reading PII
-- columns on user-account / organization rows.
--
-- Background
-- ----------
-- The anon key ships inside the front-end JS bundle, so it is effectively
-- public. Both `profiles` and `organizations` have a blanket
-- `SELECT ... USING (true)` RLS policy for the `public` role, which meant
-- ANYONE with the anon key could query, e.g.:
--     GET /rest/v1/profiles?select=email,phone,shipping_address
--     GET /rest/v1/organizations?select=stripe_connect_account_id,kyc_status
-- and harvest every user's email / phone / home address and every host's
-- Stripe/KYC state. RLS is row-level and cannot hide columns, so we layer
-- PostgreSQL *column-level* privileges on top of the existing policies.
--
-- Approach
-- --------
-- Revoke the table-wide SELECT grant from `anon`, then grant SELECT back on
-- ONLY the non-sensitive "display" columns that public pages legitimately
-- render (names, avatars, bios, social handles, vote counts, etc.).
--
-- `authenticated` and `service_role` are intentionally left untouched: a
-- logged-in user still reads their own full profile, and edge functions /
-- dashboards keep working. (Restricting cross-user reads for authenticated
-- users is a separate, larger change — see the follow-up note at the end.)
--
-- IMPORTANT: because anon now lacks SELECT on the excluded columns, any anon
-- query that does `select('*')` (or an embedded `table(*)`) on these tables
-- will error. The accompanying front-end change converts every
-- anon-reachable `*`/embed on these tables to an explicit safe-column list.
-- New sensitive columns are excluded by default (fail closed); add new SAFE
-- display columns to the GRANTs below when you add them. The front-end mirrors
-- these lists in src/constants/safeColumns.js (PROFILE_PUBLIC_COLS /
-- ORG_PUBLIC_COLS) — keep the two in sync.
--
-- EMERGENCY ROLLBACK (re-opens the exposure — use only if this breaks prod):
--     grant select on public.profiles to anon;
--     grant select on public.organizations to anon;
-- That restores the previous (wide-open) behavior. The forward fix for any
-- breakage is to add the missing column to the GRANTs below + safeColumns.js,
-- not to roll back.

begin;

-- ---------------------------------------------------------------------------
-- profiles  (the user-account table)
-- Excluded from anon: email, phone, shipping_address, onesignal_external_id,
--                     notification_preferences, bonus_actions, is_super_admin
-- ---------------------------------------------------------------------------
revoke select on public.profiles from anon;

grant select (
  id,
  first_name,
  last_name,
  bio,
  city,
  avatar_url,
  instagram,
  twitter,
  tiktok,
  linkedin,
  website,
  headline,
  occupation,
  age,
  username,
  interests,
  cover_image,
  gallery,
  intro_video_url,
  total_votes_received,
  total_competitions,
  wins,
  best_placement,
  fan_count,
  is_host,
  created_at,
  updated_at,
  onboarded_at
) on public.profiles to anon;

-- ---------------------------------------------------------------------------
-- organizations
-- Excluded from anon: stripe_connect_account_id, kyc_status, charges_enabled,
--                     payouts_enabled, connect_details_submitted,
--                     connect_onboarded_at, owner_id, legal_entity_name,
--                     master_agreement_version, master_agreement_accepted_at,
--                     master_agreement_accepted_by
-- ---------------------------------------------------------------------------
-- is_managed is referenced in the anon grant below. It is created by the
-- managed-organizations migration, which sorts AFTER this one, so guarantee it
-- exists here too (idempotent) — otherwise a from-scratch deploy would fail on
-- the grant before the column-creating migration runs. No-op on any DB that
-- already has the column (incl. prod).
alter table public.organizations add column if not exists is_managed boolean not null default false;

revoke select on public.organizations from anon;

grant select (
  id,
  name,
  slug,
  logo,
  tagline,
  description,
  cover_image,
  total_competitions,
  total_cities,
  total_contestants,
  created_at,
  updated_at,
  logo_url,
  default_about_tagline,
  default_about_description,
  default_about_traits,
  default_age_range,
  default_requirement,
  default_theme_primary,
  default_theme_voting,
  default_theme_resurrection,
  header_logo_url,
  website_url,
  org_type,
  instagram,
  tiktok,
  facebook,
  is_managed
) on public.organizations to anon;

-- Defensive: make sure the normal full-table grants for trusted roles are
-- still in place (no-ops if they already exist).
grant select on public.profiles to authenticated;
grant select on public.organizations to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- FOLLOW-UPS (not done here, tracked separately):
--
-- 1. nominees: still exposes name/email/phone/invite_token to anon because the
--    magic-link claim + login funnels read those columns while logged out.
--    Closing it safely requires moving those lookups to SECURITY DEFINER RPCs
--    (e.g. get_nomination_for_claim(token), get_pending_nominations(email))
--    and then revoking the columns from anon. invite_token being world-readable
--    is the most serious item (nomination-claim hijack).
--
-- 2. contestants: the public competition select reads contestants.email for
--    anon — should be dropped from anon the same way as profiles.
--
-- 3. Cross-user reads for authenticated users: any logged-in user can still
--    read every other user's email/phone (the `USING (true)` SELECT policy).
--    Tightening this needs a public-safe view + repointed front-end queries.
-- ---------------------------------------------------------------------------

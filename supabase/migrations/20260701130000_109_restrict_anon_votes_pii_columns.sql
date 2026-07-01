-- Migration 109: stop the anon Supabase key from reading voter PII on `votes`.
--
-- Companion to 103_restrict_anon_pii_columns (profiles + organizations). The
-- `votes` table also had a table-wide anon SELECT grant plus a
-- "Public can view votes" USING(true) policy, so anyone with the public anon
-- key could harvest every voter's email + identity:
--     GET /rest/v1/votes?select=voter_email,voter_id,contestant_id
--
-- RLS is row-level and can't hide columns, so layer column-level privileges:
-- revoke the table-wide anon grant and re-grant only the non-PII columns that
-- public paths legitimately read (vote counts for tallies, and filtering by
-- payment_intent_id for the client-side paid-vote idempotency check).
-- Excluded from anon: voter_email, voter_id.
--
-- authenticated / service_role keep full access (the host AudienceManager and
-- edge functions need voter_email). Rollback: grant select on votes to anon;
--
-- NOTE: this was applied to production directly on 2026-07-01 as an urgent
-- hotfix (the anon PII exposure was live); this file records it so repo and
-- prod stay in sync. It is idempotent to re-apply.

revoke select on public.votes from anon;
grant select (
  id, competition_id, contestant_id, vote_count, amount_paid,
  payment_intent_id, is_double_vote, created_at
) on public.votes to anon;

-- Defensive: ensure trusted roles keep full table access (no-op if present).
grant select on public.votes to authenticated;

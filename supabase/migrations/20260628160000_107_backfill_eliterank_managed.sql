-- =============================================================================
-- Migration 107: mark the EliteRank org(s) as managed (company-run)
-- =============================================================================
-- The original backfill in migration 105 only matched "Most Eligible". EliteRank
-- runs its own competitions too, so its org(s) should also be managed. On any DB
-- where 105 already ran (e.g. prod), that backfill won't re-run, so set it here.
--
-- The protect-is_managed trigger (migration 106) blocks is_managed changes from
-- any non-super-admin caller — including this migration, which runs as the table
-- owner with no auth context. Temporarily disable the trigger for this one
-- controlled data fix, then re-enable it. Idempotent: a no-op where the orgs are
-- already managed (incl. a fresh deploy, where 105's broadened backfill already
-- covered them).
-- =============================================================================

ALTER TABLE organizations DISABLE TRIGGER trg_protect_org_is_managed;

UPDATE organizations SET is_managed = true
  WHERE name ILIKE '%most eligible%' OR name ILIKE '%elite%rank%';

ALTER TABLE organizations ENABLE TRIGGER trg_protect_org_is_managed;

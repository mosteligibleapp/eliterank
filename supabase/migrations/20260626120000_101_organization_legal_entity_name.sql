-- 101_organization_legal_entity_name.sql
--
-- Optional registered legal entity name for an organization (e.g. "Acme Events
-- LLC"). Shown as the Host on a competition's public Official Rules so a
-- third-party host is attributed by its legal entity rather than only its
-- display/brand name. Falls back to organizations.name when null.
--
-- The legal entity is independently verified by Stripe at Connect KYC; this
-- column is the host-stated name surfaced in the rules text, not a source of
-- truth for identity/tax.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS legal_entity_name TEXT;

COMMENT ON COLUMN organizations.legal_entity_name IS
  'Host-stated registered legal entity name (e.g. "Acme Events LLC") shown as the Host on Official Rules. Falls back to organizations.name when null.';
</content>

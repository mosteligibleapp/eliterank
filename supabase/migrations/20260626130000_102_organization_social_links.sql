-- 102_organization_social_links.sql
--
-- Host (organization) social handles surfaced on the public competition page,
-- beneath the sponsors section. Website (website_url) and Instagram (instagram)
-- already exist on organizations; add TikTok and Facebook. Hosts set these in
-- onboarding / the Site tab branding editor. Values may be a handle or a full
-- URL — the UI normalizes to a link. Only filled platforms display publicly.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS facebook TEXT;

COMMENT ON COLUMN organizations.tiktok IS
  'Host organization TikTok handle or URL, shown on the public competition page.';
COMMENT ON COLUMN organizations.facebook IS
  'Host organization Facebook handle or URL, shown on the public competition page.';
</content>

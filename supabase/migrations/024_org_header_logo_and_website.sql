-- Add header_logo_url (wide logo with org name baked in) and website_url to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS header_logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website_url TEXT;

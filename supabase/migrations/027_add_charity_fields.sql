-- Add charity fields to competitions table
-- Allows hosts to highlight a charity that benefits from competition proceeds
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS charity_name TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS charity_logo_url TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS charity_website_url TEXT;

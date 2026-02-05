-- Add missing columns to nominees table for nomination forms

-- For self-nomination eligibility responses
ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS eligibility_answers JSONB DEFAULT NULL;

-- For nominee's Instagram handle
ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT NULL;

-- For third-party nominations - nominator info
ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS nomination_reason TEXT DEFAULT NULL;

ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS nominator_name TEXT DEFAULT NULL;

ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS nominator_email TEXT DEFAULT NULL;

ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS nominator_anonymous BOOLEAN DEFAULT FALSE;

ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS nominator_notify BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN nominees.eligibility_answers IS 'JSON object storing eligibility question answers (e.g., lives_in_city, is_single, is_age_eligible)';
COMMENT ON COLUMN nominees.instagram IS 'Instagram handle of the nominee';
COMMENT ON COLUMN nominees.nomination_reason IS 'Why the nominator nominated this person (for third-party nominations)';
COMMENT ON COLUMN nominees.nominator_name IS 'Name of the person who submitted the nomination';
COMMENT ON COLUMN nominees.nominator_email IS 'Email of the person who submitted the nomination';
COMMENT ON COLUMN nominees.nominator_anonymous IS 'Whether the nominator wants to remain anonymous';
COMMENT ON COLUMN nominees.nominator_notify IS 'Whether to notify the nominator when nominee enters';

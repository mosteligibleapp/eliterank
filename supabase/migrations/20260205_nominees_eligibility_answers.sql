-- Add eligibility_answers column to nominees table for storing self-nomination eligibility responses
ALTER TABLE nominees
ADD COLUMN IF NOT EXISTS eligibility_answers JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN nominees.eligibility_answers IS 'JSON object storing eligibility question answers (e.g., lives_in_city, is_single, is_age_eligible)';

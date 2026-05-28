-- Add a gender column to nominees and contestants for competitions that split
-- winners by gender (competitions.winners_split_by_gender = true).
--
-- The public nomination form prompts for "legally and medically recognized"
-- male or female when the host has enabled gender division. The value is
-- copied from nominees → contestants when the host approves the nomination,
-- so winner-selection logic can later filter by gender on the contestants
-- table alone.

ALTER TABLE nominees
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IS NULL OR gender IN ('male', 'female'));

ALTER TABLE contestants
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IS NULL OR gender IN ('male', 'female'));

COMMENT ON COLUMN nominees.gender IS
  'Legally and medically recognized gender. Collected on the nomination form when competitions.winners_split_by_gender is true; null otherwise.';

COMMENT ON COLUMN contestants.gender IS
  'Legally and medically recognized gender, copied from the originating nominee on approval. Used to split winners when competitions.winners_split_by_gender is true.';

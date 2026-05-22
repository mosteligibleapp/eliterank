-- Lets a host gray out Setup-tab sections they are not using.
-- Stores the section ids that should render dimmed and sort to the bottom.
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS hidden_setup_sections text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.competitions.hidden_setup_sections IS
  'Setup-tab section ids the host has grayed out (rendered dimmed, sorted last).';

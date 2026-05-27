-- Drop the catch-all "Allow competition updates" policy that let any
-- authenticated user UPDATE any competition. Three correctly-scoped UPDATE
-- policies remain and cover every legitimate write path:
--   * competitions_update                -- host_id = auth.uid() OR is_super_admin()
--   * co_hosts_update_competition        -- caller is a co-host
--   * Super admins can manage competitions
DROP POLICY IF EXISTS "Allow competition updates" ON public.competitions;

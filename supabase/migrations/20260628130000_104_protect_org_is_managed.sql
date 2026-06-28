-- =============================================================================
-- Migration 104: protect organizations.is_managed from non-super-admin writes
-- =============================================================================
-- Hosts and co-hosts can UPDATE their own organization row (e.g. branding) via
-- the hosts_update_own_org / co_hosts_update_own_org RLS policies. Postgres RLS
-- is row-level, not column-level, so without this guard a host could set
-- is_managed = true on their own org with a direct API call and self-bypass the
-- Host Agreement + Stripe-KYC launch gates (migration 103). Only a super admin
-- may change is_managed.
--
-- The trigger only fires when is_managed actually changes, so legitimate org
-- updates (branding by hosts, KYC/payout sync by the service-role edge function)
-- are unaffected. is_managed has no host- or RPC-driven write path — it is set
-- exclusively by super admins via the admin Organizations editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION _protect_org_is_managed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_managed IS DISTINCT FROM OLD.is_managed AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only a super admin can change organizations.is_managed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_is_managed ON organizations;
CREATE TRIGGER trg_protect_org_is_managed
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION _protect_org_is_managed();

-- It's a trigger function — it fires as the trigger regardless of EXECUTE grant,
-- and is meaningless to call directly (it references NEW/OLD). Revoke the default
-- public grant so it isn't a needlessly-callable SECURITY DEFINER function.
REVOKE EXECUTE ON FUNCTION _protect_org_is_managed() FROM PUBLIC;

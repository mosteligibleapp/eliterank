-- 061_vault_service_role_key_rpc.sql
--
-- Adds get_email_service_key() so edge functions can pull the current
-- service-role key from vault at request time. This sidesteps the May 17
-- incident where the edge runtime's injected SUPABASE_SERVICE_ROLE_KEY went
-- stale (rejected by verify_jwt on cross-function invokes) while the vault
-- copy stayed current. The orchestrator now reads from vault instead of
-- trusting the runtime env when calling sibling functions.
--
-- Granted to service_role only. The caller already holds a service-role
-- JWT to reach this RPC, so returning the canonical key leaks nothing —
-- it just guarantees they have the *current* one.

create or replace function public.get_email_service_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;
$$;

revoke all on function public.get_email_service_key() from public, anon, authenticated;
grant execute on function public.get_email_service_key() to service_role;

comment on function public.get_email_service_key() is
  'Returns the current service-role key from vault. Used by edge functions when invoking sibling functions, to avoid reliance on the (sometimes stale) runtime SUPABASE_SERVICE_ROLE_KEY env var. service_role only.';

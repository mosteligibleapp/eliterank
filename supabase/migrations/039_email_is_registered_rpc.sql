-- Public RPC to check whether an email is already registered in auth.users.
-- Needed so the signup flow can redirect already-registered users to the
-- login step at email entry, instead of letting them fill out the whole
-- signup form only to hit "User already registered" on submit.
--
-- Exposes whether an account exists (standard email-enumeration tradeoff
-- also present in most consumer products). Accepts either case — emails
-- are stored lowercased in auth.users, but we lower() both sides to be
-- defensive.
CREATE OR REPLACE FUNCTION public.email_is_registered(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF email_input IS NULL OR email_input = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS(
    SELECT 1
    FROM auth.users
    WHERE LOWER(email) = LOWER(email_input)
  );
END;
$$;

-- Callable from the browser. anon for signed-out visitors filling out the
-- email step; authenticated so logged-in sessions hitting the flow still
-- work.
GRANT EXECUTE ON FUNCTION public.email_is_registered(TEXT) TO anon, authenticated;

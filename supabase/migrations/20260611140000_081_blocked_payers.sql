-- Blocklist of payers who have charged back a paid-vote purchase.
--
-- Friendly-fraud chargebacks (a voter disputing the card charge after their
-- contestant loses) are our main dispute vector. When Stripe notifies us of a
-- dispute (charge.dispute.created), the stripe-webhook function records the
-- payer's billing email and card fingerprint here. New purchases from a
-- blocked payer are then refused: create-payment-intent rejects known emails
-- up front, and stripe-webhook refuses to credit + auto-refunds on the
-- authoritative charge details (email OR card fingerprint).
--
-- Written and read exclusively by edge functions using the service-role key,
-- which bypasses RLS. RLS is enabled with only a super-admin read policy so
-- this PII/abuse list is never exposed to anon or authenticated clients.

CREATE TABLE IF NOT EXISTS blocked_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lowercased billing email. Either email or card_fingerprint may be null,
  -- but at least one must be present to be a usable block.
  email TEXT,
  -- Stripe PaymentMethod card fingerprint — stable across re-entry of the
  -- same physical card, so it catches a blocked payer using a new email.
  card_fingerprint TEXT,
  reason TEXT NOT NULL DEFAULT 'chargeback',
  -- Source dispute / payment for audit + idempotency.
  dispute_id TEXT,
  payment_intent_id TEXT,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blocked_payers_identifier_present
    CHECK (email IS NOT NULL OR card_fingerprint IS NOT NULL)
);

-- One row per dispute so re-delivered dispute webhooks don't pile up dupes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_payers_dispute_id
  ON blocked_payers(dispute_id)
  WHERE dispute_id IS NOT NULL;

-- Lookups at purchase time are by email or card fingerprint.
CREATE INDEX IF NOT EXISTS idx_blocked_payers_email
  ON blocked_payers(lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blocked_payers_card_fingerprint
  ON blocked_payers(card_fingerprint)
  WHERE card_fingerprint IS NOT NULL;

ALTER TABLE blocked_payers ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated access. Super admins may read for support/triage.
DROP POLICY IF EXISTS "Super admins can view blocked payers" ON blocked_payers;
CREATE POLICY "Super admins can view blocked payers" ON blocked_payers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
    )
  );

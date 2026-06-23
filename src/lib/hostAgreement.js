import { supabase } from './supabase';

/**
 * Promoter / Master (Host) Agreement.
 *
 * The Sponsor-of-record ORGANIZATION must accept this agreement BEFORE it can
 * connect Stripe, and acceptance (current version) + Stripe verification are
 * both required before a competition can be published (§ host onboarding flow).
 *
 * Acceptance is recorded org-level, versioned, hashed and timestamped via the
 * `accept_master_agreement` RPC (migration 083). We store a SHA-256 hash of the
 * EXACT text below so we can always prove which wording was agreed to.
 *
 * ⚠️ PLACEHOLDER TEXT — replace `HOST_AGREEMENT_BODY` with the finalized legal
 * language, and BUMP `HOST_AGREEMENT_VERSION` whenever the text changes (a new
 * version forces hosts to re-accept and re-gates publishing until they do).
 */

export const HOST_AGREEMENT_VERSION = '2026-06-draft-1';

export const HOST_AGREEMENT_TITLE = 'EliteRank Promoter / Host Agreement';

// PLACEHOLDER — pending finalized language from the founder.
export const HOST_AGREEMENT_BODY = `EliteRank Promoter / Host Agreement (DRAFT — placeholder)

This is placeholder text. The finalized Promoter / Host Agreement language will
replace this section before launch. By accepting, the host organization (the
"Sponsor of record") agrees to operate competitions on EliteRank in accordance
with the platform's terms, including but not limited to:

1. Platform fee. EliteRank retains a platform fee (currently 15%) on paid votes;
   the remaining balance settles to the host's connected Stripe account.

2. Merchant of record. The host organization is the merchant of record for its
   competitions and is responsible for prize fulfillment, applicable taxes, and
   compliance with all applicable laws in the jurisdictions it operates.

3. Identity & payouts. The host completes Stripe Connect identity verification
   (KYC) directly with Stripe; EliteRank never stores raw SSN/EIN or identity
   documents.

4. Conduct & content. The host is responsible for the lawful, accurate, and
   non-deceptive operation of its competitions and the content it publishes.

[Full agreement text to be inserted here.]`;

/**
 * Compute the SHA-256 hex digest of the agreement text. Used to bind an
 * acceptance to the exact wording the host saw.
 */
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Whether an org has accepted the CURRENT agreement version. Takes either the
 * raw org row (master_agreement_version) or the dashboard's mapped agreement
 * object ({ version }).
 */
export function hasAcceptedCurrentAgreement(orgOrAgreement) {
  const version =
    orgOrAgreement?.master_agreement_version ?? orgOrAgreement?.version ?? null;
  return version === HOST_AGREEMENT_VERSION;
}

/**
 * Record acceptance of the current agreement for an organization. Computes the
 * hash of the exact text and calls the `accept_master_agreement` RPC, which
 * authorizes the caller (owner / host / co-host) and writes the audit row +
 * org snapshot atomically. Returns the updated organization row.
 */
export async function acceptHostAgreement(organizationId) {
  if (!organizationId) throw new Error('No organization to accept for.');
  const hash = await sha256Hex(HOST_AGREEMENT_BODY);
  const { data, error } = await supabase.rpc('accept_master_agreement', {
    p_organization_id: organizationId,
    p_version: HOST_AGREEMENT_VERSION,
    p_hash: hash,
    p_user_agent:
      typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 400) : null,
  });
  if (error) throw error;
  return data;
}

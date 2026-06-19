# Compliance Dev Guide (v1) — Reconciliation Against the Live Codebase

**Status:** Engineering reconciliation. No code changed.
**Inputs:** *EliteRank Developer Implementation Guide v1* + *Compliance Architecture Summary v11/v13*.
**Companion:** `docs/COMPETITION_RULES_GAP_ANALYSIS.md` (earlier 10-point spec analysis — partially superseded by this).

> ⚠️ Structural/engineering map, not legal advice. Items flagged "decision" or
> "verify with counsel" must be resolved with legal before implementation.

---

## 0. The core reframing

The dev guide is written **greenfield** ("Phase 0 must exist before any money moves").
EliteRank is **live** — it already takes vote payments, runs rounds, scores judges, and
crowns winners. So this is a **retrofit-by-invariant exercise**, not a clean build, and the
guide's foundational assumptions collide with current reality in two structural ways:

1. **Host model.** The guide's `host` is a **legal entity** (`legal_entity_name // not a
   person`, EIN, Stripe Connect account, signed Promoter Agreement). Today a host is a
   **`profiles` row with `is_host = true`** — an individual person, no entity, no EIN, no
   Connect, no agreement (`admin/.../HostsManager.jsx`).
2. **Money flow.** The guide mandates **direct charges to the host's connected account**,
   funds never pooling in EliteRank. Today **all vote money settles to EliteRank's own
   Stripe account** (`create-payment-intent/index.ts` uses the platform key), and the host
   is paid a % manually after the competition (`HostPayoutCard.jsx`).

Phase 0 is therefore a **rebuild of the host + money model underneath a running platform**,
not a green-field starting point.

---

## 1. Critical-Invariant scorecard (guide §7 vs. current code)

| # | Invariant | Status | Evidence / note |
|---|---|---|---|
| 1 | Funds never pool in EliteRank account (direct charges) | ❌ Violated | Plain PaymentIntents to platform account; manual host payout. No Connect. |
| 2 | Judge weight ≥60% of prize-determining round | ⚠️ Partial | `voting_rounds.judge_weight` (0–100) + `competitions.judges_score_weight_pct` exist; **no floor enforced** (can be 0). |
| 2a | With entry fee, votes can't decide winner↔loser | 🆕 N/A today | No entry fees (#531). **The key new rule** — see §3. |
| 3 | Free, equal-weight AMOE always exists | ✅ Satisfied | 1 free vote / 24h; free + paid both counted (`src/lib/votes.js`). |
| 4 | Platform never crowns without host confirmation | ❌ Violated | `finalize_voting_round`/`ensure_round_state` auto-crown winners on round close. No sign-off step. |
| 5 | Locked fields immutable after nominations open | ❌ Missing | No field-locking. #541 (gender toggle) is one slice, not built. |
| 6 | Judging criteria disclosed + frozen post-open | ⚠️ Partial | `judging_criteria` table exists but mutable; not provably injected into rules. |
| 7 | Immutable AMOE / void-where-prohibited header everywhere | ❌ Omitted by design | `ContestTermsPage.jsx:8-12` intentionally omits AMOE. **Decision, not bug.** |
| 8 | Append-only audit log, ≥5yr retention | ❌ Missing | No audit infrastructure. |
| 9 | Abandonment idempotent (reversal + permanent ban, no winner) | ❌ Missing | No abandonment flow; `status` has no `withdrawn`; no `launch_banned` flag. |
| 10 | Prize ARV off public showcase; charity % front-facing | ⚠️ Partial | Rewards showcase exists; no ARV-placement enforcement; charity has name/logo but **no `%` field**. |
| 11 | No biometric / face processing by default | ✅ Satisfied | Photos stored as images; no face processing. |
| 12 | Raw card data never stored | ✅ Satisfied | Tokenized via Stripe. |
| 13 | Cancellation disclosure split (public neutral / host-ban internal) | ❌ Missing | No cancellation flow. |

**Tally:** 3 satisfied (3, 11, 12), 3 partial (2, 6, 10), 7 missing/violated. Invariants
**1, 4, 5, 7** are violated by *intentional current design* → require a conscious decision
to reverse, not just a ticket.

---

## 2. State machine gap (guide §4 vs. current)

Current lifecycle: `competitions.status`/`phase` + `voting_rounds` advanced lazily by
`ensure_round_state()` (pull-based, runs on page load / vote). It has **no**:
- `GATING` stage (no launch-gating engine / state checks / host acknowledgment),
- `WINNER_PENDING_HOST_CONFIRM` stage (platform auto-crowns — violates Invariant 4),
- `ABANDONED` stage (no abandonment handler — Invariant 9),
- field-lock trigger on `nominations_opened_at` (Invariant 5),
- server-side transition guards of the kind the guide specifies.

Retrofitting the state machine is a prerequisite for invariants 4, 5, 9.

---

## 3. The new, load-bearing rule worth highlighting: §5.6 / Invariant 2a

The smartest, most concrete addition. It resolves the #531 entry-fee question with an
**enforceable** rule:

> With an entry fee charged: votes may **never** move a contestant winner↔loser. Judges
> determine the winner set (skill gate); votes may only rank/allocate **within** that set.
> Single winner → judge-dominant outright. No-entry-fee competitions may let votes decide.

Implications if entry fees are ever added:
- `finalize_voting_round` needs a **fee-aware branch** (today it has no such guard).
- The judge-weight **floor (Invariant 2) becomes mandatory**, not optional config.
- This is testable: reject any config where a vote round can change winner-vs-loser status
  in a fee-paying competition.

---

## 4. Still unaddressed: the first-party host (EliteRank hosts its own competition)

Both the compliance doc and this guide assume **third-party legal-entity hosts**. The
`host` data model literally requires `legal_entity_name // not a person` + EIN + a
connected account + a Promoter Agreement between two parties. None of that maps when
**Most Eligible is the host** (e.g., the #573 competition):
- Sponsor and Administrator are the same entity — the separation collapses.
- Whose connected account? There is no second party to sign a Promoter Agreement.
- The consumer-facing "sponsored by [Host], not EliteRank" line becomes a misstatement.

**Needs an explicit first-party mode** in the spec, or the data model contradicts
EliteRank's own competitions on day one. Recommend filing as its own gap against the doc.

---

## 5. The four gating decisions (resolve before building)

Three reverse current code; all want counsel sign-off.

| Decision | Current | Guide | Cascade |
|---|---|---|---|
| **Contestant entry fees?** | $0 (load-bearing for skill posture) | Allowed, "production cost" | Turns on 2a, judge floor, AMOE header (§6.5). #531. |
| **AMOE header?** | Intentionally omitted | Hardcoded everywhere | Reverses `ContestTermsPage.jsx:8-12`. |
| **Host = legal entity + Connect?** | Host = individual `profiles` row; funds pool in EliteRank | Entity + EIN + direct charges | Phase 0 rebuild. |
| **First-party mode?** | Implicit (Most Eligible hosts) | Not addressed | Needs a defined mode. |

---

## 6. Recommended sequencing (retrofit, not green-field)

1. **Make the four §5 decisions** (with counsel) — cheap to decide, expensive to guess.
2. **Connect migration (Invariant 1)** — the long pole, reportedly imminent. Unblocks 9 +
   reserve/refund mechanics; biggest codebase change. (See `COMPETITION_RULES_GAP_ANALYSIS.md`
   §"Stripe Connect" for the charge-type analysis: Express + direct charges.)
3. **Decision-free quick wins (additive, high-leverage):**
   - Append-only audit log (Invariant 8).
   - Host-confirmation gate on finalization (Invariant 4) — directly fixes "platform
     auto-crowns" exposure; also addresses #573-class integrity.
4. **Bundle with the entry-fee decision (ship together or not at all):**
   - Judge-weight floor enforcement (Invariant 2).
   - Fee-aware winner-determination branch (Invariant 2a / §5.6).
   - Field-locking (Invariants 5, 6; absorbs #541).
5. **National / advanced (guide Phases 2–3):** per-state gating, NY photo exemption, Stripe
   Tax, CCV/charity %, DMCA agent, platform ToS + arbitration, BIPA guardrails — each its
   own project; mostly net-new.

**Hard gate (from the guide):** Phase 0 + invariants must hold before the platform takes a
real payment — but EliteRank already takes payments, so this becomes "before the *next*
competition launches on the new host/money model."

---

## 7. Map to existing follow-up issues

| Issue | Relation |
|---|---|
| #531 (entry-fee tripwire) | Resolved-in-principle by §5.6/2a; still a go/no-go decision. |
| #541 (gender-toggle lock) | Subset of field-locking (Invariant 5 / guide §5.7). |
| #526 (persist sponsor wizard prizes/in-kind) | Prereq for in-kind prize + 1099-filer routing (compliance §12.4). |
| #577 (prize basket/tax structure) | Superseded by compliance §12.1/§12.4/§12.5. |
| #573 (post-cutoff votes) | Related to abandonment auto-reversal + Connect refund-from-correct-account. |

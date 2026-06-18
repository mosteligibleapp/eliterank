# Competition "Game Rules" — Gap Analysis & Implementation Spec

**Status:** Draft for legal review. No code has been changed.
**Date:** 2026-06-18
**Author:** Engineering (from a strategy discussion comparing EliteRank's rules to Maxim's published master rules)

> ⚠️ **This document is a structural / engineering map, not legal advice.** Every item
> marked as a legal posture change (especially §1 and §6) must be reviewed by counsel
> before implementation. See related tripwire issue **#531**.

---

## 0. The fork in the road (read this first)

The proposed spec is reverse-engineered from **Maxim's published rules**, which use a
**sweepstakes / contest hybrid**. Its load-bearing legal element is the **AMOE
mechanism**: voters pay for votes, but each vote *also* grants a free sweepstakes entry
for a cash prize, and **"NO PURCHASE NECESSARY"** is the legal shield that keeps the paid
votes from being an illegal lottery.

EliteRank deliberately chose a **different legal theory: pure contest of skill.**

- `src/pages/ContestTermsPage.jsx:8-12` contains an explicit comment stating the Terms
  **intentionally omit** AMOE / "no purchase necessary" language, because **voters do not
  enter any drawing and do not receive prizes**. Prizes go only to contestants, only on
  published scoring criteria (Section 5).
- This posture is **load-bearing** and only holds because **contestants pay nothing to
  enter** (the consideration prong of the lottery test fails on the contestant side). This
  is the exact invariant protected by issue **#531**.

**Implication:** Items §1 (AMOE disclaimer) and §6 (voter sweepstakes entry per vote) in
the spec are **not missing features — they were affirmatively designed out.** Adopting
them is a *legal model migration* from "contest of skill" to "sweepstakes," not a feature
add, and requires redoing the 50-state lottery analysis.

This document maps the current state assuming we **stay contest-of-skill**, and flags
where the spec would require a model change.

---

## 1. AMOE / "No Purchase Necessary" Disclaimer

| | |
|---|---|
| **Spec wants** | Hardcoded "NO PURCHASE NECESSARY" + "purchase does not improve chances" on rules page, entry flow, voting page, confirmation email; immutable. |
| **Current state** | **Intentionally absent.** `ContestTermsPage.jsx:8-12` documents the deliberate omission. Voters do not enter a drawing (Terms §5.4, line 286). |
| **Gap** | None to close under contest-of-skill. Adding AMOE language would be a legal-model change. |
| **Code touch if adopted** | `ContestTermsPage.jsx`, voting page, `send-onesignal-email` templates, entry flow — **gated on #531 redo.** |
| **Recommendation** | **Do not implement** without an explicit decision to migrate to a sweepstakes model. |

---

## 2. Promotion Type Classification

| | |
|---|---|
| **Spec wants** | `promotion_type` enum: sweepstakes / contest / competition, driving ruleset + scoring. |
| **Current state** | No single `promotion_type` column. Equivalent intent is spread across: `competitions.entry_type` (`nominations`/`applications`/`appointments`, migration `001`, line 205), `competitions.selection_criteria` (`votes`/`hybrid`, line 208), and `voting_rounds.round_type` (`voting`/`judging`/`resurrection`/`finale`, migration `053`, line 32). |
| **Gap** | No top-level classification that locks ruleset/disclosures. Our model is implicitly always "competition (skill)." |
| **Code touch** | Optional: add `competitions.promotion_type` defaulting to `'competition_skill'`, used only to drive `generateStandardRules.js`. Low value while we only support one model. |
| **Recommendation** | **Low priority.** Document that we are single-model by design rather than adding an enum we never branch on. |

---

## 3. Sponsor / Administrator Separation

| | |
|---|---|
| **Spec wants** | Named **Sponsor** (promoter) vs. **Administrator** (independent administrator/judge), both on every rules page. |
| **Current state** | We have **Host** (≈ Sponsor): `competitions.host_id` (migration `001`, line 190), defined in Terms §2 (lines 170-180) as responsible for selecting winners, awarding prizes, compliance. Separate `sponsors` table (commercial backers, migration `001`, lines 439-451). No distinct "Administrator" entity — the platform (Most Eligible LLC d/b/a EliteRank) is implicitly the administrator. |
| **Gap** | Administrator role is implicit, not named on the rules page. |
| **Code touch** | Text-only: add an Administrator block to `generateStandardRules.js` / `ContestTermsPage.jsx` naming Most Eligible LLC d/b/a EliteRank as administrator, auto-populated, non-host-editable. No schema change needed. |
| **Recommendation** | **Easy win, do with §9.** Naming an independent administrator strengthens the skill-contest posture. |

---

## 4. Eligibility Rules

| | |
|---|---|
| **Spec wants** | Immutable floor: 18+, age of majority, territory, **felony exclusion**, employee/family/household exclusion; host can restrict (not expand). |
| **Current state (text)** | Terms §3: 18+ "or age of majority, whichever greater" (line 187); US 50+DC / Ontario (line 188); employee + immediate family/household excluded (lines 192-194). |
| **Current state (schema)** | `demographics.age_min/age_max` (migration `001`, 169-170); `competitions.eligibility_radius_miles` (line 224); `eligibility_residency_text` + `eligibility_jurisdiction` (migration `074`); `nominees.eligibility_answers` JSONB (line 352); `nomination_form_config` (migration `064`). |
| **Gap** | **No felony / crime-of-moral-turpitude exclusion** (neither text nor field). No DB-level family-relationship or state-by-state enforcement (radius is config only). |
| **Code touch** | (a) Add felony-exclusion clause to Terms §3 + `generateStandardRules.js` (text, immutable). (b) Optionally a self-attestation checkbox in the nomination form via `nomination_form_config`. |
| **Recommendation** | **Add the felony-exclusion text** (cheap, matches precedent). DB enforcement of family/state exclusions is out of scope / low ROI. |

---

## 5. Judging / Winner Determination — **strongest existing area**

| | |
|---|---|
| **Spec wants** | Judging required for competitions; **min panel size (≥3)**; **judges control ≥51%** of outcome; skill-based criteria; audit trail; host winner confirmation. |
| **Current state (built!)** | Real tables: `judges` (+ invite/claim flow, migration `070`), `judging_criteria` (label/description/weight, migration `070` lines 61-70), `judge_scores` (per round×judge×contestant×criterion, 1–10, with `submitted_at` lock + RLS, lines 101-160). Weight: `voting_rounds.judge_weight` 0–100 (lines 24-25) and `competitions.judges_score_weight_pct` (migration `074`, line 24). Blended normalization formula in `finalize_voting_round` (migration `053`/`071`/`078`). |
| **Gap** | **No enforced minimum panel size.** **No enforced ≥51% judge-weight floor** — `judge_weight` can be set to 0 (pure public vote). Audit trail exists (`judge_scores`, `finalized_snapshot`). **No explicit host winner-confirmation step** (finalization is programmatic). No conflict-of-interest / recusal tracking. |
| **Code touch** | **Publish-time gate** (highest value): block a competition going live (or block a round of `round_type='judging'`) unless `judge count ≥ N` AND `judge_weight ≥ threshold`. Implement in the super-admin/host setup save path + a `BEFORE` validation; surface in `SetupTab.jsx` judging panel. Optional: a `winner_confirmed_by`/`winner_confirmed_at` on the finale round. |
| **Recommendation** | **Top priority.** This is the cleanest fit between spec and existing infra, and it *strengthens* the contest-of-skill defense. Pairs directly with the #531 safe-matrix (skill-dominant = ≥50% judges). |

---

## 6. Voting Rules

| | |
|---|---|
| **Spec wants** | ≥1 free vote per voter per period; paid votes optional; **every vote = sweepstakes entry**; voting period; vote reset per round; no-refund disclosure. |
| **Current state** | 1 free vote / 24h enforced (`src/lib/votes.js:47-92` via `has_voted_today` RPC); anonymous rate-limiting (`anonymous_vote_rate_limits`, migration `041`); paid votes via `price_per_vote` + Stripe (`votes.amount_paid`, `payment_intent_id`); per-round reset via `voting_rounds.votes_reset_at_start` (migration `053`); non-refundable text (Terms §5.4). Extensive anti-fraud prohibited-voting text (Terms §5.5, including contestant self-purchase ban, line 303). |
| **Gap** | **No voter sweepstakes entry per vote** — *intentional* (see §0). Plus a known **integrity bug (#573)**: paid votes can be credited *after* a round closes (no binding server-side cutoff on the webhook/credit path). |
| **Code touch** | (a) Sweepstakes entry per vote = **legal-model change, do not build** without #531 redo. (b) **#573 fix is independent and should ship regardless**: server-side round-open guard + auto-refund in `stripe-webhook`, defense-in-depth in `create-payment-intent` and `recordPaidVote()`, optional DB trigger. |
| **Recommendation** | Leave AMOE out. **Prioritize the #573 cutoff fix** — it's a real correctness bug, not a rules-text item. |

---

## 7. Competition Structure / Rounds

| | |
|---|---|
| **Spec wants** | Configurable rounds: type (public_voting/judging/hybrid), vote carry-over, advancement rule (top_n / top_pct), groups/brackets. |
| **Current state (built)** | `voting_rounds` (migration `001`, 499-511): `round_order`, `round_type`, `start/end_date`, `contestants_advance`, `tier_label`, `finalized_snapshot`, `votes_reset_at_start`. Contestant tracking: `current_round`, `eliminated_in_round`, `advancement_status`, `votes_at_round_start`. Lazy transitions via `ensure_round_state()` (migration `053`, 245-294). |
| **Gap** | **No bracket/group structure** (single flat advancement, not grouped). Advancement is `top_n` only (no `top_pct`). Carry-over is a global per-round boolean, not per-group. |
| **Code touch** | Bracket/group support is a sizable feature (schema + finalization rewrite + UI). `top_pct` advancement is a small `finalize_voting_round` addition. |
| **Recommendation** | **Defer brackets** unless a host needs them — our flat model already supports multi-round tournaments. Not a legal requirement. |

---

## 8. Entry / Withdrawal / Refund Policy

| | |
|---|---|
| **Spec wants** | Withdrawal allowed, 48h processing, no contestant refund on withdrawal, **no voter refund on contestant elimination/disqualification/withdrawal**, shown at vote purchase; immutable. |
| **Current state** | Non-refundable-votes text (Terms §5.4, 289-290). Winner verification + 5-day response + skill-testing question for Canadians (Terms §8). **No withdrawal concept**: `contestants.status` enum is `active`/`eliminated`/`winner` — **no `withdrawn` state.** No 48h SLA, no explicit "no refund if your contestant is eliminated" disclosure at the purchase step. |
| **Code touch** | (a) Add `'withdrawn'` to `contestants.status` + a withdrawal action + finalization handling. (b) Add the explicit no-voter-refund-on-elimination clause to Terms §5 and surface it **at the vote-purchase step** (the spec's key requirement). |
| **Recommendation** | **Medium priority.** The vote-purchase disclosure is cheap and worth doing; the withdrawal state machine is a small feature if hosts need it. |

---

## 9. Dispute Resolution — **notably thinner than spec**

| | |
|---|---|
| **Spec wants** | Administrator decisions final; **binding arbitration; class-action waiver; jury-trial waiver**; governing law (Illinois). |
| **Current state** | Illinois governing law + **Cook County, IL** exclusive jurisdiction (`TermsPage.jsx` §14, 338-353). Canadian consumer-protection carve-out (ContestTermsPage §14, 445-450). **No binding arbitration clause, no class-action waiver, no jury-trial waiver** in the reviewed pages. |
| **Gap** | All three waivers the spec wants are absent. |
| **Code touch** | Text-only additions to `TermsPage.jsx` and `ContestTermsPage.jsx` §14. **No schema.** Must keep the Canadian carve-out intact. |
| **Recommendation** | **High priority for counsel** — this is pure terms text with no engineering risk, and it's the largest substantive gap vs. precedent. Lawyer should draft the exact clauses (arbitration provider, opt-out window, severability). |

---

## 10. Content / Entry Materials

| | |
|---|---|
| **Spec wants** | Cover image required; **must depict actual entrant**; **AI editing permitted but entrant owns rights**; platform license. |
| **Current state** | Ownership retained + broad license grant (ContestTermsPage §4.4, 234-240); consent-of-others (§4.3); originality/no-infringement (§4.2). Schema: `nominees.avatar_url`/`contestants.avatar_url`, `competitions.cover_image` (migration `070`). |
| **Gap** | **No "must depict the actual entrant" clause. No AI-editing clause** (Maxim explicitly permits AI editing but requires the entrant to own rights and genuinely appear as depicted). No DB-level cover-image requirement. |
| **Code touch** | Text additions to ContestTermsPage §4 (actual-entrant + AI-editing). Optional: `NOT NULL`/validation on cover image at submission. |
| **Recommendation** | **Add the actual-entrant + AI clauses** — cheap, timely given AI photo tools, and matches precedent. |

---

## Summary: Hardcoded vs. Host-Configured (current reality)

**Already host-configurable (admin UI):** `judges_score_weight_pct`, `winners_split_by_gender`,
`eligibility_residency_text`, `eligibility_jurisdiction`, `eligibility_radius_miles`,
`number_of_winners`, `about_age_range`, `about_requirement`, `price_per_vote`,
`nomination_form_config`, `finale_event_text`, `crowning_text`, judge panel, `judging_criteria`,
`voting_rounds.judge_weight`/`contestants_advance`/`votes_reset_at_start`.

**Already platform-immutable (static terms):** 18+ floor, US/Ontario territory,
employee/family exclusion, non-refundable votes, contest-of-skill framing (no AMOE),
Illinois law + Cook County jurisdiction, Canadian skill-testing question.

**Infrastructure note:** `src/utils/generateStandardRules.js` already assembles the rules
page from competition config — so the "hardcoded-vs-host" split the spec wants is
*architecturally already in place*. What's missing is **immutable-floor enforcement**
(min panel size, judge-weight floor), not the rendering machinery.

---

## Recommended work order (if we stay contest-of-skill)

| Priority | Item | Type | Effort | Related |
|---|---|---|---|---|
| **P0** | #573 post-cutoff paid-vote guard + auto-refund | Bug fix | S–M | #573 |
| **P1** | Judging-floor publish-time gate (min panel + ≥X% weight) | Feature + gate | M | §5, #531 |
| **P1** | Arbitration / class-action / jury-trial waiver clauses | Terms text (lawyer-drafted) | S | §9 |
| **P2** | Actual-entrant + AI-editing content clauses | Terms text | S | §10 |
| **P2** | Felony-exclusion eligibility clause | Terms text | S | §4 |
| **P2** | No-refund-on-elimination disclosure at vote purchase | Text + UI placement | S | §8 |
| **P3** | Name "Administrator" on rules page | Terms text | S | §3 |
| **P3** | Withdrawal state (`contestants.status='withdrawn'`) | Feature | S–M | §8 |
| **Hold** | AMOE disclaimer (§1) + voter sweepstakes entry (§6) | **Legal model migration** | L | #531 |
| **Defer** | Bracket/group round structure (§7) | Feature | L | — |
| **Skip** | `promotion_type` enum (§2) | — | — | single-model by design |

**Do not build the "Hold" items without an explicit decision to migrate off the
contest-of-skill model and a fresh lottery analysis per #531.**

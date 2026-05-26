/**
 * ContestTermsPage - Contest Terms & Conditions
 *
 * Mirrors Orbiiit's contest framework adapted for a US-only audience operated by
 * Most Eligible LLC under Illinois law. Each competition's contest page may
 * supplement these terms with rules specific to that competition (eligibility
 * details, sponsor, prizes, dates, charity allocation, etc.).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { colors, spacing, typography, borderRadius, transitions } from '../styles/theme';

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
  },
  container: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: `${spacing[8]} ${spacing[4]}`,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginBottom: spacing[8],
    transition: `color ${transitions.fast}`,
  },
  title: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
    marginBottom: spacing[2],
  },
  updated: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    marginBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[8],
  },
  h2: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  h3: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
    marginTop: spacing[5],
  },
  p: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[3],
  },
  pAllCaps: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[3],
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  ul: {
    listStyle: 'disc',
    paddingLeft: spacing[6],
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[3],
  },
  li: {
    marginBottom: spacing[2],
  },
  strong: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  contactBox: {
    marginTop: spacing[3],
    padding: spacing[4],
    background: colors.background.card,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border.primary}`,
  },
  link: {
    color: colors.gold.primary,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  callout: {
    padding: spacing[4],
    background: colors.background.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
};

export default function ContestTermsPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button
          onClick={() => navigate('/')}
          style={styles.backLink}
          onMouseEnter={e => { e.currentTarget.style.color = colors.gold.primary; }}
          onMouseLeave={e => { e.currentTarget.style.color = colors.text.secondary; }}
        >
          <ArrowLeft size={16} />
          Back to EliteRank
        </button>

        <h1 style={styles.title}>Contest Terms &amp; Conditions</h1>
        <p style={styles.updated}>Last Updated: May 26, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>1. About These Terms</h2>
          <p style={styles.p}>
            EliteRank, operated by <span style={styles.strong}>Most Eligible LLC</span>, an Illinois limited
            liability company ("EliteRank," "we," "us"), offers online "Most Eligible" and related recognition
            competitions in which individuals may be nominated, entered as contestants, voted on by the public and
            by judges, and awarded prizes.
          </p>
          <p style={styles.p}>
            By entering, participating, voting, or otherwise taking part in any competition offered through
            eliterank.co (the "Platform"), you ("Entrant," "Voter," or "Participant," as applicable) agree to be
            bound by these Contest Terms &amp; Conditions (the "Contest Terms"), our{' '}
            <a onClick={() => navigate('/terms')} style={styles.link}>Terms of Use</a>, our{' '}
            <a onClick={() => navigate('/privacy')} style={styles.link}>Privacy Policy</a>, and any additional rules
            posted on the relevant contest page ("Additional Rules").
          </p>
          <p style={styles.p}>
            Additional Rules are incorporated into these Contest Terms by reference. If there is a conflict between
            these Contest Terms and Additional Rules on the contest page, the Additional Rules control with respect
            to the affected competition.
          </p>
          <p style={styles.p}>
            All decisions of the Sponsor (defined below) and of EliteRank in administering a competition are final
            and binding in all respects and are not subject to appeal, except where applicable law provides
            otherwise. Any violation of these Contest Terms may, in the Sponsor's sole discretion, result in
            disqualification.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>2. Sponsor and Promotion Entities</h2>
          <p style={styles.p}>
            Each competition has a designated <span style={styles.strong}>Sponsor</span>, identified on the relevant
            contest page. The Sponsor is the organization responsible for the competition, including selecting
            winners, awarding prizes, and complying with applicable law. EliteRank acts as the platform provider and
            administrator unless explicitly identified as the Sponsor.
          </p>
          <p style={styles.p}>
            "Promotion Entities" means the Sponsor, EliteRank, Most Eligible LLC, Orbiiit Technology, Inc., their
            respective affiliates, and their officers, directors, employees, agents, contractors, judges, and
            sponsors of the competition.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>3. Eligibility</h2>
          <p style={styles.p}>To enter or vote in a competition, you must:</p>
          <ul style={styles.ul}>
            <li style={styles.li}>be at least <span style={styles.strong}>18 years of age</span> (or the age of majority in your state, whichever is greater) at the time of entry;</li>
            <li style={styles.li}>be a legal resident of the <span style={styles.strong}>United States</span> (the 50 states and the District of Columbia); and</li>
            <li style={styles.li}>not be a resident of any state or jurisdiction in which the competition is prohibited by law.</li>
          </ul>
          <p style={styles.p}>
            Employees, officers, directors, and contractors of the Sponsor and of the other Promotion Entities, and
            their immediate family members (spouse, parents, siblings, children) and members of their households,
            are not eligible to win prizes in any competition they administer.
          </p>
          <p style={styles.p}>
            Each contest page identifies the specific eligibility, age, and geographic requirements for that
            competition (for example, a city or regional restriction). It is your responsibility to verify your
            eligibility before entering or voting.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>4. How to Enter</h2>

          <h3 style={styles.h3}>4.1 Nominations and Entries</h3>
          <p style={styles.p}>
            Each competition will specify on the contest page how individuals may be nominated and how a nomination
            becomes an entry (a "Contestant"). Typically, an individual may self-nominate or be nominated by a third
            party. A nominated individual must accept the nomination, complete the required profile information,
            and agree to these Contest Terms to become a Contestant.
          </p>

          <h3 style={styles.h3}>4.2 Submitted Materials</h3>
          <p style={styles.p}>
            "Submitted Materials" means photos, videos, captions, bios, social handles, and any other content you
            submit as part of an entry, profile, or bonus task. Submitted Materials must:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}>be your original work or content you have the right to submit;</li>
            <li style={styles.li}>not infringe the intellectual-property, privacy, publicity, or other rights of any third party;</li>
            <li style={styles.li}>not contain content that is obscene, sexually explicit involving minors, defamatory, hateful, threatening, or otherwise illegal;</li>
            <li style={styles.li}>comply with the Additional Rules for the competition and any platform community guidelines.</li>
          </ul>

          <h3 style={styles.h3}>4.3 Consent of Others</h3>
          <p style={styles.p}>
            If your Submitted Materials depict or identify any other person, you represent that you have obtained
            that person's prior written consent to (a) the submission and (b) the use of the materials by the
            Promotion Entities as described in these Contest Terms.
          </p>

          <h3 style={styles.h3}>4.4 Ownership and License</h3>
          <p style={styles.p}>
            You retain ownership of your Submitted Materials. By submitting them, you grant the Promotion Entities a
            non-exclusive, worldwide, royalty-free, sublicensable, perpetual license to use, host, store, copy,
            reproduce, display, perform, publish, distribute, translate, adapt, and create derivative works of your
            Submitted Materials in any media (now known or later developed) for purposes of administering, promoting,
            and operating the competition, the Platform, and related marketing.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>5. Format and Selection of Winners</h2>

          <h3 style={styles.h3}>5.1 Competition Rounds</h3>
          <p style={styles.p}>
            Each competition may consist of one or more rounds, including a nomination round, contestant round,
            preliminary judging round, public voting round(s), final round, and/or a winner announcement event. The
            structure, dates, and judging criteria for each competition are set out on the contest page.
          </p>

          <h3 style={styles.h3}>5.2 Public Voting</h3>
          <p style={styles.p}>
            Where the competition includes public voting, each voter receives at least one free vote credit per
            competition. Voters may also purchase additional vote credits through the Platform's payment processor
            (Stripe). All free and purchased votes are recorded in the contestant's vote tally and, where the
            competition offers a Voter Prize (see Section 6), entered into the applicable drawing.
          </p>
          <p style={styles.p}>
            Votes purchased through the Platform are final and non-refundable once a vote is recorded, except as
            required by law or as expressly provided on the contest page.
          </p>

          <h3 style={styles.h3}>5.3 Judging</h3>
          <p style={styles.p}>
            Where the competition includes judging, designated judges score contestants according to the criteria
            published on the contest page. Judges' decisions are final.
          </p>

          <h3 style={styles.h3}>5.4 Prohibited Voting</h3>
          <p style={styles.p}>
            Votes generated by automated means (bots, scripts), through fraudulent payment instruments, through
            chargebacks, through multiple accounts or false identities, or in any other manner not expressly
            permitted are prohibited and will be discarded. The Sponsor and EliteRank may disqualify any contestant
            or voter who participates in or benefits from prohibited voting.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>6. Voter Prizes (When Offered)</h2>
          <div style={styles.callout}>
            <p style={{ ...styles.p, marginBottom: 0 }}>
              <span style={styles.strong}>No purchase necessary to enter or win a Voter Prize.</span> A purchase
              does not improve your chances of winning a Voter Prize. Where a Voter Prize is offered, an alternate
              free method of entry is provided below.
            </p>
          </div>
          <p style={styles.p}>
            Some competitions offer a separate "Voter Prize" awarded to one or more voters by random drawing. Where
            a Voter Prize is offered:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}>each voter receives at least one free vote credit per competition;</li>
            <li style={styles.li}>each free or purchased vote entered during the voting period qualifies as one entry into the Voter Prize drawing (unless the contest page states a different ratio);</li>
            <li style={styles.li}>purchased votes do not increase your chances of winning the Voter Prize relative to free votes on a per-entry basis;</li>
            <li style={styles.li}>winners will be selected at random from all eligible entries received during the voting period;</li>
            <li style={styles.li}>odds of winning depend on the number of eligible entries received.</li>
          </ul>
          <p style={styles.p}>
            <span style={styles.strong}>Alternate Free Method of Entry (AMOE):</span> to enter a Voter Prize drawing
            without purchasing votes, hand-print your full name, complete mailing address (including city, state,
            and ZIP code), phone number, email address, the name of the contest, and the name of the contestant
            you wish to support on a 3" x 5" card and mail it in a #10 envelope with sufficient postage to:
          </p>
          <div style={styles.contactBox}>
            <p style={{ ...styles.p, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] }}>Most Eligible LLC &mdash; Voter Prize AMOE</p>
            <p style={{ ...styles.p, marginBottom: 0 }}>[mailing address to be posted on each contest page]</p>
          </div>
          <p style={styles.p}>
            Each valid mail-in entry counts as one (1) entry. There is no limit to the number of mail-in entries you
            may submit, but each entry must be mailed separately in its own envelope and must be received no later
            than three (3) business days after the close of the relevant voting period. Mechanically reproduced
            entries will be void.
          </p>
          <p style={styles.p}>
            Where required by applicable state law, the Voter Prize winner may be required to correctly answer,
            unaided, a time-limited mathematical skill-testing question before being awarded the prize.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>7. Prizes</h2>
          <ul style={styles.ul}>
            <li style={styles.li}>Prizes are as described in the Additional Rules on the contest page. Winners may be featured on the Platform and in related marketing materials.</li>
            <li style={styles.li}>Prizes are not transferable, assignable, or for resale, and have no cash equivalent unless explicitly stated. The Sponsor reserves the right, in its sole discretion, to substitute a prize or any component of a prize with one of equal or greater retail value (or with a cash equivalent) without liability if the original prize becomes unavailable.</li>
            <li style={styles.li}>Prizes will be distributed to winners as soon as practical after winner verification (typically within two to six months). Delays may occur where scheduling with celebrities, sponsors, or third parties is required.</li>
            <li style={styles.li}>The Sponsor is responsible only for its portion of any prize and is not liable for any portion of a prize provided (or not provided) by a third party.</li>
            <li style={styles.li}><span style={styles.strong}>Taxes:</span> All federal, state, and local taxes, withholdings, and other charges associated with the receipt or use of a prize are the sole responsibility of the winner. Where the retail value of a prize requires it (currently $600 or more in aggregate per calendar year for U.S. recipients), the Sponsor will issue an IRS Form 1099-MISC or 1099-NEC to the winner and will require the winner to provide a completed IRS Form W-9 (or equivalent) before the prize is released.</li>
            <li style={styles.li}>The Promotion Entities are not liable for any injury, loss, or damages that may result from acceptance or use of a prize, and are not liable for any shipping delays.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>8. Charity Allocation (When Applicable)</h2>
          <p style={styles.p}>
            Some competitions designate a charitable beneficiary on the contest page. Where a charitable allocation
            is designated, up to twenty percent (20%) of net proceeds from purchased votes for that competition will
            typically be donated to the designated charity (or such other percentage as stated on the contest page).
            If the designated charity is unable or unwilling to accept the donation, the Sponsor may donate the
            charity portion to an alternate charity of similar mission in its reasonable discretion.
          </p>
          <p style={styles.p}>
            Purchased votes are not tax-deductible charitable contributions and you will not receive a
            written acknowledgement for tax purposes.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>9. Winner Verification and Prize Claim</h2>
          <p style={styles.p}>
            All potential winners are subject to verification of eligibility and compliance with these Contest
            Terms. Winners may be required to execute and return an Affidavit of Eligibility, Liability Release, and
            (where lawful) Publicity Release ("Prize Claim Documents"), and to provide a completed IRS Form W-9 (or
            other tax forms required by law). A potential winner may be disqualified and an alternate winner
            selected if:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}>the Sponsor is unable to verify the potential winner's eligibility or identity;</li>
            <li style={styles.li}>the potential winner fails to respond to a winner notification within five (5) days;</li>
            <li style={styles.li}>the potential winner declines the prize or fails to complete the Prize Claim Documents within the period requested; or</li>
            <li style={styles.li}>the potential winner is found to have violated these Contest Terms, the Terms of Use, or applicable law.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>10. Privacy</h2>
          <p style={styles.p}>
            Information you provide in connection with a competition is collected and used in accordance with our{' '}
            <a onClick={() => navigate('/privacy')} style={styles.link}>Privacy Policy</a>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>11. Publicity</h2>
          <p style={styles.p}>
            Except where prohibited by law, by entering or voting in a competition, each winner consents to the
            Promotion Entities' use of their first name, last initial (or user name, where appropriate), city,
            photograph, Submitted Materials, and likeness for advertising, promotional, and trade purposes related
            to the competition and the Platform, in any media, worldwide, without further notice, review, approval,
            or compensation.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>12. Disclaimer and Release of Liability</h2>
          <p style={styles.pAllCaps}>
            All entrants, voters, and winners release, defend, indemnify, and hold harmless the Promotion Entities
            from and against any and all liability arising out of, or in any way related to, the competition; the
            publication or use of Submitted Materials, names, and likenesses; or the acceptance, use, misuse, loss,
            or misdirection of prizes &mdash; including liability for personal injury, death, property damage, or
            monetary loss &mdash; to the maximum extent permitted by applicable law.
          </p>
          <p style={styles.pAllCaps}>
            To the maximum extent permitted by applicable law, in no event shall the Promotion Entities be liable
            for any indirect, special, incidental, exemplary, consequential, or punitive damages of any kind
            (including without limitation lost profits or lost prizes) related to the competition, regardless of the
            form of action, whether in contract, tort, negligence, strict product liability, or otherwise, even if
            informed of the possibility of such damages.
          </p>
          <p style={styles.pAllCaps}>
            The Platform and the competition are provided "as is" and "as available," without technical support of
            any kind and without warranty of merchantability, fitness for a particular purpose, title, or
            non-infringement.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>13. Release of Third Parties (Social Media)</h2>
          <p style={styles.p}>
            A competition is not sponsored, endorsed, or administered by, or associated with, Instagram, Facebook,
            TikTok, X (Twitter), YouTube, Apple, Google, or any other third-party platform unless explicitly stated
            in the Additional Rules. By participating, you release each such platform from any liability related to
            your participation.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>14. Force Majeure and Sponsor Rights</h2>
          <p style={styles.p}>
            The Sponsor reserves the right to cancel, terminate, modify, or suspend in whole or in part any
            competition at any time, without prior notice, for any reason, in its sole discretion &mdash; including
            in the event of fraud, technical difficulties, or any other factor beyond the reasonable control of the
            Sponsor (such as natural disasters, epidemics, public-health emergencies, labour disputes, equipment
            failures, civil disturbances, acts of terrorism, war, or government order). The Sponsor will not be
            liable for any such cancellation, termination, modification, or suspension.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>15. Governing Law and Venue</h2>
          <p style={styles.p}>
            All issues and questions concerning the construction, validity, interpretation, and enforceability of
            these Contest Terms, or otherwise in connection with any competition, are governed by, and construed in
            accordance with, the laws of the <span style={styles.strong}>State of Illinois</span>, United States,
            without regard to conflict-of-laws principles. Entrants and voters irrevocably consent to the
            jurisdiction and venue of the state and federal courts located in <span style={styles.strong}>Cook
            County, Illinois</span>. Any claim or cause of action arising out of or related to a competition must
            be filed within one (1) year after such claim or cause of action arose, or be forever barred.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>16. Severability and Entire Agreement</h2>
          <p style={styles.p}>
            If any provision of these Contest Terms is held invalid, illegal, or unenforceable, that provision will
            be enforced to the maximum extent permitted by law, and the remaining provisions will remain in full
            force and effect. These Contest Terms, together with the Terms of Use, the Privacy Policy, the Cookie
            Policy, and the Additional Rules and Prize Claim Documents for each competition, express the entire
            agreement between you and the Promotion Entities concerning each competition, and supersede any prior
            agreements.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>17. Winners List</h2>
          <p style={styles.p}>
            To request the name of the winner(s) of a competition, send a written request within six (6) months
            after the close of the competition to the contact address below. The Sponsor reserves the right to
            withhold or limit information it is not required by law to disclose.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>18. Contact</h2>
          <p style={styles.p}>Questions about a competition or these Contest Terms?</p>
          <div style={styles.contactBox}>
            <p style={{ ...styles.p, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] }}>Most Eligible LLC</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Attn: Contests</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Email: contests@eliterank.co</p>
            <p style={{ ...styles.p, marginBottom: 0 }}>
              Website: <a href="https://eliterank.co" style={styles.link}>eliterank.co</a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

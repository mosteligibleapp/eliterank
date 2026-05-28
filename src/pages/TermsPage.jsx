/**
 * TermsPage - Terms of Use
 *
 * Operator of record: Most Eligible LLC (Illinois, USA).
 * Governing law: Illinois, USA. Defensive carve-outs for users accessing
 * from outside the United States.
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
  subsection: {
    marginBottom: spacing[5],
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
};

export default function TermsPage() {
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

        <h1 style={styles.title}>Terms of Use</h1>
        <p style={styles.updated}>Last Updated: May 28, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>1. Agreement to These Terms</h2>
          <p style={styles.p}>
            These Terms of Use ("Terms") form a binding agreement between you and{' '}
            <span style={styles.strong}>Most Eligible LLC</span>, an Illinois limited liability company
            ("EliteRank," "we," "us," or "our"), and govern your access to and use of the EliteRank website at
            eliterank.co, our mobile-optimized web app, and any related features, content, communications, and
            services (collectively, the "Service").
          </p>
          <p style={styles.pAllCaps}>
            By accessing or using the Service, you agree to be bound by these Terms, by our{' '}
            <a onClick={() => navigate('/privacy')} style={{ ...styles.link, textTransform: 'none' }}>Privacy Policy</a>,
            our <a onClick={() => navigate('/cookies')} style={{ ...styles.link, textTransform: 'none' }}>Cookie Policy</a>,
            and our <a onClick={() => navigate('/contest-terms')} style={{ ...styles.link, textTransform: 'none' }}>Contest Terms &amp; Conditions</a>,
            each of which is incorporated into these Terms by reference. If you do not agree, do not use the Service.
          </p>
          <p style={styles.p}>
            We may update these Terms from time to time. We will post the revised Terms with a new "Last Updated"
            date and, for material changes, take reasonable steps to notify active users. Your continued use of the
            Service after changes take effect constitutes acceptance.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>2. The Service</h2>
          <p style={styles.p}>
            EliteRank is a social competition platform that lets organizations host recognition competitions in which
            individuals are nominated, entered as contestants, voted on by the public and by judges, and awarded
            prizes. The Service includes user profiles, nominations, contestant entries, public and judge voting,
            leaderboards, prizes, rewards, sponsor pages, and related features.
          </p>
          <p style={styles.p}>
            We may add, change, suspend, or discontinue any feature of the Service, in whole or in part, at any time,
            with or without notice. We are not liable to you or any third party for any modification, suspension, or
            discontinuation of the Service.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>3. Eligibility</h2>
          <p style={styles.p}>
            To use the Service, you must:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}>be at least <span style={styles.strong}>18 years of age</span>;</li>
            <li style={styles.li}>be a resident of the <span style={styles.strong}>United States</span> or the <span style={styles.strong}>province of Ontario, Canada</span>;</li>
            <li style={styles.li}>have the legal capacity to enter into these Terms; and</li>
            <li style={styles.li}>not be prohibited from receiving the Service under the law of your country, state, or province of residence.</li>
          </ul>
          <p style={styles.p}>
            If you are acting on behalf of an organization (for example, as a host), you represent that you have
            authority to bind that organization to these Terms.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>4. Your Account</h2>
          <p style={styles.p}>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity
            that occurs under your account. You agree to provide accurate, current, and complete information during
            registration and to keep your information up to date. Notify us promptly at info@eliterank.co if you
            suspect unauthorized access.
          </p>
          <p style={styles.p}>
            We may suspend, restrict, or terminate your account at any time if we reasonably believe you have
            violated these Terms, our Contest Terms &amp; Conditions, applicable law, or if your conduct presents a
            risk to other users, the Service, or third parties.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>5. User Content and License</h2>
          <p style={styles.p}>
            You retain ownership of content you submit to the Service (photos, videos, profile details, comments,
            and similar materials &mdash; "User Content"). By submitting User Content, you grant EliteRank a
            non-exclusive, worldwide, royalty-free, sublicensable, and transferable license to host, store, copy,
            reproduce, display, perform, publish, distribute, translate, adapt, and otherwise use your User Content
            in connection with operating, providing, promoting, and improving the Service, including on third-party
            platforms where we promote competitions.
          </p>
          <p style={styles.p}>
            You represent and warrant that (a) you own or have the necessary rights to your User Content and to
            grant the license above; (b) your User Content does not infringe the intellectual-property, privacy,
            publicity, or other rights of any person; (c) you have obtained any required consents from individuals
            depicted; and (d) your User Content complies with applicable law and these Terms.
          </p>
          <p style={styles.p}>
            We may, but are not obligated to, review User Content and may remove or refuse to display any User
            Content at our discretion.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>6. Acceptable Use</h2>
          <p style={styles.p}>You agree not to, and not to attempt to:</p>
          <ul style={styles.ul}>
            <li style={styles.li}>use the Service for any unlawful, fraudulent, or harmful purpose;</li>
            <li style={styles.li}>manipulate votes, rankings, or competition outcomes through bots, scripts, vote-buying outside our official vote-purchase flow, payment chargebacks, collusion, or any other means we deem fraudulent;</li>
            <li style={styles.li}>create multiple accounts or use a false identity to influence a competition;</li>
            <li style={styles.li}>harass, threaten, defame, stalk, or harm any other user;</li>
            <li style={styles.li}>upload content that is illegal, obscene, sexually explicit involving minors, hateful, threatening, defamatory, or that infringes another's rights;</li>
            <li style={styles.li}>impersonate any person or misrepresent your affiliation with any person or entity;</li>
            <li style={styles.li}>probe, scan, or test the vulnerability of the Service, attempt to bypass any security or access control, or interfere with the Service's normal operation;</li>
            <li style={styles.li}>introduce viruses, worms, or other malicious code into the Service;</li>
            <li style={styles.li}>use automated scrapers, crawlers, or harvesters to access the Service except as expressly permitted by a robots.txt file;</li>
            <li style={styles.li}>reverse engineer, decompile, or attempt to derive the source code of the Service, except where applicable law expressly permits;</li>
            <li style={styles.li}>use the Service to send unsolicited commercial messages, spam, or chain mail.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>7. Competitions, Voting, and Payments</h2>
          <p style={styles.p}>
            Your participation in any competition offered through the Service is also governed by our{' '}
            <a onClick={() => navigate('/contest-terms')} style={styles.link}>Contest Terms &amp; Conditions</a> and
            by any additional rules posted on the relevant contest page. In the event of a conflict between these
            Terms and the Contest Terms &amp; Conditions, the Contest Terms &amp; Conditions control with respect to
            competition mechanics.
          </p>
          <p style={styles.p}>
            Votes may be purchased through our payment processor, Stripe. All purchases are final and non-refundable
            once the vote has been recorded, except as required by law or expressly stated on the contest page. You
            are responsible for any taxes associated with purchases.
          </p>
          <p style={styles.p}>
            We reserve the right to disqualify participants, void votes, withhold prizes, or modify competition
            outcomes if we detect fraud, manipulation, or violation of these Terms or the Contest Terms &amp;
            Conditions.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>8. Intellectual Property</h2>
          <p style={styles.p}>
            The EliteRank name, logo, the Service's design, software, code, graphics, and all other content and
            materials provided by us are owned by Most Eligible LLC or its licensors and are protected by U.S. and
            international copyright, trademark, and other intellectual-property laws. Except for the limited license
            to use the Service granted in these Terms, no rights are granted to you, by implication or otherwise.
            You may not copy, modify, distribute, sell, lease, or create derivative works based on the Service
            without our express written permission.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>9. Third-Party Services and Links</h2>
          <p style={styles.p}>
            The Service may contain links to or integrate with third-party websites and services that are not
            controlled by us. We are not responsible for the content, policies, or practices of any third-party
            service, and your dealings with any third party are solely between you and that third party.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>10. Disclaimer of Warranties</h2>
          <p style={styles.pAllCaps}>
            The Service is provided "as is" and "as available," without warranties of any kind, whether express,
            implied, statutory, or otherwise. To the maximum extent permitted by law, EliteRank disclaims all
            warranties, including implied warranties of merchantability, fitness for a particular purpose, title,
            and non-infringement. We do not warrant that the Service will be uninterrupted, timely, secure, or
            error-free, or that any information obtained through the Service will be accurate or reliable. Your use
            of the Service is at your sole risk.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>11. Limitation of Liability</h2>
          <p style={styles.pAllCaps}>
            To the maximum extent permitted by applicable law, in no event shall EliteRank, its affiliates, or their
            officers, directors, employees, agents, or licensors be liable for any indirect, incidental, special,
            consequential, exemplary, or punitive damages, or any loss of profits, revenue, data, goodwill, or other
            intangible losses, arising out of or in connection with your use of, or inability to use, the Service,
            even if advised of the possibility of such damages.
          </p>
          <p style={styles.pAllCaps}>
            In no event shall EliteRank's aggregate liability arising out of or relating to these Terms or the
            Service exceed the greater of (a) the amount you paid to EliteRank in the twelve months preceding the
            event giving rise to the claim, or (b) one hundred U.S. dollars ($100).
          </p>
          <p style={styles.p}>
            Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities. The
            above limitations apply to the maximum extent permitted by law.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>12. Indemnification</h2>
          <p style={styles.p}>
            You agree to defend, indemnify, and hold harmless EliteRank, its affiliates, and their respective
            officers, directors, employees, and agents from and against any
            claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising
            out of or related to: (a) your use of the Service; (b) your User Content; (c) your violation of these
            Terms or applicable law; or (d) your violation of any third-party right, including any intellectual
            property or privacy right.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>13. Host Obligations, Compliance, and Indemnification</h2>
          <p style={styles.p}>
            If you create, configure, host, administer, judge, sponsor, or otherwise operate a competition through
            the Service (a <span style={styles.strong}>"Host"</span>), the following additional obligations apply
            to you, in addition to all other provisions of these Terms. EliteRank provides the Service as a
            neutral technology platform; you, as Host, are the promoter and operator of record of your
            competition.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>13.1 Compliance with All Applicable Laws.</span> You represent, warrant,
            and covenant that, at your sole cost and expense, you will comply with all laws, rules, regulations,
            ordinances, codes, orders, and licensing, registration, bonding, taxation, consumer-protection,
            advertising, prize-disclosure, sweepstakes, contest, raffle, lottery, charitable-solicitation,
            data-protection, privacy, anti-discrimination, child-protection, intellectual-property, and labor
            requirements that apply to your competition in every jurisdiction in which the competition is
            offered, promoted, conducted, or capable of being entered or viewed, including without limitation
            those of any country, federal or national government, state, province, territory, region, county,
            parish, municipality, city, township, tribal nation, or other governmental authority (each, a{' '}
            <span style={styles.strong}>"Jurisdiction"</span>). This includes, where required, registering and
            bonding the competition (for example, with the New York Department of State, Florida Department of
            Agriculture and Consumer Services, or Rhode Island Secretary of State), filing required disclosures,
            obtaining any necessary permits or licenses, collecting and remitting any applicable taxes, issuing
            IRS Forms 1099 or equivalent foreign tax forms to winners, and adhering to all applicable promotion,
            marketing, and consumer-protection rules.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>13.2 Sole Responsibility; No Legal Advice.</span> You acknowledge and
            agree that the Host &mdash; not EliteRank &mdash; is solely and exclusively responsible for the
            lawful operation of the competition and for any failure to comply with any applicable law in any
            Jurisdiction. EliteRank does not undertake, and expressly disclaims, any duty to investigate, advise
            on, monitor, approve, or ensure the legality of any competition in any Jurisdiction. EliteRank does
            not provide legal, tax, or regulatory advice. You should consult qualified counsel in each relevant
            Jurisdiction before launching, promoting, or conducting any competition.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>13.3 Host Indemnification.</span> To the maximum extent permitted by law,
            you agree to defend, indemnify, and hold harmless EliteRank, its affiliates, and their respective
            officers, directors, employees, agents, licensors, and service providers (collectively, the{' '}
            <span style={styles.strong}>"EliteRank Indemnitees"</span>) from and against any and all claims,
            demands, investigations, regulatory actions, penalties, fines, judgments, settlements, taxes,
            damages, losses, costs, and expenses (including reasonable attorneys' fees and costs of defense)
            arising out of or related to:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}>(a) your competition, including its design, scoring formula, prize structure, eligibility criteria, marketing, conduct, and outcome;</li>
            <li style={styles.li}>(b) any actual or alleged violation by you (or by any person acting under your direction or on your behalf, including judges, sponsors, and co-promoters you select) of any law, rule, regulation, ordinance, order, or licensing or registration requirement of any Jurisdiction, whether at the country, federal, national, state, provincial, territorial, county, municipal, city, tribal, or other governmental level;</li>
            <li style={styles.li}>(c) your failure to obtain or maintain any required registration, bond, permit, license, or filing, or your failure to pay any required tax, withholding, or fee in connection with the competition;</li>
            <li style={styles.li}>(d) any claim by an entrant, voter, winner, judge, sponsor, regulator, charity, or third party arising from your competition, including disputes over eligibility, scoring, prize fulfillment, prize substitution, advertising claims, intellectual-property rights, publicity rights, or defamation;</li>
            <li style={styles.li}>(e) any breach by you of your representations, warranties, or covenants in these Terms or in the Contest Terms &amp; Conditions; and</li>
            <li style={styles.li}>(f) any content, materials, prizes, or marketing supplied by or on behalf of you, the Host.</li>
          </ul>
          <p style={styles.p}>
            <span style={styles.strong}>13.4 Control of Defense.</span> EliteRank may, at its option and at your
            expense, assume sole control of the defense and settlement of any claim subject to indemnification
            under this Section. You may not settle any such claim in a manner that imposes any obligation,
            restriction, or admission on EliteRank without EliteRank's prior written consent.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>13.5 Insurance.</span> EliteRank may require you, before publishing a
            competition or at any time thereafter, to obtain and maintain at your own expense general commercial
            liability insurance (including coverage for promotions and advertising injury) in amounts EliteRank
            considers reasonable for the scale, prize value, and geographic reach of the competition, and to name
            EliteRank as an additional insured. Failure to obtain such coverage when requested may result in
            suspension or removal of the competition.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>13.6 Suspension and Removal.</span> Without limiting any other right or
            remedy, EliteRank may at any time, with or without notice and without liability to you, suspend,
            modify, take down, or remove any competition that EliteRank reasonably believes (a) is or may be
            unlawful in any Jurisdiction, (b) is the subject of a regulatory inquiry or complaint, (c) violates
            these Terms or the Contest Terms &amp; Conditions, or (d) creates or could create reputational,
            legal, or financial risk for EliteRank. Suspension or removal is not a waiver of, and does not
            transfer to EliteRank, any of the Host's compliance obligations or indemnification obligations.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>13.7 Survival; No Waiver.</span> The obligations in this Section 13
            survive termination of these Terms, deletion of your account, and the conclusion of any competition.
            EliteRank's failure to enforce any provision of this Section, or to identify any non-compliance, is
            not a waiver of any right or remedy. This Section is in addition to, and not in place of, the general
            indemnification in Section 12.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>14. Termination</h2>
          <p style={styles.p}>
            You may stop using the Service and close your account at any time. We may suspend or terminate your
            access to the Service at any time, with or without notice, including for violation of these Terms.
            Sections 5 (license), 9 (IP), 11&ndash;13 (disclaimers, liability, indemnity, host obligations), 15
            (governing law), and any other provisions that by their nature should survive termination, will
            survive.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>15. Governing Law and Dispute Resolution</h2>
          <p style={styles.p}>
            These Terms and any dispute or claim arising out of or relating to them or the Service are governed by
            the laws of the <span style={styles.strong}>State of Illinois</span>, United States, and applicable U.S.
            federal law, without regard to conflict-of-laws principles. You and EliteRank submit to the exclusive
            jurisdiction of the state and federal courts located in <span style={styles.strong}>Cook County,
            Illinois</span> for any dispute not subject to arbitration.
          </p>
          <p style={styles.p}>
            The United Nations Convention on Contracts for the International Sale of Goods does not apply.
          </p>
          <p style={styles.p}>
            Any claim or cause of action arising out of or related to the Service must be filed within one (1) year
            after such claim or cause of action arose, or be forever barred, to the extent permitted by applicable
            law.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>16. International Use</h2>
          <p style={styles.p}>
            The Service is operated from the United States and intended for use by residents of the United States
            and the province of Ontario, Canada. We make no representation that the Service is appropriate or
            available in any other location. If you access the Service from outside these regions, you do so on your
            own initiative and are responsible for compliance with local laws.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>17. Severability and Entire Agreement</h2>
          <p style={styles.p}>
            If any provision of these Terms is held to be unlawful, void, or unenforceable, that provision will be
            severed to the minimum extent necessary, and the remaining provisions will remain in full force and
            effect. These Terms, together with the Privacy Policy, Cookie Policy, and Contest Terms &amp;
            Conditions, constitute the entire agreement between you and EliteRank concerning the Service, and
            supersede any prior agreements between you and EliteRank concerning the Service.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>18. Contact</h2>
          <p style={styles.p}>
            Questions about these Terms? Contact us:
          </p>
          <div style={styles.contactBox}>
            <p style={{ ...styles.p, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] }}>Most Eligible LLC</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>c/o Registered Agent</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>1 W Old State Capitol Plaza, Suite 805</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Springfield, IL 62701</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Email: <a href="mailto:info@eliterank.co" style={styles.link}>info@eliterank.co</a></p>
            <p style={{ ...styles.p, marginBottom: 0 }}>
              Website: <a href="https://eliterank.co" style={styles.link}>eliterank.co</a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

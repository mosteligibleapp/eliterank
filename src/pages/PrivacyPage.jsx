/**
 * PrivacyPage - Privacy Policy
 *
 * US-led policy with defensive coverage for GDPR (EU/UK), CCPA/CPRA (California),
 * and PIPEDA (Canada). Preserves TCPA / Twilio A2P 10DLC SMS carve-outs.
 *
 * Operator of record: Most Eligible LLC (Illinois, USA).
 * EliteRank runs on technology provided by Orbiiit Technology, Inc.
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
  pBold: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[3],
    fontWeight: typography.fontWeight.semibold,
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
  tocBox: {
    marginBottom: spacing[8],
    padding: spacing[4],
    background: colors.background.card,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border.primary}`,
  },
  tocTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: spacing[2],
  },
  tocLink: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    textDecoration: 'none',
    display: 'block',
    padding: `${spacing[1]} 0`,
  },
};

export default function PrivacyPage() {
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

        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.updated}>Last Updated: May 26, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>1. About This Policy</h2>
          <p style={styles.p}>
            This Privacy Policy describes how <span style={styles.strong}>Most Eligible LLC</span> ("EliteRank,"
            "we," "us," or "our"), an Illinois limited liability company, collects, uses, discloses, and protects
            information about you when you access or use the EliteRank website at eliterank.co, our mobile-optimized
            web app, and any related features, content, communications, and services (collectively, the "Service").
          </p>
          <p style={styles.p}>
            The Service is operated on technology provided by Orbiiit Technology, Inc., which acts as our hosting and
            platform provider but is not a controller of your personal information for purposes of this Policy.
          </p>
          <p style={styles.pBold}>
            EliteRank is offered to residents of the United States. While the Service may be technically accessible
            from other countries, we do not target or actively market the Service outside the United States. Sections
            12 (California), 13 (EEA, UK, and Switzerland), and 14 (Canada) provide additional disclosures for
            individuals who access the Service from those jurisdictions.
          </p>
          <p style={styles.p}>
            By using the Service, you acknowledge that you have read and understood this Policy. If you do not agree,
            please do not use the Service.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>2. Information We Collect</h2>

          <h3 style={styles.h3}>2.1 Information You Provide</h3>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Account information:</span> name, email address, password, mobile phone number, city, and profile details (photos, bio, social handles) you provide during registration, claim, or profile setup.</li>
            <li style={styles.li}><span style={styles.strong}>Competition data:</span> nominations you submit or receive, votes cast, contestant entries, judge scores, bonus task submissions, and competition participation history.</li>
            <li style={styles.li}><span style={styles.strong}>User content:</span> photos, videos, captions, comments, and other materials you upload to or share through the Service.</li>
            <li style={styles.li}><span style={styles.strong}>Payment information:</span> when you purchase votes or other paid features, payment-card details are collected and processed directly by our payment processor (Stripe). EliteRank receives only a transaction confirmation and the last four digits of the card.</li>
            <li style={styles.li}><span style={styles.strong}>Communications:</span> messages you send to us (support requests, feedback) and your communication preferences, including SMS opt-in consent and message delivery interactions.</li>
            <li style={styles.li}><span style={styles.strong}>Identity verification:</span> for prize claims, we may collect government-issued identification, mailing address, and tax-reporting information as required by law.</li>
          </ul>

          <h3 style={styles.h3}>2.2 Information We Collect Automatically</h3>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Device and usage data:</span> IP address, browser type and version, operating system, device identifiers, referrer URL, pages viewed, time spent, clicks, and other interaction telemetry.</li>
            <li style={styles.li}><span style={styles.strong}>Device fingerprinting:</span> we use a browser-fingerprint identifier (provided by FingerprintJS) to detect duplicate accounts and fraudulent voting. This identifier is derived from publicly readable browser characteristics and is used solely for fraud prevention and platform integrity.</li>
            <li style={styles.li}><span style={styles.strong}>Cookies and similar technologies:</span> see our <a onClick={() => navigate('/cookies')} style={styles.link}>Cookie Policy</a> for the full list of cookies, their purpose, and how to control them.</li>
            <li style={styles.li}><span style={styles.strong}>Approximate location:</span> we may infer your city or region from your IP address to surface relevant competitions. We do not collect precise GPS location.</li>
            <li style={styles.li}><span style={styles.strong}>Error and performance data:</span> we collect crash reports, performance metrics, and diagnostic data (through Sentry and Vercel Speed Insights) to keep the Service reliable.</li>
          </ul>

          <h3 style={styles.h3}>2.3 Information From Third Parties</h3>
          <ul style={styles.ul}>
            <li style={styles.li}>If you sign in or link a third-party service (for example, a social network used for profile photos or sharing), we may receive limited profile data from that service, subject to your privacy settings there.</li>
            <li style={styles.li}>Hosts, nominators, and other users may submit information about you (for example, nominating you for a competition) before you create an account. If you do not wish to participate, you may decline the nomination or contact us to remove the entry.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>3. How We Use Your Information</h2>
          <p style={styles.p}>We use the information we collect to:</p>
          <ul style={styles.ul}>
            <li style={styles.li}>Provide, operate, maintain, and improve the Service;</li>
            <li style={styles.li}>Process nominations, votes, contestant entries, judge scores, prize claims, and competition results;</li>
            <li style={styles.li}>Authenticate you, secure your account, and remember your preferences;</li>
            <li style={styles.li}>Send transactional communications you have requested or consented to, including vote alerts, nomination invitations, round advancement notices, voting reminders, event reminders, winner announcements, and account-related notices, by email, in-app notification, push notification, or SMS;</li>
            <li style={styles.li}>Process payments for vote purchases and other paid features;</li>
            <li style={styles.li}>Detect, investigate, and prevent fraud, vote manipulation, abuse, security incidents, and other prohibited or illegal activity;</li>
            <li style={styles.li}>Comply with legal obligations, enforce our Terms of Use and Contest Terms &amp; Conditions, and protect our rights, the rights of users, and the public;</li>
            <li style={styles.li}>Analyze aggregate trends in how the Service is used so we can make it better.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>4. Legal Bases for Processing</h2>
          <p style={styles.p}>
            Where required by applicable law (including the EU GDPR and UK GDPR), we rely on the following legal bases
            to process your personal information:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Performance of a contract:</span> to provide the Service you have requested and fulfill our obligations under our Terms of Use.</li>
            <li style={styles.li}><span style={styles.strong}>Consent:</span> for SMS marketing, certain cookies, optional features, and other processing where consent is required. You may withdraw consent at any time.</li>
            <li style={styles.li}><span style={styles.strong}>Legitimate interests:</span> to secure the Service, prevent fraud, analyze usage, and communicate with you about features you actively use, provided those interests are not overridden by your rights.</li>
            <li style={styles.li}><span style={styles.strong}>Legal obligation:</span> to comply with tax, anti-money-laundering, contest-disclosure, and other applicable laws.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>5. SMS / Text Messaging Privacy</h2>
          <p style={styles.p}>
            When you opt in to receive SMS notifications from EliteRank, we collect your mobile phone number, your
            consent to receive messages, and message delivery and interaction data. This information is used solely to
            send you account-related notifications about your EliteRank activity.
          </p>
          <p style={styles.pBold}>
            We will not sell, share, or rent your mobile phone number or SMS opt-in data or consent to any third
            parties for marketing or promotional purposes.
          </p>
          <p style={styles.p}>
            All categories of information described in this Policy exclude text-messaging originator opt-in data and
            consent; this information will not be shared with any third parties.
          </p>
          <p style={styles.p}>
            We share your information only with trusted service providers who assist us in delivering SMS messages
            (such as OneSignal and our underlying messaging carrier, Twilio), and only as necessary to deliver
            messages you have opted in to receive. These providers are contractually required to maintain the
            confidentiality and security of your information.
          </p>
          <p style={styles.p}>
            Message frequency varies based on your account activity and competition schedules. Message and data rates
            may apply. You may opt out at any time by replying <span style={styles.strong}>STOP</span> to any SMS
            message or by updating your notification preferences in your account settings.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>6. How We Share Information</h2>
          <p style={styles.p}>
            <span style={styles.strong}>We do not sell your personal information for money.</span> We disclose
            information only in the following limited circumstances:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Other users (public profile data):</span> your profile name, photo, city, social handles, competition entries, vote tallies, and similar competition activity are visible to other users as part of the Service.</li>
            <li style={styles.li}><span style={styles.strong}>Hosts and judges:</span> if you participate in a competition, the organization hosting that competition and its designated judges may see your entry and scoring data.</li>
            <li style={styles.li}><span style={styles.strong}>Service providers (subprocessors):</span> trusted vendors who process information on our behalf, including:
              <ul style={{ ...styles.ul, marginTop: spacing[2], marginBottom: 0 }}>
                <li style={styles.li}>Supabase &mdash; database, authentication, and file storage hosting</li>
                <li style={styles.li}>Vercel &mdash; web hosting, edge functions, and performance monitoring</li>
                <li style={styles.li}>Stripe &mdash; payment processing</li>
                <li style={styles.li}>OneSignal &mdash; email, push, and SMS delivery orchestration</li>
                <li style={styles.li}>Twilio &mdash; SMS carrier and short-code delivery</li>
                <li style={styles.li}>Sentry &mdash; error and performance monitoring</li>
                <li style={styles.li}>FingerprintJS &mdash; browser fingerprinting for fraud prevention</li>
                <li style={styles.li}>Orbiiit Technology, Inc. &mdash; underlying platform technology</li>
              </ul>
              These providers are contractually bound to use information only to deliver services to us.
            </li>
            <li style={styles.li}><span style={styles.strong}>Legal compliance:</span> when we believe disclosure is reasonably necessary to comply with a law, regulation, subpoena, court order, or other legal process; to enforce our agreements; or to protect the rights, property, or safety of EliteRank, our users, or the public.</li>
            <li style={styles.li}><span style={styles.strong}>Business transfers:</span> in connection with a merger, acquisition, financing, reorganization, sale of assets, or bankruptcy, your information may be transferred to a successor or acquirer.</li>
            <li style={styles.li}><span style={styles.strong}>Aggregate or de-identified data:</span> we may share information that has been aggregated or de-identified so that it cannot reasonably identify you.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>7. International Data Transfers</h2>
          <p style={styles.p}>
            EliteRank is operated from the United States. Some of our service providers process data in the United
            States, Canada, the European Union, or other locations. If you access the Service from outside the United
            States, your information will be transferred to, stored, and processed in the United States and other
            jurisdictions where our service providers operate.
          </p>
          <p style={styles.p}>
            Where personal information is transferred from the European Economic Area, the United Kingdom, or
            Switzerland, we rely on appropriate transfer mechanisms, such as the European Commission's Standard
            Contractual Clauses (and the UK Addendum, where applicable), to provide an adequate level of protection.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>8. Data Security</h2>
          <p style={styles.p}>
            We implement administrative, technical, and physical safeguards designed to protect your information,
            including encryption in transit (HTTPS / TLS), encryption at rest for sensitive data, row-level security
            on our database, scoped access controls, secrets management, and ongoing monitoring. No method of
            transmission over the internet or method of electronic storage is 100% secure; we cannot guarantee
            absolute security.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>9. Data Retention and Deletion</h2>
          <p style={styles.p}>
            We retain personal information for as long as your account is active or as needed to provide the Service,
            satisfy our legal, accounting, or reporting obligations, resolve disputes, and enforce our agreements.
            Specifically:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Account data:</span> retained while your account is active; deleted or anonymized within a reasonable period after account deletion, subject to legal retention obligations.</li>
            <li style={styles.li}><span style={styles.strong}>Competition records:</span> retained for the duration of the competition and a reasonable period afterward for prize fulfillment, dispute resolution, and historical accuracy.</li>
            <li style={styles.li}><span style={styles.strong}>SMS opt-in data:</span> if you opt out of SMS notifications, we securely delete your SMS opt-in data within 30 days, except where retention is required by law (for example, to honor a prior STOP request).</li>
            <li style={styles.li}><span style={styles.strong}>Payment records:</span> retained for the period required by tax and financial-reporting laws (typically up to seven years).</li>
            <li style={styles.li}><span style={styles.strong}>Logs and security data:</span> retained for a limited period sufficient to investigate incidents.</li>
          </ul>
          <p style={styles.p}>
            You may request deletion of your account and associated personal data at any time by contacting us at the
            address in Section 16. We will respond to verifiable deletion requests within 30 days (or as required by
            applicable law).
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>10. Your Choices</h2>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Account settings:</span> review or update your profile, communication preferences, and connected services at any time from your account settings.</li>
            <li style={styles.li}><span style={styles.strong}>Email:</span> use the "unsubscribe" link in any marketing email. Transactional emails (for example, security alerts) will continue.</li>
            <li style={styles.li}><span style={styles.strong}>SMS:</span> reply <span style={styles.strong}>STOP</span> to any text message, or update your preferences in account settings.</li>
            <li style={styles.li}><span style={styles.strong}>Push notifications:</span> disable in your browser or device settings.</li>
            <li style={styles.li}><span style={styles.strong}>Cookies:</span> use the cookie banner, the controls described in our <a onClick={() => navigate('/cookies')} style={styles.link}>Cookie Policy</a>, or your browser settings.</li>
            <li style={styles.li}><span style={styles.strong}>Do Not Track:</span> we do not currently respond to Do Not Track browser signals; we honor Global Privacy Control signals where required by applicable law.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>11. Children's Privacy</h2>
          <p style={styles.p}>
            The Service is intended for users <span style={styles.strong}>18 years of age or older</span>. We do not
            knowingly collect personal information from anyone under 18. If we learn that we have collected
            information from a child under 18, we will delete that information promptly. If you believe a child has
            provided us with personal information, please contact us.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>12. Notice to California Residents (CCPA / CPRA)</h2>
          <p style={styles.p}>
            This section provides additional disclosures required by the California Consumer Privacy Act, as amended
            by the California Privacy Rights Act ("CCPA"), for California residents.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>Categories of personal information collected</span> in the past 12 months
            include: identifiers (name, email, phone, device identifiers, IP address); commercial information
            (transactions); internet and network activity; approximate location; audio/visual information (photos and
            videos you submit); inferences from the above; and, where you provide it, government identification for
            prize verification. Sources, purposes, and recipients are described in Sections 2, 3, and 6.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>Sale or sharing of personal information:</span> we do not sell personal
            information for money. We do not knowingly share personal information for cross-context behavioral
            advertising. We do not sell or share the personal information of consumers under 16.
          </p>
          <p style={styles.p}>
            <span style={styles.strong}>Your California rights:</span> subject to verification, you may request to
            (i) know what personal information we have collected, used, and disclosed about you; (ii) correct
            inaccurate personal information; (iii) delete personal information we have collected from you; (iv) opt
            out of "sale" or "sharing" (we do not engage in either, but you may submit a request via the contact
            address below or a Global Privacy Control signal); and (v) limit the use of sensitive personal
            information. You may also designate an authorized agent to act on your behalf. We will not discriminate
            against you for exercising any of these rights.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>13. Notice to Residents of the EEA, United Kingdom, and Switzerland (GDPR / UK GDPR)</h2>
          <p style={styles.p}>
            EliteRank is offered in the United States and is not actively marketed in the European Economic Area, the
            United Kingdom, or Switzerland. If you access the Service from these regions, the following rights apply
            to your personal information under the EU GDPR, UK GDPR, and Swiss FADP, subject to applicable
            exceptions:
          </p>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Right of access</span> to the personal data we hold about you;</li>
            <li style={styles.li}><span style={styles.strong}>Right of rectification</span> of inaccurate or incomplete data;</li>
            <li style={styles.li}><span style={styles.strong}>Right to erasure</span> ("right to be forgotten"), subject to legal retention obligations;</li>
            <li style={styles.li}><span style={styles.strong}>Right to restrict or object</span> to certain processing, including direct marketing;</li>
            <li style={styles.li}><span style={styles.strong}>Right to data portability</span> for data you provided that we process by automated means on the basis of consent or contract;</li>
            <li style={styles.li}><span style={styles.strong}>Right to withdraw consent</span> at any time, without affecting the lawfulness of processing prior to withdrawal;</li>
            <li style={styles.li}><span style={styles.strong}>Right to lodge a complaint</span> with your local supervisory authority (in the UK, the Information Commissioner's Office; in Switzerland, the Federal Data Protection and Information Commissioner).</li>
          </ul>
          <p style={styles.p}>
            To exercise any of these rights, contact us at the address in Section 16. Most Eligible LLC is the
            controller of personal data described in this Policy. We have not designated a representative in the EU
            or UK because we do not direct the Service to those regions; we will respond to inquiries received
            through the contact channel below.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>14. Notice to Canadian Residents (PIPEDA)</h2>
          <p style={styles.p}>
            If you access the Service from Canada, you have the right under the Personal Information Protection and
            Electronic Documents Act ("PIPEDA") and applicable provincial laws to access and request correction of
            the personal information we hold about you, and to withdraw consent to our collection, use, and
            disclosure of your personal information (subject to legal or contractual restrictions). Contact us at the
            address in Section 16.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>15. Changes to This Policy</h2>
          <p style={styles.p}>
            We may update this Privacy Policy from time to time. Material changes will be communicated by updating
            the "Last Updated" date above and, where required, by additional notice (such as a banner in the Service
            or an email to active users). Your continued use of the Service after changes take effect constitutes
            acceptance of the revised Policy.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>16. Contact Us</h2>
          <p style={styles.p}>
            If you have questions about this Policy or wish to exercise any of your rights described above, please
            contact us:
          </p>
          <div style={styles.contactBox}>
            <p style={{ ...styles.p, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] }}>Most Eligible LLC</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Attn: Privacy</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Email: privacy@eliterank.co</p>
            <p style={{ ...styles.p, marginBottom: 0 }}>
              Website: <a href="https://eliterank.co" style={styles.link}>eliterank.co</a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

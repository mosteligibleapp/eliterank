/**
 * TermsPage - Terms of Service page
 * Required for Twilio A2P 10DLC compliance and TCPA SMS opt-in.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { colors, spacing, typography, borderRadius, transitions } from '../styles/theme';
import SiteFooter from '../components/layout/SiteFooter';

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
  },
  container: {
    maxWidth: '720px',
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
  },
  p: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[3],
  },
  ul: {
    listStyle: 'disc',
    paddingLeft: spacing[6],
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
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

        <h1 style={styles.title}>Terms of Service</h1>
        <p style={styles.updated}>Last Updated: March 10, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>1. Acceptance of Terms</h2>
          <p style={styles.p}>
            By accessing or using EliteRank ("the Service"), operated at eliterank.co, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, do not use the Service. We reserve the right to update these terms at any time,
            and your continued use of the Service constitutes acceptance of any changes.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>2. Description of Service</h2>
          <p style={styles.p}>
            EliteRank is a social competition platform where users can be nominated, compete, and vote in "Most Eligible" competitions across cities.
            The Service includes user profiles, competition listings, voting, nominations, leaderboards, rewards, and related features.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>3. Eligibility</h2>
          <p style={styles.p}>
            You must be at least 18 years of age and a resident of the United States to use the Service.
            By using EliteRank, you represent and warrant that you meet these eligibility requirements.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>4. User Accounts</h2>
          <p style={styles.p}>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.
            You agree to provide accurate and complete information during registration and to keep your account information up to date.
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>5. User Conduct</h2>
          <p style={styles.p}>You agree not to:</p>
          <ul style={styles.ul}>
            <li style={styles.li}>Use the Service for any unlawful purpose or to violate any laws</li>
            <li style={styles.li}>Manipulate votes, rankings, or competition outcomes through fraudulent means</li>
            <li style={styles.li}>Create multiple accounts to influence competitions</li>
            <li style={styles.li}>Harass, abuse, or harm other users</li>
            <li style={styles.li}>Upload content that is offensive, defamatory, or infringes on others' rights</li>
            <li style={styles.li}>Attempt to gain unauthorized access to the Service or its systems</li>
            <li style={styles.li}>Use automated scripts, bots, or scrapers to access the Service</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>6. Competitions and Voting</h2>
          <p style={styles.p}>
            EliteRank competitions are organized and managed by hosts. Competition rules, timelines, and prizes are set by the host and may vary.
            We reserve the right to disqualify participants, void votes, or modify competition outcomes if we detect fraud or violations of these terms.
            Participation in competitions does not guarantee any prizes or rewards.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>7. SMS/Text Messaging Terms</h2>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.1 Program Description</h3>
            <p style={styles.p}>
              EliteRank offers an SMS messaging program to deliver account notifications including:
              vote alerts, nomination invitations, competition round advancement notices, voting window reminders,
              event reminders, voting receipts, reward notifications, and winner announcements.
            </p>
          </div>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.2 Consent</h3>
            <p style={styles.p}>
              By providing your mobile phone number and opting in to SMS notifications, you expressly consent to receive
              recurring automated text messages from EliteRank at the mobile number you provided.
              Consent is not a condition of purchase, registration, or use of our Service.
              You may use EliteRank without opting in to SMS notifications.
            </p>
          </div>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.3 Message Frequency</h3>
            <p style={styles.p}>
              Message frequency varies based on your account activity and competition schedules.
              During active competition periods, you may receive up to 15 messages per month.
              During inactive periods, frequency will be significantly lower.
            </p>
          </div>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.4 Message and Data Rates</h3>
            <p style={styles.p}>
              Message and data rates may apply. Check with your mobile service provider for details about your plan's messaging rates.
              EliteRank is not responsible for any fees charged by your wireless carrier.
            </p>
          </div>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.5 Opt-Out</h3>
            <p style={styles.p}>
              You can opt out of receiving SMS messages at any time by replying <span style={styles.strong}>STOP</span> to
              any message you receive from us. After you send STOP, you will receive one final confirmation message and no further
              messages will be sent unless you re-enroll. You may also opt out by updating your notification preferences in your account
              settings or by contacting us at info@eliterank.co.
            </p>
          </div>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.6 Help and Support</h3>
            <p style={styles.p}>
              For assistance, reply <span style={styles.strong}>HELP</span> to any message you receive from us, or contact us at:
            </p>
            <ul style={styles.ul}>
              <li style={styles.li}>Email: info@eliterank.co</li>
              <li style={styles.li}>Website: <a href="https://eliterank.co" style={styles.link}>eliterank.co</a></li>
            </ul>
          </div>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.7 Carrier Disclaimer</h3>
            <p style={styles.p}>
              T-Mobile, AT&T, Verizon, and other carriers are not liable for delayed or undelivered messages.
              EliteRank is not responsible for any delays, failures in delivery, or other issues related to the
              transmission or receipt of text messages that are outside our control.
            </p>
          </div>

          <div style={styles.subsection}>
            <h3 style={styles.h3}>7.8 Privacy</h3>
            <p style={styles.p}>
              Your privacy is important to us. Please review our{' '}
              <a onClick={() => navigate('/privacy')} style={{ ...styles.link, cursor: 'pointer' }}>Privacy Policy</a>{' '}
              for information on how we collect, use, and protect your data.
              We do not sell, share, or rent your mobile phone number or SMS opt-in data to third parties for marketing or promotional purposes.
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>8. Intellectual Property</h2>
          <p style={styles.p}>
            The EliteRank name, logo, and all related content, features, and functionality are owned by EliteRank and protected by
            applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our
            Service without express written permission.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>9. User Content</h2>
          <p style={styles.p}>
            You retain ownership of content you submit to EliteRank (photos, profile information, etc.). By submitting content,
            you grant EliteRank a non-exclusive, royalty-free, worldwide license to use, display, and distribute your content
            in connection with operating the Service. You are solely responsible for the content you submit.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>10. Disclaimer of Warranties</h2>
          <p style={styles.p}>
            The Service is provided "as is" and "as available" without warranties of any kind, either express or implied.
            We do not warrant that the Service will be uninterrupted, error-free, or secure.
            Your use of the Service is at your sole risk.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>11. Limitation of Liability</h2>
          <p style={styles.p}>
            To the maximum extent permitted by law, EliteRank shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the Service, including but not limited to loss of
            profits, data, or goodwill.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>12. Modifications to Terms</h2>
          <p style={styles.p}>
            We reserve the right to modify these Terms of Service at any time. We will notify active subscribers of material changes
            via email or in-app notification. Changes will be effective when posted on this page with an updated "Last Updated" date.
            Continued use of the Service after changes constitutes acceptance of the modified terms.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>13. Governing Law</h2>
          <p style={styles.p}>
            These Terms shall be governed by and construed in accordance with the laws of the State of Texas,
            without regard to its conflict of law provisions.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>14. Contact Us</h2>
          <p style={styles.p}>
            If you have questions about these Terms of Service, contact us at:
          </p>
          <div style={styles.contactBox}>
            <p style={{ ...styles.p, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] }}>EliteRank</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Email: info@eliterank.co</p>
            <p style={{ ...styles.p, marginBottom: 0 }}>
              Website: <a href="https://eliterank.co" style={styles.link}>eliterank.co</a>
            </p>
          </div>
        </section>

      </div>
      <SiteFooter />
    </div>
  );
}

/**
 * PrivacyPage - Privacy Policy page
 * Required for Twilio A2P 10DLC compliance and TCPA SMS opt-in.
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
        <p style={styles.updated}>Last Updated: March 10, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.h2}>1. Introduction</h2>
          <p style={styles.p}>
            EliteRank ("we," "us," "our") operates the website eliterank.co and related services (the "Service").
            This Privacy Policy describes how we collect, use, and protect your personal information when you use our Service.
            By using EliteRank, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>2. Information We Collect</h2>
          <p style={styles.p}>We collect the following types of information:</p>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Account Information:</span> Name, email address, phone number, city, and profile details you provide during registration or profile setup.</li>
            <li style={styles.li}><span style={styles.strong}>Competition Data:</span> Nominations, votes, rankings, and competition participation history.</li>
            <li style={styles.li}><span style={styles.strong}>Communications Data:</span> Your mobile phone number, SMS opt-in consent, message delivery and interaction data, and communication preferences.</li>
            <li style={styles.li}><span style={styles.strong}>Usage Data:</span> Information about how you interact with our Service, including pages visited, features used, and actions taken.</li>
            <li style={styles.li}><span style={styles.strong}>Device Information:</span> Browser type, operating system, and device identifiers used to access our Service.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>3. How We Use Your Information</h2>
          <p style={styles.p}>We use the information we collect to:</p>
          <ul style={styles.ul}>
            <li style={styles.li}>Operate, maintain, and improve the EliteRank platform</li>
            <li style={styles.li}>Process nominations, votes, and competition results</li>
            <li style={styles.li}>Send you account-related notifications including vote alerts, nomination invitations, competition updates, round advancement notices, event reminders, and winner announcements</li>
            <li style={styles.li}>Deliver transactional SMS messages to your mobile phone number when you have opted in</li>
            <li style={styles.li}>Respond to your inquiries and provide customer support</li>
            <li style={styles.li}>Detect and prevent fraud, abuse, or unauthorized access</li>
            <li style={styles.li}>Comply with legal obligations</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>4. SMS/Text Messaging Privacy</h2>
          <p style={styles.p}>
            When you opt in to receive SMS notifications from EliteRank, we collect your mobile phone number, your consent to receive messages, and message delivery data.
            This information is used solely to send you account-related notifications about your EliteRank activity.
          </p>
          <p style={styles.pBold}>
            We will not sell, share, or rent your mobile phone number or SMS opt-in data and consent to any third parties for marketing or promotional purposes.
          </p>
          <p style={styles.p}>
            All categories of information described in this policy exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
          </p>
          <p style={styles.p}>
            We may share your information only with trusted service providers who assist us in operating our SMS services (such as our messaging platform provider),
            and only as necessary to deliver messages you have opted in to receive. These providers are contractually required to maintain the confidentiality and security of your information.
          </p>
          <p style={styles.p}>
            Message frequency varies based on your account activity and competition schedules. Message and data rates may apply.
            You may opt out at any time by replying STOP to any SMS message or by updating your notification preferences in your account settings.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>5. Sharing Your Information</h2>
          <p style={styles.p}>We do not sell your personal information. We may share your information in the following limited circumstances:</p>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Service Providers:</span> Trusted third-party providers who help us operate the platform (hosting, email delivery, analytics). They are contractually bound to protect your data.</li>
            <li style={styles.li}><span style={styles.strong}>Public Profile Data:</span> Your profile name, photo, and competition participation may be visible to other users as part of the competition experience.</li>
            <li style={styles.li}><span style={styles.strong}>Legal Requirements:</span> When required by law, subpoena, court order, or government request.</li>
            <li style={styles.li}><span style={styles.strong}>Safety:</span> To protect the rights, safety, or property of EliteRank, our users, or the public.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>6. Data Security</h2>
          <p style={styles.p}>
            We implement industry-standard security measures including encryption in transit and at rest, secure authentication,
            and access controls to protect your personal information from unauthorized access, disclosure, alteration, or destruction.
            While no method of transmission over the internet is 100% secure, we strive to use commercially acceptable means to protect your data.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>7. Data Retention and Deletion</h2>
          <p style={styles.p}>
            We retain your personal information for as long as your account is active or as needed to provide you our Service.
            If you opt out of SMS notifications, we will securely delete your SMS opt-in data within 30 days.
            You may request deletion of your account and associated data at any time by contacting us at the address below.
            We will respond to deletion requests within 30 days.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>8. Your Rights and Choices</h2>
          <p style={styles.p}>You have the right to:</p>
          <ul style={styles.ul}>
            <li style={styles.li}><span style={styles.strong}>Opt Out of SMS:</span> Reply STOP to any message or update your preferences in account settings.</li>
            <li style={styles.li}><span style={styles.strong}>Access Your Data:</span> Request a copy of the personal information we hold about you.</li>
            <li style={styles.li}><span style={styles.strong}>Correct Your Data:</span> Update or correct inaccurate information through your profile settings or by contacting us.</li>
            <li style={styles.li}><span style={styles.strong}>Delete Your Data:</span> Request deletion of your personal data by contacting us at info@eliterank.co.</li>
            <li style={styles.li}><span style={styles.strong}>Get Help:</span> Reply HELP to any SMS message for assistance, or contact us at info@eliterank.co.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>9. Children's Privacy</h2>
          <p style={styles.p}>
            EliteRank is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18.
            If we learn we have collected information from a child under 18, we will take steps to delete that information promptly.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>10. Changes to This Policy</h2>
          <p style={styles.p}>
            We may update this Privacy Policy from time to time. Changes will be effective when posted on this page,
            and we will update the "Last Updated" date above. We encourage you to review this policy periodically.
            Continued use of the Service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.h2}>11. Contact Us</h2>
          <p style={styles.p}>
            If you have questions about this Privacy Policy or our data practices, contact us at:
          </p>
          <div style={styles.contactBox}>
            <p style={{ ...styles.p, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[1] }}>EliteRank</p>
            <p style={{ ...styles.p, marginBottom: spacing[1] }}>Email: info@eliterank.co</p>
            <p style={{ ...styles.p, marginBottom: 0 }}>
              Website: <a href="https://eliterank.co" style={{ color: colors.gold.primary, textDecoration: 'none' }}>eliterank.co</a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

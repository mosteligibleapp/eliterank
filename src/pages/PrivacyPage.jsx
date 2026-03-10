/**
 * PrivacyPage - Privacy Policy page
 * Required for Twilio A2P 10DLC compliance and TCPA SMS opt-in.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-gold transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to EliteRank
        </Link>

        <h1 className="text-3xl font-bold text-gold mb-2">Privacy Policy</h1>
        <p className="text-text-secondary mb-8">Last Updated: March 10, 2026</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">1. Introduction</h2>
            <p>
              EliteRank ("we," "us," "our") operates the website eliterank.co and related services (the "Service").
              This Privacy Policy describes how we collect, use, and protect your personal information when you use our Service.
              By using EliteRank, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-text-primary">Account Information:</strong> Name, email address, phone number, city, and profile details you provide during registration or profile setup.</li>
              <li><strong className="text-text-primary">Competition Data:</strong> Nominations, votes, rankings, and competition participation history.</li>
              <li><strong className="text-text-primary">Communications Data:</strong> Your mobile phone number, SMS opt-in consent, message delivery and interaction data, and communication preferences.</li>
              <li><strong className="text-text-primary">Usage Data:</strong> Information about how you interact with our Service, including pages visited, features used, and actions taken.</li>
              <li><strong className="text-text-primary">Device Information:</strong> Browser type, operating system, and device identifiers used to access our Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Operate, maintain, and improve the EliteRank platform</li>
              <li>Process nominations, votes, and competition results</li>
              <li>Send you account-related notifications including vote alerts, nomination invitations, competition updates, round advancement notices, event reminders, and winner announcements</li>
              <li>Deliver transactional SMS messages to your mobile phone number when you have opted in</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect and prevent fraud, abuse, or unauthorized access</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">4. SMS/Text Messaging Privacy</h2>
            <p className="mb-3">
              When you opt in to receive SMS notifications from EliteRank, we collect your mobile phone number, your consent to receive messages, and message delivery data.
              This information is used solely to send you account-related notifications about your EliteRank activity.
            </p>
            <p className="mb-3 font-semibold text-text-primary">
              We will not sell, share, or rent your mobile phone number or SMS opt-in data and consent to any third parties for marketing or promotional purposes.
            </p>
            <p className="mb-3">
              All categories of information described in this policy exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
            </p>
            <p className="mb-3">
              We may share your information only with trusted service providers who assist us in operating our SMS services (such as our messaging platform provider),
              and only as necessary to deliver messages you have opted in to receive. These providers are contractually required to maintain the confidentiality and security of your information.
            </p>
            <p>
              Message frequency varies based on your account activity and competition schedules. Message and data rates may apply.
              You may opt out at any time by replying STOP to any SMS message or by updating your notification preferences in your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">5. Sharing Your Information</h2>
            <p className="mb-3">We do not sell your personal information. We may share your information in the following limited circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-text-primary">Service Providers:</strong> Trusted third-party providers who help us operate the platform (hosting, email delivery, analytics). They are contractually bound to protect your data.</li>
              <li><strong className="text-text-primary">Public Profile Data:</strong> Your profile name, photo, and competition participation may be visible to other users as part of the competition experience.</li>
              <li><strong className="text-text-primary">Legal Requirements:</strong> When required by law, subpoena, court order, or government request.</li>
              <li><strong className="text-text-primary">Safety:</strong> To protect the rights, safety, or property of EliteRank, our users, or the public.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit and at rest, secure authentication,
              and access controls to protect your personal information from unauthorized access, disclosure, alteration, or destruction.
              While no method of transmission over the internet is 100% secure, we strive to use commercially acceptable means to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">7. Data Retention and Deletion</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide you our Service.
              If you opt out of SMS notifications, we will securely delete your SMS opt-in data within 30 days.
              You may request deletion of your account and associated data at any time by contacting us at the address below.
              We will respond to deletion requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">8. Your Rights and Choices</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-text-primary">Opt Out of SMS:</strong> Reply STOP to any message or update your preferences in account settings.</li>
              <li><strong className="text-text-primary">Access Your Data:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong className="text-text-primary">Correct Your Data:</strong> Update or correct inaccurate information through your profile settings or by contacting us.</li>
              <li><strong className="text-text-primary">Delete Your Data:</strong> Request deletion of your personal data by contacting us at info@eliterank.co.</li>
              <li><strong className="text-text-primary">Get Help:</strong> Reply HELP to any SMS message for assistance, or contact us at info@eliterank.co.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">9. Children's Privacy</h2>
            <p>
              EliteRank is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18.
              If we learn we have collected information from a child under 18, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be effective when posted on this page,
              and we will update the "Last Updated" date above. We encourage you to review this policy periodically.
              Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <div className="mt-3 p-4 bg-surface-primary rounded-lg border border-border">
              <p className="font-semibold text-text-primary">EliteRank</p>
              <p>Email: info@eliterank.co</p>
              <p>Website: <a href="https://eliterank.co" className="text-gold hover:underline">eliterank.co</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

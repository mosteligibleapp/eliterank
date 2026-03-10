/**
 * TermsPage - Terms of Service page
 * Required for Twilio A2P 10DLC compliance and TCPA SMS opt-in.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-gold transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to EliteRank
        </Link>

        <h1 className="text-3xl font-bold text-gold mb-2">Terms of Service</h1>
        <p className="text-text-secondary mb-8">Last Updated: March 10, 2026</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using EliteRank ("the Service"), operated at eliterank.co, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service. We reserve the right to update these terms at any time,
              and your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">2. Description of Service</h2>
            <p>
              EliteRank is a social competition platform where users can be nominated, compete, and vote in "Most Eligible" competitions across cities.
              The Service includes user profiles, competition listings, voting, nominations, leaderboards, rewards, and related features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">3. Eligibility</h2>
            <p>
              You must be at least 18 years of age and a resident of the United States to use the Service.
              By using EliteRank, you represent and warrant that you meet these eligibility requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">4. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.
              You agree to provide accurate and complete information during registration and to keep your account information up to date.
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">5. User Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any unlawful purpose or to violate any laws</li>
              <li>Manipulate votes, rankings, or competition outcomes through fraudulent means</li>
              <li>Create multiple accounts to influence competitions</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload content that is offensive, defamatory, or infringes on others' rights</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Use automated scripts, bots, or scrapers to access the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">6. Competitions and Voting</h2>
            <p>
              EliteRank competitions are organized and managed by hosts. Competition rules, timelines, and prizes are set by the host and may vary.
              We reserve the right to disqualify participants, void votes, or modify competition outcomes if we detect fraud or violations of these terms.
              Participation in competitions does not guarantee any prizes or rewards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">7. SMS/Text Messaging Terms</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.1 Program Description</h3>
                <p>
                  EliteRank offers an SMS messaging program to deliver account notifications including:
                  vote alerts, nomination invitations, competition round advancement notices, voting window reminders,
                  event reminders, voting receipts, reward notifications, and winner announcements.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.2 Consent</h3>
                <p>
                  By providing your mobile phone number and opting in to SMS notifications, you expressly consent to receive
                  recurring automated text messages from EliteRank at the mobile number you provided.
                  Consent is not a condition of purchase, registration, or use of our Service.
                  You may use EliteRank without opting in to SMS notifications.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.3 Message Frequency</h3>
                <p>
                  Message frequency varies based on your account activity and competition schedules.
                  During active competition periods, you may receive up to 15 messages per month.
                  During inactive periods, frequency will be significantly lower.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.4 Message and Data Rates</h3>
                <p>
                  Message and data rates may apply. Check with your mobile service provider for details about your plan's messaging rates.
                  EliteRank is not responsible for any fees charged by your wireless carrier.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.5 Opt-Out</h3>
                <p>
                  You can opt out of receiving SMS messages at any time by replying <strong className="text-text-primary">STOP</strong> to
                  any message you receive from us. After you send STOP, you will receive one final confirmation message and no further
                  messages will be sent unless you re-enroll. You may also opt out by updating your notification preferences in your account
                  settings or by contacting us at info@eliterank.co.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.6 Help and Support</h3>
                <p>
                  For assistance, reply <strong className="text-text-primary">HELP</strong> to any message you receive from us, or contact us at:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Email: info@eliterank.co</li>
                  <li>Website: <a href="https://eliterank.co" className="text-gold hover:underline">eliterank.co</a></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.7 Carrier Disclaimer</h3>
                <p>
                  T-Mobile, AT&T, Verizon, and other carriers are not liable for delayed or undelivered messages.
                  EliteRank is not responsible for any delays, failures in delivery, or other issues related to the
                  transmission or receipt of text messages that are outside our control.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-text-primary mb-2">7.8 Privacy</h3>
                <p>
                  Your privacy is important to us. Please review our{' '}
                  <Link to="/privacy" className="text-gold hover:underline">Privacy Policy</Link>{' '}
                  for information on how we collect, use, and protect your data.
                  We do not sell, share, or rent your mobile phone number or SMS opt-in data to third parties for marketing or promotional purposes.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">8. Intellectual Property</h2>
            <p>
              The EliteRank name, logo, and all related content, features, and functionality are owned by EliteRank and protected by
              applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our
              Service without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">9. User Content</h2>
            <p>
              You retain ownership of content you submit to EliteRank (photos, profile information, etc.). By submitting content,
              you grant EliteRank a non-exclusive, royalty-free, worldwide license to use, display, and distribute your content
              in connection with operating the Service. You are solely responsible for the content you submit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied.
              We do not warrant that the Service will be uninterrupted, error-free, or secure.
              Your use of the Service is at your sole risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, EliteRank shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of the Service, including but not limited to loss of
              profits, data, or goodwill.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">12. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. We will notify active subscribers of material changes
              via email or in-app notification. Changes will be effective when posted on this page with an updated "Last Updated" date.
              Continued use of the Service after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Texas,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">14. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, contact us at:
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

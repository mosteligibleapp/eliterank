-- Email templates table for reusable email content
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  -- Supported placeholders: {{name}}, {{email}}, {{competition_name}}, {{city}}, {{season}}, {{claim_link}}
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'nomination', 'voting', 'results', 'reminder')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email send log for tracking sent emails
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('nominee', 'contestant', 'custom')),
  recipient_id UUID,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying email logs by competition
CREATE INDEX IF NOT EXISTS idx_email_log_competition ON email_log(competition_id);
CREATE INDEX IF NOT EXISTS idx_email_log_template ON email_log(template_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Only super admins / service role can manage templates
CREATE POLICY "Service role full access to email_templates"
  ON email_templates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to email_log"
  ON email_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert some default templates
INSERT INTO email_templates (name, subject, body, description, category) VALUES
(
  'Nomination Announcement',
  'You''ve been nominated for {{competition_name}}!',
  'Hi {{name}},

Great news! You''ve been nominated for {{competition_name}} in {{city}}.

This is an exciting opportunity to showcase yourself and compete for the title. Here''s what you need to do next:

1. Click the link below to accept your nomination
2. Complete your profile
3. Start gathering votes!

{{claim_link}}

Good luck!
- The EliteRank Team',
  'Sent to nominees when they are nominated',
  'nomination'
),
(
  'Voting Has Started',
  'Voting is now open for {{competition_name}}!',
  'Hi {{name}},

Exciting news — voting has officially begun for {{competition_name}}!

Share your profile with friends and family to collect votes. The more votes you get, the higher you''ll rank on the leaderboard.

May the best candidate win!

- The EliteRank Team',
  'Notify contestants when the voting phase begins',
  'voting'
),
(
  'Voting Reminder',
  'Don''t forget to vote in {{competition_name}}!',
  'Hi {{name}},

Just a friendly reminder that voting is still open for {{competition_name}} in {{city}}.

Make sure you''ve shared your profile and asked your network to vote for you. Every vote counts!

- The EliteRank Team',
  'Reminder to contestants during voting phase',
  'reminder'
),
(
  'Results Announcement',
  '{{competition_name}} Results Are In!',
  'Hi {{name}},

The results for {{competition_name}} are in!

Thank you for participating in this season''s competition. Head over to the competition page to see the final standings and winners.

Congratulations to all participants — you all made this season incredible!

- The EliteRank Team',
  'Sent to all participants when results are announced',
  'results'
),
(
  'General Update',
  'Update from {{competition_name}}',
  'Hi {{name}},

We have an important update regarding {{competition_name}} in {{city}}.

[Your message here]

Thanks,
- The EliteRank Team',
  'General purpose template for custom messages',
  'general'
);

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * notify-competition-submission
 *
 * Fired by the public /launch sales lead form after a row is inserted into
 * interest_submissions (with interest_type='launching'). Sends two emails
 * via OneSignal:
 *   1. Confirmation email to the submitter
 *   2. Internal notification to the super admin notification address
 *
 * Required Supabase secrets:
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_API_KEY
 *   APP_URL                                e.g. https://eliterank.co
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPER_ADMIN_NOTIFICATION_EMAIL         where internal alerts land
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  submission_id: string
}

/**
 * Launch leads are stored as rows in interest_submissions with
 * interest_type='launching'. Column names below follow that table.
 */
interface Submission {
  id: string
  created_at: string
  name: string
  email: string
  org_name: string | null
  website_url: string | null
  pitch: string | null
  start_timeframe: string | null
  message: string | null
}

const escape = (s: string | null | undefined) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  )

function brandShell(inner: string, appUrl: string): string {
  return `
<div style="background:#0a0a0c;padding:32px 16px;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#111114;border:1px solid #2a2a2e;border-radius:12px;overflow:hidden;">
    <div style="text-align:center;padding:32px 0 16px;">
      <span style="font-size:12px;letter-spacing:0.3em;color:#999;">ELITERANK</span>
    </div>
    <div style="padding:0 32px 32px;color:#e5e5e5;font-size:14px;line-height:1.6;">
      ${inner}
    </div>
    <div style="text-align:center;padding:24px 0;border-top:1px solid #2a2a2e;">
      <a href="${appUrl}" style="color:#d4a843;font-size:12px;text-decoration:none;">eliterank.co</a>
    </div>
  </div>
</div>
  `
}

function confirmationEmail(sub: Submission, appUrl: string): { subject: string; body: string } {
  const subject = `We got your interest — talk soon`
  const inner = `
    <h2 style="color:#d4af37;font-size:20px;margin:0 0 16px;">Thanks — we've got it.</h2>
    <p style="margin:0 0 12px;">Hi ${escape(sub.name)},</p>
    <p style="margin:0 0 12px;">
      We received your interest in launching a competition with EliteRank.
      Someone from our team will reach out within 1-2 business days to talk
      through what you have in mind.
    </p>
    <p style="margin:0 0 12px;color:#999;font-size:12px;">
      Submission ID: <code style="color:#d4a843;">${escape(sub.id)}</code>
    </p>
    <p style="margin:24px 0 0;">— The EliteRank team</p>
  `
  return { subject, body: brandShell(inner, appUrl) }
}

function adminNotificationEmail(sub: Submission, appUrl: string): { subject: string; body: string } {
  const subject = `[Lead] ${sub.org_name || sub.name} — ${sub.start_timeframe || 'no timeframe'}`
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#999;vertical-align:top;width:140px;">${label}</td>
      <td style="padding:6px 0;color:#fff;">${value}</td>
    </tr>
  `
  const inner = `
    <h2 style="color:#d4af37;font-size:20px;margin:0 0 16px;">New launch lead</h2>
    <table style="width:100%;font-size:13px;border-collapse:collapse;">
      ${row('Contact', `${escape(sub.name)} &lt;${escape(sub.email)}&gt;`)}
      ${row('Org', escape(sub.org_name || '—'))}
      ${row('Website / social', escape(sub.website_url || '—'))}
      ${row('Wants to start', escape(sub.start_timeframe || '—'))}
    </table>
    <h3 style="color:#d4af37;font-size:14px;margin:24px 0 8px;">What they want to launch</h3>
    <p style="margin:0;white-space:pre-wrap;">${escape(sub.pitch || '—')}</p>
    ${sub.message ? `
      <h3 style="color:#d4af37;font-size:14px;margin:24px 0 8px;">Notes</h3>
      <p style="margin:0;white-space:pre-wrap;">${escape(sub.message)}</p>
    ` : ''}
    <p style="margin:24px 0 0;">
      <a href="${appUrl}/admin/" style="display:inline-block;padding:10px 16px;background:#d4af37;color:#0a0a0c;text-decoration:none;border-radius:8px;font-weight:600;">
        Open in admin
      </a>
    </p>
  `
  return { subject, body: brandShell(inner, appUrl) }
}

async function sendOneSignalEmail(
  appId: string,
  apiKey: string,
  toEmail: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; status: number; result: unknown }> {
  const payload = {
    app_id: appId,
    email_subject: subject,
    email_body: body,
    email_from_name: 'EliteRank',
    email_from_address: 'info@eliterank.co',
    disable_email_click_tracking: true,
    include_email_tokens: [toEmail],
  }
  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })
  const result = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, result }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { submission_id } = (await req.json()) as RequestBody
    if (!submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appId = Deno.env.get('ONESIGNAL_APP_ID')
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://eliterank.co'
    const adminEmail = Deno.env.get('SUPER_ADMIN_NOTIFICATION_EMAIL')

    if (!appId || !apiKey) {
      console.error('Missing OneSignal credentials')
      return new Response(JSON.stringify({ error: 'OneSignal not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: sub, error } = await supabase
      .from('interest_submissions')
      .select('*')
      .eq('id', submission_id)
      .eq('interest_type', 'launching')
      .single<Submission>()

    if (error || !sub) {
      console.error('Submission lookup failed:', error)
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: Record<string, unknown> = {}

    const confirm = confirmationEmail(sub, appUrl)
    const confirmResult = await sendOneSignalEmail(
      appId,
      apiKey,
      sub.email,
      confirm.subject,
      confirm.body,
    )
    results.confirmation = { ok: confirmResult.ok, status: confirmResult.status }
    if (!confirmResult.ok) console.error('Confirmation send failed:', confirmResult.result)

    if (adminEmail) {
      const admin = adminNotificationEmail(sub, appUrl)
      const adminResult = await sendOneSignalEmail(
        appId,
        apiKey,
        adminEmail,
        admin.subject,
        admin.body,
      )
      results.admin_notification = { ok: adminResult.ok, status: adminResult.status }
      if (!adminResult.ok) console.error('Admin notification failed:', adminResult.result)
    } else {
      console.warn('SUPER_ADMIN_NOTIFICATION_EMAIL not set; skipping admin alert')
      results.admin_notification = { skipped: true }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-competition-submission error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

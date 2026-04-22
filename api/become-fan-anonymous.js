/**
 * POST /api/become-fan-anonymous
 *
 * Creates a fan relationship for an anonymous voter. Called after they
 * cast a vote and want to follow the contestant's journey.
 *
 * Requires the visitorId returned from cast-anonymous-vote — this is the
 * auth.users id we created for them. We use service role to insert since
 * they're not logged in.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return response.status(500).json({ error: 'Server not configured' });
  }

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: 'Invalid JSON body' });
  }

  const { visitorId, contestantId } = body || {};

  if (!visitorId || !contestantId) {
    return response.status(400).json({ error: 'Missing visitorId or contestantId' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Verify the visitor exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(visitorId);
    if (authError || !authUser?.user) {
      return response.status(400).json({ error: 'Invalid visitor' });
    }

    // Verify the contestant exists
    const { data: contestant, error: contestantError } = await supabase
      .from('contestants')
      .select('id, name, user_id, competition:competitions(name, slug, organization:organizations(slug))')
      .eq('id', contestantId)
      .maybeSingle();

    if (contestantError || !contestant) {
      return response.status(400).json({ error: 'Contestant not found' });
    }

    // Create the fan relationship
    const { data: fan, error: fanError } = await supabase
      .from('contestant_fans')
      .insert({
        user_id: visitorId,
        contestant_id: contestantId,
      })
      .select('id')
      .single();

    if (fanError) {
      // Already a fan (unique constraint)
      if (fanError.code === '23505') {
        return response.status(200).json({ success: true, alreadyFan: true });
      }
      console.error('Fan insert failed:', fanError);
      return response.status(500).json({ error: 'Could not create fan relationship' });
    }

    // Fire confirmation email (fire-and-forget)
    const voterEmail = authUser.user.email;
    if (voterEmail && fan?.id) {
      const appUrl = process.env.APP_URL || 'https://eliterank.co';
      const orgSlug = contestant.competition?.organization?.slug || 'most-eligible';
      const competitionSlug = contestant.competition?.slug;
      const competitionUrl = competitionSlug
        ? `${appUrl}/${orgSlug}/${competitionSlug}`
        : undefined;
      const profileUrl = contestant.user_id
        ? `${appUrl}/profile/${contestant.user_id}`
        : undefined;

      supabase.functions.invoke('send-onesignal-email', {
        body: {
          type: 'fan_confirmation',
          to_email: voterEmail,
          contestant_name: contestant.name,
          competition_name: contestant.competition?.name,
          competition_url: competitionUrl,
          profile_url: profileUrl,
          fan_id: fan.id,
        },
      }).catch(err => {
        console.warn('Fan confirmation email failed (non-fatal):', err?.message);
      });
    }

    return response.status(200).json({
      success: true,
      contestantName: contestant.name,
    });
  } catch (err) {
    console.error('Unexpected error in become-fan-anonymous:', err);
    return response.status(500).json({ error: 'An unexpected error occurred' });
  }
}

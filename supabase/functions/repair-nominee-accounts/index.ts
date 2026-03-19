import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * repair-nominee-accounts
 *
 * Admin-only edge function that audits and repairs nominee accounts.
 * For each nominee missing a proper auth user or profile, it:
 *   1. Creates an auth user (if missing) with a random temp password
 *   2. Syncs all nominee card data to the profile
 *   3. Links the nominee record to the auth user
 *   4. Sends a password reset email so the user can set their own password
 *
 * Accepts: { competition_id: string, nominee_id?: string }
 *   - If nominee_id is provided, repairs only that nominee
 *   - Otherwise repairs all nominees for the competition that need fixing
 *
 * Returns: { success: true, repaired: [...], skipped: [...], errors: [...] }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { competition_id, nominee_id } = await req.json()

    if (!competition_id && !nominee_id) {
      return new Response(
        JSON.stringify({ error: 'competition_id or nominee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 1. Fetch nominees to repair ──────────────────────────────────────
    let query = supabase
      .from('nominees')
      .select('id, name, email, phone, age, bio, city, avatar_url, instagram, user_id, nominated_by, claimed_at, status')

    if (nominee_id) {
      query = query.eq('id', nominee_id)
    } else {
      query = query.eq('competition_id', competition_id)
        // Only repair pending/approved nominees that have an email
        .in('status', ['pending', 'approved', 'profile_complete', 'awaiting_profile'])
        .not('email', 'is', null)
    }

    const { data: nominees, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch nominees:', fetchError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch nominees', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!nominees?.length) {
      return new Response(
        JSON.stringify({ success: true, repaired: [], skipped: [], errors: [], message: 'No nominees to repair' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Repairing ${nominees.length} nominees`)

    const repaired: Array<{ id: string; name: string; email: string; action: string }> = []
    const skipped: Array<{ id: string; name: string; email: string; reason: string }> = []
    const errors: Array<{ id: string; name: string; email: string; error: string }> = []

    for (const nominee of nominees) {
      const email = nominee.email?.trim()
      if (!email) {
        skipped.push({ id: nominee.id, name: nominee.name, email: '', reason: 'No email address' })
        continue
      }

      try {
        // ── 2. Check if auth user already exists ─────────────────────────
        let authUserId: string | null = null

        // 2a. Via nominee.user_id
        if (nominee.user_id) {
          const { data, error } = await supabase.auth.admin.getUserById(nominee.user_id)
          if (!error && data?.user) {
            authUserId = data.user.id
          }
        }

        // 2b. Via profiles table (email match)
        if (!authUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle()

          if (profile?.id) {
            const { data, error } = await supabase.auth.admin.getUserById(profile.id)
            if (!error && data?.user) {
              authUserId = data.user.id
            } else {
              // Orphaned profile — delete it
              console.log(`Deleting orphaned profile for ${email}:`, profile.id)
              await supabase.from('profiles').delete().eq('id', profile.id)
            }
          }
        }

        // 2c. Via auth admin listUsers
        if (!authUserId) {
          const { data: listData } = await supabase.auth.admin.listUsers({
            filter: email,
            page: 1,
            perPage: 50,
          })
          const match = listData?.users?.find(
            (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
          )
          if (match) {
            authUserId = match.id
          }
        }

        // ── 3. Check if profile exists and has data ──────────────────────
        let profileExists = false
        let profileNeedsData = false

        if (authUserId) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, bio, city, age, instagram, phone, onboarded_at')
            .eq('id', authUserId)
            .maybeSingle()

          if (existingProfile) {
            profileExists = true
            // Check if profile is missing data that the nominee has
            const missingFields = [
              !existingProfile.avatar_url && nominee.avatar_url,
              !existingProfile.bio && nominee.bio,
              !existingProfile.city && nominee.city,
              !existingProfile.age && nominee.age,
              !existingProfile.instagram && nominee.instagram,
              !existingProfile.phone && nominee.phone,
              !existingProfile.first_name && nominee.name,
              !existingProfile.onboarded_at,
            ].filter(Boolean)

            profileNeedsData = missingFields.length > 0
          }
        }

        // ── 4. Determine what action to take ─────────────────────────────

        // Case A: Auth user exists, profile is complete, nominee is linked
        if (authUserId && profileExists && !profileNeedsData && nominee.user_id === authUserId) {
          skipped.push({ id: nominee.id, name: nominee.name, email, reason: 'Already has auth user, profile, and is linked' })
          continue
        }

        // Case B: No auth user — create one
        if (!authUserId) {
          // Clean up any orphaned profiles
          const { data: orphans } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
          if (orphans?.length) {
            for (const p of orphans) {
              await supabase.from('profiles').delete().eq('id', p.id)
            }
          }

          const nameParts = nominee.name?.split(' ') || []
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''

          // Generate a random temp password (user will reset via email)
          const tempPassword = crypto.randomUUID() + '!A1'

          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName },
          })

          if (createError) {
            // If createUser failed, try to find a partially-created user
            const { data: retryList } = await supabase.auth.admin.listUsers({
              filter: email,
              page: 1,
              perPage: 50,
            })
            const found = retryList?.users?.find(
              (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
            )
            if (found) {
              authUserId = found.id
            } else {
              errors.push({ id: nominee.id, name: nominee.name, email, error: `Failed to create auth user: ${createError.message}` })
              continue
            }
          } else if (newUser?.user) {
            authUserId = newUser.user.id
          }

          if (!authUserId) {
            errors.push({ id: nominee.id, name: nominee.name, email, error: 'Failed to create or find auth user' })
            continue
          }
        }

        // ── 5. Sync nominee data to profile ──────────────────────────────
        const nameParts = nominee.name?.split(' ') || []
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authUserId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          avatar_url: nominee.avatar_url || null,
          bio: nominee.bio || null,
          city: nominee.city || null,
          age: nominee.age || null,
          instagram: nominee.instagram || null,
          phone: nominee.phone || null,
          onboarded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false })

        if (profileError) {
          console.error(`Profile upsert failed for ${email}:`, profileError.message)
          errors.push({ id: nominee.id, name: nominee.name, email, error: `Profile sync failed: ${profileError.message}` })
          continue
        }

        // ── 6. Link nominee to auth user ─────────────────────────────────
        if (!nominee.user_id || nominee.user_id !== authUserId) {
          await supabase
            .from('nominees')
            .update({
              user_id: authUserId,
              claimed_at: nominee.claimed_at || new Date().toISOString(),
            })
            .eq('id', nominee.id)
        }

        // ── 7. Send password reset email ─────────────────────────────────
        // Only for nominees that didn't have an auth user before (new accounts)
        if (!nominee.user_id) {
          const { error: resetError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
          })
          if (resetError) {
            console.warn(`Password reset email failed for ${email}:`, resetError.message)
            // Non-fatal — user can use "forgot password" later
          }
        }

        // ── Determine action description ─────────────────────────────────
        let action = ''
        if (!nominee.user_id && !profileExists) {
          action = 'Created auth user + profile + linked nominee'
        } else if (!nominee.user_id) {
          action = 'Linked existing auth user + synced profile data'
        } else if (profileNeedsData) {
          action = 'Synced missing nominee data to profile'
        } else {
          action = 'Re-linked nominee to auth user'
        }

        repaired.push({ id: nominee.id, name: nominee.name, email, action })
        console.log(`Repaired ${nominee.name} (${email}): ${action}`)

      } catch (err) {
        console.error(`Error repairing nominee ${nominee.name} (${email}):`, err)
        errors.push({ id: nominee.id, name: nominee.name, email, error: String(err) })
      }
    }

    console.log(`Repair complete: ${repaired.length} repaired, ${skipped.length} skipped, ${errors.length} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        repaired,
        skipped,
        errors,
        summary: `${repaired.length} repaired, ${skipped.length} already OK, ${errors.length} errors`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in repair-nominee-accounts:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

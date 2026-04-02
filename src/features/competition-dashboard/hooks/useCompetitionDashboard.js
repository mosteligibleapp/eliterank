import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../hooks/useCachedQuery';
import { checkAndAwardProfileBonuses, awardNomineeActionBonuses, setupDefaultBonusTasks } from '../../../lib/bonusVotes';

/**
 * Hook to fetch all dashboard data for a specific competition
 * Fetches contestants, nominees, judges, sponsors, events, announcements, rules, and host data
 * Provides CRUD operations for all entities
 */
export function useCompetitionDashboard(competitionId) {
  // Use cached profiles to avoid refetching on every dashboard load
  const { data: cachedProfiles, loading: profilesLoading } = useProfiles();

  const [data, setData] = useState({
    contestants: [],
    nominees: [],
    judges: [],
    sponsors: [],
    events: [],
    announcements: [],
    rules: [],
    prizes: [],
    host: null,
    competition: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize profile maps for quick lookups
  const { emailToProfileMap, profilesById } = useMemo(() => {
    const emailToProfileMap = new Map();
    const profilesById = new Map();
    (cachedProfiles || []).forEach((profile) => {
      profilesById.set(profile.id, profile);
      if (profile.email) {
        emailToProfileMap.set(profile.email.toLowerCase(), profile.id);
      }
    });
    return { emailToProfileMap, profilesById };
  }, [cachedProfiles]);

  const fetchDashboardData = useCallback(async () => {
    if (!competitionId || profilesLoading) {
      if (!competitionId) setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch competition-specific data in parallel (profiles come from cache)
      const [
        contestantsResult,
        nomineesResult,
        judgesResult,
        sponsorsResult,
        eventsResult,
        announcementsResult,
        rulesResult,
        prizesResult,
        competitionResult,
      ] = await Promise.all([
        // Contestants ordered by votes (for leaderboard) - join with profiles for full data
        supabase
          .from('contestants')
          .select('*, profile:profiles!user_id(*)')
          .eq('competition_id', competitionId)
          .order('votes', { ascending: false }),

        // Nominees ordered by creation date
        supabase
          .from('nominees')
          .select('*')
          .eq('competition_id', competitionId)
          .order('created_at', { ascending: false }),

        // Judges ordered by sort_order - join with profiles for full data
        supabase
          .from('judges')
          .select('*, profile:profiles!user_id(*)')
          .eq('competition_id', competitionId)
          .order('sort_order'),

        // Sponsors ordered by tier and sort_order
        supabase
          .from('sponsors')
          .select('*')
          .eq('competition_id', competitionId)
          .order('sort_order'),

        // Events ordered by date
        supabase
          .from('events')
          .select('*')
          .eq('competition_id', competitionId)
          .order('date'),

        // Announcements ordered by pinned and date
        supabase
          .from('announcements')
          .select('*')
          .eq('competition_id', competitionId)
          .order('pinned', { ascending: false })
          .order('published_at', { ascending: false }),

        // Rules ordered by sort_order
        supabase
          .from('competition_rules')
          .select('*')
          .eq('competition_id', competitionId)
          .order('sort_order'),

        // Prizes ordered by sort_order
        supabase
          .from('competition_prizes')
          .select('*')
          .eq('competition_id', competitionId)
          .order('sort_order'),

        // Get competition info with category, demographic, city, and organization joins
        supabase
          .from('competitions')
          .select(`
            *,
            category:categories(id, name, slug),
            demographic:demographics(id, label, slug),
            city:cities(id, name, state, slug),
            organization:organizations(id, name, slug, logo_url, header_logo_url, website_url),
            voting_rounds(id, start_date, round_type)
          `)
          .eq('id', competitionId)
          .single(),
      ]);

      // Check for errors
      const errors = [
        contestantsResult.error,
        nomineesResult.error,
        judgesResult.error,
        sponsorsResult.error,
        eventsResult.error,
        announcementsResult.error,
        rulesResult.error,
        prizesResult.error,
        competitionResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('Errors fetching dashboard data:', errors);
        setError(errors[0]?.message || 'Error fetching data');
      }

      // Get host profile if exists
      const competition = competitionResult.data;
      let host = null;
      if (competition?.host_id && profilesById.has(competition.host_id)) {
        const hostProfile = profilesById.get(competition.host_id);
        host = {
          id: hostProfile.id,
          name: `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim() || hostProfile.email,
          firstName: hostProfile.first_name,
          lastName: hostProfile.last_name,
          email: hostProfile.email,
          bio: hostProfile.bio,
          avatar: hostProfile.avatar_url,
          instagram: hostProfile.instagram,
          city: hostProfile.city,
          gallery: hostProfile.gallery || [],
        };
      }

      // Transform contestants for leaderboard
      const contestants = (contestantsResult.data || []).map((c, index) => ({
        id: c.id,
        name: c.name,
        age: c.age,
        votes: c.votes || 0,
        status: c.status,
        trend: c.trend || 'same',
        rank: index + 1,
        avatarUrl: c.avatar_url || c.profile?.avatar_url,
        instagram: c.instagram || c.profile?.instagram,
        userId: c.user_id,
      }));

      // Targeted profile lookup for nominee matching
      // This bypasses the cached profiles (which can be truncated by Supabase's
      // default 1000-row limit) by querying only the profiles we actually need.
      const nomineeEmails = (nomineesResult.data || [])
        .map(n => n.email?.toLowerCase()).filter(Boolean);
      const nomineeUserIds = (nomineesResult.data || [])
        .map(n => n.user_id).filter(Boolean);

      const nomineeProfilesById = new Map();
      const nomineeProfilesByEmail = new Map();

      const profileLookups = [];
      if (nomineeEmails.length > 0) {
        // Use ilike-based OR filter for case-insensitive email matching
        const emailFilter = nomineeEmails.map(e => `email.ilike.${e}`).join(',');
        profileLookups.push(
          supabase.from('profiles')
            .select('id, email, avatar_url, instagram, onboarded_at')
            .or(emailFilter)
        );
      }
      if (nomineeUserIds.length > 0) {
        profileLookups.push(
          supabase.from('profiles')
            .select('id, email, avatar_url, instagram, onboarded_at')
            .in('id', nomineeUserIds)
        );
      }
      if (profileLookups.length > 0) {
        const profileResults = await Promise.all(profileLookups);
        profileResults.forEach(r => {
          (r.data || []).forEach(p => {
            nomineeProfilesById.set(p.id, p);
            if (p.email) {
              nomineeProfilesByEmail.set(p.email.toLowerCase(), p);
            }
          });
        });
      }

      // Transform nominees - include all fields for categorization
      const nominees = (nomineesResult.data || []).map((n) => {
        let hasProfile = false;
        let matchedProfileId = null;
        let matchedProfile = null;

        // Match by user_id first (set when nominee claims their nomination)
        if (n.user_id) {
          matchedProfileId = n.user_id;
          matchedProfile = nomineeProfilesById.get(n.user_id) || profilesById.get(n.user_id) || null;
          // Count as "has profile" if the user has completed onboarding or
          // has a real profile (matched profile with onboarded_at, or avatar).
          // claimed_at alone is NOT sufficient — it can be set when the nominee
          // clicks "Accept" before finishing the flow.
          if (!!matchedProfile?.onboarded_at || (!!n.claimed_at && !!matchedProfile)) {
            hasProfile = true;
          } else if (n.nominated_by === 'self') {
            hasProfile = !!n.avatar_url || !!matchedProfile?.avatar_url;
          }
        }
        // Fall back to email matching
        else if (n.email) {
          const emailLower = n.email.toLowerCase();
          const directMatch = nomineeProfilesByEmail.get(emailLower);
          if (directMatch) {
            hasProfile = !!directMatch.onboarded_at;
            matchedProfileId = directMatch.id;
            matchedProfile = directMatch;
          }
        }

        // Self-nominees who completed the flow but whose user_id wasn't linked
        // (RLS blocked the client-side update). Only count them if they have a
        // matching profile with onboarding evidence (not just a pre-created shell).
        if (!hasProfile && n.nominated_by === 'self' && matchedProfile) {
          hasProfile = !!matchedProfile.onboarded_at || !!matchedProfile.avatar_url;
        }

        return {
          id: n.id,
          name: n.name,
          email: n.email,
          phone: n.phone,
          userId: n.user_id,
          nominatedBy: n.nominated_by,
          nominatorId: n.nominator_id,
          nominatorName: n.nominator_name,
          nominationReason: n.nomination_reason,
          nominatorAnonymous: n.nominator_anonymous,
          matchedProfileId,
          hasProfile,
          avatarUrl: matchedProfile?.avatar_url || n.avatar_url || null,
          instagram: matchedProfile?.instagram || null,
          status: n.status,
          inviteToken: n.invite_token,
          inviteSentAt: n.invite_sent_at,
          claimedAt: n.claimed_at,
          flowStage: n.flow_stage || null,
          convertedToContestant: n.converted_to_contestant,
          createdAt: n.created_at,
        };
      });

      // Transform judges
      const judges = (judgesResult.data || []).map((j) => ({
        id: j.id,
        userId: j.user_id,
        name: j.name,
        title: j.title || 'Judge',
        bio: j.bio,
        avatarUrl: j.avatar_url,
        sortOrder: j.sort_order,
      }));

      // Transform sponsors
      const sponsors = (sponsorsResult.data || []).map((s) => ({
        id: s.id,
        name: s.name,
        tier: s.tier?.toLowerCase() || 'gold',
        amount: parseFloat(s.amount) || 0,
        logoUrl: s.logo_url,
        websiteUrl: s.website_url,
        sortOrder: s.sort_order,
      }));

      // Transform events
      const events = (eventsResult.data || []).map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date,
        endDate: e.end_date,
        time: e.time,
        location: e.location,
        description: e.description,
        imageUrl: e.image_url,
        ticketUrl: e.ticket_url,
        status: e.status,
        isDoubleVoteDay: e.is_double_vote_day,
        publicVisible: e.public_visible,
        sortOrder: e.sort_order,
      }));

      // Transform announcements
      const announcements = (announcementsResult.data || []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        pinned: a.pinned,
        type: a.type,
        publishedAt: a.published_at,
        createdAt: a.created_at,
      }));

      // Transform rules
      const rules = (rulesResult.data || []).map((r) => ({
        id: r.id,
        sectionTitle: r.section_title,
        sectionContent: r.section_content,
        sortOrder: r.sort_order,
      }));

      // Transform prizes
      const prizes = (prizesResult.data || []).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        value: p.value,
        sponsorName: p.sponsor_name,
        externalUrl: p.external_url,
        sortOrder: p.sort_order,
        prizeType: p.prize_type || 'winner',
      }));

      setData({
        contestants,
        nominees,
        judges,
        sponsors,
        events,
        announcements,
        rules,
        prizes,
        host,
        competition: competition ? {
          id: competition.id,
          name: competition.name,
          status: competition.status,
          season: competition.season,
          hostId: competition.host_id,
          organizationId: competition.organization_id,
          city: competition.city?.name || null,
          cityData: competition.city,
          cityId: competition.city_id,
          nominationStart: competition.nomination_start,
          nominationEnd: competition.nomination_end,
          votingStart: competition.voting_start
            || competition.voting_rounds
              ?.filter(r => r.round_type === 'voting')
              ?.map(r => r.start_date)
              ?.sort()[0]
            || null,
          votingEnd: competition.voting_end,
          finalsDate: competition.finals_date,
          hasEvents: competition.has_events,
          numberOfWinners: competition.number_of_winners,
          selectionCriteria: competition.selection_criteria,
          entryType: competition.entry_type,
          rulesDocUrl: competition.rules_doc_url,
          description: competition.description,
          winners: competition.winners || [],
          nominationFormConfig: competition.nomination_form_config,
          // Category & Demographic (joined)
          categoryId: competition.category_id,
          categoryName: competition.category?.name || null,
          categorySlug: competition.category?.slug || null,
          demographicId: competition.demographic_id,
          demographicName: competition.demographic?.label || null,
          demographicSlug: competition.demographic?.slug || null,
          // Economics & Settings (admin-controlled)
          pricePerVote: parseFloat(competition.price_per_vote) || 1.00,
          minimumPrizeCents: competition.minimum_prize_cents || 100000,
          eligibilityRadiusMiles: competition.eligibility_radius_miles || 100,
          minContestants: competition.min_contestants || 40,
          maxContestants: competition.max_contestants || null,
          // Additional fields for card generation and links
          slug: competition.slug || null,
          organizationName: competition.organization?.name || null,
          organizationLogoUrl: competition.organization?.logo_url || null,
          organizationHeaderLogoUrl: competition.organization?.header_logo_url || null,
          organizationWebsiteUrl: competition.organization?.website_url || null,
          themePrimary: competition.theme_primary || null,
        } : null,
      });
    } catch (err) {
      console.error('Error in useCompetitionDashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [competitionId, profilesLoading, emailToProfileMap, profilesById]);

  // Initial fetch - wait for profiles to be loaded
  useEffect(() => {
    if (!profilesLoading) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, profilesLoading]);

  // Refresh function for manual refetch
  const refresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ============================================================================
  // NOMINEE OPERATIONS
  // ============================================================================

  const approveNominee = useCallback(async (nominee) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      // Find profile to link to contestant
      let linkedUserId = nominee.userId || nominee.matchedProfileId || null;

      if (!linkedUserId && nominee.email) {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', nominee.email)
          .limit(1)
          .maybeSingle();

        if (profileByEmail?.id) {
          linkedUserId = profileByEmail.id;
        }
      }

      const contestantData = {
        competition_id: competitionId,
        name: nominee.name,
        email: nominee.email,
        phone: nominee.phone,
        status: 'active',
        votes: 0,
        user_id: linkedUserId,
      };

      // Insert contestant FIRST — if this fails, nominee stays pending
      const { data: insertedContestant, error: insertError } = await supabase
        .from('contestants')
        .insert(contestantData)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Only mark nominee as approved after contestant was created
      const { error: updateError } = await supabase
        .from('nominees')
        .update({ status: 'approved', converted_to_contestant: true })
        .eq('id', nominee.id);

      if (updateError) {
        console.error('Nominee status update failed after contestant insert:', updateError);
      }

      // Migrate reward assignments from nominee → contestant so claimed
      // status, discount codes, etc. carry over after promotion.
      if (insertedContestant?.id) {
        try {
          await supabase
            .from('reward_assignments')
            .update({ contestant_id: insertedContestant.id })
            .eq('nominee_id', nominee.id)
            .is('contestant_id', null);
        } catch (rewardErr) {
          console.warn('Error migrating reward assignments to contestant:', rewardErr);
        }
      }

      // Auto-award bonus votes earned during nominee phase
      if (linkedUserId && insertedContestant?.id) {
        try {
          await setupDefaultBonusTasks(competitionId);
          // Award profile-based tasks
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, bio, city, avatar_url, instagram, twitter, tiktok, linkedin')
            .eq('id', linkedUserId)
            .maybeSingle();
          if (profile) {
            await checkAndAwardProfileBonuses(competitionId, insertedContestant.id, linkedUserId, profile);
          }
          // Award action-based tasks completed during nominee phase (view_how_to_win, share_profile)
          await awardNomineeActionBonuses(competitionId, insertedContestant.id, linkedUserId);
        } catch (bonusErr) {
          console.warn('Error auto-awarding bonus votes on conversion:', bonusErr);
        }
      }

      // Notify the nominee that they've been approved
      if (linkedUserId) {
        const cityName = data.competition?.city?.name || data.competition?.city || '';
        const season = data.competition?.season || '';
        try {
          await supabase.from('notifications').insert({
            user_id: linkedUserId,
            type: 'nomination_approved',
            title: "You're officially in!",
            body: `Your nomination for Most Eligible ${cityName} ${season} has been approved. You're now a contestant!`.trim(),
            competition_id: competitionId,
          });
        } catch (notifErr) {
          console.warn('Failed to create approval notification:', notifErr);
        }
      }

      // Update profile's competition count if linked
      if (linkedUserId) {
        try {
          const { error: rpcError } = await supabase.rpc('increment_profile_competitions', {
            p_user_id: linkedUserId,
          });

          if (rpcError) {
            // Fallback to manual update
            const { data: profile } = await supabase
              .from('profiles')
              .select('total_competitions')
              .eq('id', linkedUserId)
              .maybeSingle();

            if (profile) {
              await supabase
                .from('profiles')
                .update({
                  total_competitions: (profile.total_competitions || 0) + 1,
                })
                .eq('id', linkedUserId);
            }
          }
        } catch (profileErr) {
          console.warn('Error updating profile competition count:', profileErr);
          // Non-critical, don't fail the approval
        }
      }

      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error approving nominee:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, data.competition, fetchDashboardData]);

  const rejectNominee = useCallback(async (nomineeId) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { error: updateError } = await supabase
        .from('nominees')
        .update({ status: 'rejected' })
        .eq('id', nomineeId);

      if (updateError) throw updateError;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error rejecting nominee:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  const restoreNominee = useCallback(async (nomineeId) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      // Determine the appropriate status to restore to based on the nominee's flow state
      const { data: nominee } = await supabase
        .from('nominees')
        .select('flow_stage, claimed_at')
        .eq('id', nomineeId)
        .single();

      let restoreStatus = 'pending';
      if (nominee?.flow_stage === 'complete' || nominee?.flow_stage === 'profile_complete') {
        restoreStatus = 'profile_complete';
      } else if (nominee?.claimed_at) {
        restoreStatus = 'awaiting_profile';
      }

      const { error: updateError } = await supabase
        .from('nominees')
        .update({ status: restoreStatus })
        .eq('id', nomineeId);

      if (updateError) throw updateError;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error restoring nominee:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  const removeContestant = useCallback(async (contestantId) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { data: contestant } = await supabase
        .from('contestants')
        .select('email, user_id')
        .eq('id', contestantId)
        .single();

      const { error: deleteError } = await supabase
        .from('contestants')
        .delete()
        .eq('id', contestantId);

      if (deleteError) throw deleteError;

      if (contestant?.email) {
        await supabase
          .from('nominees')
          .update({ status: 'rejected', converted_to_contestant: false })
          .eq('competition_id', competitionId)
          .ilike('email', contestant.email)
          .eq('status', 'approved');
      }

      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error removing contestant:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  /**
   * Resend invitation email to a nominee
   * Uses force_resend to bypass the already-sent check
   */
  const resendInvite = useCallback(async (nomineeId) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      // Refresh session before calling edge function to avoid 401
      await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('send-nomination-invite', {
        body: { nominee_id: nomineeId, force_resend: true },
      });

      if (error) {
        // Check for auth errors
        if (error.message?.includes('401') || error.message?.includes('unauthorized') || error.message?.includes('JWT')) {
          return { success: false, error: 'Your session has expired. Please refresh the page and try again.' };
        }
        throw error;
      }

      await fetchDashboardData();
      return { success: true, data };
    } catch (err) {
      console.error('Error resending invite:', err);
      return { success: false, error: err.message || 'Failed to send reminder' };
    }
  }, [fetchDashboardData]);

  /**
   * Manually add a nominee (by admin/host)
   * Can be linked to an existing profile or created with manual data
   */
  const addNominee = useCallback(async (nomineeData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { error: insertError } = await supabase
        .from('nominees')
        .insert({
          competition_id: competitionId,
          name: nomineeData.name,
          email: nomineeData.email || null,
          phone: nomineeData.phone || null,
          nominated_by: 'host',
          invite_token: crypto.randomUUID(),
          status: 'pending',
        });

      if (insertError) throw insertError;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding nominee:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  /**
   * Manually add a contestant directly (skip nomination process)
   * Can be linked to an existing profile or created with manual data
   */
  const addContestant = useCallback(async (contestantData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const linkedUserId = contestantData.userId || null;

      const { error: insertError } = await supabase
        .from('contestants')
        .insert({
          competition_id: competitionId,
          name: contestantData.name,
          email: contestantData.email,
          instagram: contestantData.instagram,
          age: contestantData.age,
          bio: contestantData.bio,
          avatar_url: contestantData.avatarUrl || null,
          status: 'active',
          votes: 0,
          user_id: linkedUserId,
        });

      if (insertError) throw insertError;

      // Update profile's competition count if linked
      if (linkedUserId) {
        try {
          const { error: rpcError } = await supabase.rpc('increment_profile_competitions', {
            p_user_id: linkedUserId,
          });

          if (rpcError) {
            // Fallback to manual update
            const { data: profile } = await supabase
              .from('profiles')
              .select('total_competitions')
              .eq('id', linkedUserId)
              .maybeSingle();

            if (profile) {
              await supabase
                .from('profiles')
                .update({
                  total_competitions: (profile.total_competitions || 0) + 1,
                })
                .eq('id', linkedUserId);
            }
          }
        } catch (profileErr) {
          console.warn('Error updating profile competition count:', profileErr);
        }
      }

      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding contestant:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  // ============================================================================
  // JUDGE OPERATIONS
  // ============================================================================

  const addJudge = useCallback(async (judgeData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const maxSort = data.judges.length > 0 ? Math.max(...data.judges.map(j => j.sortOrder || 0)) : 0;
      const { error } = await supabase
        .from('judges')
        .insert({
          competition_id: competitionId,
          name: judgeData.name,
          title: judgeData.title,
          bio: judgeData.bio,
          avatar_url: judgeData.avatarUrl,
          user_id: judgeData.userId,
          sort_order: maxSort + 1,
        });

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding judge:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, data.judges, fetchDashboardData]);

  const updateJudge = useCallback(async (judgeId, judgeData) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('judges')
        .update({
          name: judgeData.name,
          title: judgeData.title,
          bio: judgeData.bio,
          avatar_url: judgeData.avatarUrl,
        })
        .eq('id', judgeId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating judge:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  const deleteJudge = useCallback(async (judgeId) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('judges')
        .delete()
        .eq('id', judgeId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error deleting judge:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  // ============================================================================
  // SPONSOR OPERATIONS
  // ============================================================================

  const addSponsor = useCallback(async (sponsorData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const maxSort = data.sponsors.length > 0 ? Math.max(...data.sponsors.map(s => s.sortOrder || 0)) : 0;
      const { error } = await supabase
        .from('sponsors')
        .insert({
          competition_id: competitionId,
          name: sponsorData.name,
          tier: sponsorData.tier,
          amount: sponsorData.amount,
          logo_url: sponsorData.logoUrl,
          website_url: sponsorData.websiteUrl,
          sort_order: maxSort + 1,
        });

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding sponsor:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, data.sponsors, fetchDashboardData]);

  const updateSponsor = useCallback(async (sponsorId, sponsorData) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('sponsors')
        .update({
          name: sponsorData.name,
          tier: sponsorData.tier,
          amount: sponsorData.amount,
          logo_url: sponsorData.logoUrl,
          website_url: sponsorData.websiteUrl,
        })
        .eq('id', sponsorId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating sponsor:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  const deleteSponsor = useCallback(async (sponsorId) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', sponsorId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error deleting sponsor:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  // ============================================================================
  // EVENT OPERATIONS
  // ============================================================================

  const addEvent = useCallback(async (eventData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    // date is required by the DB schema
    if (!eventData.date) return { success: false, error: 'Date is required' };

    try {
      const maxSort = data.events.length > 0 ? Math.max(...data.events.map(e => e.sortOrder || 0)) : 0;
      const { error } = await supabase
        .from('events')
        .insert({
          competition_id: competitionId,
          name: eventData.name,
          date: eventData.date,
          end_date: eventData.endDate || null,
          time: eventData.time || null,
          location: eventData.location || null,
          description: eventData.description || null,
          image_url: eventData.imageUrl || null,
          ticket_url: eventData.ticketUrl || null,
          status: eventData.status || 'upcoming',
          public_visible: eventData.publicVisible ?? true,
          is_double_vote_day: eventData.isDoubleVoteDay ?? false,
          sort_order: maxSort + 1,
        });

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding event:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, data.events, fetchDashboardData]);

  const updateEvent = useCallback(async (eventId, eventData) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: eventData.name,
          date: eventData.date || null,
          end_date: eventData.endDate || null,
          time: eventData.time || null,
          location: eventData.location || null,
          description: eventData.description || null,
          image_url: eventData.imageUrl || null,
          ticket_url: eventData.ticketUrl || null,
          status: eventData.status,
          public_visible: eventData.publicVisible,
          is_double_vote_day: eventData.isDoubleVoteDay,
        })
        .eq('id', eventId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating event:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  const deleteEvent = useCallback(async (eventId) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error deleting event:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  // ============================================================================
  // ANNOUNCEMENT OPERATIONS
  // ============================================================================

  const addAnnouncement = useCallback(async (announcementData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          competition_id: competitionId,
          title: announcementData.title,
          content: announcementData.content,
          type: announcementData.type || 'announcement',
          pinned: announcementData.pinned ?? false,
          is_ai_generated: announcementData.isAiGenerated ?? false,
          published_at: new Date().toISOString(),
        });

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding announcement:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  const updateAnnouncement = useCallback(async (announcementId, announcementData) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: announcementData.title,
          content: announcementData.content,
          type: announcementData.type,
          pinned: announcementData.pinned,
        })
        .eq('id', announcementId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating announcement:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  const deleteAnnouncement = useCallback(async (announcementId) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error deleting announcement:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  const toggleAnnouncementPin = useCallback(async (announcementId, pinned) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('announcements')
        .update({ pinned: !pinned })
        .eq('id', announcementId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error toggling announcement pin:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  // ============================================================================
  // RULE OPERATIONS
  // ============================================================================

  const addRule = useCallback(async (ruleData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const maxSort = data.rules.length > 0 ? Math.max(...data.rules.map(r => r.sortOrder || 0)) : 0;
      const { error } = await supabase
        .from('competition_rules')
        .insert({
          competition_id: competitionId,
          section_title: ruleData.sectionTitle,
          section_content: ruleData.sectionContent,
          sort_order: maxSort + 1,
        });

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding rule:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, data.rules, fetchDashboardData]);

  const updateRule = useCallback(async (ruleId, ruleData) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('competition_rules')
        .update({
          section_title: ruleData.sectionTitle,
          section_content: ruleData.sectionContent,
        })
        .eq('id', ruleId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating rule:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  const deleteRule = useCallback(async (ruleId) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('competition_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error deleting rule:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  // ============================================================================
  // PRIZE OPERATIONS
  // ============================================================================

  const addPrize = useCallback(async (prizeData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const maxSort = data.prizes.length > 0 ? Math.max(...data.prizes.map(p => p.sortOrder || 0)) : 0;
      const { error } = await supabase
        .from('competition_prizes')
        .insert({
          competition_id: competitionId,
          title: prizeData.title,
          description: prizeData.description || null,
          image_url: prizeData.imageUrl || null,
          value: prizeData.value || null,
          sponsor_name: prizeData.sponsorName || null,
          external_url: prizeData.externalUrl || null,
          prize_type: prizeData.prizeType || 'winner',
          sort_order: maxSort + 1,
        });

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error adding prize:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, data.prizes, fetchDashboardData]);

  const updatePrize = useCallback(async (prizeId, prizeData) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('competition_prizes')
        .update({
          title: prizeData.title,
          description: prizeData.description || null,
          image_url: prizeData.imageUrl || null,
          value: prizeData.value || null,
          sponsor_name: prizeData.sponsorName || null,
          external_url: prizeData.externalUrl || null,
          prize_type: prizeData.prizeType || 'winner',
          updated_at: new Date().toISOString(),
        })
        .eq('id', prizeId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating prize:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  const deletePrize = useCallback(async (prizeId) => {
    if (!supabase) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('competition_prizes')
        .delete()
        .eq('id', prizeId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error deleting prize:', err);
      return { success: false, error: err.message };
    }
  }, [fetchDashboardData]);

  // ============================================================================
  // COMPETITION TIMELINE OPERATIONS
  // ============================================================================

  const updateTimeline = useCallback(async (timelineData) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('competitions')
        .update({
          nomination_start: timelineData.nominationStart,
          nomination_end: timelineData.nominationEnd,
          voting_start: timelineData.votingStart,
          voting_end: timelineData.votingEnd,
          finals_date: timelineData.finalsDate,
        })
        .eq('id', competitionId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating timeline:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  // ============================================================================
  // WINNERS OPERATIONS
  // ============================================================================

  const updateWinners = useCallback(async (winnerIds) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('competitions')
        .update({ winners: winnerIds })
        .eq('id', competitionId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error updating winners:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  // ============================================================================
  // HOST OPERATIONS
  // ============================================================================

  const assignHost = useCallback(async (userId) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      // Update competition with new host
      const { error: compError } = await supabase
        .from('competitions')
        .update({ host_id: userId })
        .eq('id', competitionId);

      if (compError) throw compError;

      // Set is_host on the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_host: true })
        .eq('id', userId);

      if (profileError) throw profileError;

      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error assigning host:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  const removeHost = useCallback(async () => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { error } = await supabase
        .from('competitions')
        .update({ host_id: null })
        .eq('id', competitionId);

      if (error) throw error;
      await fetchDashboardData();
      return { success: true };
    } catch (err) {
      console.error('Error removing host:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  // ============================================================================
  // NOMINEE ACCOUNT REPAIR OPERATIONS
  // ============================================================================

  /**
   * Repair a single nominee's account (create auth user if missing, sync profile data)
   * Uses the repair-nominee-accounts edge function (admin API, bypasses RLS)
   */
  const repairNomineeAccount = useCallback(async (nomineeId) => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('repair-nominee-accounts', {
        body: { competition_id: competitionId, nominee_id: nomineeId },
      });

      if (fnError) throw fnError;

      await fetchDashboardData();
      return { success: true, data: result };
    } catch (err) {
      console.error('Error repairing nominee account:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  /**
   * Repair all nominee accounts for this competition
   */
  const repairAllNomineeAccounts = useCallback(async () => {
    if (!supabase || !competitionId) return { success: false, error: 'Missing configuration' };

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('repair-nominee-accounts', {
        body: { competition_id: competitionId },
      });

      if (fnError) throw fnError;

      await fetchDashboardData();
      return { success: true, data: result };
    } catch (err) {
      console.error('Error repairing all nominee accounts:', err);
      return { success: false, error: err.message };
    }
  }, [competitionId, fetchDashboardData]);

  return {
    data,
    loading,
    error,
    refresh,
    // Nominee operations
    addNominee,
    approveNominee,
    rejectNominee,
    removeContestant,
    restoreNominee,
    resendInvite,
    repairNomineeAccount,
    repairAllNomineeAccounts,
    // Contestant operations
    addContestant,
    // Judge operations
    addJudge,
    updateJudge,
    deleteJudge,
    // Sponsor operations
    addSponsor,
    updateSponsor,
    deleteSponsor,
    // Event operations
    addEvent,
    updateEvent,
    deleteEvent,
    // Announcement operations
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementPin,
    // Rule operations
    addRule,
    updateRule,
    deleteRule,
    // Prize operations
    addPrize,
    updatePrize,
    deletePrize,
    // Competition operations
    updateTimeline,
    updateWinners,
    assignHost,
    removeHost,
  };
}

export default useCompetitionDashboard;

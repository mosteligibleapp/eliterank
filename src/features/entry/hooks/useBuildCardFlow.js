import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { uploadPhoto } from '../utils/uploadPhoto';
import { getCityName } from '../utils/eligibilityEngine';

// Columns added by 20260213 migration — strip if migration hasn't run yet
const NEW_COLUMNS = ['city', 'flow_stage'];

function stripNewColumns(record) {
  const clean = { ...record };
  NEW_COLUMNS.forEach((col) => delete clean[col]);
  return clean;
}

function isSchemaError(error) {
  return error?.message?.includes('schema cache') || error?.code === 'PGRST204';
}

/**
 * useBuildCardFlow - Unified "Build Your Card" orchestrator
 *
 * Three entry scenarios:
 * - 'self-auth':   Logged-in self-nominee  → eligibility, photo, details, bio, card
 * - 'self-anon':   Not-logged-in self-nom  → eligibility, photo, details, bio, password, card
 * - 'third-party': Third-party nominee     → accept, eligibility-confirm, photo, details, bio, password?, card
 *
 * @param {Object} options
 * @param {'self-auth'|'self-anon'|'third-party'} options.mode
 * @param {Object} options.competition - Full competition object
 * @param {Object|null} options.profile - User profile if logged in
 * @param {Object|null} options.user - Supabase auth user if logged in
 * @param {Object|null} options.nominee - Existing nominee record (third-party claims)
 * @param {boolean} options.needsPassword - Whether user needs to create/set password
 */
export function useBuildCardFlow({
  mode,
  competition,
  profile,
  user,
  nominee,
  needsPassword = false,
}) {
  // Build step list based on mode
  const steps = useMemo(() => {
    switch (mode) {
      case 'self-auth':
        return ['eligibility', 'photo', 'details', 'bio', 'card'];
      case 'self-anon':
        return ['eligibility', 'photo', 'details', 'bio', 'password', 'card'];
      case 'third-party': {
        const base = ['accept', 'eligibility-confirm', 'photo', 'details', 'bio'];
        if (needsPassword) base.push('password');
        base.push('card');
        return base;
      }
      default:
        return ['photo', 'details', 'bio', 'card'];
    }
  }, [mode, needsPassword]);

  // Flow state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [nomineeId, setNomineeId] = useState(nominee?.id || null);
  const [currentUser, setCurrentUser] = useState(user);

  // Sync currentUser when the user prop changes (e.g. auth loads after initial render)
  useEffect(() => {
    if (user && !currentUser) {
      setCurrentUser(user);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Eligibility (for self modes)
  const [eligibilityAnswers, setEligibilityAnswers] = useState(
    nominee?.eligibility_answers || {}
  );

  // Pre-fill card data from profile or nominee record
  const nameParts = nominee?.name?.split(' ') || [];
  const [cardData, setCardData] = useState({
    firstName: profile?.first_name || nameParts[0] || '',
    lastName: profile?.last_name || nameParts.slice(1).join(' ') || '',
    age: profile?.age || nominee?.age || '',
    location: profile?.city || nominee?.city || getCityName(competition) || '',
    email: profile?.email || nominee?.email || '',
    phone: profile?.phone || nominee?.phone || '',
    instagram: profile?.instagram || nominee?.instagram || '',
    photoFile: null,
    photoPreview: profile?.avatar_url || nominee?.avatar_url || '',
    bio: profile?.bio || nominee?.bio || '',
    smsConsent: profile?.sms_consent || nominee?.sms_consent || false,
  });

  // Sync nominee data when the async fetch completes (nominee goes from null → data).
  // useState initial values are captured once; this effect fills empty fields when nominee loads.
  useEffect(() => {
    if (!nominee) return;

    if (nominee.id && !nomineeId) {
      setNomineeId(nominee.id);
    }

    setCardData((prev) => {
      const parts = nominee.name?.split(' ') || [];
      return {
        ...prev,
        firstName: prev.firstName || parts[0] || '',
        lastName: prev.lastName || parts.slice(1).join(' ') || '',
        age: prev.age || nominee.age || '',
        location: prev.location || nominee.city || '',
        email: prev.email || nominee.email || '',
        phone: prev.phone || nominee.phone || '',
        instagram: prev.instagram || nominee.instagram || '',
        photoPreview: prev.photoPreview || nominee.avatar_url || '',
        bio: prev.bio || nominee.bio || '',
      };
    });
  }, [nominee]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume: skip to the step after the last persisted flow_stage so returning
  // users don't redo completed steps.  Runs once when nominee first loads.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !nominee?.flow_stage || mode !== 'third-party') return;
    resumedRef.current = true;

    // Map flow_stage to the step to resume AT (not after)
    // If they completed 'details', they should resume at 'bio'
    // If they completed 'card' (bio step), they go to password or final card
    const stageToResumeStep = {
      accepted: 'eligibility-confirm',  // Completed accept → go to eligibility
      'eligibility-confirm': 'photo',   // Completed eligibility → go to photo
      photo: 'details',                  // Completed photo → go to details
      details: 'bio',                    // Completed details → go to bio
      bio: needsPassword ? 'password' : 'card',  // Completed bio → password or card
      card: needsPassword ? 'password' : 'card', // Legacy: flow_stage='card' means bio done
    };
    const resumeStep = stageToResumeStep[nominee.flow_stage];
    if (resumeStep) {
      const idx = steps.indexOf(resumeStep);
      if (idx > 0) setCurrentStepIndex(idx);
    }
  }, [nominee, steps, mode, needsPassword]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Navigation
  const next = useCallback(() => {
    setSubmitError('');
    setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const back = useCallback(() => {
    setSubmitError('');
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Field updates
  const setEligibility = useCallback((id, value) => {
    setEligibilityAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const updateCardData = useCallback((updates) => {
    setCardData((prev) => ({ ...prev, ...updates }));
  }, []);

  // ---- Third-party: Accept nomination ----
  const acceptNomination = useCallback(async () => {
    if (!nominee?.id) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const updateData = {
        flow_stage: 'accepted',
      };
      if (currentUser?.id) {
        updateData.user_id = currentUser.id;
      }

      let { error } = await supabase
        .from('nominees')
        .update(updateData)
        .eq('id', nominee.id);

      if (error && isSchemaError(error)) {
        ({ error } = await supabase
          .from('nominees')
          .update(stripNewColumns(updateData))
          .eq('id', nominee.id));
      }
      if (error) throw error;
      next();
    } catch (err) {
      setSubmitError(err.message || 'Failed to accept nomination');
    } finally {
      setIsSubmitting(false);
    }
  }, [nominee, currentUser, next]);

  // ---- Third-party: Decline nomination ----
  const declineNomination = useCallback(async () => {
    if (!nominee?.id) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const updateData = { status: 'declined' };
      if (currentUser?.id) {
        updateData.user_id = currentUser.id;
      }

      const { error } = await supabase
        .from('nominees')
        .update(updateData)
        .eq('id', nominee.id);

      if (error) throw error;
      return true; // Signal to parent to close/navigate away
    } catch (err) {
      setSubmitError(err.message || 'Failed to decline nomination');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [nominee, currentUser]);

  // ---- Early persistence: save progress after details step ----
  const persistProgress = useCallback(async (flowStage) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const fullName = `${cardData.firstName} ${cardData.lastName}`.trim();

      // Upload photo if new file — failures are non-blocking here so the
      // user isn't stuck on the details step.  submitCard will retry.
      let avatarUrl = cardData.photoPreview;
      if (cardData.photoFile) {
        try {
          avatarUrl = await uploadPhoto(cardData.photoFile, 'avatars');
        } catch (uploadErr) {
          console.warn('Photo upload failed during persist, will retry on final submit:', uploadErr.message);
          // Don't save local blob: URLs to DB — use the existing remote URL or null
          avatarUrl = (cardData.photoPreview && !cardData.photoPreview.startsWith('blob:'))
            ? cardData.photoPreview
            : null;
        }
      }

      const record = {
        name: fullName,
        email: cardData.email?.trim() || null,
        phone: cardData.phone?.trim() || null,
        instagram: cardData.instagram?.trim() || null,
        age: cardData.age ? parseInt(cardData.age, 10) : null,
        avatar_url: avatarUrl || null,
        city: cardData.location?.trim() || null,
        flow_stage: flowStage,
        sms_consent: cardData.smsConsent || false,
        sms_consent_at: cardData.smsConsent ? new Date().toISOString() : null,
      };

      if (currentUser?.id) {
        record.user_id = currentUser.id;
      }

      if (nomineeId) {
        // Update existing nominee record
        let { error } = await supabase
          .from('nominees')
          .update(record)
          .eq('id', nomineeId);

        if (error && isSchemaError(error)) {
          ({ error } = await supabase
            .from('nominees')
            .update(stripNewColumns(record))
            .eq('id', nomineeId));
        }
        if (error) throw error;
      } else {
        // Insert new nominee record (self-entry early persist)
        record.competition_id = competition?.id;
        record.nominated_by = 'self';
        record.status = 'pending';
        record.eligibility_answers = eligibilityAnswers;
        // claimed_at set later: at submitCard for logged-in users, at createAccount for anon
        if (currentUser?.id) {
          record.claimed_at = new Date().toISOString();
        }

        let { data: inserted, error } = await supabase
          .from('nominees')
          .insert(record)
          .select('id')
          .single();

        if (error && isSchemaError(error)) {
          ({ data: inserted, error } = await supabase
            .from('nominees')
            .insert(stripNewColumns(record))
            .select('id')
            .single());
        }

        if (error) {
          if (error.code === '23505') {
            throw new Error('You have already entered this competition.');
          }
          throw error;
        }
        setNomineeId(inserted.id);
      }

      // Update local preview if photo was uploaded
      if (avatarUrl && avatarUrl !== cardData.photoPreview) {
        setCardData((prev) => ({ ...prev, photoPreview: avatarUrl }));
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save progress');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [cardData, currentUser, nomineeId, competition, eligibilityAnswers]);

  // ---- Submit final card (pitch step) ----
  const submitCard = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Persist with pitch included
      let avatarUrl = cardData.photoPreview;
      if (cardData.photoFile) {
        avatarUrl = await uploadPhoto(cardData.photoFile, 'avatars');
      }

      const fullName = `${cardData.firstName} ${cardData.lastName}`.trim();

      const record = {
        name: fullName,
        email: cardData.email?.trim() || null,
        phone: cardData.phone?.trim() || null,
        instagram: cardData.instagram?.trim() || null,
        age: cardData.age ? parseInt(cardData.age, 10) : null,
        avatar_url: avatarUrl || null,
        city: cardData.location?.trim() || null,
        bio: cardData.bio?.trim() || null,
        flow_stage: 'card',
      };

      if (currentUser?.id) {
        record.user_id = currentUser.id;
        // If no password step follows, this is the final step — mark claimed
        if (!steps.includes('password') || steps.indexOf('password') < steps.indexOf('bio')) {
          record.claimed_at = new Date().toISOString();
        }
      }

      if (nomineeId) {
        // Update existing
        let { error } = await supabase
          .from('nominees')
          .update(record)
          .eq('id', nomineeId);
        if (error && isSchemaError(error)) {
          ({ error } = await supabase
            .from('nominees')
            .update(stripNewColumns(record))
            .eq('id', nomineeId));
        }
        if (error) throw error;
      } else {
        // Insert new (self-entry that skipped early persist)
        record.competition_id = competition?.id;
        record.nominated_by = 'self';
        record.status = 'pending';
        record.eligibility_answers = eligibilityAnswers;
        // Self-auth users (logged in, no password step) are done here
        if (currentUser?.id) {
          record.claimed_at = new Date().toISOString();
        }

        let { data: inserted, error } = await supabase
          .from('nominees')
          .insert(record)
          .select('id')
          .single();

        if (error && isSchemaError(error)) {
          ({ data: inserted, error } = await supabase
            .from('nominees')
            .insert(stripNewColumns(record))
            .select('id')
            .single());
        }

        if (error) {
          if (error.code === '23505') {
            throw new Error('You have already entered this competition.');
          }
          throw error;
        }
        setNomineeId(inserted.id);
      }

      // Also update profile if user is logged in
      if (currentUser?.id) {
        await supabase
          .from('profiles')
          .update({
            first_name: cardData.firstName.trim(),
            last_name: cardData.lastName.trim(),
            avatar_url: avatarUrl || undefined,
            bio: cardData.bio?.trim() || undefined,
            city: cardData.location?.trim() || undefined,
            age: cardData.age ? parseInt(cardData.age, 10) : undefined,
            instagram: cardData.instagram?.trim() || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id);

        window.dispatchEvent(new Event('profile-updated'));
      }

      setSubmittedData({
        name: fullName,
        photoUrl: avatarUrl,
        handle: cardData.instagram,
        bio: cardData.bio,
        isNomination: false,
      });

      // Advance to the next step. For third-party flows with needsPassword,
      // the next step after 'bio' is 'password' — jumping directly to
      // 'card' would skip it.  Using next() respects the step order.
      next();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit entry');
    } finally {
      setIsSubmitting(false);
    }
  }, [cardData, currentUser, nomineeId, competition, eligibilityAnswers, steps, next]);

  // ---- Create account / set password ----
  const createAccount = useCallback(async (password) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      let userId = currentUser?.id || null;
      const email = cardData.email?.trim();

      if (currentUser) {
        // User exists (magic link) — just set password via client API
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        // Mark nominee as claimed now that password is set
        if (userId && nomineeId) {
          await supabase
            .from('nominees')
            .update({ user_id: userId, claimed_at: new Date().toISOString() })
            .eq('id', nomineeId);
        }
      } else if (mode === 'third-party' && nominee?.invite_token) {
        // =====================================================================
        // THIRD-PARTY NOMINEE: Use edge function for reliable user creation
        // This bypasses trigger issues and handles all edge cases server-side
        // =====================================================================
        if (!email) {
          throw new Error('Email is required to create an account. Please go back and enter your email.');
        }

        console.log('Calling set-nominee-password edge function');
        const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(
          'set-nominee-password',
          {
            body: {
              invite_token: nominee.invite_token,
              password,
              email, // Pass email in case nominee record doesn't have it
            },
          }
        );

        if (edgeError) {
          console.error('Edge function error:', edgeError);
          throw new Error(edgeError.message || 'Failed to create account. Please try again.');
        }

        if (!edgeResult?.success) {
          const errorMsg = edgeResult?.error || 'Failed to create account';
          // Handle specific error codes
          if (edgeResult?.code === 'EMAIL_EXISTS') {
            throw new Error('An account with this email already exists. Please try logging in instead.');
          }
          throw new Error(errorMsg);
        }

        userId = edgeResult.user_id;
        console.log('Edge function succeeded, user_id:', userId);

        // Sign in with the new password to get a session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // User was created but sign-in failed — this shouldn't happen
          // but let them proceed since the account exists
          console.error('Sign-in after password set failed:', signInError);
          // Don't throw — the account was created successfully
        } else if (signInData?.user) {
          setCurrentUser(signInData.user);
          userId = signInData.user.id;
        }
      } else {
        // =====================================================================
        // SELF-ANON MODE: Use standard signUp for new self-nominees
        // =====================================================================
        if (!email) throw new Error('Email is required to create an account');

        const fullName = `${cardData.firstName} ${cardData.lastName}`.trim();

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              nominee_id: nomineeId,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message?.includes('already registered')) {
            // Account exists — try to sign in
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user?.email?.toLowerCase() === email.toLowerCase()) {
              // We have a valid session — just set the password
              const { error: updateErr } = await supabase.auth.updateUser({ password });
              if (updateErr) throw updateErr;
              userId = sessionData.session.user.id;
              setCurrentUser(sessionData.session.user);
            } else {
              // No matching session — try signing in with the password they entered
              const { data: signInData, error: signInError } =
                await supabase.auth.signInWithPassword({ email, password });

              if (signInError) {
                throw new Error(
                  'An account with this email already exists. Please use your existing password or reset it.'
                );
              }

              setCurrentUser(signInData.user);
              userId = signInData.user?.id;
            }

            // Link user to nominee and mark claimed
            if (userId && nomineeId) {
              await supabase
                .from('nominees')
                .update({ user_id: userId, claimed_at: new Date().toISOString() })
                .eq('id', nomineeId);
            }
          } else {
            throw signUpError;
          }
        } else if (data?.user) {
          setCurrentUser(data.user);
          userId = data.user.id;

          // Link user to nominee and mark claimed
          if (userId && nomineeId) {
            await supabase
              .from('nominees')
              .update({ user_id: userId, claimed_at: new Date().toISOString() })
              .eq('id', nomineeId);
          }
        }
      }

      // Populate the profile with all card data now that the account exists.
      // submitCard may have run before the user had an account, so the profile
      // was only seeded with email/name by the DB trigger.
      if (userId) {
        const avatarUrl = (cardData.photoPreview && !cardData.photoPreview.startsWith('blob:'))
          ? cardData.photoPreview : undefined;
        await supabase
          .from('profiles')
          .update({
            first_name: cardData.firstName.trim(),
            last_name: cardData.lastName.trim(),
            avatar_url: avatarUrl,
            bio: cardData.bio?.trim() || undefined,
            city: cardData.location?.trim() || undefined,
            age: cardData.age ? parseInt(cardData.age, 10) : undefined,
            instagram: cardData.instagram?.trim() || undefined,
            phone: cardData.phone?.trim() || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // Notify all useSupabaseAuth instances to refetch the profile
        window.dispatchEvent(new Event('profile-updated'));
      }

      // =====================================================================
      // ENGAGEMENT: Cancel pending reminders + notify nominator
      // =====================================================================
      if (nomineeId && mode === 'third-party') {
        // Cancel pending nomination reminder emails (nominee has claimed)
        try {
          await supabase
            .from('engagement_queue')
            .delete()
            .eq('nominee_id', nomineeId)
            .in('engagement_type', ['nomination_reminder_48h', 'nomination_reminder_5d', 'nominator_no_response'])
            .is('sent_at', null);
        } catch (cancelErr) {
          console.warn('Failed to cancel pending engagement emails:', cancelErr);
        }

        // Notify nominator that their friend entered (if they opted in)
        // EMAIL ONLY - nominator has not opted in to SMS
        if (nominee?.nominator_email && nominee?.nominator_notify !== false) {
          const cityName = getCityName(competition) || '';
          const competitionName = `Most Eligible ${cityName} ${competition?.season || ''}`.trim();
          const fullName = `${cardData.firstName} ${cardData.lastName}`.trim();

          try {
            await supabase.from('engagement_queue').insert({
              nominee_id: nomineeId,
              competition_id: competition?.id,
              engagement_type: 'nominator_friend_entered',
              channel: 'email',  // Nominator hasn't opted in to SMS
              email_to: nominee.nominator_email,
              phone_to: null,
              scheduled_for: new Date().toISOString(),
              template_data: {
                nominee_name: fullName,
                nominator_name: nominee.nominator_name || 'Friend',
                competition_name: competitionName,
                city_name: cityName,
                season: String(competition?.season || ''),
                profile_url: `${window.location.origin}/profile`,
                voting_starts: competition?.voting_start
                  ? new Date(competition.voting_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : null,
              },
            });
            console.log('Scheduled nominator notification email');
          } catch (notifyErr) {
            console.warn('Failed to schedule nominator notification:', notifyErr);
          }
        }
      }

      next();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, cardData, nomineeId, next, mode, nominee, competition]);

  // ---- Skip password — send magic link so they can claim their account later ----
  const skipPassword = useCallback(() => {
    if (nomineeId) {
      supabase.functions.invoke('send-nomination-invite', {
        body: { nominee_id: nomineeId, force_resend: true },
      }).catch((err) => {
        console.warn('Failed to send account setup email:', err);
      });
    }
    next();
  }, [next, nomineeId]);

  // ---- Account collision: check if email exists ----
  const checkEmailExists = useCallback(async (email) => {
    if (!email?.trim()) return false;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  }, []);

  // ---- Login existing account (account collision) ----
  const loginExistingAccount = useCallback(async (email, password) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setCurrentUser(data.user);

      // Fetch profile and pre-fill
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileData) {
        setCardData((prev) => ({
          ...prev,
          firstName: prev.firstName || profileData.first_name || '',
          lastName: prev.lastName || profileData.last_name || '',
          age: prev.age || profileData.age || '',
          location: prev.location || profileData.city || '',
          instagram: prev.instagram || profileData.instagram || '',
          photoPreview: prev.photoPreview || profileData.avatar_url || '',
        }));
      }

      // Link user to nominee
      if (data.user.id && nomineeId) {
        await supabase
          .from('nominees')
          .update({ user_id: data.user.id })
          .eq('id', nomineeId);
      }

      return true;
    } catch (err) {
      setSubmitError(err.message || 'Invalid email or password');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [nomineeId]);

  return {
    // State
    currentStep,
    currentStepIndex,
    totalSteps,
    steps,
    isFirstStep,
    isLastStep,
    isSubmitting,
    submitError,
    submittedData,
    nomineeId,
    currentUser,

    // Data
    cardData,
    eligibilityAnswers,

    // Actions
    next,
    back,
    setEligibility,
    updateCardData,
    acceptNomination,
    declineNomination,
    persistProgress,
    submitCard,
    createAccount,
    skipPassword,
    checkEmailExists,
    loginExistingAccount,
    setSubmitError,
  };
}

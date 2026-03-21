import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { uploadPhoto } from '../utils/uploadPhoto';

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

const SELF_STEPS_AUTH = ['mode', 'eligibility', 'photo', 'details', 'bio', 'card'];
const SELF_STEPS_ANON = ['mode', 'eligibility', 'photo', 'details', 'bio', 'password', 'card'];
const NOMINATE_STEPS = ['mode', 'eligibility', 'nominee', 'why', 'nominator', 'card'];

// Map flow_stage values to step names
const FLOW_STAGE_TO_STEP = {
  'details': 'bio', // After details is saved, next step is bio
  'bio': 'password', // After bio is saved, next step is password (or card for logged in)
  'password': 'card', // After password, show card
  'card': 'card', // Already at card
};

/**
 * useEntryFlow - State management for the gamified entry/nomination flow
 *
 * @param {Object} competition - Full competition object with joined relations
 * @param {Object|null} profile - User profile if logged in
 * @returns {Object} Flow state and actions
 */
export function useEntryFlow(competition, profile) {
  const isLoggedIn = !!profile?.id;

  // Track if we've checked for existing progress
  const hasCheckedProgressRef = useRef(false);
  
  // Freeze the step array when mode is selected so that auth state changes
  // mid-flow (e.g. after signUp in createAccount) don't swap ANON→AUTH steps
  // and reset the user to the beginning.
  const frozenStepsRef = useRef(null);

  // Flow state
  const [mode, setMode] = useState(null); // 'self' | 'nominate'
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [nomineeId, setNomineeId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Eligibility
  const [eligibilityAnswers, setEligibilityAnswers] = useState({});

  // Self-entry data — now includes location
  const [selfData, setSelfData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    instagram: profile?.instagram || '',
    age: profile?.age || '',
    location: profile?.city || '',
    photoFile: null,
    photoPreview: profile?.avatar_url || '',
    bio: '',
  });

  // Nomination data
  const [nomineeData, setNomineeData] = useState({
    name: '',
    email: '',
    instagram: '',
    relationship: '',
    photoFile: null,
    photoPreview: '',
    reason: '',
  });

  const [nominatorData, setNominatorData] = useState({
    name: '',
    email: '',
    anonymous: false,
    emailOptIn: false,
  });

  // Current steps list — frozen once mode is selected so mid-flow auth
  // changes (signUp) can't swap the array and invalidate the step index.
  const steps = useMemo(() => {
    if (frozenStepsRef.current) return frozenStepsRef.current;
    if (mode === 'nominate') return NOMINATE_STEPS;
    if (mode === 'self') return isLoggedIn ? SELF_STEPS_AUTH : SELF_STEPS_ANON;
    return SELF_STEPS_AUTH; // default before mode selected
  }, [mode, isLoggedIn]);

  const currentStep = steps[currentStepIndex] || 'mode';
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Check for existing in-progress entry and resume from saved state
  // This prevents the "loop" bug where users lose progress on page refresh
  useEffect(() => {
    if (hasCheckedProgressRef.current || !competition?.id) return;
    hasCheckedProgressRef.current = true;

    const checkExistingProgress = async () => {
      try {
        // Get user's email - from profile if logged in, or from session if exists
        let userEmail = profile?.email;
        
        if (!userEmail) {
          const { data: { session } } = await supabase.auth.getSession();
          userEmail = session?.user?.email;
        }

        if (!userEmail) return; // Can't check without email

        // Look for an existing self-nomination in progress for this competition
        const { data: existingNominee, error } = await supabase
          .from('nominees')
          .select('*')
          .eq('competition_id', competition.id)
          .ilike('email', userEmail)
          .eq('nominated_by', 'self')
          .maybeSingle();

        if (error || !existingNominee) return;

        // Found existing entry - check if we should resume
        const flowStage = existingNominee.flow_stage;
        const hasClaimed = !!existingNominee.claimed_at;
        
        // If already claimed and completed, don't resume
        if (hasClaimed && flowStage === 'card') {
          return;
        }

        // Pre-fill data from existing nominee
        const nameParts = (existingNominee.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setSelfData((prev) => ({
          ...prev,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          email: existingNominee.email || prev.email,
          phone: existingNominee.phone || prev.phone,
          instagram: existingNominee.instagram || prev.instagram,
          age: existingNominee.age ? String(existingNominee.age) : prev.age,
          location: existingNominee.city || prev.location,
          photoPreview: existingNominee.avatar_url || prev.photoPreview,
          bio: existingNominee.bio || prev.bio,
        }));

        if (existingNominee.eligibility_answers) {
          setEligibilityAnswers(existingNominee.eligibility_answers);
        }

        // Set the nominee ID so updates go to the right record
        setNomineeId(existingNominee.id);

        // Set mode to self and freeze steps
        setMode('self');
        frozenStepsRef.current = isLoggedIn ? SELF_STEPS_AUTH : SELF_STEPS_ANON;

        // Determine which step to resume from
        if (flowStage && FLOW_STAGE_TO_STEP[flowStage]) {
          const resumeStep = FLOW_STAGE_TO_STEP[flowStage];
          // For logged in users, skip password step
          const targetSteps = isLoggedIn ? SELF_STEPS_AUTH : SELF_STEPS_ANON;
          let resumeIndex = targetSteps.indexOf(resumeStep);
          
          // If the step doesn't exist (e.g., password for logged-in users), 
          // find the next available step
          if (resumeIndex === -1) {
            // If we're at password stage but logged in, go to card
            if (resumeStep === 'password' && isLoggedIn) {
              resumeIndex = targetSteps.indexOf('card');
            } else {
              resumeIndex = 1; // Default to after mode selection
            }
          }
          
          if (resumeIndex > 0) {
            setCurrentStepIndex(resumeIndex);
            console.log(`Resuming entry flow from step: ${targetSteps[resumeIndex]} (index ${resumeIndex})`);
          }
        }
      } catch (err) {
        console.warn('Error checking existing progress:', err);
        // Don't block the flow if check fails
      }
    };

    checkExistingProgress();
  }, [competition?.id, profile?.email, isLoggedIn]);

  // Select mode
  const selectMode = useCallback((selectedMode) => {
    setMode(selectedMode);

    // Freeze steps based on auth state at the moment mode is chosen
    if (selectedMode === 'nominate') {
      frozenStepsRef.current = NOMINATE_STEPS;
    } else if (selectedMode === 'self') {
      frozenStepsRef.current = isLoggedIn ? SELF_STEPS_AUTH : SELF_STEPS_ANON;
    }

    // Pre-fill self data from profile if available
    if (selectedMode === 'self' && profile) {
      setSelfData((prev) => ({
        ...prev,
        firstName: prev.firstName || profile.first_name || '',
        lastName: prev.lastName || profile.last_name || '',
        email: prev.email || profile.email || '',
        phone: prev.phone || profile.phone || '',
        instagram: prev.instagram || profile.instagram || '',
        age: prev.age || profile.age || '',
        location: prev.location || profile.city || '',
        photoPreview: prev.photoPreview || profile.avatar_url || '',
      }));
    }

    setCurrentStepIndex(1); // Move past mode select
  }, [profile, isLoggedIn]);

  // Navigation
  const next = useCallback(() => {
    setSubmitError('');
    setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const back = useCallback(() => {
    setSubmitError('');
    if (currentStepIndex === 1) {
      // Going back to mode select — unfreeze steps
      frozenStepsRef.current = null;
      setMode(null);
      setCurrentStepIndex(0);
    } else {
      setCurrentStepIndex((i) => Math.max(i - 1, 0));
    }
  }, [currentStepIndex]);

  // Field setters
  const setEligibility = useCallback((id, value) => {
    setEligibilityAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const updateSelfData = useCallback((updates) => {
    setSelfData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateNomineeData = useCallback((updates) => {
    setNomineeData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateNominatorData = useCallback((updates) => {
    setNominatorData((prev) => ({ ...prev, ...updates }));
  }, []);

  // ---- Early persistence: save after details step ----
  const persistSelfProgress = useCallback(async (flowStage) => {
    if (!competition?.id) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      let avatarUrl = selfData.photoPreview;
      if (selfData.photoFile) {
        try {
          avatarUrl = await uploadPhoto(selfData.photoFile, 'avatars');
        } catch (uploadErr) {
          console.warn('Photo upload failed during persist, will retry on final submit:', uploadErr.message);
          avatarUrl = (selfData.photoPreview && !selfData.photoPreview.startsWith('blob:'))
            ? selfData.photoPreview
            : null;
        }
      }

      const fullName = `${selfData.firstName} ${selfData.lastName}`.trim();

      const record = {
        competition_id: competition.id,
        name: fullName,
        email: selfData.email?.trim() || null,
        phone: selfData.phone?.trim() || null,
        instagram: selfData.instagram?.trim() || null,
        age: selfData.age ? parseInt(selfData.age, 10) : null,
        city: selfData.location?.trim() || null,
        avatar_url: avatarUrl || null,
        nominated_by: 'self',
        status: 'pending',
        eligibility_answers: eligibilityAnswers,
        flow_stage: flowStage,
      };

      if (profile?.id) {
        record.user_id = profile.id;
        // Logged-in users are already authenticated — claimed_at set at submitSelfEntry
      }

      if (nomineeId) {
        // Update existing early-persisted record
        const updateData = {
          name: record.name,
          email: record.email,
          phone: record.phone,
          instagram: record.instagram,
          age: record.age,
          city: record.city,
          avatar_url: record.avatar_url,
          flow_stage: flowStage,
        };
        let { error } = await supabase
          .from('nominees')
          .update(updateData)
          .eq('id', nomineeId);
        if (error && isSchemaError(error)) {
          ({ error } = await supabase
            .from('nominees')
            .update(stripNewColumns(updateData))
            .eq('id', nomineeId));
        }
        if (error) throw error;
      } else {
        // Insert new
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

      if (avatarUrl && avatarUrl !== selfData.photoPreview) {
        setSelfData((prev) => ({ ...prev, photoPreview: avatarUrl }));
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save progress');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [competition, selfData, eligibilityAnswers, profile, nomineeId]);

  // Submit self-entry
  const submitSelfEntry = useCallback(async () => {
    if (!competition?.id) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Upload photo if new file selected
      let avatarUrl = selfData.photoPreview;
      if (selfData.photoFile) {
        avatarUrl = await uploadPhoto(selfData.photoFile);
      }

      const fullName = `${selfData.firstName} ${selfData.lastName}`.trim();

      const record = {
        name: fullName,
        email: selfData.email.trim(),
        phone: selfData.phone.trim() || null,
        instagram: selfData.instagram.trim() || null,
        bio: selfData.bio.trim() || null,
        avatar_url: avatarUrl || null,
        age: selfData.age ? parseInt(selfData.age, 10) : null,
        city: selfData.location?.trim() || null,
        // Anon users still need the password step — set 'bio' so resume
        // maps to 'password'. Logged-in users skip password, so 'card'.
        flow_stage: isLoggedIn ? 'card' : 'bio',
      };

      if (profile?.id) {
        record.user_id = profile.id;
        // Logged-in users don't have a password step — mark claimed now
        record.claimed_at = new Date().toISOString();
      }

      if (nomineeId) {
        // Update the early-persisted record with final data
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
        // No early persist happened — insert full record
        record.competition_id = competition.id;
        record.nominated_by = 'self';
        record.status = 'pending';
        record.eligibility_answers = eligibilityAnswers;
        // claimed_at: already set above for logged-in; anon users get it at createAccount

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
        if (inserted?.id) setNomineeId(inserted.id);
      }

      // Update profile if logged in
      if (profile?.id) {
        const profileUpdate = {
          first_name: selfData.firstName.trim(),
          last_name: selfData.lastName.trim(),
          updated_at: new Date().toISOString(),
        };
        if (avatarUrl) profileUpdate.avatar_url = avatarUrl;
        if (selfData.bio?.trim()) profileUpdate.bio = selfData.bio.trim();
        if (selfData.location?.trim()) profileUpdate.city = selfData.location.trim();
        if (selfData.age) profileUpdate.age = parseInt(selfData.age, 10);
        if (selfData.instagram?.trim()) profileUpdate.instagram = selfData.instagram.trim();

        const { error: profileErr } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', profile.id);

        if (profileErr) {
          console.error('Failed to update profile:', profileErr);
        }

        window.dispatchEvent(new Event('profile-updated'));
      }

      setSubmittedData({
        name: fullName,
        photoUrl: avatarUrl,
        handle: selfData.instagram,
        bio: selfData.bio,
        isNomination: false,
      });

      // Move to card reveal (skip password for logged-in) or to password step
      if (!isLoggedIn) {
        setCurrentStepIndex(steps.indexOf('password'));
      } else {
        setCurrentStepIndex(steps.indexOf('card'));
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit entry');
    } finally {
      setIsSubmitting(false);
    }
  }, [competition, selfData, eligibilityAnswers, profile, steps, isLoggedIn, nomineeId]);

  // ---- Create account for anon self-nominees ----
  //
  // Uses the set-nominee-password edge function (server-side admin API) to
  // reliably create the auth user, link the nominee, and sync all card data
  // to the profile. This bypasses RLS and avoids the multiple failure modes
  // of client-side signUp (email confirmation blocking sessions, fake users
  // returned for existing emails, trigger crashes swallowed silently).
  const createAccount = useCallback(async (password) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const email = selfData.email?.trim();
      if (!email) throw new Error('Email is required to create an account');

      let resolvedUserId = null;

      // ── Use the set-nominee-password edge function ──────────────────
      // This creates the auth user via admin API, sets the password,
      // links the nominee record, and syncs all card data to the profile
      // — all server-side with the service role key.
      console.log('Using set-nominee-password edge function for self-nomination account creation');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const fnUrl = `${supabaseUrl}/functions/v1/set-nominee-password`;
      const fnHeaders = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      };
      const fnBody = JSON.stringify({
        nominee_id: nomineeId || undefined,
        password,
        email,
      });

      let fnResp = await fetch(fnUrl, { method: 'POST', headers: fnHeaders, body: fnBody });
      let fnData = null;
      try { fnData = await fnResp.json(); } catch (_) { /* non-JSON response */ }

      if (!fnResp.ok || fnData?.error) {
        const fnErrMsg = fnData?.error || `Edge Function returned status ${fnResp.status}`;
        console.warn('set-nominee-password attempt 1 failed:', fnErrMsg);

        // If it's an "already registered" style error, try signing in directly
        if (fnErrMsg.includes('already') || fnErrMsg.includes('exists')) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            throw new Error(
              'An account with this email already exists. Please use your existing password or reset it.'
            );
          }
          setCurrentUser(signInData.user);
          resolvedUserId = signInData.user?.id;
        } else {
          // Retry once after a brief delay
          await new Promise((r) => setTimeout(r, 2000));
          fnResp = await fetch(fnUrl, { method: 'POST', headers: fnHeaders, body: fnBody });
          try { fnData = await fnResp.json(); } catch (_) { fnData = null; }

          if (!fnResp.ok || fnData?.error) {
            const retryErrMsg = fnData?.error || `Edge Function returned status ${fnResp.status}`;
            console.error('set-nominee-password attempt 2 failed:', retryErrMsg);
            throw new Error(
              'Account setup failed due to a server issue. Please try again in a moment, or contact support if this persists.'
            );
          }
        }
      }

      // Edge function succeeded — sign in to establish client session
      if (!resolvedUserId) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          throw new Error(
            'Account created but sign-in failed. Please try logging in with your email and password.'
          );
        }
        setCurrentUser(signInData.user);
        resolvedUserId = signInData.user?.id;
      }

      // Link user to nominee and mark claimed (edge fn does this too, but
      // ensure it's set in case of race conditions)
      if (resolvedUserId && nomineeId) {
        await supabase
          .from('nominees')
          .update({ user_id: resolvedUserId, claimed_at: new Date().toISOString() })
          .eq('id', nomineeId);
      }

      // The edge function already synced nominee data to the profile.
      // Do a client-side upsert too with the latest card data in case
      // the user edited fields after the nominee was persisted.
      if (resolvedUserId) {
        const avatarUrl = (selfData.photoPreview && !selfData.photoPreview.startsWith('blob:'))
          ? selfData.photoPreview : null;

        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert({
            id: resolvedUserId,
            email,
            first_name: selfData.firstName.trim(),
            last_name: selfData.lastName.trim(),
            avatar_url: avatarUrl || undefined,
            bio: selfData.bio?.trim() || null,
            city: selfData.location?.trim() || null,
            age: selfData.age ? parseInt(selfData.age, 10) : null,
            instagram: selfData.instagram?.trim() || null,
            phone: selfData.phone?.trim() || null,
            onboarded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (profileErr) {
          // Not fatal — edge function already synced the core data
          console.warn('Client-side profile upsert failed (edge fn already synced):', profileErr.message);
        }

        // Notify all useSupabaseAuth instances to refetch the profile
        window.dispatchEvent(new Event('profile-updated'));
      }

      // Mark flow_stage as 'card' now that account is created
      if (nomineeId) {
        await supabase
          .from('nominees')
          .update({ flow_stage: 'card' })
          .eq('id', nomineeId);
      }

      // Move to card
      setCurrentStepIndex(steps.indexOf('card'));
    } catch (err) {
      setSubmitError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  }, [selfData, nomineeId, steps]);

  // ---- Skip password — send magic link so they can claim their account later ----
  const skipPassword = useCallback(() => {
    if (nomineeId) {
      supabase.functions.invoke('send-nomination-invite', {
        body: { nominee_id: nomineeId, force_resend: true },
      }).catch((err) => {
        console.warn('Failed to send account setup email:', err);
      });
    }
    setCurrentStepIndex(steps.indexOf('card'));
  }, [steps, nomineeId]);

  // Submit nomination (unchanged — this is the nominator's flow, not the nominee's)
  const submitNomination = useCallback(async () => {
    if (!competition?.id) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Upload photo if provided
      let avatarUrl = null;
      if (nomineeData.photoFile) {
        avatarUrl = await uploadPhoto(nomineeData.photoFile);
      }

      const record = {
        competition_id: competition.id,
        name: nomineeData.name.trim(),
        email: nomineeData.email.trim() || null,
        instagram: nomineeData.instagram.trim() || null,
        relationship: nomineeData.relationship || null,
        avatar_url: avatarUrl,
        nomination_reason: nomineeData.reason.trim() || null,
        nominated_by: 'third_party',
        nominator_name: nominatorData.anonymous ? null : nominatorData.name.trim(),
        nominator_email: nominatorData.email.trim(),
        nominator_anonymous: nominatorData.anonymous,
        nominator_notify: nominatorData.emailOptIn,
        status: 'pending',
        eligibility_answers: eligibilityAnswers,
      };

      // Link nominator if logged in
      if (profile?.id) {
        record.nominator_id = profile.id;
      }

      const { data: inserted, error } = await supabase
        .from('nominees')
        .insert(record)
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This person has already been nominated for this competition.');
        }
        throw error;
      }

      // Send notification email to nominee immediately (fire-and-forget)
      if (inserted?.id) {
        supabase.functions.invoke('send-nomination-invite', {
          body: { nominee_id: inserted.id },
        }).catch((inviteErr) => {
          console.warn('Failed to send nomination invite email:', inviteErr);
        });
      }

      setSubmittedData({
        name: nomineeData.name,
        photoUrl: avatarUrl,
        handle: nomineeData.instagram,
        pitch: nomineeData.reason,
        isNomination: true,
        nominatorAnonymous: nominatorData.anonymous,
      });

      setCurrentStepIndex(steps.indexOf('card'));
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit nomination');
    } finally {
      setIsSubmitting(false);
    }
  }, [competition, nomineeData, nominatorData, eligibilityAnswers, profile, steps]);

  // Reset for nominating another person (keeps nominator info + eligibility)
  const resetForNewNomination = useCallback(() => {
    setNomineeData({
      name: '',
      email: '',
      instagram: '',
      relationship: '',
      photoFile: null,
      photoPreview: '',
      reason: '',
    });
    setSubmittedData(null);
    setSubmitError('');
    // Go back to the nominee info step
    setCurrentStepIndex(steps.indexOf('nominee'));
  }, [steps]);

  return {
    // State
    mode,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    isSubmitting,
    submitError,
    submittedData,
    isLoggedIn,

    // Data
    eligibilityAnswers,
    selfData,
    nomineeData,
    nominatorData,

    // Actions
    selectMode,
    next,
    back,
    setEligibility,
    updateSelfData,
    updateNomineeData,
    updateNominatorData,
    submitSelfEntry,
    submitNomination,
    resetForNewNomination,
    persistSelfProgress,
    createAccount,
    skipPassword,
    setSubmitError,
  };
}

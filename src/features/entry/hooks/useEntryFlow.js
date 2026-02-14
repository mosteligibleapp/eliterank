import { useState, useCallback, useMemo, useRef } from 'react';
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

const SELF_STEPS_AUTH = ['mode', 'eligibility', 'photo', 'details', 'pitch', 'card'];
const SELF_STEPS_ANON = ['mode', 'eligibility', 'photo', 'details', 'pitch', 'password', 'card'];
const NOMINATE_STEPS = ['mode', 'eligibility', 'nominee', 'why', 'nominator', 'card'];

/**
 * useEntryFlow - State management for the gamified entry/nomination flow
 *
 * @param {Object} competition - Full competition object with joined relations
 * @param {Object|null} profile - User profile if logged in
 * @returns {Object} Flow state and actions
 */
export function useEntryFlow(competition, profile) {
  const isLoggedIn = !!profile?.id;

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
    pitch: '',
  });

  // Nomination data
  const [nomineeData, setNomineeData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    age: '',
    relationship: '',
    photoFile: null,
    photoPreview: '',
    reason: '',
  });

  const [nominatorData, setNominatorData] = useState({
    name: '',
    email: '',
    anonymous: false,
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
        claimed_at: new Date().toISOString(),
        flow_stage: flowStage,
      };

      if (profile?.id) {
        record.user_id = profile.id;
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
        bio: selfData.pitch.trim() || null,
        avatar_url: avatarUrl || null,
        age: selfData.age ? parseInt(selfData.age, 10) : null,
        city: selfData.location?.trim() || null,
        flow_stage: 'card',
      };

      if (profile?.id) {
        record.user_id = profile.id;
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
        record.claimed_at = new Date().toISOString();

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
        await supabase
          .from('profiles')
          .update({
            first_name: selfData.firstName.trim(),
            last_name: selfData.lastName.trim(),
            avatar_url: avatarUrl || undefined,
            bio: selfData.pitch?.trim() || undefined,
            city: selfData.location?.trim() || undefined,
            age: selfData.age ? parseInt(selfData.age, 10) : undefined,
            instagram: selfData.instagram?.trim() || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        window.dispatchEvent(new Event('profile-updated'));
      }

      setSubmittedData({
        name: fullName,
        photoUrl: avatarUrl,
        handle: selfData.instagram,
        pitch: selfData.pitch,
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
  const createAccount = useCallback(async (password) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const email = selfData.email?.trim();
      if (!email) throw new Error('Email is required to create an account');

      const fullName = `${selfData.firstName} ${selfData.lastName}`.trim();

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
          // Try login with password
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email, password });

          if (signInError) {
            throw new Error(
              'An account with this email already exists. Please use your existing password.'
            );
          }
          setCurrentUser(signInData.user);

          if (signInData.user?.id && nomineeId) {
            await supabase
              .from('nominees')
              .update({ user_id: signInData.user.id })
              .eq('id', nomineeId);
          }
        } else {
          throw signUpError;
        }
      } else if (data?.user) {
        setCurrentUser(data.user);

        if (data.user.id && nomineeId) {
          await supabase
            .from('nominees')
            .update({ user_id: data.user.id })
            .eq('id', nomineeId);
        }
      }

      // Populate the profile with all card data now that the account exists.
      // submitSelfEntry skipped this because profile?.id was null at that point.
      const userId = data?.user?.id || currentUser?.id;
      if (userId) {
        const avatarUrl = (selfData.photoPreview && !selfData.photoPreview.startsWith('blob:'))
          ? selfData.photoPreview : undefined;
        await supabase
          .from('profiles')
          .update({
            first_name: selfData.firstName.trim(),
            last_name: selfData.lastName.trim(),
            avatar_url: avatarUrl,
            bio: selfData.pitch?.trim() || undefined,
            city: selfData.location?.trim() || undefined,
            age: selfData.age ? parseInt(selfData.age, 10) : undefined,
            instagram: selfData.instagram?.trim() || undefined,
            phone: selfData.phone?.trim() || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // Notify all useSupabaseAuth instances to refetch the profile
        window.dispatchEvent(new Event('profile-updated'));
      }

      // Move to card
      setCurrentStepIndex(steps.indexOf('card'));
    } catch (err) {
      setSubmitError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  }, [selfData, nomineeId, steps, currentUser]);

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
        phone: nomineeData.phone.trim() || null,
        instagram: nomineeData.instagram.trim() || null,
        age: nomineeData.age ? parseInt(nomineeData.age, 10) : null,
        relationship: nomineeData.relationship || null,
        avatar_url: avatarUrl,
        nomination_reason: nomineeData.reason.trim() || null,
        nominated_by: 'third_party',
        nominator_name: nominatorData.anonymous ? null : nominatorData.name.trim(),
        nominator_email: nominatorData.email.trim(),
        nominator_anonymous: nominatorData.anonymous,
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
      phone: '',
      instagram: '',
      age: '',
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

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { uploadPhoto } from '../utils/uploadPhoto';

/**
 * useBuildCardFlow - Unified "Build Your Card" orchestrator
 *
 * Three entry scenarios:
 * - 'self-auth':   Logged-in self-nominee  → eligibility, photo, details, pitch, card
 * - 'self-anon':   Not-logged-in self-nom  → eligibility, photo, details, pitch, password, card
 * - 'third-party': Third-party nominee     → accept, eligibility-confirm, photo, details, pitch, password?, card
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
        return ['eligibility', 'photo', 'details', 'pitch', 'card'];
      case 'self-anon':
        return ['eligibility', 'photo', 'details', 'pitch', 'password', 'card'];
      case 'third-party': {
        const base = ['accept', 'eligibility-confirm', 'photo', 'details', 'pitch'];
        if (needsPassword) base.push('password');
        base.push('card');
        return base;
      }
      default:
        return ['photo', 'details', 'pitch', 'card'];
    }
  }, [mode, needsPassword]);

  // Flow state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [nomineeId, setNomineeId] = useState(nominee?.id || null);
  const [currentUser, setCurrentUser] = useState(user);

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
    location: profile?.city || competition?.city?.name || competition?.cityData?.name || '',
    email: profile?.email || nominee?.email || '',
    phone: profile?.phone || nominee?.phone || '',
    instagram: profile?.instagram || nominee?.instagram || '',
    photoFile: null,
    photoPreview: profile?.avatar_url || nominee?.avatar_url || '',
    pitch: '',
  });

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
        claimed_at: new Date().toISOString(),
      };
      if (currentUser?.id) {
        updateData.user_id = currentUser.id;
      }

      const { error } = await supabase
        .from('nominees')
        .update(updateData)
        .eq('id', nominee.id);

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
      const updateData = { status: 'rejected' };
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
    setSubmitError('');

    try {
      const fullName = `${cardData.firstName} ${cardData.lastName}`.trim();

      // Upload photo if new file
      let avatarUrl = cardData.photoPreview;
      if (cardData.photoFile) {
        avatarUrl = await uploadPhoto(cardData.photoFile, 'avatars');
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
      };

      if (currentUser?.id) {
        record.user_id = currentUser.id;
      }

      if (nomineeId) {
        // Update existing nominee record
        const { error } = await supabase
          .from('nominees')
          .update(record)
          .eq('id', nomineeId);

        if (error) throw error;
      } else {
        // Insert new nominee record (self-entry early persist)
        record.competition_id = competition?.id;
        record.nominated_by = 'self';
        record.status = 'pending';
        record.eligibility_answers = eligibilityAnswers;
        record.claimed_at = new Date().toISOString();

        const { data: inserted, error } = await supabase
          .from('nominees')
          .insert(record)
          .select('id')
          .single();

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
        bio: cardData.pitch?.trim() || null,
        flow_stage: 'card',
      };

      if (currentUser?.id) {
        record.user_id = currentUser.id;
      }

      if (nomineeId) {
        // Update existing
        const { error } = await supabase
          .from('nominees')
          .update(record)
          .eq('id', nomineeId);
        if (error) throw error;
      } else {
        // Insert new (self-entry that skipped early persist)
        record.competition_id = competition?.id;
        record.nominated_by = 'self';
        record.status = 'pending';
        record.eligibility_answers = eligibilityAnswers;
        record.claimed_at = new Date().toISOString();

        const { data: inserted, error } = await supabase
          .from('nominees')
          .insert(record)
          .select('id')
          .single();

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
            bio: cardData.pitch?.trim() || undefined,
            city: cardData.location?.trim() || undefined,
            age: cardData.age ? parseInt(cardData.age, 10) : undefined,
            instagram: cardData.instagram?.trim() || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id);
      }

      setSubmittedData({
        name: fullName,
        photoUrl: avatarUrl,
        handle: cardData.instagram,
        pitch: cardData.pitch,
        isNomination: false,
      });

      // Move to card reveal
      setCurrentStepIndex(steps.indexOf('card'));
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit entry');
    } finally {
      setIsSubmitting(false);
    }
  }, [cardData, currentUser, nomineeId, competition, eligibilityAnswers, steps]);

  // ---- Create account / set password ----
  const createAccount = useCallback(async (password) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (currentUser) {
        // User exists (magic link) — just set password
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      } else {
        // New user — sign up
        const email = cardData.email?.trim();
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
          // Already registered — try login
          if (signUpError.message?.includes('already registered')) {
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({ email, password });

            if (signInError) {
              throw new Error(
                'An account with this email already exists. Please use your existing password or reset it.'
              );
            }

            setCurrentUser(signInData.user);

            // Link user to nominee
            if (signInData.user?.id && nomineeId) {
              await supabase
                .from('nominees')
                .update({
                  user_id: signInData.user.id,
                  flow_stage: 'password',
                })
                .eq('id', nomineeId);
            }

            next();
            return;
          }
          throw signUpError;
        }

        if (data?.user) {
          setCurrentUser(data.user);

          // Link user to nominee
          if (data.user.id && nomineeId) {
            await supabase
              .from('nominees')
              .update({
                user_id: data.user.id,
                flow_stage: 'password',
              })
              .eq('id', nomineeId);
          }
        }
      }

      // Update flow stage
      if (nomineeId) {
        await supabase
          .from('nominees')
          .update({ flow_stage: 'password' })
          .eq('id', nomineeId);
      }

      next();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, cardData, nomineeId, next]);

  // ---- Skip password ----
  const skipPassword = useCallback(() => {
    next();
  }, [next]);

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

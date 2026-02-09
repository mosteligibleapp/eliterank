import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { uploadPhoto } from '../utils/uploadPhoto';

const SELF_STEPS = ['mode', 'eligibility', 'photo', 'details', 'pitch', 'card'];
const NOMINATE_STEPS = ['mode', 'eligibility', 'nominee', 'why', 'nominator', 'card'];

/**
 * useEntryFlow - State management for the gamified entry/nomination flow
 *
 * @param {Object} competition - Full competition object with joined relations
 * @param {Object|null} profile - User profile if logged in
 * @returns {Object} Flow state and actions
 */
export function useEntryFlow(competition, profile) {
  // Flow state
  const [mode, setMode] = useState(null); // 'self' | 'nominate'
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  // Eligibility
  const [eligibilityAnswers, setEligibilityAnswers] = useState({});

  // Self-entry data
  const [selfData, setSelfData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    instagram: profile?.instagram || '',
    age: profile?.age || '',
    photoFile: null,
    photoPreview: profile?.avatar_url || '',
    pitch: '',
  });

  // Nomination data
  const [nomineeData, setNomineeData] = useState({
    name: '',
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

  // Current steps list
  const steps = useMemo(
    () => (mode === 'nominate' ? NOMINATE_STEPS : SELF_STEPS),
    [mode]
  );

  const currentStep = steps[currentStepIndex] || 'mode';
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Select mode
  const selectMode = useCallback((selectedMode) => {
    setMode(selectedMode);

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
        photoPreview: prev.photoPreview || profile.avatar_url || '',
      }));
    }

    setCurrentStepIndex(1); // Move past mode select
  }, [profile]);

  // Navigation
  const next = useCallback(() => {
    setSubmitError('');
    setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const back = useCallback(() => {
    setSubmitError('');
    if (currentStepIndex === 1) {
      // Going back to mode select
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
        competition_id: competition.id,
        name: fullName,
        email: selfData.email.trim(),
        phone: selfData.phone.trim() || null,
        instagram: selfData.instagram.trim() || null,
        bio: selfData.pitch.trim() || null,
        avatar_url: avatarUrl || null,
        age: selfData.age ? parseInt(selfData.age, 10) : null,
        nominated_by: 'self',
        status: 'pending',
        eligibility_answers: eligibilityAnswers,
      };

      // Link to user if logged in
      if (profile?.id) {
        record.user_id = profile.id;
      }

      const { error } = await supabase.from('nominees').insert(record);

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already entered this competition.');
        }
        throw error;
      }

      setSubmittedData({
        name: fullName,
        photoUrl: avatarUrl,
        handle: selfData.instagram,
        pitch: selfData.pitch,
        isNomination: false,
      });

      // Move to card reveal
      setCurrentStepIndex(steps.indexOf('card'));
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit entry');
    } finally {
      setIsSubmitting(false);
    }
  }, [competition, selfData, eligibilityAnswers, profile, steps]);

  // Submit nomination
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

      const { error } = await supabase.from('nominees').insert(record);

      if (error) {
        if (error.code === '23505') {
          throw new Error('This person has already been nominated for this competition.');
        }
        throw error;
      }

      setSubmittedData({
        name: nomineeData.name,
        photoUrl: avatarUrl,
        handle: nomineeData.instagram,
        pitch: nomineeData.reason,
        isNomination: true,
      });

      setCurrentStepIndex(steps.indexOf('card'));
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit nomination');
    } finally {
      setIsSubmitting(false);
    }
  }, [competition, nomineeData, nominatorData, eligibilityAnswers, profile, steps]);

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
    setSubmitError,
  };
}

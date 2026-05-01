import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_FORM, LAUNCH_DRAFT_KEY, STEP_KEYS } from './constants';
import { isStepValid, validateStep } from './validation';

function loadDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAUNCH_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(form, stepIndex, reachedIndex) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LAUNCH_DRAFT_KEY,
      JSON.stringify({ form, stepIndex, reachedIndex }),
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAUNCH_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Wizard state: current step, form data, validation errors, autosave to
 * localStorage, and a "reached" pointer that lets the user jump back to any
 * step they've already touched.
 */
export function useLaunchWizard() {
  const draftRef = useRef(loadDraft());
  const [stepIndex, setStepIndex] = useState(draftRef.current?.stepIndex ?? 0);
  const [reachedIndex, setReachedIndex] = useState(
    draftRef.current?.reachedIndex ?? draftRef.current?.stepIndex ?? 0,
  );
  const [form, setForm] = useState({ ...INITIAL_FORM, ...(draftRef.current?.form || {}) });
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const stepKey = STEP_KEYS[stepIndex];
  const errors = useMemo(() => validateStep(stepKey, form), [stepKey, form]);
  const stepValid = Object.keys(errors).length === 0;

  // Autosave on every change
  useEffect(() => {
    saveDraft(form, stepIndex, reachedIndex);
  }, [form, stepIndex, reachedIndex]);

  const update = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goTo = useCallback(
    (target) => {
      if (target < 0 || target >= STEP_KEYS.length) return;
      // Allow jumping freely to any step the user has reached, plus the next
      // unvisited step (so users can step forward without filling out the
      // current one when it's skippable).
      if (target > reachedIndex + 1) return;
      setShowErrors(false);
      setStepIndex(target);
      setReachedIndex((r) => Math.max(r, target));
    },
    [reachedIndex],
  );

  const next = useCallback(() => {
    if (!isStepValid(stepKey, form)) {
      setShowErrors(true);
      return false;
    }
    setShowErrors(false);
    const target = Math.min(stepIndex + 1, STEP_KEYS.length - 1);
    setStepIndex(target);
    setReachedIndex((r) => Math.max(r, target));
    return true;
  }, [stepKey, form, stepIndex]);

  const skip = useCallback(() => {
    setShowErrors(false);
    const target = Math.min(stepIndex + 1, STEP_KEYS.length - 1);
    setStepIndex(target);
    setReachedIndex((r) => Math.max(r, target));
  }, [stepIndex]);

  const back = useCallback(() => {
    setShowErrors(false);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  return {
    stepIndex,
    stepKey,
    reachedIndex,
    form,
    errors,
    showErrors,
    stepValid,
    submitting,
    submitError,
    setSubmitting,
    setSubmitError,
    update,
    setField,
    goTo,
    next,
    skip,
    back,
    setShowErrors,
  };
}

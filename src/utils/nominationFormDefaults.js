/**
 * Per-competition customization of the public nomination form.
 *
 * Standard fields are fixed (handled by the form / claim flow itself).
 * Hosts can add up to MAX_CUSTOM_QUESTIONS questions on top.
 */
export const MAX_CUSTOM_QUESTIONS = 2;

export const DEFAULT_NOMINATION_FORM_CONFIG = {
  custom_questions: [],
};

export const CUSTOM_QUESTION_TYPES = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Paragraph' },
  { value: 'select', label: 'Dropdown' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'checkbox', label: 'Checkbox' },
];

/**
 * The fields collected by the standard nomination + claim flow, surfaced as
 * a read-only list in the host editor so they see what's already included.
 */
export const STANDARD_NOMINATION_FIELDS = [
  { label: 'First name', stage: 'Nomination form' },
  { label: 'Last name', stage: 'Nomination form' },
  { label: 'Email', stage: 'Nomination form' },
  { label: 'Instagram', stage: 'Nomination form' },
  { label: 'Photo', stage: 'Claim flow' },
  { label: 'Age', stage: 'Claim flow' },
  { label: 'City', stage: 'Claim flow' },
  { label: 'Bio (skippable)', stage: 'Claim flow' },
  { label: 'Password', stage: 'Claim flow' },
];

/**
 * Standard fields list with a Gender row inserted when the competition splits
 * winners by gender. Used by the host editor so the read-only field list
 * matches what the public form actually collects.
 */
export function getStandardNominationFields(competition) {
  if (competition?.winners_split_by_gender || competition?.winnersSplitByGender) {
    return [
      ...STANDARD_NOMINATION_FIELDS.slice(0, 4),
      { label: 'Gender (legally & medically recognized)', stage: 'Nomination form' },
      ...STANDARD_NOMINATION_FIELDS.slice(4),
    ];
  }
  return STANDARD_NOMINATION_FIELDS;
}

export function resolveNominationFormConfig(stored) {
  if (!stored || typeof stored !== 'object') {
    return { custom_questions: [] };
  }

  const customQuestions = Array.isArray(stored.custom_questions)
    ? stored.custom_questions
        .filter((q) => q && typeof q.id === 'string' && typeof q.label === 'string')
        .slice(0, MAX_CUSTOM_QUESTIONS)
        .map((q) => ({
          id: q.id,
          label: q.label,
          type: CUSTOM_QUESTION_TYPES.some((t) => t.value === q.type) ? q.type : 'short_text',
          required: !!q.required,
          options: Array.isArray(q.options) ? q.options.filter((o) => typeof o === 'string') : [],
          help_text: typeof q.help_text === 'string' ? q.help_text : '',
        }))
    : [];

  return { custom_questions: customQuestions };
}

export function newCustomQuestionId() {
  return 'cq_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

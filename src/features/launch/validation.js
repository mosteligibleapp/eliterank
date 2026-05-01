const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}([/?#].*)?$/i;

export function validateStep(stepKey, form) {
  switch (stepKey) {
    case 'org': {
      const errors = {};
      if (!form.org_name.trim()) errors.org_name = 'Org name is required.';
      if (!form.contact_name.trim()) errors.contact_name = 'Your name is required.';
      if (!form.contact_email.trim()) errors.contact_email = 'Contact email is required.';
      else if (!EMAIL_RE.test(form.contact_email.trim())) errors.contact_email = 'Enter a valid email.';
      if (form.website_url && !URL_RE.test(form.website_url.trim()))
        errors.website_url = 'Looks like that isn\'t a valid URL.';
      if (form.social_url && !URL_RE.test(form.social_url.trim()))
        errors.social_url = 'Looks like that isn\'t a valid URL.';
      return errors;
    }
    case 'category': {
      const errors = {};
      if (!form.category) errors.category = 'Pick a category to continue.';
      if (form.category === 'other' && !form.category_other.trim())
        errors.category_other = 'Tell us briefly what kind of competition.';
      return errors;
    }
    case 'name': {
      const errors = {};
      // competition_name is optional — they can change it later
      if (!form.scope) errors.scope = 'Pick the geographic scope.';
      return errors;
    }
    case 'who': {
      const errors = {};
      if (!form.gender_eligibility.length) errors.gender_eligibility = 'Pick at least one.';
      if (!form.no_age_restrictions) {
        const min = Number(form.age_min);
        const max = Number(form.age_max);
        if (!form.age_min || !form.age_max) errors.age_range = 'Set a range or check "no age restrictions".';
        else if (Number.isNaN(min) || Number.isNaN(max)) errors.age_range = 'Ages must be numbers.';
        else if (min < 13) errors.age_range = 'Minimum age must be 13 or higher.';
        else if (max < min) errors.age_range = 'Max age must be ≥ min age.';
      }
      return errors;
    }
    case 'revenue': {
      const errors = {};
      if (!form.revenue_models.length) errors.revenue_models = 'Pick at least one revenue model.';
      return errors;
    }
    case 'timing': {
      const errors = {};
      if (!form.start_timeframe) errors.start_timeframe = 'Pick a timeframe to continue.';
      return errors;
    }
    case 'notes':
      return {};
    case 'review':
      return {};
    default:
      return {};
  }
}

export function isStepValid(stepKey, form) {
  return Object.keys(validateStep(stepKey, form)).length === 0;
}

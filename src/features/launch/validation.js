const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStep(stepKey, form) {
  switch (stepKey) {
    case 'org': {
      const errors = {};
      if (!form.org_name.trim()) errors.org_name = 'Org name is required.';
      if (!form.contact_email.trim()) errors.contact_email = 'Contact email is required.';
      else if (!EMAIL_RE.test(form.contact_email.trim())) errors.contact_email = 'Enter a valid email.';
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
      if (!form.competition_name.trim()) errors.competition_name = 'Name is required.';
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
    case 'social':
      return {};
    case 'revenue': {
      const errors = {};
      if (!form.revenue_models.length) errors.revenue_models = 'Pick at least one revenue model.';
      if (form.revenue_models.includes('Paid voting') && form.vote_price_usd !== '') {
        const v = Number(form.vote_price_usd);
        if (Number.isNaN(v) || v < 0) errors.vote_price_usd = 'Vote price must be a positive number.';
      }
      return errors;
    }
    case 'winning': {
      const errors = {};
      if (!form.num_winners || Number(form.num_winners) < 1)
        errors.num_winners = 'At least one winner per round.';
      if (form.cash_pool_usd !== '') {
        const v = Number(form.cash_pool_usd);
        if (Number.isNaN(v) || v < 0) errors.cash_pool_usd = 'Cash pool must be a positive number.';
      }
      return errors;
    }
    case 'city': {
      const errors = {};
      if (!form.city.trim()) errors.city = 'City is required.';
      return errors;
    }
    case 'launch': {
      const errors = {};
      if (!form.start_date) errors.start_date = 'Start date is required.';
      if (!form.end_date) errors.end_date = 'End date is required.';
      if (form.start_date && form.end_date) {
        const start = new Date(form.start_date);
        const end = new Date(form.end_date);
        if (!(end > start)) errors.end_date = 'End date must be after start date.';
      }
      if (!form.num_rounds || Number(form.num_rounds) < 1)
        errors.num_rounds = 'At least one voting round.';
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

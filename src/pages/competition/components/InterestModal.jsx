import { useState } from 'react';
import {
  X,
  Check,
  Loader,
  User,
  Mail,
  Phone,
  MessageSquare,
  Trophy,
  Users as UsersIcon,
  MapPin,
  Calendar,
  Hash,
  DollarSign,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import {
  INTEREST_TYPE,
  INTEREST_TYPE_CONFIG,
  ONBOARDING_INTEREST_TYPES,
  COMPETITION_TYPE_OPTIONS,
  TARGET_DEMOGRAPHIC_OPTIONS,
  EXPECTED_CONTESTANTS_OPTIONS,
  LAUNCH_TIMEFRAME_OPTIONS,
  BUDGET_RANGE_OPTIONS,
  US_STATES,
} from '../../../types/competition';

const INITIAL_FORM = {
  // Contact (step 1)
  name: '',
  email: '',
  phone: '',
  message: '',
  // Onboarding (step 2)
  competition_type: '',
  target_demographic: '',
  target_city: '',
  target_state: '',
  expected_contestants: '',
  target_launch_timeframe: '',
  budget_range: '',
  has_venue: '',
  has_audience: '',
  goals: '',
};

/**
 * Interest form modal. For host/sponsor types this becomes a 2-step
 * onboarding wizard that gathers details about the competition they want
 * to launch. All other types use the original single-step form.
 *
 * @param {string} type - Interest type (competing, hosting, sponsoring, fan, judging)
 * @param {object} competition - Competition object
 * @param {function} onClose - Close handler
 */
export function InterestModal({ type, competition, onClose }) {
  const isOnboarding = ONBOARDING_INTEREST_TYPES.includes(type);

  const [formData, setFormData] = useState(() => ({
    ...INITIAL_FORM,
    target_city: competition?.city || '',
  }));
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const totalSteps = isOnboarding ? 2 : 1;
  const config = INTEREST_TYPE_CONFIG[type] || {};
  const isDemoMode = !isSupabaseConfigured();

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateContactStep = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError(null);
    if (!validateContactStep()) return;
    setStep(2);
  };

  const handleBack = () => {
    setError(null);
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateContactStep()) {
      setStep(1);
      return;
    }

    setIsSubmitting(true);

    if (isDemoMode) {
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 800);
      return;
    }

    try {
      const payload = {
        competition_id: competition?.id || null,
        interest_type: type,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        message: formData.message.trim() || null,
        city: competition?.city || null,
        status: 'pending',
      };

      if (isOnboarding) {
        Object.assign(payload, {
          competition_type: formData.competition_type || null,
          target_demographic: formData.target_demographic || null,
          target_city: formData.target_city.trim() || null,
          target_state: formData.target_state || null,
          expected_contestants: formData.expected_contestants || null,
          target_launch_timeframe: formData.target_launch_timeframe || null,
          budget_range: formData.budget_range || null,
          has_venue:
            formData.has_venue === '' ? null : formData.has_venue === 'yes',
          has_audience:
            formData.has_audience === '' ? null : formData.has_audience === 'yes',
          goals: formData.goals.trim() || null,
        });
      }

      const { error: submitError } = await supabase
        .from('interest_submissions')
        .insert(payload);

      if (submitError) throw submitError;

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting interest form:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container modal-interest" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
          <div className="interest-success">
            <div className="interest-success-icon">
              <Check size={32} />
            </div>
            <h3>Thank You!</h3>
            <p>
              {isOnboarding
                ? "We've received your details. Our team will reach out within 1-2 business days to discuss next steps."
                : "Your interest has been submitted. We'll be in touch soon with more details."}
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const messagePlaceholder =
    type === INTEREST_TYPE.COMPETING
      ? "Why do you think you're the most eligible?"
      : type === INTEREST_TYPE.HOSTING
      ? 'Tell us about your experience with events...'
      : type === INTEREST_TYPE.SPONSORING
      ? 'Tell us about your business or brand...'
      : 'Any questions or comments?';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-interest" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="interest-form">
          <div className="interest-header">
            <h3>{config.label || 'Express Interest'}</h3>
            <p>
              {step === 2
                ? 'Tell us about the competition you want to launch.'
                : config.description}
            </p>
          </div>

          {isOnboarding && (
            <div className="interest-steps" aria-label={`Step ${step} of ${totalSteps}`}>
              <span className={`interest-step-dot ${step >= 1 ? 'is-active' : ''}`} />
              <span className={`interest-step-dot ${step >= 2 ? 'is-active' : ''}`} />
            </div>
          )}

          <form onSubmit={step === totalSteps ? handleSubmit : handleNext}>
            {step === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <User size={14} />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Your full name"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Mail size={14} />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="your@email.com"
                    className="form-input"
                    required
                  />
                </div>

                {(type === INTEREST_TYPE.HOSTING ||
                  type === INTEREST_TYPE.SPONSORING) && (
                  <div className="form-group">
                    <label className="form-label">
                      <Phone size={14} />
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="form-input"
                    />
                  </div>
                )}

                {type !== INTEREST_TYPE.FAN && (
                  <div className="form-group">
                    <label className="form-label">
                      <MessageSquare size={14} />
                      Tell us about yourself (optional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => updateField('message', e.target.value)}
                      placeholder={messagePlaceholder}
                      rows={3}
                      className="form-input form-textarea"
                    />
                  </div>
                )}
              </>
            )}

            {step === 2 && isOnboarding && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <Trophy size={14} />
                    Competition Type
                  </label>
                  <select
                    value={formData.competition_type}
                    onChange={(e) => updateField('competition_type', e.target.value)}
                    className="form-input form-select"
                  >
                    <option value="">Select a category…</option>
                    {COMPETITION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <UsersIcon size={14} />
                    Target Demographic
                  </label>
                  <select
                    value={formData.target_demographic}
                    onChange={(e) => updateField('target_demographic', e.target.value)}
                    className="form-input form-select"
                  >
                    <option value="">Select a demographic…</option>
                    {TARGET_DEMOGRAPHIC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <MapPin size={14} />
                      Target City
                    </label>
                    <input
                      type="text"
                      value={formData.target_city}
                      onChange={(e) => updateField('target_city', e.target.value)}
                      placeholder="e.g., Chicago"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group form-group-state">
                    <label className="form-label">State</label>
                    <select
                      value={formData.target_state}
                      onChange={(e) => updateField('target_state', e.target.value)}
                      className="form-input form-select"
                    >
                      <option value="">--</option>
                      {US_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Hash size={14} />
                      Expected Contestants
                    </label>
                    <select
                      value={formData.expected_contestants}
                      onChange={(e) => updateField('expected_contestants', e.target.value)}
                      className="form-input form-select"
                    >
                      <option value="">Select…</option>
                      {EXPECTED_CONTESTANTS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <Calendar size={14} />
                      Launch Timeframe
                    </label>
                    <select
                      value={formData.target_launch_timeframe}
                      onChange={(e) =>
                        updateField('target_launch_timeframe', e.target.value)
                      }
                      className="form-input form-select"
                    >
                      <option value="">Select…</option>
                      {LAUNCH_TIMEFRAME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <DollarSign size={14} />
                    {type === INTEREST_TYPE.SPONSORING
                      ? 'Sponsorship Budget'
                      : 'Production Budget'}
                  </label>
                  <select
                    value={formData.budget_range}
                    onChange={(e) => updateField('budget_range', e.target.value)}
                    className="form-input form-select"
                  >
                    <option value="">Select a range…</option>
                    {BUDGET_RANGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {type === INTEREST_TYPE.HOSTING && (
                  <>
                    <div className="form-group">
                      <span className="form-label">Do you have a venue secured?</span>
                      <div className="form-pill-group" role="radiogroup">
                        {['yes', 'no', 'unsure'].map((val) => (
                          <button
                            type="button"
                            key={val}
                            role="radio"
                            aria-checked={formData.has_venue === val}
                            className={`form-pill ${
                              formData.has_venue === val ? 'is-active' : ''
                            }`}
                            onClick={() => updateField('has_venue', val)}
                          >
                            {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not yet'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <span className="form-label">
                        Do you already have an audience or community?
                      </span>
                      <div className="form-pill-group" role="radiogroup">
                        {['yes', 'no', 'unsure'].map((val) => (
                          <button
                            type="button"
                            key={val}
                            role="radio"
                            aria-checked={formData.has_audience === val}
                            className={`form-pill ${
                              formData.has_audience === val ? 'is-active' : ''
                            }`}
                            onClick={() => updateField('has_audience', val)}
                          >
                            {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Building it'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">
                    <MessageSquare size={14} />
                    Goals & anything else we should know
                  </label>
                  <textarea
                    value={formData.goals}
                    onChange={(e) => updateField('goals', e.target.value)}
                    placeholder={
                      type === INTEREST_TYPE.SPONSORING
                        ? 'What does success look like for your brand?'
                        : 'What are you hoping to accomplish with this competition?'
                    }
                    rows={3}
                    className="form-input form-textarea"
                  />
                </div>
              </>
            )}

            {error && <div className="form-error">{error}</div>}

            <div className="interest-actions">
              {isOnboarding && step === 2 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}

              {step < totalSteps ? (
                <button type="submit" className="btn btn-primary btn-full">
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader size={16} className="loading-spinner" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              )}
            </div>

            <p className="form-disclaimer">
              By submitting, you agree to be contacted about this competition.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InterestModal;

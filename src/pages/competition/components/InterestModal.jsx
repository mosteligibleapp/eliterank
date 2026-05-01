import { useState } from 'react';
import { X, Check, Loader, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { INTEREST_TYPE, INTEREST_TYPE_CONFIG } from '../../../types/competition';

/**
 * Simplified interest form modal for a specific interest type
 * @param {string} type - Interest type (competing, hosting, sponsoring, fan)
 * @param {object} competition - Competition object
 * @param {function} onClose - Close handler
 */
export function InterestModal({ type, competition, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const config = INTEREST_TYPE_CONFIG[type] || {};
  const isDemoMode = !isSupabaseConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Demo mode - just show success
    if (isDemoMode) {
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 1000);
      return;
    }

    try {
      const { error: submitError } = await supabase
        .from('interest_submissions')
        .insert({
          competition_id: competition?.id || null,
          interest_type: type,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          message: formData.message.trim() || null,
          city: competition?.city || null,
          status: 'pending',
        });

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
              Your interest has been submitted. We'll be in touch soon with more details.
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-interest" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="interest-form">
          {/* Header */}
          <div className="interest-header">
            <h3>{config.label || 'Express Interest'}</h3>
            <p>{config.description}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="form-group">
              <label className="form-label">
                <User size={14} />
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
                className="form-input"
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
                className="form-input"
                required
              />
            </div>

            {/* Phone - only for hosting/sponsoring */}
            {(type === INTEREST_TYPE.HOSTING || type === INTEREST_TYPE.SPONSORING) && (
              <div className="form-group">
                <label className="form-label">
                  <Phone size={14} />
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="form-input"
                />
              </div>
            )}

            {/* Message - only for hosting/sponsoring/competing */}
            {type !== INTEREST_TYPE.FAN && (
              <div className="form-group">
                <label className="form-label">
                  <MessageSquare size={14} />
                  Tell us about yourself (optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={
                    type === INTEREST_TYPE.COMPETING
                      ? "Why do you think you're the most eligible?"
                      : type === INTEREST_TYPE.HOSTING
                      ? "Tell us about your experience with events..."
                      : type === INTEREST_TYPE.SPONSORING
                      ? "Tell us about your business or brand..."
                      : "Any questions or comments?"
                  }
                  rows={3}
                  className="form-input form-textarea"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            {/* Submit Button */}
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

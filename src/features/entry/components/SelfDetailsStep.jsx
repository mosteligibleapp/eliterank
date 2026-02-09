import React from 'react';
import { Mail, Phone, Instagram } from 'lucide-react';

/**
 * Self-entry details: name, birthday, email, phone, instagram
 */
export default function SelfDetailsStep({
  data,
  onChange,
  onNext,
  error,
}) {
  const handleChange = (field) => (e) => {
    onChange({ [field]: e.target.value });
  };

  const hasEmail = data.email.trim() && data.email.includes('@');
  const hasPhone = data.phone.trim().length > 0;
  const hasContact = hasEmail || hasPhone;

  const isValid =
    data.firstName.trim() &&
    data.lastName.trim() &&
    hasContact &&
    data.age &&
    parseInt(data.age, 10) >= 18;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) onNext();
  };

  return (
    <form className="entry-step entry-step-details" onSubmit={handleSubmit}>
      <h2 className="entry-step-title">Your details</h2>
      <p className="entry-step-subtitle">Tell us about yourself</p>

      <div className="entry-form-row">
        <div className="entry-form-field">
          <label className="entry-label">First Name *</label>
          <input
            type="text"
            className="entry-input"
            value={data.firstName}
            onChange={handleChange('firstName')}
            placeholder="First name"
            autoComplete="given-name"
          />
        </div>
        <div className="entry-form-field">
          <label className="entry-label">Last Name *</label>
          <input
            type="text"
            className="entry-input"
            value={data.lastName}
            onChange={handleChange('lastName')}
            placeholder="Last name"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Age *</label>
        <input
          type="number"
          className="entry-input"
          value={data.age}
          onChange={handleChange('age')}
          placeholder="Your age"
          min="18"
          max="99"
          inputMode="numeric"
        />
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Email {!hasPhone ? '*' : ''}</label>
        <div className="entry-input-icon">
          <Mail size={18} />
          <input
            type="email"
            className="entry-input"
            value={data.email}
            onChange={handleChange('email')}
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Phone {!hasEmail ? '*' : ''}</label>
        <div className="entry-input-icon">
          <Phone size={18} />
          <input
            type="tel"
            className="entry-input"
            value={data.phone}
            onChange={handleChange('phone')}
            placeholder="(555) 555-5555"
            autoComplete="tel"
          />
        </div>
      </div>

      {!hasContact && (
        <p className="entry-hint">Email or phone is required</p>
      )}

      <div className="entry-form-field">
        <label className="entry-label">Instagram</label>
        <div className="entry-input-icon">
          <Instagram size={18} />
          <input
            type="text"
            className="entry-input"
            value={data.instagram}
            onChange={(e) =>
              onChange({ instagram: e.target.value.replace('@', '') })
            }
            placeholder="username"
          />
        </div>
      </div>

      {error && <p className="entry-error">{error}</p>}

      <button
        type="submit"
        className="entry-btn-primary"
        disabled={!isValid}
      >
        Continue
      </button>
    </form>
  );
}

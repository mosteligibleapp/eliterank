import React, { useRef } from 'react';
import { Instagram, Camera, X, Mail, Phone } from 'lucide-react';

const RELATIONSHIPS = [
  { id: 'friend', label: 'Friend' },
  { id: 'coworker', label: 'Coworker' },
  { id: 'family', label: 'Family' },
  { id: 'other', label: "They don't know me yet" },
];

/**
 * Nomination: nominee info (name, instagram, age, relationship, optional photo)
 */
export default function NomineeInfoStep({
  data,
  onChange,
  onNext,
  error,
}) {
  const inputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      alert('Photo must be under 4.5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onChange({ photoFile: file, photoPreview: previewUrl });
  };

  const hasContact = (data.email && data.email.trim()) || (data.phone && data.phone.trim());
  const isValid = data.name.trim() && hasContact;

  return (
    <div className="entry-step entry-step-nominee">
      <h2 className="entry-step-title">Who are you nominating?</h2>
      <p className="entry-step-subtitle">Tell us about them</p>

      {/* Optional photo */}
      <div className="entry-nominee-photo-row">
        {data.photoPreview ? (
          <div className="entry-nominee-photo-thumb">
            <img src={data.photoPreview} alt="Nominee" />
            <button
              className="entry-photo-remove-sm"
              onClick={() => onChange({ photoFile: null, photoPreview: '' })}
              type="button"
              aria-label="Remove photo"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            className="entry-nominee-photo-add"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Camera size={20} />
          </button>
        )}
        <span className="entry-nominee-photo-label">
          {data.photoPreview ? 'Photo added' : 'Add their photo (optional)'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="entry-photo-input"
        />
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Their Name *</label>
        <input
          type="text"
          className="entry-input"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Full name"
        />
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Their Email {!data.phone?.trim() ? '*' : ''}</label>
        <div className="entry-input-icon">
          <Mail size={18} />
          <input
            type="email"
            className="entry-input"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div className="entry-form-field">
        <label className="entry-label">Their Phone {!data.email?.trim() ? '*' : ''}</label>
        <div className="entry-input-icon">
          <Phone size={18} />
          <input
            type="tel"
            className="entry-input"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="(555) 555-5555"
            inputMode="tel"
          />
        </div>
      </div>

      {!hasContact && (
        <p className="entry-hint">Email or phone is required so we can reach them</p>
      )}

      <div className="entry-form-field">
        <label className="entry-label">Instagram Handle</label>
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

      <div className="entry-form-field">
        <label className="entry-label">Their Age</label>
        <input
          type="number"
          className="entry-input"
          value={data.age}
          onChange={(e) => onChange({ age: e.target.value })}
          placeholder="Age"
          min="18"
          max="99"
          inputMode="numeric"
        />
      </div>

      {/* Relationship chips */}
      <div className="entry-form-field">
        <label className="entry-label">How do you know them?</label>
        <div className="entry-chips">
          {RELATIONSHIPS.map((rel) => (
            <button
              key={rel.id}
              type="button"
              className={`entry-chip ${data.relationship === rel.id ? 'active' : ''}`}
              onClick={() =>
                onChange({
                  relationship: data.relationship === rel.id ? '' : rel.id,
                })
              }
            >
              {rel.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="entry-error">{error}</p>}

      <button
        className="entry-btn-primary"
        disabled={!isValid}
        onClick={onNext}
      >
        Continue
      </button>
    </div>
  );
}

import React, { useRef } from 'react';
import { Instagram, Camera, X, Mail } from 'lucide-react';

/**
 * Nomination: nominee info (name, email, instagram, optional photo)
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

    if (file.size > 20 * 1024 * 1024) {
      alert('Photo must be under 20MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onChange({ photoFile: file, photoPreview: previewUrl });
  };

  const isValid = data.name.trim() && data.email?.trim();

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
        <label className="entry-label">Their Email *</label>
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

      {error && <p className="entry-error">{error}</p>}

      <button
        className="entry-btn-primary"
        disabled={!isValid}
        onClick={onNext}
      >
        Continue
      </button>

      <button
        type="button"
        className="entry-link-btn"
        onClick={() => {
          const url = `${window.location.origin}${window.location.pathname}`;
          const msg = `Nominations are open for Most Eligible Bachelorettes! Enter at this link: ${url}`;
          if (navigator.share) {
            navigator.share({ text: msg }).catch(() => {});
          } else {
            window.location.href = `sms:&body=${encodeURIComponent(msg)}`;
          }
        }}
      >
        Don't know their email? Send them the link instead
      </button>
    </div>
  );
}

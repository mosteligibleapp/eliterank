import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';

/**
 * Photo upload step for self-entry (required) or nomination (optional)
 */
export default function PhotoUpload({
  photoPreview,
  onPhotoSelect,
  onRemovePhoto,
  onNext,
  required = true,
}) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
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
    onPhotoSelect(file, previewUrl);
  };

  const hasPhoto = !!photoPreview;

  return (
    <div className="entry-step entry-step-photo">
      <h2 className="entry-step-title">Add your best photo</h2>
      <p className="entry-step-subtitle">
        This will be your competition profile picture
      </p>

      <div className="entry-photo-area">
        {hasPhoto ? (
          <div className="entry-photo-preview">
            <img
              src={photoPreview}
              alt="Preview"
              className="entry-photo-img"
            />
            <button
              className="entry-photo-remove"
              onClick={onRemovePhoto}
              type="button"
              aria-label="Remove photo"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            className="entry-photo-upload"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Camera size={40} />
            <span>Tap to upload</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="entry-photo-input"
        />

        {hasPhoto && (
          <button
            className="entry-photo-change"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            Change photo
          </button>
        )}
      </div>

      <button
        className="entry-btn-primary"
        disabled={required && !hasPhoto}
        onClick={onNext}
      >
        {hasPhoto ? 'Looks great — continue' : required ? 'Upload a photo to continue' : 'Skip for now'}
      </button>
    </div>
  );
}

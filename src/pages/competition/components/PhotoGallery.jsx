import { useState, useCallback, useEffect } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { transformSupabaseImage } from '../../../lib/storageImage';

/**
 * PhotoGallery — competition photo gallery shown on the results page.
 * A responsive thumbnail grid that opens a full-screen lightbox on click.
 * Renders nothing when the competition has no photos.
 */
export function PhotoGallery() {
  const { photos } = usePublicCompetition();
  const [activeIndex, setActiveIndex] = useState(null);

  const hasPhotos = Array.isArray(photos) && photos.length > 0;

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(
    (e) => {
      e?.stopPropagation();
      setActiveIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    },
    [photos]
  );
  const showNext = useCallback(
    (e) => {
      e?.stopPropagation();
      setActiveIndex((i) => (i === null ? null : (i + 1) % photos.length));
    },
    [photos]
  );

  // Keyboard navigation while the lightbox is open.
  useEffect(() => {
    if (activeIndex === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') showPrev();
      else if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, close, showPrev, showNext]);

  if (!hasPhotos) return null;

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <div className="competition-gallery">
      <div className="competition-section-header">
        <Camera size={20} className="competition-section-icon" />
        <h2 className="competition-section-title">Photos</h2>
      </div>

      <div className="competition-gallery-grid">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className="competition-gallery-thumb"
            onClick={() => setActiveIndex(index)}
            aria-label={photo.caption || `Photo ${index + 1}`}
          >
            <img
              src={transformSupabaseImage(photo.image_url, { width: 400, height: 400 })}
              alt={photo.caption || `Competition photo ${index + 1}`}
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activePhoto && (
        <div className="competition-lightbox" onClick={close} role="dialog" aria-modal="true">
          <button className="competition-lightbox-close" onClick={close} aria-label="Close">
            <X size={24} />
          </button>

          {photos.length > 1 && (
            <button
              className="competition-lightbox-nav competition-lightbox-prev"
              onClick={showPrev}
              aria-label="Previous photo"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <figure className="competition-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img
              src={transformSupabaseImage(activePhoto.image_url, { width: 1200 })}
              alt={activePhoto.caption || 'Competition photo'}
            />
            {activePhoto.caption && (
              <figcaption className="competition-lightbox-caption">{activePhoto.caption}</figcaption>
            )}
          </figure>

          {photos.length > 1 && (
            <button
              className="competition-lightbox-nav competition-lightbox-next"
              onClick={showNext}
              aria-label="Next photo"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PhotoGallery;

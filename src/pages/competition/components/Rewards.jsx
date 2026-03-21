import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Crown, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

// Default rewards when no prizes are uploaded by the host
const DEFAULT_REWARDS = [
  {
    icon: DollarSign,
    title: 'Cash',
    description: 'Cash Prize for 1st Place - $1,000 minimum.',
  },
  {
    icon: Crown,
    title: 'Title',
    description: 'Winners hold the title for one year, with media features and exposure opportunities.',
  },
  {
    icon: Gift,
    title: 'Sponsored Prizes',
    description: 'Diamond necklaces, beauty products, and more — courtesy of our sponsors.',
  },
];

const AUTO_ROTATE_INTERVAL = 4000;

/**
 * Rewards display component
 * Shows a rotating carousel of prizes uploaded by the host,
 * or falls back to static default reward cards.
 */
export function Rewards() {
  const { prizes } = usePublicCompetition();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const hasPrizes = prizes && prizes.length > 0;
  const totalPrizes = hasPrizes ? prizes.length : 0;

  const goTo = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [isTransitioning]);

  const goNext = useCallback(() => {
    if (totalPrizes <= 1) return;
    goTo((currentIndex + 1) % totalPrizes);
  }, [currentIndex, totalPrizes, goTo]);

  const goPrev = useCallback(() => {
    if (totalPrizes <= 1) return;
    goTo((currentIndex - 1 + totalPrizes) % totalPrizes);
  }, [currentIndex, totalPrizes, goTo]);

  // Auto-rotate
  useEffect(() => {
    if (!hasPrizes || totalPrizes <= 1 || isPaused) return;
    const timer = setInterval(goNext, AUTO_ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [hasPrizes, totalPrizes, isPaused, goNext]);

  // Static fallback — same as before
  if (!hasPrizes) {
    return (
      <div className="rewards-section">
        <div className="rewards-header">
          <h3 className="rewards-title">Rewards</h3>
        </div>
        <div className="rewards-grid">
          {DEFAULT_REWARDS.map((reward) => (
            <div key={reward.title} className="reward-card">
              <div className="reward-icon">
                <reward.icon size={24} />
              </div>
              <h4 className="reward-name">{reward.title}</h4>
              <p className="reward-description">{reward.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentPrize = prizes[currentIndex];

  return (
    <div
      className="rewards-section rewards-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="rewards-header">
        <h3 className="rewards-title">Rewards</h3>
        {totalPrizes > 1 && (
          <span className="rewards-counter">
            {currentIndex + 1} / {totalPrizes}
          </span>
        )}
      </div>

      <div className="rewards-carousel-viewport">
        {totalPrizes > 1 && (
          <button
            className="rewards-carousel-arrow rewards-carousel-arrow-left"
            onClick={goPrev}
            aria-label="Previous prize"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <div className={`rewards-carousel-slide ${isTransitioning ? 'rewards-slide-transitioning' : ''}`}>
          {currentPrize.image_url ? (
            <div className="rewards-prize-image-wrap">
              <img
                src={currentPrize.image_url}
                alt={currentPrize.title}
                className="rewards-prize-image"
              />
            </div>
          ) : (
            <div className="reward-icon reward-icon-large">
              <Gift size={32} />
            </div>
          )}
          <h4 className="reward-name reward-name-featured">{currentPrize.title}</h4>
          {currentPrize.description && (
            <p className="reward-description">{currentPrize.description}</p>
          )}
          {currentPrize.value && (
            <span className="rewards-value">
              ${Number(currentPrize.value).toLocaleString()}
            </span>
          )}
        </div>

        {totalPrizes > 1 && (
          <button
            className="rewards-carousel-arrow rewards-carousel-arrow-right"
            onClick={goNext}
            aria-label="Next prize"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {totalPrizes > 1 && (
        <div className="rewards-carousel-dots">
          {prizes.map((_, i) => (
            <button
              key={i}
              className={`rewards-dot ${i === currentIndex ? 'rewards-dot-active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to prize ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Rewards;

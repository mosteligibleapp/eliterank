import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Share2,
  Loader,
  ImagePlus,
  Trophy,
  Star,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useAchievementCards } from './useAchievementCards';
import {
  generateAchievementCard,
  getAdvancementTitle,
  getPlacementTitle,
} from './generateAchievementCard';
import './MyCardsSection.css';

/**
 * MyCardsSection - UI for contestants to view and generate achievement cards
 * 
 * Shows:
 * - Available cards they can generate based on current status
 * - Previously generated cards
 * - Download/share actions
 */
export default function MyCardsSection({
  contestant,
  competition,
  organization,
  votingRounds = [],
  onClose,
}) {
  const {
    cards,
    loading,
    generating,
    error,
    fetchCards,
    generateCard,
    downloadCard,
    shareCard,
  } = useAchievementCards(contestant?.id);

  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'saved'
  const [generatingType, setGeneratingType] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch existing cards on mount
  useEffect(() => {
    if (contestant?.id) {
      fetchCards();
    }
  }, [contestant?.id, fetchCards]);

  // Determine which cards are available based on contestant status
  const availableCards = useMemo(() => {
    if (!contestant) return [];

    const cardOptions = [];
    const status = contestant.status || 'active';
    const currentRound = contestant.current_round || 1;
    const rank = contestant.rank;

    // Always available: Nominated card
    cardOptions.push({
      type: 'nominated',
      title: 'NOMINATED',
      description: 'Share that you\'ve been nominated!',
      icon: <Sparkles size={24} />,
    });

    // If approved/active: Contestant card
    if (status === 'active' || status === 'winner') {
      cardOptions.push({
        type: 'contestant',
        title: 'COMPETING',
        description: 'Let everyone know you\'re officially competing',
        icon: <Star size={24} />,
      });
    }

    // If advanced past round 1: Show advancement cards
    if (currentRound > 1 && status === 'active') {
      // Find the round they advanced to
      const advancedToRound = votingRounds.find(r => r.round_order === currentRound);
      const advanceCount = advancedToRound?.contestants_advance;
      
      if (advanceCount) {
        cardOptions.push({
          type: 'advanced',
          customTitle: getAdvancementTitle(advanceCount),
          title: getAdvancementTitle(advanceCount),
          description: `You made it to the ${advancedToRound?.title || `Round ${currentRound}`}!`,
          icon: <Trophy size={24} />,
        });
      }
    }

    // If finalist (last round)
    const finalRound = votingRounds[votingRounds.length - 1];
    if (finalRound && currentRound === finalRound.round_order && status === 'active') {
      cardOptions.push({
        type: 'finalist',
        title: 'FINALIST',
        description: 'You\'re in the finals!',
        icon: <Trophy size={24} />,
      });
    }

    // If winner
    if (status === 'winner' && rank) {
      cardOptions.push({
        type: rank === 1 ? 'winner' : 'placement',
        customTitle: rank === 1 ? undefined : getPlacementTitle(rank),
        title: rank === 1 ? 'WINNER' : getPlacementTitle(rank),
        description: rank === 1 ? 'You won! Share your victory!' : `You placed ${rank}${rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'}!`,
        icon: <Trophy size={24} />,
        rank,
      });
    }

    return cardOptions;
  }, [contestant, votingRounds]);

  // Generate preview for a card type
  const generatePreview = async (cardOption) => {
    setPreviewLoading(true);
    setPreviewUrl(null);

    try {
      const blob = await generateAchievementCard({
        achievementType: cardOption.type,
        customTitle: cardOption.customTitle,
        name: contestant?.name,
        photoUrl: contestant?.avatar_url,
        handle: contestant?.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city}`,
        season: competition?.season?.toString(),
        organizationName: organization?.name || 'Most Eligible',
        organizationLogoUrl: organization?.logo_url,
        accentColor: competition?.theme_primary || '#d4af37',
        voteUrl: competition?.slug ? `mosteligible.co/${competition.slug}` : 'mosteligible.co',
        rank: cardOption.rank,
      });

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview generation failed:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle generate and save
  const handleGenerate = async (cardOption) => {
    setGeneratingType(cardOption.type);

    try {
      await generateCard({
        achievementType: cardOption.type,
        customTitle: cardOption.customTitle,
        contestant,
        competition,
        organization,
        rank: cardOption.rank,
      });

      // Switch to saved tab to show the new card
      setActiveTab('saved');
    } catch (err) {
      console.error('Card generation failed:', err);
    } finally {
      setGeneratingType(null);
    }
  };

  // Handle share
  const handleShare = async (imageUrl) => {
    try {
      const result = await shareCard(imageUrl);
      setShareStatus(result);
      setTimeout(() => setShareStatus(null), 2000);
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Quick download from preview
  const handleQuickDownload = async (cardOption) => {
    setGeneratingType(cardOption.type);

    try {
      const blob = await generateAchievementCard({
        achievementType: cardOption.type,
        customTitle: cardOption.customTitle,
        name: contestant?.name,
        photoUrl: contestant?.avatar_url,
        handle: contestant?.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city}`,
        season: competition?.season?.toString(),
        organizationName: organization?.name || 'Most Eligible',
        organizationLogoUrl: organization?.logo_url,
        accentColor: competition?.theme_primary || '#d4af37',
        voteUrl: competition?.slug ? `mosteligible.co/${competition.slug}` : 'mosteligible.co',
        rank: cardOption.rank,
      });

      // Download directly
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cardOption.type}-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setGeneratingType(null);
    }
  };

  return (
    <div className="my-cards-section">
      {/* Header */}
      <div className="my-cards-header">
        <div className="my-cards-title">
          <ImagePlus size={24} />
          <h2>Share Cards</h2>
        </div>
        {onClose && (
          <button className="my-cards-close" onClick={onClose}>
            <X size={24} />
          </button>
        )}
      </div>

      <p className="my-cards-subtitle">
        Download shareable cards to promote yourself on social media
      </p>

      {/* Tabs */}
      <div className="my-cards-tabs">
        <button
          className={`my-cards-tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          Create New
        </button>
        <button
          className={`my-cards-tab ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved ({cards.length})
        </button>
      </div>

      {/* Content */}
      <div className="my-cards-content">
        {activeTab === 'generate' ? (
          <div className="my-cards-generate">
            {availableCards.length === 0 ? (
              <div className="my-cards-empty">
                <Sparkles size={32} />
                <p>No cards available yet</p>
              </div>
            ) : (
              <div className="my-cards-options">
                {availableCards.map((cardOption) => (
                  <div key={cardOption.type} className="card-option">
                    <div className="card-option-icon">{cardOption.icon}</div>
                    <div className="card-option-info">
                      <h3>{cardOption.title}</h3>
                      <p>{cardOption.description}</p>
                    </div>
                    <div className="card-option-actions">
                      <button
                        className="card-option-btn card-option-btn--download"
                        onClick={() => handleQuickDownload(cardOption)}
                        disabled={generatingType === cardOption.type}
                      >
                        {generatingType === cardOption.type ? (
                          <Loader size={18} className="spinning" />
                        ) : (
                          <Download size={18} />
                        )}
                      </button>
                      <button
                        className="card-option-btn card-option-btn--save"
                        onClick={() => handleGenerate(cardOption)}
                        disabled={generatingType === cardOption.type}
                      >
                        {generatingType === cardOption.type ? (
                          <Loader size={18} className="spinning" />
                        ) : (
                          <ImagePlus size={18} />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="my-cards-saved">
            {loading ? (
              <div className="my-cards-loading">
                <Loader size={32} className="spinning" />
                <p>Loading cards...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="my-cards-empty">
                <ImagePlus size={32} />
                <p>No saved cards yet</p>
                <button
                  className="my-cards-empty-btn"
                  onClick={() => setActiveTab('generate')}
                >
                  Create your first card
                </button>
              </div>
            ) : (
              <div className="my-cards-grid">
                {cards.map((card) => (
                  <div key={card.id} className="saved-card">
                    <img
                      src={card.image_url}
                      alt={card.achievement_type}
                      className="saved-card-image"
                    />
                    <div className="saved-card-overlay">
                      <button
                        className="saved-card-btn"
                        onClick={() => downloadCard(card.image_url, `${card.achievement_type}-card.png`)}
                      >
                        <Download size={18} />
                      </button>
                      <button
                        className="saved-card-btn"
                        onClick={() => handleShare(card.image_url)}
                      >
                        {shareStatus === 'shared' || shareStatus === 'copied' ? (
                          <Check size={18} />
                        ) : (
                          <Share2 size={18} />
                        )}
                      </button>
                    </div>
                    <div className="saved-card-label">
                      {card.custom_title || card.achievement_type.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="my-cards-error">
          <p>{error}</p>
          <button onClick={fetchCards}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

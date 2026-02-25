import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Vote,
  Users,
  Share2,
  Calendar,
  Star,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
  Target,
  MessageCircle,
  Camera,
  Heart,
  Zap,
  Gift,
  Clock,
} from 'lucide-react';
import './ContestantGuide.css';

/**
 * ContestantGuide - Dynamic onboarding/learning center for contestants
 * 
 * Modes:
 * - splash: Post-entry welcome flow with step-through screens
 * - page: Full learning center accessible from profile dropdown
 * 
 * All content is dynamically generated based on competition configuration.
 */
export default function ContestantGuide({
  competition,
  votingRounds = [],
  prizePool,
  about,
  phase,
  mode = 'splash', // 'splash' | 'page'
  onComplete,
  onClose,
}) {
  const [currentStep, setCurrentStep] = useState(0);

  // Generate dynamic content based on competition
  const content = useMemo(() => {
    return generateGuideContent({
      competition,
      votingRounds,
      prizePool,
      about,
      phase,
    });
  }, [competition, votingRounds, prizePool, about, phase]);

  const totalSteps = content.sections.length;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  // Splash mode - step-through screens
  if (mode === 'splash') {
    const section = content.sections[currentStep];
    const isLastStep = currentStep === totalSteps - 1;

    return (
      <div className="contestant-guide contestant-guide--splash">
        <div className="guide-splash-container">
          {/* Skip button */}
          <button className="guide-skip-btn" onClick={handleSkip}>
            Skip
          </button>

          {/* Progress dots */}
          <div className="guide-progress">
            {content.sections.map((_, idx) => (
              <span
                key={idx}
                className={`guide-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="guide-splash-content" key={currentStep}>
            <div className="guide-icon-wrap">
              {section.icon}
            </div>
            <h2 className="guide-title">{section.title}</h2>
            <p className="guide-subtitle">{section.subtitle}</p>
            
            <div className="guide-points">
              {section.points.map((point, idx) => {
                const isNested = typeof point === 'object' && point.subpoints;
                return (
                  <div key={idx}>
                    <div className="guide-point">
                      <CheckCircle size={18} className="guide-point-icon" />
                      <span>{isNested ? point.text : point}</span>
                    </div>
                    {isNested && (
                      <div className="guide-subpoints">
                        {point.subpoints.map((sub, sIdx) => (
                          <div key={sIdx} className="guide-subpoint">
                            <span className="guide-subpoint-dash">—</span>
                            <span>{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {section.tip && (
              <div className="guide-tip">
                <Sparkles size={16} />
                <span>{section.tip}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="guide-nav">
            {currentStep > 0 && (
              <button className="guide-nav-btn guide-nav-btn--back" onClick={handleBack}>
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            <button className="guide-nav-btn guide-nav-btn--next" onClick={handleNext}>
              {isLastStep ? "Let's Go!" : 'Next'}
              {!isLastStep && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Page mode - full learning center
  return (
    <div className="contestant-guide contestant-guide--page">
      {onClose && (
        <button className="guide-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
      )}

      <header className="guide-page-header">
        <div className="guide-page-icon">
          <Trophy size={32} />
        </div>
        <h1>{content.welcomeTitle}</h1>
        <p>{content.welcomeSubtitle}</p>
      </header>

      <div className="guide-sections">
        {content.sections.map((section, idx) => (
          <section key={idx} className="guide-section">
            <div className="guide-section-header">
              <div className="guide-section-icon">{section.icon}</div>
              <div>
                <h2>{section.title}</h2>
                <p>{section.subtitle}</p>
              </div>
            </div>

            <ul className="guide-section-list">
              {section.points.map((point, pIdx) => {
                const isNested = typeof point === 'object' && point.subpoints;
                return (
                  <li key={pIdx}>
                    <div className="guide-section-list-item">
                      <CheckCircle size={16} />
                      <span>{isNested ? point.text : point}</span>
                    </div>
                    {isNested && (
                      <ul className="guide-section-sublist">
                        {point.subpoints.map((sub, sIdx) => (
                          <li key={sIdx}>{sub}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            {section.tip && (
              <div className="guide-section-tip">
                <Sparkles size={16} />
                <span>{section.tip}</span>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Quick reference card */}
      <div className="guide-quick-ref">
        <h3>Quick Reference</h3>
        <div className="guide-quick-grid">
          {content.quickFacts.map((fact, idx) => (
            <div key={idx} className="guide-quick-item">
              {fact.icon}
              <span className="guide-quick-label">{fact.label}</span>
              <span className="guide-quick-value">{fact.value}</span>
            </div>
          ))}
        </div>
      </div>

      {onComplete && (
        <button className="guide-done-btn" onClick={onComplete}>
          Got It!
        </button>
      )}
    </div>
  );
}

/**
 * Generate dynamic guide content based on competition configuration
 */
function generateGuideContent({ competition, votingRounds = [], prizePool, about, phase }) {
  const competitionName = competition?.name || 'the competition';
  const cityName = competition?.city || 'your city';
  const pricePerVote = competition?.price_per_vote || 1;
  const numWinners = competition?.number_of_winners || 5;
  const prizeMinimum = prizePool?.minimum || competition?.prize_pool_minimum || 1000;
  const currentPrize = prizePool?.total || prizeMinimum;
  
  // Count rounds from actual data
  const rounds = votingRounds || [];
  const votingOnlyRounds = rounds.filter(r => r.round_type === 'voting');
  // Use voting-type rounds if they exist, otherwise count all non-judging rounds
  const votingRoundCount = votingOnlyRounds.length || rounds.filter(r => r.round_type !== 'judging').length || rounds.length;
  const hasResurrection = rounds.some(r =>
    r.round_type === 'resurrection' || r.title?.toLowerCase().includes('resurrection')
  );

  // Determine what phase we're in for context
  const isVotingPhase = phase?.isVoting;
  const isNominationPhase = phase?.phase === 'nominations';

  // Build round advancement details from actual data
  const roundDetails = rounds
    .filter(r => r.round_type !== 'judging')
    .sort((a, b) => (a.round_order || 0) - (b.round_order || 0))
    .map((r, i) => {
      const label = r.title || `Round ${i + 1}`;
      const advance = r.contestants_advance ? ` — Top ${r.contestants_advance} advance` : '';
      return `${label}${advance}`;
    });

  const sections = [
    // Section 1: Welcome / How It Works
    {
      icon: <Trophy size={48} className="guide-icon guide-icon--gold" />,
      title: 'Welcome to the Competition!',
      subtitle: `Here's how ${competitionName} works`,
      points: [
        `Compete against other contestants from ${cityName}`,
        votingRoundCount > 0
          ? {
              text: `${votingRoundCount} voting round${votingRoundCount !== 1 ? 's' : ''} with eliminations each round`,
              subpoints: roundDetails.length > 0 ? roundDetails : undefined,
            }
          : 'Multiple voting rounds with eliminations each round',
        `Top ${numWinners} finishers win prizes — 1st place takes home cash`,
        hasResurrection ? 'Resurrection round gives eliminated contestants a second chance!' : 'Every vote counts toward your ranking',
      ].filter(Boolean),
      tip: 'The more votes you get, the higher you rank. Top performers advance to the next round!',
    },

    // Section 2: How Voting Works
    {
      icon: <Vote size={48} className="guide-icon guide-icon--pink" />,
      title: 'How Voting Works',
      subtitle: 'Understanding votes is key to winning',
      points: [
        'Anyone can vote for you — once per day for FREE',
        'Free votes reset at midnight (local time)',
        `Supporters can buy extra votes ($${pricePerVote.toFixed(2)} each)`,
        'Paid votes count immediately and never expire',
        'Vote totals reset to zero at the start of each new round',
      ],
      tip: 'Remind your supporters to vote daily — those free votes add up fast!',
    },

    // Section 3: How to Get Votes
    {
      icon: <Share2 size={48} className="guide-icon guide-icon--blue" />,
      title: 'How to Get Votes',
      subtitle: 'Rally your network to climb the leaderboard',
      points: [
        'Share your profile link on social media (Instagram, TikTok, etc.)',
        'Ask friends and family to vote daily',
        'Post stories and remind people when voting rounds start',
        'Engage with the community — voters support active contestants',
        'Use your shareable card to stand out',
      ],
      tip: 'Contestants who share consistently get 3-5x more votes on average!',
    },

    // Section 4: Tips for Success
    {
      icon: <Star size={48} className="guide-icon guide-icon--purple" />,
      title: 'Tips for Success',
      subtitle: 'What winning contestants do differently',
      points: [
        'Complete your profile with a great photo and bio',
        'Be active — post updates, engage with voters',
        'Create a sense of urgency near round deadlines',
        "Thank your voters publicly — they'll keep coming back",
        'Watch the leaderboard and push harder when you need to',
      ],
      tip: "Don't wait until the last day — steady daily votes beat last-minute pushes!",
    },

    // Section 5: Prize Pool
    {
      icon: <Gift size={48} className="guide-icon guide-icon--green" />,
      title: 'Prize Pool',
      subtitle: 'Real prizes. Real bragging rights.',
      points: [
        'All winners earn the title and hold it for one year',
        {
          text: '1st place takes home a cash prize',
          subpoints: [
            `$${prizeMinimum.toLocaleString()} guaranteed minimum — grows with every paid vote`,
            'Winner may keep the prize or donate to a verified 501(c)(3) of their choice',
            'Contestants donating to charity are encouraged to promote their cause throughout the competition',
          ],
        },
        `All ${numWinners} winners receive a sponsor prize package`,
      ],
      tip: `Current prize pool: $${currentPrize.toLocaleString()}+ — and growing!`,
    },
  ];

  // Quick facts for page mode
  const quickFacts = [
    {
      icon: <Clock size={20} />,
      label: 'Free Votes',
      value: '1/day per person',
    },
    {
      icon: <Vote size={20} />,
      label: 'Vote Price',
      value: `$${pricePerVote.toFixed(2)}`,
    },
    {
      icon: <TrendingUp size={20} />,
      label: 'Rounds',
      value: `${votingRoundCount} rounds`,
    },
    {
      icon: <Trophy size={20} />,
      label: 'Winners',
      value: `Top ${numWinners}`,
    },
    {
      icon: <Gift size={20} />,
      label: 'Min Prize',
      value: `$${prizeMinimum.toLocaleString()}`,
    },
    {
      icon: <Target size={20} />,
      label: 'Goal',
      value: 'Get the most votes!',
    },
  ];

  return {
    welcomeTitle: `How to Win ${competitionName}`,
    welcomeSubtitle: `Everything you need to know to compete and win in ${cityName}`,
    sections,
    quickFacts,
  };
}

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

          {/* Skip below nav */}
          <button className="guide-skip-btn guide-skip-btn--bottom" onClick={handleSkip}>
            Skip for now
          </button>
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

// 1 → "1st", 2 → "2nd", 21 → "21st", 11 → "11th", etc.
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Generate dynamic guide content based on competition configuration
 */
function generateGuideContent({ competition, votingRounds = [], prizePool, about, phase }) {
  const competitionName = competition?.name || 'the competition';
  const cityName = (competition?.city?.name || competition?.city || 'your city');
  const pricePerVote = Number(competition?.price_per_vote) || 1;
  const numWinners = competition?.number_of_winners || 5;
  const splitByGender = !!competition?.winners_split_by_gender;
  const judgesPctRaw = competition?.judges_score_weight_pct;
  const prizeMinimum = Number(prizePool?.minimum ?? competition?.prize_pool_minimum ?? 0);
  const currentPrize = Number(prizePool?.total ?? prizeMinimum);

  const rounds = votingRounds || [];
  const sorted = [...rounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));

  // The last entry is the "final" round (judging or otherwise); everything
  // before it is a regular voting round.
  const finalRound = sorted[sorted.length - 1] || null;
  const regularRounds = sorted.slice(0, -1);
  const numRegularRounds = regularRounds.length;
  const advanceToFinalists = regularRounds[regularRounds.length - 1]?.contestants_advance;
  const finalJudgePct = judgesPctRaw ?? finalRound?.judge_weight ?? 0;
  const half = (n) => Math.ceil(n / 2);

  const howItWorksPoints = [];
  if (numRegularRounds > 0) {
    howItWorksPoints.push(`The competition runs across ${numRegularRounds} ${numRegularRounds === 1 ? 'round' : 'rounds'}`);
    howItWorksPoints.push('A set number of contestants advances each round based on vote count, and votes reset at the start of every round');

    if (advanceToFinalists) {
      if (splitByGender) {
        howItWorksPoints.push(`After the ${ordinal(numRegularRounds)} round, the top ${advanceToFinalists} (${half(advanceToFinalists)} men and ${half(advanceToFinalists)} women) will advance as finalists`);
      } else {
        howItWorksPoints.push(`After the ${ordinal(numRegularRounds)} round, the top ${advanceToFinalists} will advance as finalists`);
      }
    }
  }

  const winnerGenderSuffix = splitByGender
    ? (numWinners === 2 ? ' (1 male and 1 female)' : ` (${half(numWinners)} male and ${half(numWinners)} female)`)
    : '';
  if (finalJudgePct > 0) {
    const votePct = 100 - finalJudgePct;
    howItWorksPoints.push(`In the final round, a mix of judge scores (${finalJudgePct}%) and vote count (${votePct}%) determines the ${numWinners} winners${winnerGenderSuffix}`);
  } else if (finalRound) {
    howItWorksPoints.push(`In the final round, the final vote count determines the ${numWinners} winner${numWinners === 1 ? '' : 's'}${winnerGenderSuffix}`);
  }

  if (competition?.crowning_text) {
    howItWorksPoints.push(competition.crowning_text);
  } else if (splitByGender && numWinners === 2) {
    howItWorksPoints.push('The 2 winners (1 male and 1 female) will be crowned and hold the title for one year');
  } else {
    howItWorksPoints.push(`The ${numWinners} winner${numWinners === 1 ? '' : 's'} will be crowned and hold the title for one year`);
  }

  const prizePoolPoints = [];
  if (splitByGender && numWinners === 2) {
    prizePoolPoints.push(`2 winners (1 male and 1 female) earn the title and prize package`);
  } else {
    prizePoolPoints.push(`${numWinners} winners earn the title and prize package`);
  }
  prizePoolPoints.push(`Winners receive a prize package from competition sponsors`);
  if (prizeMinimum > 0) {
    prizePoolPoints.push({
      text: `1st place receives a cash prize (min $${prizeMinimum.toLocaleString()})`,
      subpoints: [
        'Winner may keep the prize or donate to a verified 501(c)(3) of their choice',
      ],
    });
  }

  const sections = [
    // Section 1: How It Works
    {
      icon: <Trophy size={48} className="guide-icon guide-icon--gold" />,
      title: 'How It Works',
      subtitle: `Here's how ${competitionName} works`,
      points: howItWorksPoints,
      tip: 'The more votes you get, the higher you rank!',
    },

    // Section 2: Voting
    {
      icon: <Vote size={48} className="guide-icon guide-icon--pink" />,
      title: 'Voting',
      subtitle: 'Understanding votes is key to advancing',
      points: [
        'Fans can vote once daily for free, or purchase additional votes',
        `Additional votes can be purchased (not required) and are applied immediately to the contestant's vote count`,
        'Vote counts reset to zero at the start of each new round',
        'Keep an eye out for Double Vote Days — when they hit, every vote counts twice',
        'The host may upload simple Bonus Vote tasks for contestants to earn additional free votes (e.g., add your profile link to your Instagram bio)',
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
      points: prizePoolPoints,
      tip: prizeMinimum > 0 ? `Current cash prize: $${currentPrize.toLocaleString()}+` : null,
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
      value: `${numRegularRounds} rounds`,
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

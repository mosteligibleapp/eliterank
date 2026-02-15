import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { usePublicCompetition } from '../../contexts/PublicCompetitionContext';
import { useSupabaseAuth } from '../../hooks';
import { useEntryFlow } from './hooks/useEntryFlow';
import { getCompetitionTitle } from './utils/eligibilityEngine';

// Step components
import CompetitionBanner from './components/CompetitionBanner';
import ModeSelect from './components/ModeSelect';
import EligibilityStep from './components/EligibilityStep';
import PhotoUpload from './components/PhotoUpload';
import BuildCardDetailsStep from './components/BuildCardDetailsStep';
import SelfPitchStep from './components/SelfPitchStep';
import CreatePasswordStep from './components/CreatePasswordStep';
import NomineeInfoStep from './components/NomineeInfoStep';
import WhyNominateStep from './components/WhyNominateStep';
import NominatorInfoStep from './components/NominatorInfoStep';
import CardReveal from './components/CardReveal';

import './EntryFlow.css';

/**
 * EntryFlow - Gamified nomination/self-entry flow
 * Uses PublicCompetitionContext for competition data
 * Works for ANY competition - all content driven by competition data
 */
export default function EntryFlow() {
  const navigate = useNavigate();
  const { competition, loading, error, phase, orgSlug, competitionSlug } = usePublicCompetition();
  const { profile } = useSupabaseAuth();

  const flow = useEntryFlow(competition, profile);
  const flowRef = useRef(null);

  const competitionTitle = getCompetitionTitle(competition);

  // Scroll to top on step change to prevent layout jump
  useEffect(() => {
    if (flowRef.current) {
      flowRef.current.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [flow.currentStep]);

  // Handle back to competition page
  const handleBack = () => {
    if (flow.currentStep !== 'mode' && flow.currentStep !== 'card') {
      flow.back();
    } else {
      navigate(`/${orgSlug}/${competitionSlug}`);
    }
  };

  const handleDone = () => {
    navigate(`/${orgSlug}/${competitionSlug}`);
  };

  // Early persist after details step for self-entry
  const handleDetailsNext = async () => {
    try {
      await flow.persistSelfProgress('details');
      flow.next();
    } catch {
      // Error already set in hook — don't navigate
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="entry-flow">
        <div className="entry-loading">
          <div className="entry-spinner" />
          <p>Loading competition...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !competition) {
    return (
      <div className="entry-flow">
        <div className="entry-error-state">
          <AlertCircle size={48} />
          <h2>Competition Not Found</h2>
          <p>This competition doesn't exist or the URL is incorrect.</p>
          <button className="entry-btn-primary" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Nominations closed check
  const isNominationPhase = phase?.phase === 'nominations';
  const isComingSoon = phase?.phase === 'coming-soon';
  if (!isNominationPhase && !isComingSoon) {
    return (
      <div className="entry-flow">
        <div className="entry-closed-state">
          <AlertCircle size={48} />
          <h2>Entries Closed</h2>
          <p>Nominations for {competitionTitle} are no longer open.</p>
          <button
            className="entry-btn-primary"
            onClick={() => navigate(`/${orgSlug}/${competitionSlug}`)}
          >
            View Competition
          </button>
        </div>
      </div>
    );
  }

  // Progress dots
  const totalDots = flow.totalSteps;
  const currentDot = flow.currentStepIndex;

  return (
    <div className="entry-flow" ref={flowRef}>
      {/* Header with back button and progress */}
      {flow.currentStep !== 'card' && (
        <header className="entry-header">
          <button
            className="entry-back-btn"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          {flow.mode && (
            <div className="entry-progress">
              {Array.from({ length: totalDots }, (_, i) => (
                <span
                  key={i}
                  className={`entry-dot ${i === currentDot ? 'active' : ''} ${i < currentDot ? 'completed' : ''}`}
                />
              ))}
            </div>
          )}

          <div className="entry-header-spacer" />
        </header>
      )}

      {/* Competition banner */}
      {flow.currentStep !== 'card' && (
        <CompetitionBanner competition={competition} />
      )}

      {/* Step content with slide animation */}
      <div className="entry-content" key={flow.currentStep}>
        {renderStep(flow, competition, competitionTitle, handleDone, flow.resetForNewNomination, handleDetailsNext)}
      </div>
    </div>
  );
}

/**
 * Render the current step
 */
function renderStep(flow, competition, competitionTitle, handleDone, handleNominateAnother, handleDetailsNext) {
  switch (flow.currentStep) {
    case 'mode':
      return (
        <ModeSelect
          onSelectMode={flow.selectMode}
          competitionTitle={competitionTitle}
        />
      );

    case 'eligibility':
      return (
        <EligibilityStep
          competition={competition}
          isSelf={flow.mode === 'self'}
          answers={flow.eligibilityAnswers}
          onToggle={flow.setEligibility}
          onNext={flow.next}
        />
      );

    case 'photo':
      return (
        <PhotoUpload
          photoPreview={flow.selfData.photoPreview}
          onPhotoSelect={(file, previewUrl) =>
            flow.updateSelfData({ photoFile: file, photoPreview: previewUrl })
          }
          onRemovePhoto={() =>
            flow.updateSelfData({ photoFile: null, photoPreview: '' })
          }
          onNext={flow.next}
          required={true}
        />
      );

    case 'details':
      return (
        <BuildCardDetailsStep
          data={flow.selfData}
          onChange={flow.updateSelfData}
          onNext={handleDetailsNext}
          error={flow.submitError}
          isSubmitting={flow.isSubmitting}
        />
      );

    case 'bio':
      return (
        <SelfPitchStep
          bio={flow.selfData.bio}
          onChange={(bio) => flow.updateSelfData({ bio })}
          onSubmit={flow.submitSelfEntry}
          isSubmitting={flow.isSubmitting}
          error={flow.submitError}
          competition={competition}
        />
      );

    case 'password':
      return (
        <CreatePasswordStep
          email={flow.selfData.email}
          onSubmit={flow.createAccount}
          isSubmitting={flow.isSubmitting}
          error={flow.submitError}
          isSettingPassword={false}
        />
      );

    case 'nominee':
      return (
        <NomineeInfoStep
          data={flow.nomineeData}
          onChange={flow.updateNomineeData}
          onNext={flow.next}
          error={flow.submitError}
        />
      );

    case 'why':
      return (
        <WhyNominateStep
          reason={flow.nomineeData.reason}
          onChange={(reason) => flow.updateNomineeData({ reason })}
          onNext={flow.next}
          error={flow.submitError}
          competition={competition}
          nomineeName={flow.nomineeData.name}
        />
      );

    case 'nominator':
      return (
        <NominatorInfoStep
          data={flow.nominatorData}
          onChange={flow.updateNominatorData}
          onSubmit={flow.submitNomination}
          isSubmitting={flow.isSubmitting}
          error={flow.submitError}
        />
      );

    case 'card':
      return (
        <CardReveal
          competition={competition}
          submittedData={flow.submittedData}
          onDone={handleDone}
          onNominateAnother={handleNominateAnother}
        />
      );

    default:
      return null;
  }
}

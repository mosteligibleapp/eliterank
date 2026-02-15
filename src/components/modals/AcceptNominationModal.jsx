import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Modal } from '../ui';
import { useBuildCardFlow } from '../../features/entry/hooks/useBuildCardFlow';

// Shared step components
import AcceptDeclineStep from '../../features/entry/components/AcceptDeclineStep';
import EligibilityConfirmStep from '../../features/entry/components/EligibilityConfirmStep';
import PhotoUpload from '../../features/entry/components/PhotoUpload';
import BuildCardDetailsStep from '../../features/entry/components/BuildCardDetailsStep';
import SelfPitchStep from '../../features/entry/components/SelfPitchStep';
import CreatePasswordStep from '../../features/entry/components/CreatePasswordStep';
import CardReveal from '../../features/entry/components/CardReveal';
import CompetitionBanner from '../../features/entry/components/CompetitionBanner';

import '../../features/entry/EntryFlow.css';

/**
 * AcceptNominationModal - In-app Build Your Card flow for existing logged-in users
 *
 * Wraps the unified step components inside a modal.
 * Includes password step — magic-link users may not have a password yet.
 */
export default function AcceptNominationModal({
  isOpen,
  onClose,
  nomination,
  profile,
  user,
  onAccept,
  onDecline,
}) {
  const competition = nomination?.competition;
  const contentRef = useRef(null);

  const flow = useBuildCardFlow({
    mode: 'third-party',
    competition,
    profile,
    user,
    nominee: nomination,
    needsPassword: true, // Always include — magic-link users need to set a password
  });

  // Scroll to top on step change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0 });
    }
  }, [flow.currentStep]);

  const handleDecline = async () => {
    const success = await flow.declineNomination();
    if (success) {
      onDecline?.();
      onClose?.();
    }
  };

  const handleIneligible = async () => {
    const success = await flow.declineNomination();
    if (success) {
      onDecline?.();
      onClose?.();
    }
  };

  const handleDetailsNext = async () => {
    try {
      await flow.persistProgress('details');
      flow.next();
    } catch {
      // Error set in hook
    }
  };

  const handleDone = () => {
    onAccept?.();
    onClose?.();
  };

  if (!isOpen || !nomination) return null;

  const totalDots = flow.totalSteps;
  const currentDot = flow.currentStepIndex;
  const canGoBack = flow.currentStep !== 'accept' && flow.currentStep !== 'card';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="480px">
      <div className="entry-flow" ref={contentRef} style={{ minHeight: 'auto', maxHeight: '85vh', overflow: 'auto' }}>
        {/* Header with progress */}
        {flow.currentStep !== 'card' && (
          <header className="entry-header" style={{ position: 'relative' }}>
            {canGoBack ? (
              <button
                className="entry-back-btn"
                onClick={flow.back}
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="entry-header-spacer" />
            )}

            <div className="entry-progress">
              {Array.from({ length: totalDots }, (_, i) => (
                <span
                  key={i}
                  className={`entry-dot ${i === currentDot ? 'active' : ''} ${i < currentDot ? 'completed' : ''}`}
                />
              ))}
            </div>

            <div className="entry-header-spacer" />
          </header>
        )}

        {flow.currentStep !== 'card' && flow.currentStep !== 'accept' && competition && (
          <CompetitionBanner competition={competition} />
        )}

        <div className="entry-content" key={flow.currentStep}>
          {renderModalStep(flow, competition, nomination, handleDecline, handleIneligible, handleDetailsNext, handleDone, user)}
        </div>
      </div>
    </Modal>
  );
}

function renderModalStep(flow, competition, nomination, handleDecline, handleIneligible, handleDetailsNext, handleDone, user) {
  switch (flow.currentStep) {
    case 'accept':
      return (
        <AcceptDeclineStep
          nominee={nomination}
          competition={competition}
          onAccept={flow.acceptNomination}
          onDecline={handleDecline}
          processing={flow.isSubmitting}
        />
      );

    case 'eligibility-confirm':
      return (
        <EligibilityConfirmStep
          competition={competition}
          onNext={flow.next}
          onIneligible={handleIneligible}
        />
      );

    case 'photo':
      return (
        <PhotoUpload
          photoPreview={flow.cardData.photoPreview}
          onPhotoSelect={(file, previewUrl) =>
            flow.updateCardData({ photoFile: file, photoPreview: previewUrl })
          }
          onRemovePhoto={() =>
            flow.updateCardData({ photoFile: null, photoPreview: '' })
          }
          onNext={flow.next}
          required={true}
        />
      );

    case 'details':
      return (
        <BuildCardDetailsStep
          data={flow.cardData}
          onChange={flow.updateCardData}
          onNext={handleDetailsNext}
          error={flow.submitError}
          isSubmitting={flow.isSubmitting}
        />
      );

    case 'bio':
      return (
        <SelfPitchStep
          bio={flow.cardData.bio}
          onChange={(bio) => flow.updateCardData({ bio })}
          onSubmit={flow.submitCard}
          isSubmitting={flow.isSubmitting}
          error={flow.submitError}
          competition={competition}
        />
      );

    case 'password':
      return (
        <CreatePasswordStep
          email={flow.cardData.email}
          onSubmit={flow.createAccount}
          isSubmitting={flow.isSubmitting}
          error={flow.submitError}
          isSettingPassword={!!user}
        />
      );

    case 'card':
      return (
        <CardReveal
          competition={competition}
          submittedData={flow.submittedData}
          onDone={handleDone}
        />
      );

    default:
      return null;
  }
}

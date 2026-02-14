import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useBuildCardFlow } from '../../entry/hooks/useBuildCardFlow';

// Shared step components
import AcceptDeclineStep from '../../entry/components/AcceptDeclineStep';
import EligibilityConfirmStep from '../../entry/components/EligibilityConfirmStep';
import PhotoUpload from '../../entry/components/PhotoUpload';
import BuildCardDetailsStep from '../../entry/components/BuildCardDetailsStep';
import SelfPitchStep from '../../entry/components/SelfPitchStep';
import CreatePasswordStep from '../../entry/components/CreatePasswordStep';
import CardReveal from '../../entry/components/CardReveal';
import CompetitionBanner from '../../entry/components/CompetitionBanner';

import '../../entry/EntryFlow.css';

/**
 * ClaimNominationPage - Unified Build Your Card flow for third-party nominees
 *
 * User clicks magic link → lands here → Accept/Decline → Build Card → Share
 * Replaces the old fragmented auth-first flow with the gamified step-by-step experience.
 */
export default function ClaimNominationPage({ token, onClose, onSuccess }) {
  const toast = useToast();

  // Capture magic link indicator once at mount time. Supabase clears the URL
  // hash after processing auth tokens, so this must be evaluated eagerly —
  // reading window.location.hash on later renders would return an empty string.
  const cameViaMagicLinkRef = useRef(
    window.location.hash.includes('access_token') || window.location.hash.includes('type=magiclink')
  );
  const cameViaMagicLink = cameViaMagicLinkRef.current;

  // Auth state
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data state
  const [loading, setLoading] = useState(true);
  const [nominee, setNominee] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [error, setError] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [ready, setReady] = useState(false);

  const flowRef = useRef(null);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
        setAuthLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Fetch nominee data
  useEffect(() => {
    const fetchNomination = async () => {
      if (!token) {
        setError('Invalid nomination link');
        setLoading(false);
        return;
      }

      try {
        const { data: nomineeData, error: nomineeError } = await supabase
          .from('nominees')
          .select(`
            *,
            competition:competitions(
              id,
              city:cities(name),
              season,
              status,
              nomination_start,
              nomination_end,
              organization:organizations(name, logo_url, slug),
              demographic:demographics(*),
              category:categories(*)
            )
          `)
          .eq('invite_token', token)
          .single();

        if (nomineeError || !nomineeData) {
          setError('Nomination not found. This link may be invalid or expired.');
          setLoading(false);
          return;
        }

        if (nomineeData.converted_to_contestant) {
          setError('This nomination has already been fully processed.');
          setLoading(false);
          return;
        }

        if (nomineeData.status === 'rejected') {
          setError('This nomination was previously declined.');
          setLoading(false);
          return;
        }

        const comp = nomineeData.competition;
        if (comp?.nomination_end) {
          const endDate = new Date(comp.nomination_end);
          if (new Date() > endDate) {
            setError('Sorry, the nomination period for this competition has ended.');
            setLoading(false);
            return;
          }
        }

        setNominee(nomineeData);
        setCompetition(comp);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching nomination:', err);
        setError('Something went wrong. Please try again.');
        setLoading(false);
      }
    };

    fetchNomination();
  }, [token]);

  // Determine password needs after auth check.
  // cameViaMagicLink was captured at mount time because Supabase clears the
  // URL hash after processing tokens, so checking it here would be too late.
  useEffect(() => {
    if (loading || authLoading || !nominee) return;

    if (user && cameViaMagicLink) {
      // Magic-link user — needs to set a password so they can log back in
      setNeedsPassword(true);
    } else if (!user) {
      // No account at all — needs to create one
      setNeedsPassword(true);
    } else {
      setNeedsPassword(false);
    }

    setReady(true);
  }, [loading, authLoading, user, nominee, cameViaMagicLink]);

  // Initialize the Build Your Card flow
  const flow = useBuildCardFlow({
    mode: 'third-party',
    competition,
    profile,
    user,
    nominee,
    needsPassword,
  });

  // Scroll to top on step change
  useEffect(() => {
    if (flowRef.current) {
      flowRef.current.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [flow.currentStep]);

  // Handle decline
  const handleDecline = async () => {
    const success = await flow.declineNomination();
    if (success) {
      toast.success('Nomination declined');
      onClose?.();
    }
  };

  // Handle ineligible
  const handleIneligible = async () => {
    const success = await flow.declineNomination();
    if (success) {
      toast.success('Thanks for letting us know.');
      onClose?.();
    }
  };

  // Handle details next with early persistence
  const handleDetailsNext = async () => {
    try {
      await flow.persistProgress('details');
      flow.next();
    } catch {
      // Error set in hook
    }
  };

  // Handle done
  const handleDone = () => {
    onSuccess?.();
  };

  // ---- Loading ----
  if (loading || authLoading || !ready) {
    return (
      <div className="entry-flow">
        <div className="entry-loading">
          <div className="entry-spinner" />
          <p>Loading your nomination...</p>
        </div>
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="entry-flow">
        <div className="entry-error-state">
          <AlertCircle size={48} />
          <h2>Oops!</h2>
          <p>{error}</p>
          <Button variant="secondary" onClick={onClose}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // ---- Render Build Your Card flow ----
  const totalDots = flow.totalSteps;
  const currentDot = flow.currentStepIndex;

  const showHeader = flow.currentStep !== 'card';
  const canGoBack = flow.currentStep !== 'accept' && flow.currentStep !== 'card';

  return (
    <div className="entry-flow" ref={flowRef}>
      {showHeader && (
        <header className="entry-header">
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
        {renderClaimStep(flow, competition, nominee, handleDecline, handleIneligible, handleDetailsNext, handleDone, user)}
      </div>
    </div>
  );
}

function renderClaimStep(flow, competition, nominee, handleDecline, handleIneligible, handleDetailsNext, handleDone, user) {
  switch (flow.currentStep) {
    case 'accept':
      return (
        <AcceptDeclineStep
          nominee={nominee}
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

    case 'pitch':
      return (
        <SelfPitchStep
          pitch={flow.cardData.pitch}
          onChange={(pitch) => flow.updateCardData({ pitch })}
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

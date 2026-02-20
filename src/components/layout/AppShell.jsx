/**
 * AppShell - Application shell component
 * 
 * Handles common shell concerns:
 * - Auth state monitoring (via Zustand)
 * - Pending nominations modal
 * - Accept nomination modal
 * - Error boundary wrapping
 * - Auth loading state
 */

import React, { useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthWithZustand } from '../../hooks';
import { useAuthStore, useUIStore } from '../../stores';
import { ErrorBoundary, LoadingScreen } from '../common';

const AcceptNominationModal = lazy(() => import('../modals/AcceptNominationModal'));

/**
 * PendingNominationsModal - Shows when user has multiple pending nominations
 */
function PendingNominationsModal({ nominations, onSelect, onClose }) {
  if (!nominations?.length) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-6 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-bg-elevated border border-border-gold rounded-2xl p-8 max-w-[480px] w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-gold/30 to-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            👑
          </div>
          <h2 className="text-gold text-2xl mb-2 font-semibold">
            You Have Pending Nominations!
          </h2>
          <p className="text-gray-400 text-[0.95rem]">
            Select a competition to claim your nomination
          </p>
        </div>

        {/* Nominations List */}
        <div className="flex flex-col gap-3">
          {nominations.map((nom) => (
            <button
              key={nom.id}
              onClick={() => onSelect(nom)}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left cursor-pointer transition-all hover:bg-gold/10 hover:border-border-gold"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold mb-1">
                    Most Eligible {nom.competition?.city} {nom.competition?.season}
                  </p>
                  <p className="text-gray-400 text-[0.85rem]">
                    {nom.competition?.organization?.name || 'EliteRank'}
                  </p>
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    nom.flow_stage 
                      ? 'bg-green-400/20 text-green-400' 
                      : 'bg-gold/20 text-gold'
                  }`}
                >
                  {nom.flow_stage ? 'Continue' : 'Accept/Decline'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Skip Option */}
        <button
          onClick={onClose}
          className="w-full mt-5 p-3 bg-transparent border-none text-gray-500 text-[0.9rem] cursor-pointer underline hover:text-gray-400 transition-colors"
        >
          I'll do this later
        </button>
      </div>
    </div>
  );
}

/**
 * Check for pending nominations
 */
async function checkPendingNominations(userEmail) {
  if (!userEmail || !supabase) return null;

  try {
    const { data: nominees, error } = await supabase
      .from('nominees')
      .select(`
        id,
        name,
        email,
        invite_token,
        claimed_at,
        status,
        user_id,
        nominator_name,
        nominator_anonymous,
        nomination_reason,
        competition:competitions(
          id,
          name,
          season,
          status,
          nomination_end,
          city:cities(name),
          organization:organizations(name, slug)
        )
      `)
      .eq('email', userEmail)
      .not('status', 'in', '("rejected","declined")')
      .or('converted_to_contestant.is.null,converted_to_contestant.eq.false')
      .is('claimed_at', null);

    if (error || !nominees?.length) {
      return null;
    }

    // Filter to only pending nominations
    const pending = nominees.filter(n => {
      if (n.competition?.nomination_end) {
        const endDate = new Date(n.competition.nomination_end);
        if (new Date() > endDate) return false;
      }
      return true;
    });

    return pending.length ? pending : null;
  } catch (err) {
    console.error('Error checking pending nominations:', err);
    return null;
  }
}

/**
 * AppShell Component
 */
export default function AppShell({ children }) {
  const navigate = useNavigate();
  
  // Initialize auth sync with Zustand (this keeps Supabase auth → Zustand in sync)
  useAuthWithZustand();
  
  // Get auth state from Zustand store
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const authLoading = useAuthStore(s => s.isLoading);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // Get UI state from Zustand store
  const pendingNominations = useUIStore(s => s.pendingNominations);
  const showNominationsModal = useUIStore(s => s.showNominationsModal);
  const acceptingNomination = useUIStore(s => s.acceptingNomination);
  const openNominationsModal = useUIStore(s => s.openNominationsModal);
  const closeNominationsModal = useUIStore(s => s.closeNominationsModal);
  const openAcceptNomination = useUIStore(s => s.openAcceptNomination);
  const closeAcceptNomination = useUIStore(s => s.closeAcceptNomination);
  
  // Track if we've checked for pending nominations this session
  const hasCheckedPendingRef = React.useRef(false);

  // Check for pending nominations when user logs in
  useEffect(() => {
    const checkOnAuth = async () => {
      if (
        isAuthenticated &&
        user?.email &&
        !hasCheckedPendingRef.current &&
        !acceptingNomination &&
        !showNominationsModal
      ) {
        hasCheckedPendingRef.current = true;

        const pending = await checkPendingNominations(user.email);

        if (pending?.length) {
          if (pending.length === 1) {
            openAcceptNomination(pending[0]);
          } else {
            openNominationsModal(pending);
          }
        }
      }
    };

    checkOnAuth();
  }, [isAuthenticated, user?.email, acceptingNomination, showNominationsModal, openAcceptNomination, openNominationsModal]);

  // Reset check flag on logout
  useEffect(() => {
    if (!isAuthenticated) {
      hasCheckedPendingRef.current = false;
    }
  }, [isAuthenticated]);

  // Handlers
  const handleSelectNomination = useCallback((nomination) => {
    closeNominationsModal();
    openAcceptNomination(nomination);
  }, [closeNominationsModal, openAcceptNomination]);

  const handleCloseNominationsModal = useCallback(() => {
    closeNominationsModal();
  }, [closeNominationsModal]);

  const handleAcceptNomination = useCallback(() => {
    closeAcceptNomination();
  }, [closeAcceptNomination]);

  const handleDeclineNomination = useCallback(() => {
    closeAcceptNomination();
  }, [closeAcceptNomination]);

  const handleCloseAcceptModal = useCallback(() => {
    closeAcceptNomination();
  }, [closeAcceptNomination]);

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <ErrorBoundary>
      {children}

      {/* Pending Nominations Modal */}
      {showNominationsModal && pendingNominations?.length > 0 && (
        <PendingNominationsModal
          nominations={pendingNominations}
          onSelect={handleSelectNomination}
          onClose={handleCloseNominationsModal}
        />
      )}

      {/* Accept Nomination Modal */}
      {acceptingNomination && (
        <Suspense fallback={null}>
          <AcceptNominationModal
            isOpen={true}
            onClose={handleCloseAcceptModal}
            nomination={acceptingNomination}
            profile={profile}
            user={user}
            onAccept={handleAcceptNomination}
            onDecline={handleDeclineNomination}
          />
        </Suspense>
      )}
    </ErrorBoundary>
  );
}

// Export for external use
export { checkPendingNominations };

/**
 * UI Store - Centralized UI/Modal state with Zustand
 * 
 * Consolidates scattered modal/UI state from:
 * - App.jsx (showUserProfile, showRewards, acceptingNomination, etc.)
 * - PublicCompetitionContext.jsx (selectedContestant, showVoteModal, etc.)
 * - Various component-level useState calls
 */
import { create } from 'zustand';

// View states (for main app navigation)
export const VIEW = Object.freeze({
  PUBLIC: 'public',
  LOGIN: 'login',
  HOST_DASHBOARD: 'host_dashboard',
  SUPER_ADMIN: 'super_admin',
});

export const useUIStore = create((set, get) => ({
  // ========== View State ==========
  currentView: VIEW.PUBLIC,

  // ========== Modal Visibility ==========
  showLoginModal: false,
  showProfileModal: false,       // User's own profile
  showRewardsModal: false,
  showNominationsModal: false,
  showVoteModal: false,
  showContestantProfile: false,  // Viewing a contestant's profile

  // ========== Modal Data ==========
  // Data associated with currently open modals
  acceptingNomination: null,     // Nomination being accepted/declined
  pendingNominations: null,      // Multiple pending nominations list
  viewingProfile: null,          // Profile being viewed (public profile view)
  selectedContestant: null,      // Contestant selected for voting/viewing

  // ========== Claim Flow State ==========
  claimToken: null,
  claimStage: null,              // null, 'initial', 'completion', 'profile'
  claimData: null,               // { nominee, competition } after accept

  // ========== Return URL ==========
  loginReturnUrl: null,          // URL to redirect to after login

  // ========== Profile Editing State ==========
  isEditingProfile: false,
  editingProfileData: null,

  // ========== View Actions ==========
  setView: (view) => set({ currentView: view }),
  goToPublic: () => set({ currentView: VIEW.PUBLIC }),
  goToLogin: () => set({ currentView: VIEW.LOGIN }),
  goToHostDashboard: () => set({ currentView: VIEW.HOST_DASHBOARD }),
  goToSuperAdmin: () => set({ currentView: VIEW.SUPER_ADMIN }),

  // ========== Login Modal ==========
  openLogin: (returnUrl = null) => set({ 
    showLoginModal: true,
    loginReturnUrl: returnUrl,
  }),
  closeLogin: () => set({ 
    showLoginModal: false,
  }),
  clearLoginReturnUrl: () => set({ loginReturnUrl: null }),

  // ========== Profile Modal (own profile) ==========
  openProfile: () => set({ showProfileModal: true }),
  closeProfile: () => set({ 
    showProfileModal: false,
    isEditingProfile: false,
    editingProfileData: null,
  }),

  // ========== Profile Editing ==========
  startEditingProfile: (profileData) => set({ 
    isEditingProfile: true,
    editingProfileData: { ...profileData },
  }),
  updateEditingProfile: (updates) => set((state) => ({
    editingProfileData: state.editingProfileData 
      ? { ...state.editingProfileData, ...updates }
      : updates,
  })),
  cancelEditingProfile: () => set({
    isEditingProfile: false,
    editingProfileData: null,
  }),
  finishEditingProfile: () => set({
    isEditingProfile: false,
    editingProfileData: null,
  }),

  // ========== Rewards Modal ==========
  openRewards: () => set({ showRewardsModal: true }),
  closeRewards: () => set({ showRewardsModal: false }),

  // ========== Vote Modal ==========
  openVoteModal: (contestant) => set({ 
    showVoteModal: true,
    showContestantProfile: false,
    selectedContestant: contestant,
  }),
  closeVoteModal: () => set({ 
    showVoteModal: false,
    // Don't immediately clear selectedContestant for animation purposes
  }),

  // ========== Contestant Profile Modal ==========
  openContestantProfile: (contestant) => set({
    showContestantProfile: true,
    showVoteModal: false,
    selectedContestant: contestant,
  }),
  closeContestantProfile: () => set({
    showContestantProfile: false,
  }),

  // Switch from profile view to vote
  switchToVote: () => set({
    showContestantProfile: false,
    showVoteModal: true,
  }),

  // ========== Public Profile View ==========
  viewProfile: (profile) => set({ viewingProfile: profile }),
  closeViewProfile: () => set({ viewingProfile: null }),

  // ========== Nominations Modal ==========
  openNominationsModal: (nominations) => set({
    showNominationsModal: true,
    pendingNominations: nominations,
  }),
  closeNominationsModal: () => set({
    showNominationsModal: false,
    pendingNominations: null,
  }),

  // ========== Accept Nomination Modal ==========
  openAcceptNomination: (nomination) => set({
    acceptingNomination: nomination,
  }),
  closeAcceptNomination: () => set({
    acceptingNomination: null,
  }),

  // ========== Claim Flow ==========
  startClaimFlow: (token, stage = 'initial') => set({
    claimToken: token,
    claimStage: stage,
  }),
  setClaimData: (data) => set({ claimData: data }),
  setClaimStage: (stage) => set({ claimStage: stage }),
  resetClaimFlow: () => set({
    claimToken: null,
    claimStage: null,
    claimData: null,
  }),

  // ========== Selected Contestant (clear after animation) ==========
  clearSelectedContestant: () => set({ selectedContestant: null }),

  // ========== Close All Modals ==========
  closeAllModals: () => set({
    showLoginModal: false,
    showProfileModal: false,
    showRewardsModal: false,
    showNominationsModal: false,
    showVoteModal: false,
    showContestantProfile: false,
    acceptingNomination: null,
    pendingNominations: null,
    viewingProfile: null,
    isEditingProfile: false,
    editingProfileData: null,
  }),

  // ========== Reset All State ==========
  // Called on logout
  reset: () => set({
    currentView: VIEW.PUBLIC,
    showLoginModal: false,
    showProfileModal: false,
    showRewardsModal: false,
    showNominationsModal: false,
    showVoteModal: false,
    showContestantProfile: false,
    acceptingNomination: null,
    pendingNominations: null,
    viewingProfile: null,
    selectedContestant: null,
    claimToken: null,
    claimStage: null,
    claimData: null,
    loginReturnUrl: null,
    isEditingProfile: false,
    editingProfileData: null,
  }),
}));

// ========== Convenience Hooks ==========
// These provide specific slices of state for common use cases

export const useCurrentView = () => useUIStore((state) => state.currentView);

export const useSelectedContestant = () => useUIStore((state) => state.selectedContestant);

export const useIsVoteModalOpen = () => useUIStore((state) => state.showVoteModal);

export const useIsProfileModalOpen = () => useUIStore((state) => state.showProfileModal);

export const useIsEditingProfile = () => useUIStore((state) => ({
  isEditing: state.isEditingProfile,
  editingData: state.editingProfileData,
}));

export default useUIStore;

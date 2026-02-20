/**
 * Preferences Store - User preferences with persistence
 * 
 * Stores user preferences that persist across sessions:
 * - Theme preferences
 * - Notification settings
 * - UI preferences
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePreferencesStore = create(
  persist(
    (set, get) => ({
      // ========== Theme ==========
      theme: 'dark', // 'dark' | 'light' | 'system'
      accentColor: 'gold', // 'gold' | 'blue' | 'purple' | 'green'

      // ========== Notifications ==========
      notifications: {
        email: true,
        push: false,
        voteAlerts: true,
        eventReminders: true,
        competitionUpdates: true,
      },

      // ========== UI Preferences ==========
      compactMode: false,
      showAnimations: true,
      showTutorials: true,

      // ========== Dismissed Items ==========
      dismissedBanners: [], // IDs of dismissed banners/announcements
      completedTutorials: [], // IDs of completed tutorials

      // ========== Recent Activity ==========
      recentCompetitions: [], // Last viewed competition IDs
      favoriteContestants: [], // Favorited contestant IDs

      // ========== Actions: Theme ==========
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),

      // ========== Actions: Notifications ==========
      setNotificationPreference: (key, value) => set((state) => ({
        notifications: {
          ...state.notifications,
          [key]: value,
        },
      })),

      toggleNotification: (key) => set((state) => ({
        notifications: {
          ...state.notifications,
          [key]: !state.notifications[key],
        },
      })),

      // ========== Actions: UI ==========
      setCompactMode: (compactMode) => set({ compactMode }),
      toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
      
      setShowAnimations: (showAnimations) => set({ showAnimations }),
      toggleAnimations: () => set((state) => ({ showAnimations: !state.showAnimations })),

      setShowTutorials: (showTutorials) => set({ showTutorials }),

      // ========== Actions: Dismissed Items ==========
      dismissBanner: (id) => set((state) => ({
        dismissedBanners: [...new Set([...state.dismissedBanners, id])],
      })),

      isBannerDismissed: (id) => {
        return get().dismissedBanners.includes(id);
      },

      completeTutorial: (id) => set((state) => ({
        completedTutorials: [...new Set([...state.completedTutorials, id])],
      })),

      isTutorialComplete: (id) => {
        return get().completedTutorials.includes(id);
      },

      // ========== Actions: Recent/Favorites ==========
      addRecentCompetition: (competitionId) => set((state) => {
        const recent = [competitionId, ...state.recentCompetitions.filter(id => id !== competitionId)];
        return { recentCompetitions: recent.slice(0, 10) }; // Keep last 10
      }),

      toggleFavoriteContestant: (contestantId) => set((state) => {
        const favorites = state.favoriteContestants;
        if (favorites.includes(contestantId)) {
          return { favoriteContestants: favorites.filter(id => id !== contestantId) };
        }
        return { favoriteContestants: [...favorites, contestantId] };
      }),

      isFavoriteContestant: (contestantId) => {
        return get().favoriteContestants.includes(contestantId);
      },

      // ========== Reset ==========
      resetPreferences: () => set({
        theme: 'dark',
        accentColor: 'gold',
        notifications: {
          email: true,
          push: false,
          voteAlerts: true,
          eventReminders: true,
          competitionUpdates: true,
        },
        compactMode: false,
        showAnimations: true,
        showTutorials: true,
      }),

      clearDismissed: () => set({
        dismissedBanners: [],
        completedTutorials: [],
      }),

      clearRecent: () => set({
        recentCompetitions: [],
        favoriteContestants: [],
      }),
    }),
    {
      name: 'eliterank-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ========== Convenience Hooks ==========

export const useTheme = () => usePreferencesStore((state) => state.theme);

export const useAccentColor = () => usePreferencesStore((state) => state.accentColor);

export const useNotificationPreferences = () => usePreferencesStore((state) => state.notifications);

export const useCompactMode = () => usePreferencesStore((state) => state.compactMode);

export const useFavoriteContestants = () => usePreferencesStore((state) => state.favoriteContestants);

export default usePreferencesStore;

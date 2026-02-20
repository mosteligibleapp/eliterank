/**
 * Zustand Stores - Barrel Export
 * 
 * Central export point for all Zustand stores.
 * Import from here to keep imports clean:
 * 
 * import { useAuthStore, useUIStore, useCompetitionStore } from '../stores';
 */

// Auth Store
export {
  useAuthStore,
  useUserRole,
  useIsSuperAdmin,
  useIsHost,
  useHasDashboardAccess,
  useHostProfile,
  useUserName,
  ROLES,
} from './authStore';

// UI Store
export {
  useUIStore,
  useCurrentView,
  useSelectedContestant,
  useIsVoteModalOpen,
  useIsProfileModalOpen,
  useIsEditingProfile,
  VIEW,
} from './uiStore';

// Competition Store
export {
  useCompetitionStore,
  useActiveCompetition,
  useHostCompetition,
  useContestants,
  useTopThree,
  useDangerZone,
  useCompetitionPhase,
  useCompetitionLoading,
} from './competitionStore';

// Preferences Store
export {
  usePreferencesStore,
  useTheme,
  useAccentColor,
  useNotificationPreferences,
  useCompactMode,
  useFavoriteContestants,
} from './preferencesStore';

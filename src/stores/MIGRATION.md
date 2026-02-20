# Zustand Migration Guide

This document explains how to migrate from Context-based state to Zustand stores.

## Store Structure

```
src/stores/
├── index.js              # Barrel exports
├── authStore.js          # Auth state (user, profile, roles)
├── uiStore.js            # UI state (modals, views, editing)
├── competitionStore.js   # Competition data (contestants, events, etc.)
└── preferencesStore.js   # User preferences (theme, notifications)
```

## Migration Steps

### Phase 1: Add Stores (DONE)
- ✅ Created Zustand stores
- ✅ Created bridge hook (useAuthWithZustand)
- ✅ Added to package.json

### Phase 2: Wire Up Auth (DONE)
- ✅ AppShell calls `useAuthWithZustand()` to sync Supabase → Zustand
- ✅ AppShell uses `useAuthStore` and `useUIStore` for state
- ✅ HomePage uses `useAuthStore` with convenience hooks
- ✅ DashboardPage uses `useAuthStore` 
- ✅ ProtectedRoute uses `useAuthStore` and `useUserRole`

### Phase 3: Wire Up UI State (DONE)
Update App.jsx to use Zustand for auth:

```jsx
// Before (Context-based)
import { useSupabaseAuth } from './hooks';
const { user, profile, loading } = useSupabaseAuth();

// After (Zustand)
import { useAuthStore, useUserRole, useHostProfile } from './stores';
import { useAuthWithZustand } from './hooks';

// In App component:
useAuthWithZustand(); // Initialize once at root

// Then read state directly:
const user = useAuthStore(state => state.user);
const profile = useAuthStore(state => state.profile);
const isLoading = useAuthStore(state => state.isLoading);
const userRole = useUserRole();
const hostProfile = useHostProfile();
```

- ✅ AppShell uses `useUIStore` for nomination modals (pendingNominations, acceptingNomination)

### Phase 4: Remaining Work
More components can still be migrated incrementally. Replace useState calls with useUIStore:

```jsx
// Before
const [showUserProfile, setShowUserProfile] = useState(false);
const [acceptingNomination, setAcceptingNomination] = useState(null);

// After
import { useUIStore } from './stores';

const showUserProfile = useUIStore(state => state.showProfileModal);
const openProfile = useUIStore(state => state.openProfile);
const closeProfile = useUIStore(state => state.closeProfile);

const acceptingNomination = useUIStore(state => state.acceptingNomination);
const openAcceptNomination = useUIStore(state => state.openAcceptNomination);
```

### Phase 5: Update More Components (Optional)
More components can now import directly from stores:

```jsx
// In any component (no more prop drilling!)
import { useAuthStore, useUserName } from '../stores';

function MyComponent() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userName = useUserName();
  
  // ...
}
```

### Phase 6: Remove Contexts (Future)
Once all components use stores, remove old contexts:
- src/contexts/AuthContext.jsx → useAuthStore
- src/contexts/CompetitionContext.jsx → useCompetitionStore
- Parts of PublicCompetitionContext → useCompetitionStore + useUIStore

NOTE: The old hooks (useSupabaseAuth) still work and can be used as fallback.
The stores are now the source of truth for auth state.

## Common Patterns

### Reading Multiple Values
```jsx
// Option 1: Multiple selectors (re-renders on any change)
const user = useAuthStore(state => state.user);
const profile = useAuthStore(state => state.profile);

// Option 2: Object selector with shallow compare (recommended for multiple)
import { shallow } from 'zustand/shallow';
const { user, profile } = useAuthStore(
  state => ({ user: state.user, profile: state.profile }),
  shallow
);
```

### Actions
```jsx
// Get actions (these never change, safe to destructure)
const { signOut, updateProfile } = useAuthStore.getState();

// Or in component:
const signOut = useAuthStore(state => state.signOut);
```

### Computed Values
```jsx
// Use the convenience hooks for computed values:
const userRole = useUserRole();
const hostProfile = useHostProfile();
const topThree = useTopThree();
```

## Testing

After each phase, test:
1. Login/logout flow
2. Profile viewing/editing
3. Competition pages load
4. Voting works
5. Modal open/close states

## Files Updated

Already migrated:
1. ✅ `src/components/layout/AppShell.jsx` - Auth sync + UI store for nomination modals
2. ✅ `src/pages/HomePage.jsx` - Uses auth store with convenience hooks
3. ✅ `src/pages/DashboardPage.jsx` - Uses auth store
4. ✅ `src/routes/ProtectedRoute.jsx` - Uses auth store + useUserRole

Not yet migrated (receive auth via props):
- `src/features/public-site/PublicSitePage.jsx` - Uses props from parent
- `src/features/public-site/components/VoteModal.jsx` - Uses props
- Individual dashboard components (can be migrated incrementally)

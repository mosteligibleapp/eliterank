import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useAuthStore, useIsSuperAdmin } from '@shared/stores/authStore';
import { supabase } from '@shared/lib/supabase';
import { log } from '@shared/lib/logger';
import { ToastProvider } from '@shared/contexts/ToastContext';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { Crown, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';

const SuperAdminPage = lazy(() => import('./features/super-admin/SuperAdminPage'));

const AUTH_TIMEOUT_MS = 8000;

function AdminApp() {
  const { user, isAuthenticated, isLoading, profile } = useAuthStore();
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);
  const signOut = useAuthStore((s) => s.signOut);
  const isSuperAdmin = useIsSuperAdmin();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Auth initialization
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const authReadyRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Load profile from Supabase and set user+profile atomically.
   * Extracted as a stable callback so both initAuth and handleLogin can use it.
   */
  const loadUserAndProfile = useCallback(async (sessionUser) => {
    log.info('admin', 'Loading profile', { userId: sessionUser.id });
    try {
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error) {
        log.warn('admin', 'Profile fetch error', { error: error.message });
      }

      if (mountedRef.current) {
        // Set profile first, then user — React 18 batches both into one render
        setProfile(profileData || null);
        setUser(sessionUser);
        log.info('admin', 'Auth complete', {
          email: sessionUser.email,
          isSuperAdmin: (profileData?.roles || []).includes('super_admin'),
        });
      }
    } catch (err) {
      log.error('admin', 'Profile fetch failed', { error: err.message });
      if (mountedRef.current) {
        setProfile(null);
        setUser(sessionUser);
      }
    }
  }, [setUser, setProfile]);

  // ── Auth initialization ──────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const timeout = setTimeout(() => {
      if (mountedRef.current && !authReadyRef.current) {
        log.warn('admin', `Auth init timed out after ${AUTH_TIMEOUT_MS}ms`);
        setLoading(false);
        setAuthReady(true);
        authReadyRef.current = true;
        // Don't set authError — just show login form. Timeout likely means no session.
      }
    }, AUTH_TIMEOUT_MS);

    const initAuth = async () => {
      log.info('admin', 'Initializing auth');
      try {
        if (!supabase) {
          log.error('admin', 'Supabase not configured');
          if (mountedRef.current) {
            setLoading(false);
            setAuthReady(true);
            authReadyRef.current = true;
            setAuthError('Supabase is not configured.');
          }
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user && mountedRef.current) {
          log.info('admin', 'Existing session found', { email: session.user.email });
          await loadUserAndProfile(session.user);
        } else {
          log.info('admin', 'No existing session');
        }
      } catch (err) {
        log.error('admin', 'Auth init error', { error: err.message });
        if (mountedRef.current) setAuthError(err.message);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setAuthReady(true);
          authReadyRef.current = true;
          clearTimeout(timeout);
        }
      }
    };

    initAuth();

    // Listen for external auth state changes (e.g., token refresh, tab sync)
    let subscription = null;
    if (supabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mountedRef.current) return;
            log.debug('admin', 'Auth state change', { event });

            if (event === 'SIGNED_OUT') {
              setUser(null);
              setProfile(null);
            }
            // SIGNED_IN is handled directly in handleLogin — don't double-process
          }
        );
        subscription = data?.subscription;
      } catch (err) {
        log.error('admin', 'Auth listener setup failed', { error: err.message });
      }
    }

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [setUser, setProfile, setLoading, loadUserAndProfile]);

  // ── Login handler — direct flow, no reliance on onAuthStateChange ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setAuthError(null);
    setLoginLoading(true);

    log.info('admin', 'Login attempt', { email });

    try {
      if (!supabase) throw new Error('Supabase is not configured');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      log.info('admin', 'Sign-in successful, loading profile');

      // Directly load profile — don't wait for onAuthStateChange
      if (data?.user) {
        await loadUserAndProfile(data.user);
      }
      // Don't set loginLoading=false on success — render gate switches to admin panel
    } catch (err) {
      log.warn('admin', 'Login failed', { error: err.message });
      setLoginError(err.message);
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    log.info('admin', 'Signing out');
    await signOut();
  };

  // ── Render gates (order matters) ──────────────────────────────

  // 1. Still initializing auth — show skeleton
  if (isLoading || !authReady) {
    return (
      <div style={styles.centeredPage}>
        <div style={{ width: '100%', maxWidth: 400, padding: spacing.xxl }}>
          <div style={{ width: 56, height: 56, borderRadius: borderRadius.lg, background: colors.background.elevated, margin: '0 auto 16px' }} />
          <div style={{ height: 24, background: colors.background.elevated, borderRadius: borderRadius.md, width: '60%', margin: '0 auto 8px' }} />
          <div style={{ height: 14, background: colors.background.elevated, borderRadius: borderRadius.sm, width: '80%', margin: '0 auto 32px' }} />
          <div style={{ height: 44, background: colors.background.elevated, borderRadius: borderRadius.lg, marginBottom: 16 }} />
          <div style={{ height: 44, background: colors.background.elevated, borderRadius: borderRadius.lg, marginBottom: 24 }} />
          <div style={{ height: 44, background: colors.background.elevated, borderRadius: borderRadius.lg }} />
        </div>
      </div>
    );
  }

  // 2. Auth error (Supabase not configured, etc.) — show error with reload
  if (authError && !isAuthenticated) {
    return (
      <div style={styles.centeredPage}>
        <div style={{ ...styles.messageCard, borderColor: 'rgba(239,68,68,0.3)' }}>
          <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: spacing.md }} />
          <h1 style={styles.messageTitle}>Connection Error</h1>
          <p style={styles.messageText}>{authError}</p>
          <button onClick={() => window.location.reload()} style={styles.primaryButton}>
            <RefreshCw size={16} />
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // 3. Not authenticated — show login form
  if (!isAuthenticated || !user) {
    return (
      <div style={styles.centeredPage}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <div style={styles.logoIcon}>
              <Crown size={28} style={{ color: '#fff' }} />
            </div>
            <h1 style={styles.loginTitle}>EliteRank Admin</h1>
            <p style={styles.loginSubtitle}>Sign in with your admin account</p>
          </div>

          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eliterank.co"
                required
                autoComplete="email"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={styles.input}
              />
            </div>

            {loginError && (
              <div style={styles.errorMessage}>{loginError}</div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                ...styles.loginButton,
                opacity: loginLoading ? 0.6 : 1,
                cursor: loginLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. Authenticated but not super admin — show access denied with sign out
  if (!isSuperAdmin) {
    return (
      <div style={styles.centeredPage}>
        <div style={styles.messageCard}>
          <Crown size={48} style={{ color: colors.status.error, marginBottom: spacing.md }} />
          <h1 style={styles.messageTitle}>Access Denied</h1>
          <p style={styles.messageText}>
            Your account does not have admin privileges.
          </p>
          <button onClick={handleLogout} style={styles.outlineButton}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 5. Authenticated super admin — render the admin panel
  return (
    <Suspense fallback={<div style={styles.centeredPage} />}>
      <SuperAdminPage onLogout={handleLogout} user={user} profile={profile} />
    </Suspense>
  );
}

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[admin] Uncaught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: colors.background.primary,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: spacing.lg, padding: spacing.xl,
        }}>
          <AlertTriangle size={48} style={{ color: '#ef4444' }} />
          <h1 style={{ color: '#fff', fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold }}>
            Something went wrong
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                padding: `${spacing.md} ${spacing.xl}`, background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`, borderRadius: borderRadius.lg,
                color: '#fff', fontSize: typography.fontSize.md, cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} />
              Reload Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: `${spacing.md} ${spacing.xl}`, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                border: 'none', borderRadius: borderRadius.lg,
                color: '#fff', fontSize: typography.fontSize.md, cursor: 'pointer',
              }}
            >Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AdminErrorBoundary>
      <ToastProvider>
        <AdminApp />
      </ToastProvider>
    </AdminErrorBoundary>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const styles = {
  centeredPage: {
    minHeight: '100vh',
    background: colors.background.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loginCard: {
    width: '100%',
    maxWidth: '400px',
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
  },
  messageCard: {
    textAlign: 'center',
    padding: spacing.xxl,
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.xxl,
    maxWidth: '400px',
    width: '100%',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  logoIcon: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    borderRadius: borderRadius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    marginBottom: spacing.md,
  },
  loginTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  loginSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  messageTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.md,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  input: {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: '#fff',
    fontSize: typography.fontSize.md,
    outline: 'none',
    boxSizing: 'border-box',
  },
  errorMessage: {
    padding: spacing.md,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: borderRadius.md,
    color: '#ef4444',
    fontSize: typography.fontSize.sm,
  },
  loginButton: {
    width: '100%',
    padding: spacing.md,
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    border: 'none',
    borderRadius: borderRadius.lg,
    color: '#fff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.xl}`,
    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    border: 'none',
    borderRadius: borderRadius.lg,
    color: '#fff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  outlineButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.xl}`,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
    cursor: 'pointer',
  },
};

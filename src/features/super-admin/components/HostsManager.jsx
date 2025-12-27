import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, UserX, Mail, Instagram, Linkedin, MapPin, Clock, Check, X, Eye, Loader } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';

export default function HostsManager() {
  const [activeTab, setActiveTab] = useState('hosts');
  const [hosts, setHosts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch hosts from Supabase (users with is_host = true)
  const fetchHosts = useCallback(async () => {
    if (!supabase) {
      setHosts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_host', true)
        .order('created_at', { ascending: false });

      if (error) {
        // is_host column might not exist - that's ok
        console.warn('Error fetching hosts (is_host column may not exist):', error);
        setHosts([]);
        return;
      }

      setHosts((data || []).map(h => ({
        id: h.id,
        name: `${h.first_name || ''} ${h.last_name || ''}`.trim() || h.email,
        email: h.email,
        city: h.city || 'Not specified',
        avatar: h.avatar_url,
        instagram: h.instagram,
        linkedin: h.linkedin,
        joinedAt: h.created_at?.split('T')[0] || 'Unknown',
        competitions: 0, // Would need to count from competitions table
        totalRevenue: 0, // Would need to sum from transactions
        status: 'active',
      })));
    } catch (err) {
      console.error('Error fetching hosts:', err);
      // Don't set error - just show empty hosts
      setHosts([]);
    }
  }, []);

  // Fetch host applications from Supabase
  const fetchApplications = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('host_applications')
        .select('*, profile:profiles(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        console.warn('Host applications table not found or empty:', error);
        setApplications([]);
        return;
      }

      setApplications((data || []).map(app => ({
        id: app.id,
        userId: app.user_id,
        name: app.profile ? `${app.profile.first_name || ''} ${app.profile.last_name || ''}`.trim() : 'Unknown',
        email: app.profile?.email || app.email,
        city: app.city,
        experience: app.experience,
        socialFollowing: app.social_following || 0,
        instagram: app.instagram,
        linkedin: app.linkedin,
        whyHost: app.why_host,
        status: app.status,
        appliedAt: app.created_at?.split('T')[0] || 'Unknown',
      })));
    } catch (err) {
      console.error('Error fetching applications:', err);
      // Don't set error for missing table
      setApplications([]);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      console.log('HostsManager: Starting data load...');
      setLoading(true);

      // Failsafe timeout
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.warn('HostsManager: Load timeout - forcing loading to false');
          setLoading(false);
        }
      }, 10000);

      try {
        await Promise.all([fetchHosts(), fetchApplications()]);
        console.log('HostsManager: Data load complete');
      } catch (err) {
        console.error('HostsManager: Error loading data:', err);
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchHosts, fetchApplications]);

  // Approve a host application
  const handleApprove = async (applicationId) => {
    if (!supabase) return;

    const app = applications.find(a => a.id === applicationId);
    if (!app) return;

    try {
      // Update the user's profile to mark as host
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_host: true })
        .eq('id', app.userId);

      if (profileError) throw profileError;

      // Update application status
      const { error: appError } = await supabase
        .from('host_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      if (appError) throw appError;

      // Refresh data
      await Promise.all([fetchHosts(), fetchApplications()]);
      setSelectedApplication(null);
    } catch (err) {
      console.error('Error approving application:', err);
      setError(err.message);
    }
  };

  // Reject a host application
  const handleReject = async (applicationId) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('host_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) throw error;

      await fetchApplications();
      setSelectedApplication(null);
    } catch (err) {
      console.error('Error rejecting application:', err);
      setError(err.message);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
        color: colors.text.secondary
      }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: spacing.md }} />
        <p>Loading hosts...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Host Management
          </h1>
          <p style={{ color: colors.text.secondary }}>
            Manage hosts and review applications
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl }}>
        <button
          onClick={() => setActiveTab('hosts')}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            background: activeTab === 'hosts' ? 'rgba(139,92,246,0.2)' : 'transparent',
            border: `1px solid ${activeTab === 'hosts' ? '#8b5cf6' : colors.border.light}`,
            borderRadius: borderRadius.lg,
            color: activeTab === 'hosts' ? '#8b5cf6' : colors.text.secondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          <UserCheck size={18} />
          Active Hosts ({hosts.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            background: activeTab === 'applications' ? 'rgba(139,92,246,0.2)' : 'transparent',
            border: `1px solid ${activeTab === 'applications' ? '#8b5cf6' : colors.border.light}`,
            borderRadius: borderRadius.lg,
            color: activeTab === 'applications' ? '#8b5cf6' : colors.text.secondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          <Clock size={18} />
          Pending Applications ({applications.length})
          {applications.length > 0 && (
            <span style={{
              width: '20px',
              height: '20px',
              background: '#ef4444',
              borderRadius: borderRadius.full,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
            }}>
              {applications.length}
            </span>
          )}
        </button>
      </div>

      {/* Active Hosts */}
      {activeTab === 'hosts' && (
        hosts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: spacing.xxxl,
            background: colors.background.card,
            borderRadius: borderRadius.xl,
            border: `1px solid ${colors.border.light}`,
          }}>
            <UserCheck size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.sm }}>No Hosts Yet</h3>
            <p style={{ color: colors.text.secondary }}>
              Hosts will appear here when users are assigned the host role.
            </p>
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginTop: spacing.md }}>
              To add a host, set is_host = true on their profile in Supabase.
            </p>
          </div>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: spacing.xl }}>
          {hosts.map((host) => (
            <div
              key={host.id}
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
              }}
            >
              <div style={{ display: 'flex', gap: spacing.lg, marginBottom: spacing.lg }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  borderRadius: borderRadius.xl,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {host.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>{host.name}</h3>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.sm }}>{host.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <MapPin size={14} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: typography.fontSize.sm, color: '#8b5cf6' }}>{host.city}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md, marginBottom: spacing.lg }}>
                <div style={{ textAlign: 'center', padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.md }}>
                  <p style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: '#8b5cf6' }}>{host.competitions}</p>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Competitions</p>
                </div>
                <div style={{ textAlign: 'center', padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.md }}>
                  <p style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>${(host.totalRevenue / 1000).toFixed(0)}K</p>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Revenue</p>
                </div>
                <div style={{ textAlign: 'center', padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.md }}>
                  <p style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold }}>{host.joinedAt.split('-')[0]}</p>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Joined</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: spacing.sm }}>
                {host.instagram && (
                  <a
                    href={`https://instagram.com/${host.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: spacing.sm,
                      background: colors.background.secondary,
                      borderRadius: borderRadius.md,
                      color: colors.text.secondary,
                    }}
                  >
                    <Instagram size={18} />
                  </a>
                )}
                {host.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${host.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: spacing.sm,
                      background: colors.background.secondary,
                      borderRadius: borderRadius.md,
                      color: colors.text.secondary,
                    }}
                  >
                    <Linkedin size={18} />
                  </a>
                )}
                <Button variant="secondary" size="sm" style={{ marginLeft: 'auto' }}>
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {/* Pending Applications */}
      {activeTab === 'applications' && (
        <div>
          {applications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: spacing.xxxl,
              background: colors.background.card,
              borderRadius: borderRadius.xl,
              border: `1px solid ${colors.border.light}`,
            }}>
              <UserCheck size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
              <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.sm }}>No Pending Applications</h3>
              <p style={{ color: colors.text.secondary }}>All host applications have been reviewed.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              {applications.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: colors.background.card,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.xl,
                    padding: spacing.xl,
                  }}
                >
                  <div style={{ display: 'flex', gap: spacing.xl }}>
                    {/* Left: Profile */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: spacing.lg, marginBottom: spacing.lg }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                          borderRadius: borderRadius.xl,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: typography.fontSize.xl,
                          fontWeight: typography.fontWeight.bold,
                          color: '#000',
                          flexShrink: 0,
                        }}>
                          {app.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>{app.name}</h3>
                            <Badge variant="warning" size="sm">Pending Review</Badge>
                          </div>
                          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.sm }}>{app.email}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                              <MapPin size={14} style={{ color: '#f59e0b' }} />
                              <span style={{ fontSize: typography.fontSize.sm, color: '#f59e0b' }}>{app.city}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                              <Users size={14} style={{ color: colors.text.muted }} />
                              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{app.socialFollowing.toLocaleString()} followers</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: spacing.lg }}>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: spacing.sm }}>Experience</p>
                        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.light, lineHeight: 1.6 }}>{app.experience}</p>
                      </div>

                      <div>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: spacing.sm }}>Why they want to host</p>
                        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.light, lineHeight: 1.6 }}>{app.whyHost}</p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{
                      width: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: spacing.md,
                      paddingLeft: spacing.xl,
                      borderLeft: `1px solid ${colors.border.light}`,
                    }}>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
                        Applied {app.appliedAt}
                      </p>

                      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
                        {app.instagram && (
                          <a
                            href={`https://instagram.com/${app.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: spacing.sm,
                              background: colors.background.secondary,
                              borderRadius: borderRadius.md,
                              color: colors.text.secondary,
                            }}
                          >
                            <Instagram size={18} />
                          </a>
                        )}
                        {app.linkedin && (
                          <a
                            href={`https://linkedin.com/in/${app.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: spacing.sm,
                              background: colors.background.secondary,
                              borderRadius: borderRadius.md,
                              color: colors.text.secondary,
                            }}
                          >
                            <Linkedin size={18} />
                          </a>
                        )}
                      </div>

                      <Button
                        icon={Check}
                        onClick={() => handleApprove(app.id)}
                        style={{ background: '#22c55e' }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        icon={X}
                        onClick={() => handleReject(app.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

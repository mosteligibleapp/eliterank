import React, { useState } from 'react';
import { Users, UserCheck, UserX, Mail, Instagram, Linkedin, MapPin, Clock, Check, X, Eye } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

// Mock data for hosts and applications
const MOCK_HOSTS = [
  {
    id: 'h1',
    name: 'James Davidson',
    email: 'host@eliterank.com',
    city: 'New York',
    avatar: null,
    instagram: '@jamesdavidson',
    linkedin: 'jamesdavidson',
    joinedAt: '2024-01-15',
    competitions: 2,
    totalRevenue: 45000,
    status: 'active',
  },
  {
    id: 'h2',
    name: 'Sarah Miller',
    email: 'sarah@example.com',
    city: 'Chicago',
    avatar: null,
    instagram: '@sarahmiller',
    linkedin: 'sarahmiller',
    joinedAt: '2024-06-01',
    competitions: 1,
    totalRevenue: 12000,
    status: 'active',
  },
];

const MOCK_APPLICATIONS = [
  {
    id: 'a1',
    userId: 'u3',
    name: 'Michael Chen',
    email: 'michael@example.com',
    city: 'Los Angeles',
    experience: '5 years in event management, previously organized charity galas and networking events.',
    socialFollowing: 15000,
    instagram: '@michaelchen',
    linkedin: 'michaelchen',
    whyHost: 'I have a strong network in LA and want to bring exciting social events to the city.',
    status: 'pending',
    appliedAt: '2024-12-20',
  },
  {
    id: 'a2',
    userId: 'u4',
    name: 'Emily Rodriguez',
    email: 'emily@example.com',
    city: 'Miami',
    experience: '3 years as social media manager, built communities of 50k+ followers.',
    socialFollowing: 25000,
    instagram: '@emilyrodriguez',
    linkedin: 'emilyrod',
    whyHost: 'Miami has an amazing social scene and I want to create opportunities for singles to connect.',
    status: 'pending',
    appliedAt: '2024-12-18',
  },
  {
    id: 'a3',
    userId: 'u5',
    name: 'David Park',
    email: 'david@example.com',
    city: 'San Francisco',
    experience: 'Tech industry professional with experience organizing meetups and conferences.',
    socialFollowing: 8000,
    instagram: '@davidpark',
    linkedin: 'davidpark',
    whyHost: 'SF needs more social opportunities outside of tech events.',
    status: 'pending',
    appliedAt: '2024-12-15',
  },
];

export default function HostsManager() {
  const [activeTab, setActiveTab] = useState('hosts');
  const [hosts, setHosts] = useState(MOCK_HOSTS);
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const handleApprove = (applicationId) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;

    // Add to hosts
    setHosts([...hosts, {
      id: app.userId,
      name: app.name,
      email: app.email,
      city: app.city,
      avatar: null,
      instagram: app.instagram,
      linkedin: app.linkedin,
      joinedAt: new Date().toISOString().split('T')[0],
      competitions: 0,
      totalRevenue: 0,
      status: 'active',
    }]);

    // Remove from applications
    setApplications(applications.filter(a => a.id !== applicationId));
    setSelectedApplication(null);
  };

  const handleReject = (applicationId) => {
    setApplications(applications.filter(a => a.id !== applicationId));
    setSelectedApplication(null);
  };

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

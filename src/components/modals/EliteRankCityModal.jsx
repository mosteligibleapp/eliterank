import React, { useState, useEffect } from 'react';
import {
  X, Crown, MapPin, Calendar, Trophy, Clock, ChevronRight, Sparkles, Users, Star,
  Ticket, Activity, Info, Briefcase, UserPlus, Loader
} from 'lucide-react';
import { Button, Badge, OrganizationLogo } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

const TABS = [
  { id: 'competitions', label: 'Competitions', icon: Crown },
  { id: 'about', label: 'About', icon: Info },
];

export default function EliteRankCityModal({
  isOpen,
  onClose,
  onOpenCompetition,
  isFullPage = false,
  onLogin,
  onDashboard,
  isAuthenticated = false,
  userRole = 'fan',
  userName,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState('competitions');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch competitions and organizations from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const [compsResult, orgsResult] = await Promise.all([
          supabase.from('competitions').select('*').order('created_at', { ascending: false }),
          supabase.from('organizations').select('*').order('name'),
        ]);

        if (compsResult.data) {
          setCompetitions(compsResult.data.map(comp => ({
            id: comp.id,
            name: `${comp.city} ${comp.season || ''}`.trim(),
            city: comp.city,
            season: comp.season || new Date().getFullYear(),
            status: comp.status || 'upcoming',
            // Use status as the phase for PublicSitePage consistency
            phase: comp.status || 'setup',
            contestants: 0,
            votes: 0,
            // Allow viewing competitions that are in nomination, voting, judging, or completed phases
            available: ['active', 'nomination', 'voting', 'judging', 'completed', 'assigned'].includes(comp.status),
            organizationId: comp.organization_id,
            host: comp.host_id ? { id: comp.host_id } : null,
          })));
        }

        if (orgsResult.data) {
          setOrganizations(orgsResult.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCompetitionClick = (competition) => {
    if (competition.available && onOpenCompetition) {
      onOpenCompetition(competition);
    }
  };

  const getOrganizationName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || '';
  };

  const getOrganizationLogo = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.logo || null;
  };

  // Competition Card Component
  const CompetitionCard = ({ competition, isEnded = false }) => {
    const isHovered = hoveredCard === competition.id;
    const isAvailable = competition.available;

    const statusConfig = {
      active: { variant: 'success', label: 'LIVE NOW', icon: null, pulse: true },
      voting: { variant: 'success', label: 'VOTING', icon: null, pulse: true },
      nomination: { variant: 'warning', label: 'NOMINATIONS OPEN', icon: UserPlus },
      judging: { variant: 'info', label: 'JUDGING', icon: null, pulse: true },
      setup: { variant: 'default', label: 'SETUP', icon: Clock },
      assigned: { variant: 'warning', label: 'COMING SOON', icon: Clock },
      upcoming: { variant: 'warning', label: 'COMING SOON', icon: Clock },
      completed: { variant: 'secondary', label: 'COMPLETED', icon: Trophy },
    };

    const status = statusConfig[competition.status] || statusConfig.upcoming;

    return (
      <div
        onClick={() => handleCompetitionClick(competition)}
        onMouseEnter={() => setHoveredCard(competition.id)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          position: 'relative',
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          cursor: isAvailable ? 'pointer' : 'default',
          transform: isHovered && isAvailable ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isHovered && isAvailable
            ? '0 20px 40px rgba(212,175,55,0.3), 0 0 0 2px rgba(212,175,55,0.5)'
            : '0 4px 20px rgba(0,0,0,0.3)',
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
        }}
      >
        <div style={{
          background: `linear-gradient(135deg, ${colors.gold.primary}15, transparent)`,
          padding: spacing.xl,
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg }}>
            <Badge variant={status.variant} size="md" pill>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {status.pulse && (
                  <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                )}
                {status.icon && <status.icon size={12} />}
                {status.label}
              </span>
            </Badge>
            <OrganizationLogo logo={getOrganizationLogo(competition.organizationId)} size={40} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
              <MapPin size={14} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, textTransform: 'uppercase', letterSpacing: '2px' }}>
                {competition.city}
              </span>
            </div>

            {competition.organizationId && (
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>
                {getOrganizationName(competition.organizationId)}
              </p>
            )}

            <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.sm }}>
              {competition.name}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <Calendar size={14} style={{ color: colors.text.secondary }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Season {competition.season}</span>
            </div>
          </div>

          {isAvailable && (
            <div style={{
              marginTop: spacing.lg,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              color: colors.gold.primary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              opacity: isHovered ? 1 : 0.7,
              transition: 'opacity 0.2s',
            }}>
              {competition.status === 'nomination' ? 'Nominate Now' : 'View Competition'}
              <ChevronRight size={18} style={{ transform: isHovered ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Tab Content
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary, marginBottom: spacing.md }} />
          <p style={{ color: colors.text.secondary }}>Loading competitions...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    switch (activeTab) {
      case 'competitions':
        return (
          <>
            <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.lg, lineHeight: 1.2 }}>
                Discover the Most Eligible
                <span style={{ display: 'block', color: colors.gold.primary }}>In Your City</span>
              </h2>
              <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                Vote for your favorites, attend exclusive events, and be part of the most exciting social competition in America.
              </p>
            </section>

            <section style={{ padding: `0 ${spacing.xxl} ${spacing.xxxl}`, maxWidth: '1400px', margin: '0 auto' }}>
              {competitions.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                    <Sparkles size={24} style={{ color: colors.gold.primary }} />
                    <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>
                      Active Competitions
                    </h3>
                    <Badge variant="warning" size="sm">{competitions.length}</Badge>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl }}>
                    {competitions.map((competition) => (
                      <CompetitionCard key={competition.id} competition={competition} />
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: spacing.xxxl, background: colors.background.card, borderRadius: borderRadius.xxl, border: `1px solid ${colors.border.light}` }}>
                  <Crown size={48} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
                  <h3 style={{ fontSize: typography.fontSize.xl, color: '#fff', marginBottom: spacing.sm }}>No Competitions Yet</h3>
                  <p style={{ fontSize: typography.fontSize.md, color: colors.text.secondary }}>
                    Check back soon for upcoming competitions in your city!
                  </p>
                </div>
              )}
            </section>
          </>
        );

      case 'about':
        return (
          <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', borderRadius: borderRadius.xl, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: spacing.xl }}>
                <Crown size={40} style={{ color: '#0a0a0f' }} />
              </div>
              <h2 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.lg }}>About Elite Rank</h2>
              <p style={{ fontSize: typography.fontSize.xl, color: colors.text.secondary, maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                Elite Rank is America's premier social competition platform, connecting ambitious professionals through city-based competitions, exclusive events, and meaningful networking opportunities.
              </p>
            </div>

            <div style={{ background: colors.background.card, border: `1px solid ${colors.border.gold}`, borderRadius: borderRadius.xxl, padding: spacing.xxxl, marginBottom: spacing.xxxl }}>
              <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary, marginBottom: spacing.lg, textAlign: 'center' }}>Our Mission</h3>
              <p style={{ fontSize: typography.fontSize.lg, color: colors.text.primary, textAlign: 'center', lineHeight: 1.8 }}>
                To celebrate and elevate exceptional individuals in every major city. We believe that recognition, community, and connection are powerful catalysts for personal and professional growth.
              </p>
            </div>

            <div style={{ marginBottom: spacing.xxxl }}>
              <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.xl, textAlign: 'center' }}>How It Works</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.xl }}>
                {[
                  { step: '1', title: 'Compete', desc: 'Contestants are nominated and compete for votes in their city' },
                  { step: '2', title: 'Vote', desc: 'The public votes for their favorites throughout the season' },
                  { step: '3', title: 'Win', desc: 'Winners are crowned at exclusive finale events' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: spacing.xl }}>
                    <div style={{ width: '48px', height: '48px', background: colors.gold.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#0a0a0f' }}>{item.step}</div>
                    <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.sm }}>{item.title}</h4>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  const containerStyle = isFullPage
    ? { minHeight: '100vh', background: colors.background.primary }
    : {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        zIndex: 1000,
        overflow: 'auto',
      };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.border.light}`,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: `${spacing.md} ${spacing.xxl}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Crown size={24} style={{ color: '#0a0a0f' }} />
            </div>
            <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
              Elite<span style={{ color: colors.gold.primary }}>Rank</span>
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: spacing.xs }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: `${spacing.sm} ${spacing.lg}`,
                  background: activeTab === tab.id ? 'rgba(212,175,55,0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  color: activeTab === tab.id ? colors.gold.primary : colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Auth Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {isAuthenticated ? (
              <>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Hi, {userName}
                </span>
                {onDashboard && (
                  <Button variant="secondary" size="sm" onClick={onDashboard}>Dashboard</Button>
                )}
                <Button variant="secondary" size="sm" onClick={onLogout}>Logout</Button>
              </>
            ) : (
              onLogin && <Button variant="primary" size="sm" onClick={onLogin}>Sign In</Button>
            )}
            {!isFullPage && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text.secondary,
                  cursor: 'pointer',
                  padding: spacing.sm,
                }}
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        {renderContent()}
      </main>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

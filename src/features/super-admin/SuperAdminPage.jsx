import React, { useState } from 'react';
import { Crown, MapPin, Users, Settings, Building2, Gift } from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { HostAssignmentModal } from '../../components/modals';
import CompetitionsManager from './components/CompetitionsManager';
import HostsManager from './components/HostsManager';
import CitiesManager from './components/CitiesManager';
import OrganizationsManager from './components/OrganizationsManager';
import RewardsManager from './components/RewardsManager';
import SiteSettingsManager from './components/SiteSettingsManager';
import { CompetitionDashboard } from '../competition-dashboard';

const TABS = [
  { id: 'organizations', label: 'Organizations', shortLabel: 'Orgs', icon: Building2 },
  { id: 'cities', label: 'Cities', shortLabel: 'Cities', icon: MapPin },
  { id: 'competitions', label: 'Competitions', shortLabel: 'Comps', icon: Crown },
  { id: 'rewards', label: 'Rewards', shortLabel: 'Rewards', icon: Gift },
  { id: 'hosts', label: 'Hosts', shortLabel: 'Hosts', icon: Users },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export default function SuperAdminPage({ onLogout }) {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('organizations');
  const [viewingCompetition, setViewingCompetition] = useState(null);
  const [showHostAssignment, setShowHostAssignment] = useState(false);
  const [hostAssignCallback, setHostAssignCallback] = useState(null);

  const handleViewCompetition = (competition) => {
    setViewingCompetition(competition);
  };

  const handleBackToCompetitions = () => {
    setViewingCompetition(null);
  };

  const handleOpenHostAssignment = (callback) => {
    setHostAssignCallback(() => callback);
    setShowHostAssignment(true);
  };

  const handleCloseHostAssignment = () => {
    setShowHostAssignment(false);
    setHostAssignCallback(null);
  };

  // If viewing a competition, show the shared competition dashboard
  if (viewingCompetition) {
    return (
      <>
        <CompetitionDashboard
          competitionId={viewingCompetition.id}
          role="superadmin"
          onBack={handleBackToCompetitions}
          onLogout={onLogout}
          onOpenHostAssignment={() => handleOpenHostAssignment(null)}
          onViewPublicSite={() => {
            // Navigate to public page format: /:orgSlug/:city-year
            const orgSlug = viewingCompetition?.organization?.slug || viewingCompetition?.organization_slug || 'most-eligible';
            const cityName = viewingCompetition?.city?.name || viewingCompetition?.city_name || viewingCompetition?.city || 'competition';
            const citySlug = cityName.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '');
            const year = viewingCompetition?.season || new Date().getFullYear();
            const path = `/${orgSlug}/${citySlug}-${year}`;
            window.open(path, '_blank');
          }}
        />
        <HostAssignmentModal
          isOpen={showHostAssignment}
          onClose={handleCloseHostAssignment}
          onAssign={async (userId) => {
            // The assignment is handled by the dashboard's hook
            if (hostAssignCallback) {
              await hostAssignCallback(userId);
            }
            handleCloseHostAssignment();
          }}
          currentHostId={viewingCompetition.host_id}
        />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'organizations':
        return <OrganizationsManager />;
      case 'cities':
        return <CitiesManager />;
      case 'competitions':
        return (
          <CompetitionsManager
            onViewDashboard={handleViewCompetition}
          />
        );
      case 'rewards':
        return <RewardsManager />;
      case 'hosts':
        return <HostsManager />;
      case 'settings':
        return <SiteSettingsManager />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.background.primary }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(212,175,55,0.1))',
        borderBottom: `1px solid ${colors.border.light}`,
        padding: isMobile ? `${spacing.md} ${spacing.md}` : `${spacing.lg} ${spacing.xxl}`,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? spacing.sm : spacing.md, minWidth: 0 }}>
            <div style={{
              width: isMobile ? '36px' : '48px',
              height: isMobile ? '36px' : '48px',
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Crown size={isMobile ? 20 : 26} style={{ color: '#fff' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                }}>
                  Elite Rank
                </h1>
                <Badge variant="warning" size="sm">ADMIN</Badge>
              </div>
              {!isMobile && (
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Manage competitions, hosts, and cities
                </p>
              )}
            </div>
          </div>
          <Button variant="secondary" size={isMobile ? 'sm' : 'md'} onClick={onLogout}>
            {isMobile ? 'Out' : 'Sign Out'}
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        background: colors.background.secondary,
        borderBottom: `1px solid ${colors.border.light}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          gap: '0',
          padding: isMobile ? `0 ${spacing.sm}` : `0 ${spacing.xxl}`,
          minWidth: 'max-content',
        }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: isMobile ? `${spacing.md} ${spacing.sm}` : `${spacing.lg} ${spacing.xl}`,
                  color: isActive ? '#8b5cf6' : colors.text.secondary,
                  fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.md,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                  borderBottom: `2px solid ${isActive ? '#8b5cf6' : 'transparent'}`,
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '4px' : spacing.sm,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  minHeight: '44px',
                }}
              >
                <Icon size={isMobile ? 14 : 18} /> {isMobile ? tab.shortLabel : tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? spacing.md : spacing.xxl
      }}>
        {renderContent()}
      </main>
    </div>
  );
}

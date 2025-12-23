import React, { useState } from 'react';
import { X, Crown, Users, Calendar, Sparkles, Award, UserPlus } from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import ContestantsTab from './components/ContestantsTab';
import EventsTab from './components/EventsTab';
import AnnouncementsTab from './components/AnnouncementsTab';
import AboutTab from './components/AboutTab';
import NominationTab from './components/NominationTab';
import VoteModal from './components/VoteModal';

const VOTING_TABS = [
  { id: 'contestants', label: 'Contestants', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'announcements', label: 'Announcements', icon: Sparkles },
  { id: 'about', label: 'About', icon: Award },
];

const NOMINATION_TABS = [
  { id: 'nominate', label: 'Nominate', icon: UserPlus },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'announcements', label: 'Announcements', icon: Sparkles },
  { id: 'about', label: 'About', icon: Award },
];

export default function PublicSitePage({
  isOpen,
  onClose,
  city = 'New York',
  phase = 'voting', // 'nomination' or 'voting'
  contestants,
  events,
  announcements,
  judges,
  sponsors,
  forceDoubleVoteDay = true,
}) {
  const isNominationPhase = phase === 'nomination';
  const TABS = isNominationPhase ? NOMINATION_TABS : VOTING_TABS;
  const [activeTab, setActiveTab] = useState(isNominationPhase ? 'nominate' : 'contestants');
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [voteCount, setVoteCount] = useState(1);

  if (!isOpen) return null;

  const platinumSponsor = sponsors.find((s) => s.tier === 'Platinum');

  const headerStyle = {
    background: 'linear-gradient(135deg, rgba(212,175,55,0.1), transparent)',
    borderBottom: `1px solid rgba(212,175,55,0.2)`,
    padding: `${spacing.lg} ${spacing.xxl}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(20px)',
  };

  const navStyle = {
    background: 'rgba(20,20,30,0.8)',
    borderBottom: `1px solid ${colors.border.lighter}`,
    padding: `0 ${spacing.xxl}`,
    position: 'sticky',
    top: '73px',
    zIndex: 9,
  };

  const getTabStyle = (isActive) => ({
    padding: `${spacing.md} ${spacing.xl}`,
    color: isActive ? colors.gold.primary : colors.text.secondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                  borderRadius: borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown size={22} style={{ color: '#0a0a0f' }} />
              </div>
              <div>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Most Eligible
                </p>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                  {city}
                </p>
              </div>
            </div>
            {platinumSponsor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.lg, paddingLeft: spacing.lg, borderLeft: `1px solid ${colors.border.light}` }}>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Presented by
                </span>
                <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.tier.platinum }}>
                  {platinumSponsor.name}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {isNominationPhase ? (
              <Badge variant="warning" size="md" pill>
                <Sparkles size={12} /> NOMINATIONS OPEN
              </Badge>
            ) : (
              <Badge variant="success" size="md" pill>
                ● LIVE
              </Badge>
            )}
            <Button variant="secondary" onClick={onClose} icon={X} style={{ width: 'auto', padding: `${spacing.sm} ${spacing.lg}` }}>
              Exit Preview
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={navStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} style={getTabStyle(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: `${spacing.xxxl} ${spacing.xxl}` }}>
        {activeTab === 'nominate' && (
          <NominationTab
            city={city}
            onNominationSubmit={(data) => console.log('Nomination submitted:', data)}
          />
        )}
        {activeTab === 'contestants' && (
          <ContestantsTab
            contestants={contestants}
            events={events}
            forceDoubleVoteDay={forceDoubleVoteDay}
            onVote={setSelectedContestant}
          />
        )}
        {activeTab === 'events' && <EventsTab events={events} />}
        {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} />}
        {activeTab === 'about' && (
          <AboutTab
            judges={judges}
            sponsors={sponsors}
            events={events}
          />
        )}
      </main>

      {/* Vote Modal */}
      <VoteModal
        isOpen={!!selectedContestant}
        onClose={() => setSelectedContestant(null)}
        contestant={selectedContestant}
        voteCount={voteCount}
        onVoteCountChange={setVoteCount}
        forceDoubleVoteDay={forceDoubleVoteDay}
      />
    </div>
  );
}

import React from 'react';
import { X, Crown, MapPin, Calendar, Trophy, Clock, CheckCircle } from 'lucide-react';
import { colors, spacing, borderRadius, typography, shadows, gradients } from '../../styles/theme';

const UPCOMING_COMPETITIONS = [
  {
    id: 1,
    name: 'Most Eligible New York',
    city: 'New York',
    season: '2026',
    status: 'upcoming',
    startDate: 'March 2026',
  },
  {
    id: 2,
    name: 'Most Eligible Chicago',
    city: 'Chicago',
    season: '2026',
    status: 'upcoming',
    startDate: 'May 2026',
  },
  {
    id: 3,
    name: 'Most Eligible Miami',
    city: 'Miami',
    season: '2026',
    status: 'upcoming',
    startDate: 'July 2026',
  },
  {
    id: 4,
    name: 'Most Eligible USA',
    city: 'National',
    season: '2026',
    status: 'upcoming',
    startDate: 'October 2026',
  },
];

const ENDED_COMPETITIONS = [
  {
    id: 5,
    name: 'Most Eligible Chicago',
    city: 'Chicago',
    season: '2025',
    status: 'ended',
    endDate: 'December 2025',
    winner: 'Sarah Mitchell',
  },
];

export default function EliteRankCityModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: colors.background.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backdropFilter: 'blur(4px)',
  };

  const modalStyle = {
    background: colors.background.secondary,
    border: `1px solid ${colors.border.gold}`,
    borderRadius: borderRadius.xxl,
    width: '90%',
    maxWidth: '800px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: shadows.goldLarge,
  };

  const headerStyle = {
    background: gradients.goldSubtle,
    padding: spacing.xl,
    borderBottom: `1px solid ${colors.border.gold}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const sectionStyle = {
    padding: spacing.xl,
  };

  const sectionTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.lg,
    color: colors.text.primary,
  };

  const competitionCardStyle = {
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  };

  const CompetitionCard = ({ competition, isEnded }) => (
    <div
      style={{
        ...competitionCardStyle,
        borderColor: isEnded ? colors.border.light : colors.border.gold,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: borderRadius.lg,
            background: isEnded ? 'rgba(255,255,255,0.05)' : gradients.goldSubtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isEnded ? (
            <Trophy size={24} style={{ color: colors.gold.primary }} />
          ) : (
            <Crown size={24} style={{ color: colors.gold.primary }} />
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.xs,
            }}
          >
            {competition.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <MapPin size={12} />
              {competition.city}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <Calendar size={12} />
              Season {competition.season}
            </span>
          </div>
          {isEnded && competition.winner && (
            <div
              style={{
                marginTop: spacing.sm,
                fontSize: typography.fontSize.sm,
                color: colors.gold.primary,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Trophy size={12} />
              Winner: {competition.winner}
            </div>
          )}
        </div>
      </div>
      <div>
        {isEnded ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              background: 'rgba(255,255,255,0.05)',
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: borderRadius.pill,
              fontSize: typography.fontSize.xs,
              color: colors.text.secondary,
            }}
          >
            <CheckCircle size={12} />
            Completed
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              background: gradients.goldSubtle,
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: borderRadius.pill,
              fontSize: typography.fontSize.xs,
              color: colors.gold.primary,
              border: `1px solid ${colors.border.gold}`,
            }}
          >
            <Clock size={12} />
            {competition.startDate}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: borderRadius.lg,
                background: gradients.gold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={20} style={{ color: '#000' }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                Elite Rank City
              </h2>
              <p
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                }}
              >
                Browse all Most Eligible competitions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: colors.text.secondary,
              padding: spacing.sm,
              borderRadius: borderRadius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ maxHeight: 'calc(85vh - 100px)', overflowY: 'auto' }}>
          {/* Upcoming Season 2026 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Clock size={18} style={{ color: colors.gold.primary }} />
              Upcoming - Season 2026
            </div>
            {UPCOMING_COMPETITIONS.map((competition) => (
              <CompetitionCard
                key={competition.id}
                competition={competition}
                isEnded={false}
              />
            ))}
          </div>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              background: colors.border.light,
              margin: `0 ${spacing.xl}`,
            }}
          />

          {/* Ended Season 2025 */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Trophy size={18} style={{ color: colors.text.secondary }} />
              Ended - Season 2025
            </div>
            {ENDED_COMPETITIONS.map((competition) => (
              <CompetitionCard
                key={competition.id}
                competition={competition}
                isEnded={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

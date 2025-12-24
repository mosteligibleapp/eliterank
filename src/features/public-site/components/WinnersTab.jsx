import React, { useState } from 'react';
import { Crown, Trophy, Star, Instagram, Sparkles } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatNumber } from '../../../utils/formatters';
import ProfileModal from './ProfileModal';

// Winner images - professional headshots
const WINNER_IMAGES = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face',
];

// Medal colors for top 5
const MEDAL_STYLES = {
  1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' },
  2: { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#000' },
  3: { bg: 'linear-gradient(135deg, #CD7F32, #B8860B)', color: '#000' },
  4: { bg: 'rgba(0,0,0,0.7)', color: '#fff' },
  5: { bg: 'rgba(0,0,0,0.7)', color: '#fff' },
};

export default function WinnersTab({ city, season, winners = [] }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleViewProfile = (winner, index) => {
    setSelectedProfile(winner);
    setSelectedIndex(index);
  };

  // If no winners provided, use placeholder data
  const displayWinners = winners.length > 0 ? winners : [
    { rank: 1, name: 'Sarah Mitchell', votes: 28450, occupation: 'Marketing Executive', instagram: '@sarahmitchell' },
    { rank: 2, name: 'James Rodriguez', votes: 24320, occupation: 'Tech Entrepreneur', instagram: '@jamesrodriguez' },
    { rank: 3, name: 'Emily Chen', votes: 21890, occupation: 'Fashion Designer', instagram: '@emilychen' },
    { rank: 4, name: 'Michael Thompson', votes: 19750, occupation: 'Investment Banker', instagram: '@michaelthompson' },
    { rank: 5, name: 'Olivia Williams', votes: 18420, occupation: 'Attorney', instagram: '@oliviawilliams' },
  ];

  const grandWinner = displayWinners[0];
  const runnerUps = displayWinners.slice(1, 5);

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: spacing.xxxl,
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: typography.fontWeight.bold,
          color: '#fff',
          marginBottom: spacing.md,
          lineHeight: 1.1,
        }}>
          Congratulations to
          <span style={{ display: 'block', color: colors.gold.primary }}>{city}'s Most Eligible!</span>
        </h1>

        <p style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Thank you to everyone who participated, voted, and made this season unforgettable.
        </p>
      </div>

      {/* Grand Winner Card - Photo Focused */}
      {grandWinner && (
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          marginBottom: spacing.xxxl,
        }}>
          <div
            onClick={() => handleViewProfile(grandWinner, 0)}
            style={{
              background: colors.background.card,
              border: `2px solid ${colors.gold.primary}`,
              borderRadius: borderRadius.xxl,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {/* Crown Badge */}
            <div style={{
              position: 'absolute',
              top: spacing.md,
              left: spacing.md,
              width: '48px',
              height: '48px',
              borderRadius: borderRadius.lg,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
            }}>
              <Crown size={28} style={{ color: '#000' }} />
            </div>

            {/* Winner Badge */}
            <div style={{
              position: 'absolute',
              top: spacing.md,
              right: spacing.md,
              padding: `${spacing.xs} ${spacing.md}`,
              background: 'rgba(212,175,55,0.9)',
              borderRadius: borderRadius.pill,
              zIndex: 2,
            }}>
              <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Winner
              </span>
            </div>

            {/* Profile Image */}
            <div style={{
              width: '100%',
              aspectRatio: '4/5',
              background: '#1a1a24',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <img
                src={WINNER_IMAGES[0]}
                alt={grandWinner.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: `${spacing.xxxl} ${spacing.lg} ${spacing.lg}`,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
              }}>
                <p style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.gold.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: spacing.xs,
                  fontWeight: typography.fontWeight.semibold,
                }}>
                  Season {season} Champion
                </p>
                <h2 style={{
                  fontSize: typography.fontSize.xxl,
                  fontWeight: typography.fontWeight.bold,
                  color: '#fff',
                  marginBottom: spacing.xs,
                }}>
                  {grandWinner.name}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.md }}>
                  {grandWinner.occupation}
                </p>
              </div>
            </div>

            {/* Card Footer */}
            <div style={{
              padding: `${spacing.lg} ${spacing.xl}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: colors.background.cardHover,
            }}>
              <div>
                <p style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
                  {formatNumber(grandWinner.votes)}
                </p>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Votes
                </p>
              </div>
              {grandWinner.instagram && (
                <a
                  href={`https://instagram.com/${grandWinner.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    color: colors.text.light,
                    textDecoration: 'none',
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Instagram size={18} />
                  <span style={{ fontSize: typography.fontSize.sm }}>{grandWinner.instagram}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Runner Ups - Photo Cards */}
      <div style={{ marginBottom: spacing.xxxl }}>
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.xl,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
        }}>
          <Sparkles size={24} style={{ color: colors.gold.primary }} />
          Top 5 Finalists
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: spacing.xl,
        }}>
          {runnerUps.map((winner, index) => {
            const medalStyle = MEDAL_STYLES[winner.rank];

            return (
              <div
                key={winner.rank}
                onClick={() => handleViewProfile(winner, index + 1)}
                style={{
                  background: colors.background.card,
                  border: winner.rank <= 3 ? `2px solid rgba(212,175,55,0.4)` : `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.xxl,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                {/* Rank Badge */}
                <div style={{
                  position: 'absolute',
                  top: spacing.md,
                  left: spacing.md,
                  width: '32px',
                  height: '32px',
                  borderRadius: borderRadius.md,
                  background: medalStyle?.bg || 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.bold,
                  color: medalStyle?.color || '#fff',
                  zIndex: 2,
                }}>
                  {winner.rank}
                </div>

                {/* Profile Image */}
                <div style={{
                  width: '100%',
                  aspectRatio: '4/5',
                  background: '#1a1a24',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <img
                    src={WINNER_IMAGES[index + 1] || WINNER_IMAGES[0]}
                    alt={winner.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: `${spacing.xxxl} ${spacing.lg} ${spacing.md}`,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
                  }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: '2px', color: '#fff' }}>
                      {winner.name}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm }}>
                      {winner.occupation}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: colors.background.cardHover,
                }}>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: winner.rank <= 3 ? colors.gold.primary : '#fff' }}>
                      {formatNumber(winner.votes)}
                    </p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Votes
                    </p>
                  </div>
                  {winner.instagram && (
                    <a
                      href={`https://instagram.com/${winner.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: colors.text.muted }}
                    >
                      <Instagram size={18} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Season Stats */}
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xxl,
        padding: spacing.xxl,
        marginBottom: spacing.xxxl,
      }}>
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.xl,
          textAlign: 'center',
        }}>
          Season {season} by the Numbers
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: spacing.lg,
        }}>
          {[
            { value: '18', label: 'Contestants' },
            { value: '89K+', label: 'Total Votes' },
            { value: '12', label: 'Events' },
            { value: '5', label: 'Winners' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: typography.fontSize.hero,
                fontWeight: typography.fontWeight.bold,
                color: colors.gold.primary,
                marginBottom: spacing.xs,
              }}>
                {stat.value}
              </p>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Thank You Message */}
      <div style={{
        textAlign: 'center',
        padding: spacing.xxl,
        background: 'rgba(212,175,55,0.05)',
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border.gold}`,
      }}>
        <Trophy size={48} style={{ color: colors.gold.primary, marginBottom: spacing.lg }} />
        <h3 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.md,
        }}>
          Thank You, {city}!
        </h3>
        <p style={{
          fontSize: typography.fontSize.md,
          color: colors.text.secondary,
          maxWidth: '500px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Season {season} was incredible thanks to our amazing contestants, dedicated voters, and supportive sponsors.
          See you next season!
        </p>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        profile={selectedProfile}
        type="contestant"
        rank={selectedProfile?.rank}
        imageIndex={selectedIndex}
      />
    </div>
  );
}

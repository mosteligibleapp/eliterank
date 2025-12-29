import React, { useState } from 'react';
import { Crown, Sparkles, LogIn, Award } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatNumber } from '../../../utils/formatters';
import { useCountdown } from '../../../hooks';
import { CONTESTANT_IMAGES, COMPETITION_STAGES } from '../../../constants';

export default function ContestantsTab({ contestants, events, forceDoubleVoteDay, onVote, isAuthenticated = false, onLogin, isJudgingPhase = false, onViewProfile }) {
  const currentStage = COMPETITION_STAGES.find((s) => s.status === 'active') || COMPETITION_STAGES[1];
  const timeLeft = useCountdown(currentStage.endDate);

  // Handle vote button click - require authentication
  const handleVoteClick = (contestant) => {
    if (isJudgingPhase) return; // Voting disabled during judging
    if (!isAuthenticated && onLogin) {
      onLogin();
    } else {
      onVote(contestant);
    }
  };

  const getTrendStyle = (trend) => ({
    width: '28px',
    height: '28px',
    borderRadius: borderRadius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
    background: trend === 'up' ? 'rgba(34,197,94,0.9)' : trend === 'down' ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    zIndex: 2,
  });

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
        <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
          Meet the Contestants
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg, marginBottom: spacing.xxxl }}>
          {isJudgingPhase
            ? 'Voting has ended. Our judges are now evaluating the finalists!'
            : 'Vote for your favorite to help them advance to the finals'
          }
        </p>

        {/* Double Vote Day Alert - only show during voting phase */}
        {forceDoubleVoteDay && !isJudgingPhase && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(251,191,36,0.1))',
              border: `2px solid rgba(212,175,55,0.4)`,
              borderRadius: borderRadius.xl,
              padding: `${spacing.lg} ${spacing.xxl}`,
              marginBottom: spacing.xxxl,
              maxWidth: '500px',
              margin: '0 auto 32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
              <Sparkles size={24} style={{ color: colors.gold.primary }} />
              <div>
                <p style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.xl }}>
                  DOUBLE VOTE DAY!
                </p>
                <p style={{ color: colors.text.light, fontSize: typography.fontSize.md }}>
                  Every vote counts twice today • $1 = 2 votes
                </p>
              </div>
              <Sparkles size={24} style={{ color: colors.gold.primary }} />
            </div>
          </div>
        )}

        {/* Show different content based on phase */}
        {isJudgingPhase ? (
          /* Judging in Progress Banner */
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
              border: `1px solid rgba(59,130,246,0.3)`,
              borderRadius: borderRadius.xxl,
              padding: `${spacing.xxl} ${spacing.xxxl}`,
              maxWidth: '700px',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md }}>
              <Award size={32} style={{ color: colors.status.info }} />
              <span
                style={{
                  color: colors.status.info,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                Judging in Progress
              </span>
            </div>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>
              Our panel of judges is evaluating the finalists. Winners will be announced at the Finals Gala!
            </p>
          </div>
        ) : (
          /* Countdown Timer - only during voting */
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.xxl,
              padding: `${spacing.xxl} ${spacing.xxxl}`,
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: borderRadius.full,
                  background: colors.status.success,
                  boxShadow: '0 0 10px rgba(74,222,128,0.5)',
                }}
              />
              <span
                style={{
                  color: colors.gold.primary,
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                {currentStage.name} Ends In
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.lg }}>
              {[
                { value: timeLeft.days, label: 'Days' },
                { value: timeLeft.hours, label: 'Hours' },
                { value: timeLeft.minutes, label: 'Minutes' },
                { value: timeLeft.seconds, label: 'Seconds' },
              ].map((unit) => (
                <div key={unit.label} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: borderRadius.xl,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid rgba(212,175,55,0.2)`,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <span
                      style={{
                        fontSize: typography.fontSize.hero,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.gold.primary,
                        fontFamily: 'monospace',
                      }}
                    >
                      {String(unit.value).padStart(2, '0')}
                    </span>
                  </div>
                  <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base, marginTop: spacing.lg }}>
              {!isAuthenticated
                ? 'Sign in to vote for your favorite contestant!'
                : 'Vote now to help your favorite advance to the next round!'
              }
            </p>
          </div>
        )}
      </div>

      {/* Contestant Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: spacing.xl }}>
        {contestants.map((contestant, index) => (
          <div
            key={contestant.id}
            onClick={() => onViewProfile?.(contestant)}
            style={{
              background: colors.background.card,
              border: index < 3 ? `2px solid rgba(212,175,55,0.4)` : `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xxl,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.3s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = index < 3
                ? '0 12px 40px rgba(212,175,55,0.3)'
                : '0 8px 24px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Rank Badge */}
            <div
              style={{
                position: 'absolute',
                top: spacing.md,
                left: spacing.md,
                width: '32px',
                height: '32px',
                borderRadius: borderRadius.md,
                background:
                  index === 0
                    ? 'linear-gradient(135deg, #d4af37, #f4d03f)'
                    : index === 1
                      ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8)'
                      : index === 2
                        ? 'linear-gradient(135deg, #cd7f32, #daa06d)'
                        : 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.bold,
                color: index < 3 ? '#0a0a0f' : '#fff',
                zIndex: 2,
              }}
            >
              {index + 1}
            </div>

            {/* Trend Badge */}
            <div style={{ position: 'absolute', top: spacing.md, right: spacing.md, ...getTrendStyle(contestant.trend) }}>
              {contestant.trend === 'up' ? '↑' : contestant.trend === 'down' ? '↓' : '—'}
            </div>

            {/* Profile Image */}
            <div
              style={{
                width: '100%',
                aspectRatio: '4/5',
                background: '#1a1a24',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <img
                src={contestant.avatarUrl || contestant.avatar_url || CONTESTANT_IMAGES[index] || CONTESTANT_IMAGES[0]}
                alt={contestant.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: `${spacing.xxxl} ${spacing.lg} ${spacing.md}`,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
                }}
              >
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: '2px', color: '#fff' }}>
                  {contestant.name}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: typography.fontSize.sm }}>
                  {contestant.age} • {contestant.occupation}
                </p>
              </div>
            </div>

            {/* Card Footer */}
            <div
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: colors.background.cardHover,
              }}
            >
              <div>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: index < 3 ? colors.gold.primary : '#fff' }}>
                  {formatNumber(contestant.votes)}
                </p>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Votes
                </p>
              </div>
              {isJudgingPhase ? (
                <Badge variant="info" size="md">
                  <Award size={12} /> Judging
                </Badge>
              ) : !isAuthenticated ? (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVoteClick(contestant);
                  }}
                  size="md"
                  variant="secondary"
                >
                  <LogIn size={14} />
                  Sign In
                </Button>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVoteClick(contestant);
                  }}
                  size="md"
                >
                  Vote
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

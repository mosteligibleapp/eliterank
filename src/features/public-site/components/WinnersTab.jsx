import React, { useState, useEffect } from 'react';
import { Crown, Trophy, Sparkles, Loader } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';

export default function WinnersTab({ city, season, winners = [], competitionId, onViewProfile }) {
  const [loadedWinners, setLoadedWinners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch winners from competition if competitionId is provided
  useEffect(() => {
    const fetchWinners = async () => {
      // If winners already provided as profiles, use them
      if (winners.length > 0 && winners[0]?.first_name) {
        setLoadedWinners(winners);
        setLoading(false);
        return;
      }

      // If competitionId provided, fetch from database
      if (competitionId && supabase) {
        try {
          // Get competition with winners
          const { data: compData, error: compError } = await supabase
            .from('competitions')
            .select('winners')
            .eq('id', competitionId)
            .single();

          if (compError || !compData?.winners?.length) {
            setLoadedWinners([]);
            setLoading(false);
            return;
          }

          // Fetch winner profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, avatar_url')
            .in('id', compData.winners);

          if (profilesError || !profiles) {
            setLoadedWinners([]);
            setLoading(false);
            return;
          }

          // Maintain order from winner IDs
          const orderedWinners = compData.winners
            .map(id => profiles.find(p => p.id === id))
            .filter(Boolean);

          setLoadedWinners(orderedWinners);
        } catch (err) {
          console.error('Error fetching winners:', err);
          setLoadedWinners([]);
        }
      } else {
        setLoadedWinners([]);
      }
      setLoading(false);
    };

    fetchWinners();
  }, [competitionId, winners]);

  const getProfileName = (profile) => {
    if (!profile) return 'Unknown';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || profile.email || 'Unknown';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <Loader size={48} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary, marginBottom: spacing.lg }} />
        <p style={{ color: colors.text.secondary }}>Loading winners...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!loadedWinners || loadedWinners.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <Trophy size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
        <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md, color: '#fff' }}>
          Winners
        </h2>
        <p style={{ color: colors.text.secondary }}>
          No winners have been announced yet.
        </p>
      </div>
    );
  }

  const grandWinner = loadedWinners[0];
  const runnerUps = loadedWinners.slice(1);

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

      {/* Grand Winner Card */}
      {grandWinner && (
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          marginBottom: spacing.xxxl,
        }}>
          <div
            onClick={() => onViewProfile?.(grandWinner)}
            style={{
              background: colors.background.card,
              border: `2px solid ${colors.gold.primary}`,
              borderRadius: borderRadius.xxl,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(212,175,55,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
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

            {/* Profile Image/Avatar */}
            <div style={{
              width: '100%',
              aspectRatio: '4/5',
              background: grandWinner.avatar_url
                ? `url(${grandWinner.avatar_url}) center/cover`
                : 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {!grandWinner.avatar_url && (
                <span style={{
                  fontSize: '120px',
                  fontWeight: typography.fontWeight.bold,
                  color: colors.gold.primary,
                  opacity: 0.5,
                }}>
                  {getProfileName(grandWinner).charAt(0).toUpperCase()}
                </span>
              )}
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
                  {getProfileName(grandWinner)}
                </h2>
              </div>
            </div>

            {/* Card Footer */}
            <div style={{
              padding: `${spacing.lg} ${spacing.xl}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colors.background.cardHover,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                color: colors.gold.primary,
              }}>
                <Trophy size={20} />
                <span style={{ fontWeight: typography.fontWeight.semibold }}>Grand Champion</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Runner Ups */}
      {runnerUps.length > 0 && (
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
            Other Winners
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: spacing.xl,
            justifyContent: 'center',
          }}>
            {runnerUps.map((winner, index) => (
              <div
                key={winner.id}
                onClick={() => onViewProfile?.(winner)}
                style={{
                  background: colors.background.card,
                  border: `1px solid rgba(212,175,55,0.3)`,
                  borderRadius: borderRadius.xxl,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
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
                  background: 'rgba(212,175,55,0.2)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}>
                  <Crown size={18} style={{ color: colors.gold.primary }} />
                </div>

                {/* Profile Image/Avatar */}
                <div style={{
                  width: '100%',
                  aspectRatio: '4/5',
                  background: winner.avatar_url
                    ? `url(${winner.avatar_url}) center/cover`
                    : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {!winner.avatar_url && (
                    <span style={{
                      fontSize: '80px',
                      fontWeight: typography.fontWeight.bold,
                      color: colors.gold.primary,
                      opacity: 0.3,
                    }}>
                      {getProfileName(winner).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: `${spacing.xxxl} ${spacing.lg} ${spacing.md}`,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
                  }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginBottom: '2px', color: '#fff' }}>
                      {getProfileName(winner)}
                    </h3>
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: colors.background.cardHover,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    padding: `${spacing.xs} ${spacing.md}`,
                    background: 'rgba(212,175,55,0.15)',
                    borderRadius: borderRadius.pill,
                    color: colors.gold.primary,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    <Trophy size={12} />
                    Winner
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

    </div>
  );
}

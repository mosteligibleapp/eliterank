import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Crown, Trophy, Sparkles, Star, Award, Medal, 
  ChevronRight, Share2, ExternalLink, Users, 
  TrendingUp, Calendar, ArrowRight, Instagram, Twitter,
  Download, Loader, Check
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { generateAchievementCard, getPlacementTitle } from '../../achievement-cards';

/**
 * WinnersShowcase - Premium winners display inspired by
 * Forbes 30u30, Kalshi, Posh, and Sweatpals
 * 
 * Features:
 * - Cinematic hero section for grand champion
 * - Podium display for top 3
 * - Leaderboard for top 10
 * - Past seasons archive (auto-populated)
 * - Social share cards
 * - Zero manual work after setup
 * 
 * @param {Object} props
 * @param {string} props.competitionId - Current/active competition
 * @param {string} props.city - City name for display
 * @param {string} props.season - Season identifier
 * @param {Array} props.winners - Pre-loaded winners (optional)
 * @param {Function} props.onViewProfile - Callback when viewing a profile
 */

// ============================================
// DESIGN TOKENS (EliteRank aligned)
// ============================================
const tokens = {
  colors: {
    gold: {
      primary: '#d4af37',
      light: '#f5d77a',
      dark: '#b8960c',
      glow: 'rgba(212, 175, 55, 0.3)',
      subtle: 'rgba(212, 175, 55, 0.1)',
    },
    silver: '#c0c0c0',
    bronze: '#cd7f32',
    bg: {
      primary: '#08080c',
      secondary: '#0f0f14',
      card: '#141419',
      elevated: '#1c1c24',
      glass: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a1a1aa',
      muted: '#71717a',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.1)',
      gold: 'rgba(212, 175, 55, 0.3)',
    },
  },
  spacing: {
    xs: '4px', sm: '8px', md: '12px', lg: '16px',
    xl: '24px', xxl: '32px', xxxl: '48px', xxxxl: '64px',
  },
  radius: {
    sm: '6px', md: '8px', lg: '12px', xl: '16px', 
    xxl: '20px', xxxl: '24px', full: '9999px',
  },
  shadows: {
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
    glow: {
      gold: '0 0 60px rgba(212, 175, 55, 0.4)',
      goldStrong: '0 0 80px rgba(212, 175, 55, 0.6)',
    },
  },
  font: {
    display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    size: {
      xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
      xl: '1.25rem', xxl: '1.5rem', xxxl: '2rem', xxxxl: '2.5rem',
      hero: 'clamp(2.5rem, 6vw, 4rem)',
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700, black: 900 },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getProfileName = (profile) => {
  if (!profile) return 'Unknown';
  const firstName = profile.first_name || profile.firstName || '';
  const lastName = profile.last_name || profile.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || profile.name || profile.email?.split('@')[0] || 'Unknown';
};

const getRankColor = (rank) => {
  if (rank === 1) return tokens.colors.gold.primary;
  if (rank === 2) return tokens.colors.silver;
  if (rank === 3) return tokens.colors.bronze;
  return tokens.colors.text.muted;
};

const getRankIcon = (rank) => {
  if (rank === 1) return Crown;
  if (rank === 2) return Award;
  if (rank === 3) return Medal;
  return Star;
};

/**
 * Generate and share/download a winner card
 */
const useWinnerCardShare = (competition, organization) => {
  const [generating, setGenerating] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);

  const generateAndDownload = useCallback(async (winner, rank = 1) => {
    if (!winner) return;
    
    setGenerating(winner.id);
    
    try {
      const name = getProfileName(winner);
      const achievementType = rank === 1 ? 'winner' : 'placement';
      const customTitle = rank === 1 ? undefined : getPlacementTitle(rank);
      
      const blob = await generateAchievementCard({
        achievementType,
        customTitle,
        name,
        photoUrl: winner.avatar_url,
        handle: winner.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city}`,
        season: competition?.season?.toString(),
        organizationName: organization?.name || 'Most Eligible',
        organizationLogoUrl: organization?.logo_url,
        accentColor: competition?.theme_primary || '#d4af37',
        voteUrl: competition?.slug ? `mosteligible.co/${competition.slug}` : 'mosteligible.co',
        rank,
      });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-winner-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShareStatus({ id: winner.id, status: 'downloaded' });
      setTimeout(() => setShareStatus(null), 2000);
    } catch (err) {
      console.error('Failed to generate winner card:', err);
    } finally {
      setGenerating(null);
    }
  }, [competition, organization]);

  const shareToSocial = useCallback(async (winner, rank = 1) => {
    if (!winner) return;
    
    setGenerating(winner.id);
    
    try {
      const name = getProfileName(winner);
      const achievementType = rank === 1 ? 'winner' : 'placement';
      const customTitle = rank === 1 ? undefined : getPlacementTitle(rank);
      
      const blob = await generateAchievementCard({
        achievementType,
        customTitle,
        name,
        photoUrl: winner.avatar_url,
        handle: winner.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city}`,
        season: competition?.season?.toString(),
        organizationName: organization?.name || 'Most Eligible',
        organizationLogoUrl: organization?.logo_url,
        accentColor: competition?.theme_primary || '#d4af37',
        voteUrl: competition?.slug ? `mosteligible.co/${competition.slug}` : 'mosteligible.co',
        rank,
      });

      // Try native share if available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'winner-card.png', { type: 'image/png' });
        const shareData = {
          title: `${name} - Most Eligible ${competition?.city || ''} Winner`,
          text: `Congratulations to ${name} for winning Most Eligible ${competition?.city || ''}! 🏆`,
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setShareStatus({ id: winner.id, status: 'shared' });
          setTimeout(() => setShareStatus(null), 2000);
          return;
        }
      }

      // Fallback to download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-winner-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShareStatus({ id: winner.id, status: 'downloaded' });
      setTimeout(() => setShareStatus(null), 2000);
    } catch (err) {
      console.error('Failed to share winner card:', err);
    } finally {
      setGenerating(null);
    }
  }, [competition, organization]);

  return { generating, shareStatus, generateAndDownload, shareToSocial };
};

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Animated background particles
 */
const ParticleBackground = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  }}>
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: `${Math.random() * 4 + 2}px`,
          height: `${Math.random() * 4 + 2}px`,
          background: tokens.colors.gold.primary,
          borderRadius: '50%',
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          opacity: Math.random() * 0.3 + 0.1,
          animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
          animationDelay: `${Math.random() * -10}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.1; }
        50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
      }
    `}</style>
  </div>
);

/**
 * Winner Avatar with rank indicator
 */
const WinnerAvatar = ({ 
  src, 
  name, 
  rank, 
  size = 'md',
  showGlow = false,
  onClick 
}) => {
  const sizes = {
    sm: { avatar: 48, ring: 3, icon: 14 },
    md: { avatar: 72, ring: 4, icon: 18 },
    lg: { avatar: 96, ring: 4, icon: 22 },
    xl: { avatar: 140, ring: 5, icon: 28 },
    hero: { avatar: 200, ring: 6, icon: 36 },
  };
  
  const s = sizes[size] || sizes.md;
  const rankColor = getRankColor(rank);
  const Icon = getRankIcon(rank);
  
  return (
    <div 
      onClick={onClick}
      style={{
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {/* Glow effect for champion */}
      {showGlow && (
        <div style={{
          position: 'absolute',
          inset: -20,
          background: `radial-gradient(circle, ${tokens.colors.gold.glow} 0%, transparent 70%)`,
          animation: 'pulse 3s ease-in-out infinite',
        }} />
      )}
      
      {/* Avatar ring */}
      <div style={{
        width: s.avatar,
        height: s.avatar,
        borderRadius: '50%',
        padding: s.ring,
        background: rank <= 3 
          ? `linear-gradient(135deg, ${rankColor}, ${rankColor}88)`
          : tokens.colors.border.default,
        boxShadow: rank === 1 ? tokens.shadows.glow.gold : 'none',
      }}>
        {/* Avatar image */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          background: src 
            ? `url(${src}) center/cover` 
            : `linear-gradient(135deg, ${tokens.colors.bg.elevated}, ${tokens.colors.bg.card})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {!src && (
            <span style={{
              fontSize: s.avatar * 0.4,
              fontWeight: tokens.font.weight.bold,
              color: tokens.colors.gold.primary,
              opacity: 0.6,
            }}>
              {getInitials(name)}
            </span>
          )}
        </div>
      </div>
      
      {/* Rank badge */}
      {rank && rank <= 10 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: s.icon * 1.5,
          height: s.icon * 1.5,
          borderRadius: '50%',
          background: rank <= 3 
            ? `linear-gradient(135deg, ${rankColor}, ${rankColor}cc)`
            : tokens.colors.bg.elevated,
          border: `2px solid ${tokens.colors.bg.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: rank === 1 ? tokens.shadows.glow.gold : tokens.shadows.card,
        }}>
          {rank <= 3 ? (
            <Icon size={s.icon * 0.7} style={{ color: rank === 1 ? '#000' : '#fff' }} />
          ) : (
            <span style={{ 
              fontSize: s.icon * 0.6, 
              fontWeight: tokens.font.weight.bold,
              color: tokens.colors.text.primary,
            }}>
              {rank}
            </span>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

/**
 * Hero section for the grand champion
 */
const ChampionHero = ({ winner, city, season, stats, onViewProfile, onShare, isSharing, shareStatus }) => {
  if (!winner) return null;
  
  const name = getProfileName(winner);
  
  return (
    <section style={{
      position: 'relative',
      padding: `${tokens.spacing.xxxxl} ${tokens.spacing.xl}`,
      background: `linear-gradient(180deg, ${tokens.colors.bg.secondary} 0%, ${tokens.colors.bg.primary} 100%)`,
      borderBottom: `1px solid ${tokens.colors.border.gold}`,
      overflow: 'hidden',
    }}>
      <ParticleBackground />
      
      <div style={{
        position: 'relative',
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: tokens.spacing.xxl,
      }}>
        {/* Season badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
          background: tokens.colors.gold.subtle,
          border: `1px solid ${tokens.colors.border.gold}`,
          borderRadius: tokens.radius.full,
        }}>
          <Crown size={14} style={{ color: tokens.colors.gold.primary }} />
          <span style={{
            fontSize: tokens.font.size.xs,
            fontWeight: tokens.font.weight.semibold,
            color: tokens.colors.gold.primary,
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}>
            Season {season} Champion
          </span>
        </div>
        
        {/* Champion avatar */}
        <WinnerAvatar
          src={winner.avatar_url}
          name={name}
          rank={1}
          size="hero"
          showGlow
          onClick={() => onViewProfile?.(winner)}
        />
        
        {/* Champion name */}
        <div>
          <h1 style={{
            fontSize: tokens.font.size.hero,
            fontWeight: tokens.font.weight.black,
            fontFamily: tokens.font.display,
            color: tokens.colors.text.primary,
            margin: 0,
            lineHeight: 1.1,
          }}>
            {name}
          </h1>
          <p style={{
            fontSize: tokens.font.size.xl,
            color: tokens.colors.gold.primary,
            margin: `${tokens.spacing.md} 0 0`,
            fontWeight: tokens.font.weight.medium,
          }}>
            Most Eligible {city}
          </p>
        </div>
        
        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: tokens.spacing.xxxl,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {winner.votes && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: tokens.font.size.xxxl,
                fontWeight: tokens.font.weight.bold,
                color: tokens.colors.text.primary,
              }}>
                {formatNumber(winner.votes)}
              </div>
              <div style={{
                fontSize: tokens.font.size.sm,
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                Votes
              </div>
            </div>
          )}
          {stats?.totalVoters && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: tokens.font.size.xxxl,
                fontWeight: tokens.font.weight.bold,
                color: tokens.colors.text.primary,
              }}>
                {formatNumber(stats.totalVoters)}
              </div>
              <div style={{
                fontSize: tokens.font.size.sm,
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                Voters
              </div>
            </div>
          )}
          {stats?.totalContestants && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: tokens.font.size.xxxl,
                fontWeight: tokens.font.weight.bold,
                color: tokens.colors.text.primary,
              }}>
                {stats.totalContestants}
              </div>
              <div style={{
                fontSize: tokens.font.size.sm,
                color: tokens.colors.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                Contestants
              </div>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: tokens.spacing.md,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => onViewProfile?.(winner)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: tokens.spacing.sm,
              padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
              background: `linear-gradient(135deg, ${tokens.colors.gold.primary}, ${tokens.colors.gold.dark})`,
              color: '#000',
              border: 'none',
              borderRadius: tokens.radius.full,
              fontSize: tokens.font.size.sm,
              fontWeight: tokens.font.weight.semibold,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = tokens.shadows.glow.gold;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            View Profile
            <ChevronRight size={16} />
          </button>
          
          <button
            onClick={() => onShare?.(winner, 1)}
            disabled={isSharing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: tokens.spacing.sm,
              padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
              background: 'transparent',
              color: shareStatus?.id === winner?.id ? tokens.colors.gold.primary : tokens.colors.text.primary,
              border: `1px solid ${shareStatus?.id === winner?.id ? tokens.colors.gold.primary : tokens.colors.border.default}`,
              borderRadius: tokens.radius.full,
              fontSize: tokens.font.size.sm,
              fontWeight: tokens.font.weight.medium,
              cursor: isSharing ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isSharing ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSharing) {
                e.currentTarget.style.borderColor = tokens.colors.gold.primary;
                e.currentTarget.style.color = tokens.colors.gold.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSharing && shareStatus?.id !== winner?.id) {
                e.currentTarget.style.borderColor = tokens.colors.border.default;
                e.currentTarget.style.color = tokens.colors.text.primary;
              }
            }}
          >
            {isSharing ? (
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : shareStatus?.id === winner?.id ? (
              <Check size={16} />
            ) : (
              <Share2 size={16} />
            )}
            {shareStatus?.id === winner?.id ? 'Downloaded!' : 'Share Card'}
          </button>
        </div>
      </div>
    </section>
  );
};

/**
 * Podium display for top 3
 */
const WinnersPodium = ({ winners, onViewProfile }) => {
  if (!winners || winners.length < 2) return null;
  
  // Reorder for podium: 2nd, 1st, 3rd
  const [first, second, third] = winners;
  const podiumOrder = [
    { winner: second, rank: 2, height: 100 },
    { winner: first, rank: 1, height: 140 },
    { winner: third, rank: 3, height: 80 },
  ].filter(p => p.winner);
  
  return (
    <section style={{
      padding: `${tokens.spacing.xxxl} ${tokens.spacing.xl}`,
      background: tokens.colors.bg.primary,
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* Section header */}
        <div style={{
          textAlign: 'center',
          marginBottom: tokens.spacing.xxxl,
        }}>
          <h2 style={{
            fontSize: tokens.font.size.xxl,
            fontWeight: tokens.font.weight.bold,
            color: tokens.colors.text.primary,
            margin: 0,
          }}>
            Top Performers
          </h2>
          <p style={{
            fontSize: tokens.font.size.base,
            color: tokens.colors.text.secondary,
            marginTop: tokens.spacing.sm,
          }}>
            This season's highest vote recipients
          </p>
        </div>
        
        {/* Podium */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: tokens.spacing.lg,
        }}>
          {podiumOrder.map(({ winner, rank, height }) => {
            const name = getProfileName(winner);
            const isFirst = rank === 1;
            const rankColor = getRankColor(rank);
            
            return (
              <div
                key={winner.id || rank}
                onClick={() => onViewProfile?.(winner)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  flex: isFirst ? '0 0 auto' : '0 0 auto',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Avatar */}
                <WinnerAvatar
                  src={winner.avatar_url}
                  name={name}
                  rank={rank}
                  size={isFirst ? 'xl' : 'lg'}
                  showGlow={isFirst}
                />
                
                {/* Name */}
                <p style={{
                  fontSize: isFirst ? tokens.font.size.lg : tokens.font.size.base,
                  fontWeight: tokens.font.weight.semibold,
                  color: tokens.colors.text.primary,
                  margin: `${tokens.spacing.md} 0 ${tokens.spacing.xs}`,
                  textAlign: 'center',
                  maxWidth: '120px',
                }}>
                  {name}
                </p>
                
                {/* Votes */}
                <p style={{
                  fontSize: tokens.font.size.sm,
                  color: tokens.colors.text.muted,
                  margin: 0,
                }}>
                  {formatNumber(winner.votes)} votes
                </p>
                
                {/* Podium stand */}
                <div style={{
                  marginTop: tokens.spacing.lg,
                  width: isFirst ? '120px' : '100px',
                  height: height,
                  background: `linear-gradient(180deg, ${rankColor}40 0%, ${rankColor}20 100%)`,
                  borderRadius: `${tokens.radius.lg} ${tokens.radius.lg} 0 0`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingTop: tokens.spacing.lg,
                  border: `1px solid ${rankColor}40`,
                  borderBottom: 'none',
                }}>
                  <span style={{
                    fontSize: isFirst ? tokens.font.size.xxxl : tokens.font.size.xxl,
                    fontWeight: tokens.font.weight.black,
                    color: rankColor,
                  }}>
                    {rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Leaderboard for top 10
 */
const TopTenLeaderboard = ({ winners, onViewProfile }) => {
  if (!winners || winners.length <= 3) return null;
  
  const remaining = winners.slice(3, 10);
  if (remaining.length === 0) return null;
  
  return (
    <section style={{
      padding: `${tokens.spacing.xxxl} ${tokens.spacing.xl}`,
      background: tokens.colors.bg.secondary,
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        {/* Section header */}
        <div style={{
          textAlign: 'center',
          marginBottom: tokens.spacing.xxl,
        }}>
          <h2 style={{
            fontSize: tokens.font.size.xl,
            fontWeight: tokens.font.weight.bold,
            color: tokens.colors.text.primary,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.sm,
          }}>
            <Trophy size={20} style={{ color: tokens.colors.gold.primary }} />
            Top 10 Finalists
          </h2>
        </div>
        
        {/* Leaderboard rows */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.sm,
        }}>
          {remaining.map((winner, index) => {
            const rank = index + 4;
            const name = getProfileName(winner);
            
            return (
              <div
                key={winner.id || rank}
                onClick={() => onViewProfile?.(winner)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.lg,
                  padding: tokens.spacing.lg,
                  background: tokens.colors.bg.card,
                  borderRadius: tokens.radius.lg,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tokens.colors.bg.elevated;
                  e.currentTarget.style.borderColor = tokens.colors.border.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = tokens.colors.bg.card;
                  e.currentTarget.style.borderColor = tokens.colors.border.subtle;
                }}
              >
                {/* Rank */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: tokens.radius.md,
                  background: tokens.colors.bg.elevated,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: tokens.font.size.sm,
                    fontWeight: tokens.font.weight.bold,
                    color: tokens.colors.text.secondary,
                  }}>
                    {rank}
                  </span>
                </div>
                
                {/* Avatar */}
                <WinnerAvatar
                  src={winner.avatar_url}
                  name={name}
                  size="sm"
                />
                
                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: tokens.font.size.base,
                    fontWeight: tokens.font.weight.medium,
                    color: tokens.colors.text.primary,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </p>
                </div>
                
                {/* Votes */}
                <div style={{
                  fontSize: tokens.font.size.sm,
                  color: tokens.colors.text.muted,
                  fontWeight: tokens.font.weight.medium,
                  flexShrink: 0,
                }}>
                  {formatNumber(winner.votes)}
                </div>
                
                <ChevronRight size={16} style={{ 
                  color: tokens.colors.text.muted, 
                  flexShrink: 0 
                }} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * All Winners Grid (like MostEligibleChi titleholders)
 */
const AllWinnersGrid = ({ winners, title = "Winners", onViewProfile }) => {
  if (!winners || winners.length === 0) return null;
  
  return (
    <section style={{
      padding: `${tokens.spacing.xxxl} ${tokens.spacing.xl}`,
      background: tokens.colors.bg.primary,
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{
          textAlign: 'center',
          marginBottom: tokens.spacing.xxl,
        }}>
          <h2 style={{
            fontSize: tokens.font.size.xxl,
            fontWeight: tokens.font.weight.bold,
            color: tokens.colors.text.primary,
            margin: 0,
          }}>
            {title}
          </h2>
        </div>
        
        {/* Winners grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: tokens.spacing.xl,
        }}>
          {winners.map((winner, index) => {
            const name = getProfileName(winner);
            const rank = index + 1;
            
            return (
              <div
                key={winner.id || index}
                onClick={() => onViewProfile?.(winner)}
                style={{
                  background: tokens.colors.bg.card,
                  borderRadius: tokens.radius.xxl,
                  overflow: 'hidden',
                  border: rank === 1 
                    ? `2px solid ${tokens.colors.gold.primary}` 
                    : `1px solid ${tokens.colors.border.subtle}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: rank === 1 ? tokens.shadows.glow.gold : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = rank === 1 
                    ? tokens.shadows.glow.goldStrong 
                    : tokens.shadows.card;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = rank === 1 
                    ? tokens.shadows.glow.gold 
                    : 'none';
                }}
              >
                {/* Image section */}
                <div style={{
                  position: 'relative',
                  paddingTop: tokens.spacing.xxl,
                  paddingBottom: tokens.spacing.lg,
                  display: 'flex',
                  justifyContent: 'center',
                  background: `linear-gradient(180deg, ${tokens.colors.bg.elevated} 0%, transparent 100%)`,
                }}>
                  <WinnerAvatar
                    src={winner.avatar_url}
                    name={name}
                    rank={rank}
                    size="lg"
                    showGlow={rank === 1}
                  />
                </div>
                
                {/* Info section */}
                <div style={{
                  padding: `${tokens.spacing.md} ${tokens.spacing.lg} ${tokens.spacing.xl}`,
                  textAlign: 'center',
                }}>
                  <h3 style={{
                    fontSize: tokens.font.size.lg,
                    fontWeight: tokens.font.weight.semibold,
                    color: tokens.colors.text.primary,
                    margin: 0,
                  }}>
                    {name}
                  </h3>
                  
                  {/* Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    marginTop: tokens.spacing.sm,
                    padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
                    background: tokens.colors.gold.subtle,
                    borderRadius: tokens.radius.full,
                  }}>
                    <Crown size={12} style={{ color: tokens.colors.gold.primary }} />
                    <span style={{
                      fontSize: tokens.font.size.xs,
                      color: tokens.colors.gold.primary,
                      fontWeight: tokens.font.weight.medium,
                    }}>
                      {rank === 1 ? 'Champion' : 'Winner'}
                    </span>
                  </div>
                  
                  {/* Votes */}
                  {winner.votes && (
                    <p style={{
                      fontSize: tokens.font.size.sm,
                      color: tokens.colors.text.muted,
                      marginTop: tokens.spacing.sm,
                      margin: `${tokens.spacing.sm} 0 0`,
                    }}>
                      {formatNumber(winner.votes)} votes
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Past seasons horizontal scroll
 */
const PastSeasonsScroll = ({ seasons, currentSeason, onSelectSeason }) => {
  if (!seasons || seasons.length <= 1) return null;
  
  const pastSeasons = seasons.filter(s => s.season !== currentSeason);
  if (pastSeasons.length === 0) return null;
  
  return (
    <section style={{
      padding: `${tokens.spacing.xxl} ${tokens.spacing.xl}`,
      background: tokens.colors.bg.secondary,
      borderTop: `1px solid ${tokens.colors.border.subtle}`,
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: tokens.spacing.xl,
        }}>
          <h3 style={{
            fontSize: tokens.font.size.lg,
            fontWeight: tokens.font.weight.semibold,
            color: tokens.colors.text.primary,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}>
            <Calendar size={18} style={{ color: tokens.colors.gold.primary }} />
            Past Champions
          </h3>
        </div>
        
        <div style={{
          display: 'flex',
          gap: tokens.spacing.lg,
          overflowX: 'auto',
          paddingBottom: tokens.spacing.md,
          scrollbarWidth: 'thin',
          scrollbarColor: `${tokens.colors.gold.primary}40 transparent`,
        }}>
          {pastSeasons.map((season) => (
            <div
              key={season.season}
              onClick={() => onSelectSeason?.(season)}
              style={{
                flexShrink: 0,
                width: '160px',
                padding: tokens.spacing.lg,
                background: tokens.colors.bg.card,
                borderRadius: tokens.radius.xl,
                border: `1px solid ${tokens.colors.border.subtle}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border.gold;
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.border.subtle;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {season.champion?.avatar_url ? (
                <img
                  src={season.champion.avatar_url}
                  alt={getProfileName(season.champion)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${tokens.colors.gold.primary}40`,
                    margin: '0 auto',
                  }}
                />
              ) : (
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: tokens.colors.bg.elevated,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}>
                  <Crown size={24} style={{ color: tokens.colors.gold.primary }} />
                </div>
              )}
              
              <p style={{
                fontSize: tokens.font.size.sm,
                fontWeight: tokens.font.weight.medium,
                color: tokens.colors.text.primary,
                margin: `${tokens.spacing.md} 0 ${tokens.spacing.xs}`,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {season.champion ? getProfileName(season.champion) : 'View'}
              </p>
              
              <p style={{
                fontSize: tokens.font.size.xs,
                color: tokens.colors.gold.primary,
                margin: 0,
              }}>
                Season {season.season}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Stats bar / social proof
 */
const StatsBar = ({ stats }) => {
  if (!stats) return null;
  
  const items = [
    { label: 'Total Votes', value: stats.totalVotes, icon: TrendingUp },
    { label: 'Contestants', value: stats.totalContestants, icon: Users },
    { label: 'Voters', value: stats.totalVoters, icon: Users },
  ].filter(item => item.value);
  
  if (items.length === 0) return null;
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: tokens.spacing.xxxl,
      padding: `${tokens.spacing.xl} ${tokens.spacing.lg}`,
      background: tokens.colors.bg.glass,
      borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      flexWrap: 'wrap',
    }}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}>
            <Icon size={16} style={{ color: tokens.colors.gold.primary }} />
            <span style={{
              fontSize: tokens.font.size.sm,
              color: tokens.colors.text.secondary,
            }}>
              <strong style={{ color: tokens.colors.text.primary }}>
                {formatNumber(item.value)}
              </strong>
              {' '}{item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Footer CTA
 */
const FooterCTA = ({ city, season }) => (
  <section style={{
    padding: `${tokens.spacing.xxxxl} ${tokens.spacing.xl}`,
    background: `linear-gradient(180deg, ${tokens.colors.bg.primary} 0%, ${tokens.colors.bg.secondary} 100%)`,
    textAlign: 'center',
  }}>
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: tokens.spacing.xxl,
      background: tokens.colors.gold.subtle,
      borderRadius: tokens.radius.xxl,
      border: `1px solid ${tokens.colors.border.gold}`,
    }}>
      <Trophy size={48} style={{ 
        color: tokens.colors.gold.primary, 
        marginBottom: tokens.spacing.lg 
      }} />
      
      <h3 style={{
        fontSize: tokens.font.size.xl,
        fontWeight: tokens.font.weight.bold,
        color: tokens.colors.text.primary,
        margin: `0 0 ${tokens.spacing.md}`,
      }}>
        Thank You, {city}!
      </h3>
      
      <p style={{
        fontSize: tokens.font.size.base,
        color: tokens.colors.text.secondary,
        margin: `0 0 ${tokens.spacing.xl}`,
        lineHeight: 1.6,
      }}>
        Season {season} was incredible. Thank you to everyone who participated, 
        voted, and made this unforgettable. See you next season!
      </p>
      
      <button style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
        background: `linear-gradient(135deg, ${tokens.colors.gold.primary}, ${tokens.colors.gold.dark})`,
        color: '#000',
        border: 'none',
        borderRadius: tokens.radius.full,
        fontSize: tokens.font.size.sm,
        fontWeight: tokens.font.weight.semibold,
        cursor: 'pointer',
      }}>
        Get Notified for Next Season
        <ArrowRight size={16} />
      </button>
    </div>
  </section>
);

/**
 * Loading state
 */
const LoadingState = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xxxxl,
    minHeight: '400px',
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      border: `3px solid ${tokens.colors.border.subtle}`,
      borderTopColor: tokens.colors.gold.primary,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
    <p style={{
      marginTop: tokens.spacing.lg,
      color: tokens.colors.text.secondary,
    }}>
      Loading winners...
    </p>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * Empty state
 */
const EmptyState = ({ city }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xxxxl,
    textAlign: 'center',
    minHeight: '400px',
  }}>
    <Trophy size={64} style={{ 
      color: tokens.colors.text.muted, 
      marginBottom: tokens.spacing.lg 
    }} />
    <h2 style={{
      fontSize: tokens.font.size.xl,
      fontWeight: tokens.font.weight.bold,
      color: tokens.colors.text.primary,
      margin: `0 0 ${tokens.spacing.md}`,
    }}>
      Winners Coming Soon
    </h2>
    <p style={{
      fontSize: tokens.font.size.base,
      color: tokens.colors.text.secondary,
      maxWidth: '400px',
    }}>
      {city ? `${city}'s ` : ''}winners haven't been announced yet. 
      Check back soon!
    </p>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function WinnersShowcase({
  competitionId,
  city = 'Chicago',
  season = '2025',
  winners: propWinners = [],
  pastSeasons = [],
  stats = {},
  onViewProfile,
  variant = 'full', // 'full' | 'compact' | 'hero-only'
  competition = null, // For share card generation
  organization = null, // For share card generation
}) {
  // Share card functionality
  const { generating, shareStatus, generateAndDownload, shareToSocial } = useWinnerCardShare(
    competition || { city, season, name: `Most Eligible ${city}` },
    organization
  );
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch winners if not provided
  useEffect(() => {
    const fetchWinners = async () => {
      // Use provided winners if available
      if (propWinners.length > 0) {
        setWinners(propWinners);
        setLoading(false);
        return;
      }

      // Fetch from database if competitionId provided
      if (competitionId && supabase) {
        try {
          const { data: compData } = await supabase
            .from('competitions')
            .select('winners')
            .eq('id', competitionId)
            .single();

          if (compData?.winners?.length) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', compData.winners);

            if (profiles) {
              // Maintain winner order
              const ordered = compData.winners
                .map(id => profiles.find(p => p.id === id))
                .filter(Boolean);
              setWinners(ordered);
            }
          }
        } catch (err) {
          console.error('Error fetching winners:', err);
        }
      }
      setLoading(false);
    };

    fetchWinners();
  }, [competitionId, propWinners]);

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Empty state
  if (!winners || winners.length === 0) {
    return <EmptyState city={city} />;
  }

  const champion = winners[0];
  const topThree = winners.slice(0, 3);
  const allWinners = winners;

  // Render based on variant
  if (variant === 'hero-only') {
    return (
      <ChampionHero
        winner={champion}
        city={city}
        season={season}
        stats={stats}
        onViewProfile={onViewProfile}
        onShare={shareToSocial}
        isSharing={generating === champion?.id}
        shareStatus={shareStatus}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <AllWinnersGrid
        winners={allWinners}
        title={`${city}'s Most Eligible ${season}`}
        onViewProfile={onViewProfile}
      />
    );
  }

  // Full variant (default)
  return (
    <div style={{
      background: tokens.colors.bg.primary,
      minHeight: '100vh',
    }}>
      {/* Stats bar */}
      <StatsBar stats={stats} />
      
      {/* Hero section with champion */}
      <ChampionHero
        winner={champion}
        city={city}
        season={season}
        stats={stats}
        onViewProfile={onViewProfile}
        onShare={shareToSocial}
        isSharing={generating === champion?.id}
        shareStatus={shareStatus}
      />
      
      {/* Top 3 podium */}
      {topThree.length >= 2 && (
        <WinnersPodium
          winners={topThree}
          onViewProfile={onViewProfile}
        />
      )}
      
      {/* Top 10 leaderboard */}
      <TopTenLeaderboard
        winners={winners}
        onViewProfile={onViewProfile}
      />
      
      {/* All winners grid (if more than 3) */}
      {winners.length > 3 && (
        <AllWinnersGrid
          winners={allWinners}
          title="All Winners"
          onViewProfile={onViewProfile}
        />
      )}
      
      {/* Past seasons scroll */}
      <PastSeasonsScroll
        seasons={pastSeasons}
        currentSeason={season}
        onSelectSeason={(s) => console.log('Selected season:', s)}
      />
      
      {/* Footer CTA */}
      <FooterCTA city={city} season={season} />
    </div>
  );
}

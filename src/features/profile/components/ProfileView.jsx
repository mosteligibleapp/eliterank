import React, { useState, useEffect, useCallback } from 'react';
import { Edit, MapPin, FileText, Camera, Globe, TrendingUp, Share2, Check, Heart } from 'lucide-react';
import { Panel, Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { getCompetitionStats } from '../../../lib/competition-history';
import { useResponsive } from '../../../hooks/useResponsive';
import ProfileCompetitions from './ProfileCompetitions';
import ProfileBonusVotes from './ProfileBonusVotes';
import ProfileRewardsCard from './ProfileRewardsCard';
import BonusVotesEarnedBadge from './BonusVotesEarnedBadge';

export default function ProfileView({ hostProfile, onEdit }) {
  const { isMobile, isSmall } = useResponsive();
  const [competitionStats, setCompetitionStats] = useState(null);
  const [bonusVotes, setBonusVotes] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hostProfile?.id) return;
    getCompetitionStats(hostProfile.id).then(setCompetitionStats).catch(console.error);
  }, [hostProfile?.id]);

  const handleBonusVotesLoaded = useCallback((data) => {
    setBonusVotes(data);
  }, []);

  const handleShare = async () => {
    if (!hostProfile?.id) return; // Profile not loaded yet
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/profile/${hostProfile.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!hostProfile) return null;

  const initials = `${(hostProfile.firstName || '?')[0]}${(hostProfile.lastName || '?')[0]}`;
  const gallery = hostProfile.gallery || [];

  const socialLinks = [
    { platform: 'Instagram', handle: hostProfile.instagram, icon: '📷', gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)', url: hostProfile.instagram ? `https://instagram.com/${hostProfile.instagram.replace('@', '')}` : null },
    { platform: 'TikTok', handle: hostProfile.tiktok, icon: '♪', gradient: 'linear-gradient(135deg, #00f2ea, #ff0050)', url: hostProfile.tiktok ? `https://tiktok.com/@${hostProfile.tiktok.replace('@', '')}` : null },
    { platform: 'LinkedIn', handle: hostProfile.linkedin, icon: 'in', background: '#0A66C2', url: hostProfile.linkedin ? `https://linkedin.com/in/${hostProfile.linkedin}` : null },
    ...(hostProfile.website ? [{ platform: 'Link', handle: hostProfile.website.replace(/^https?:\/\//, ''), icon: '🔗', background: colors.background.elevated, url: hostProfile.website.startsWith('http') ? hostProfile.website : `https://${hostProfile.website}` }] : []),
  ].filter(link => link.handle);

  const sectionPadding = isMobile ? spacing.lg : spacing.xxl;
  const dividerStyle = { borderTop: `1px solid ${colors.border.secondary}`, margin: `0 ${sectionPadding}` };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <Panel style={{ marginBottom: spacing.xl }}>
        {/* Hero Section */}
        <div style={{ position: 'relative', padding: isMobile ? spacing.sm : spacing.lg, paddingBottom: 0 }}>
          <div style={{ position: 'absolute', top: isMobile ? spacing.sm : spacing.lg, left: isMobile ? spacing.sm : spacing.lg, zIndex: 2 }}>
            <Button
              onClick={handleShare}
              icon={copied ? Check : Share2}
              size={isMobile ? 'sm' : 'md'}
              style={{
                background: copied ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: isMobile ? 'auto' : '100px',
              }}
            >
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
          {onEdit && (
            <div style={{ position: 'absolute', top: isMobile ? spacing.sm : spacing.lg, right: isMobile ? spacing.sm : spacing.lg, zIndex: 2 }}>
              <Button
                onClick={onEdit}
                icon={Edit}
                size={isMobile ? 'sm' : 'md'}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {isMobile ? 'Edit' : 'Edit Profile'}
              </Button>
            </div>
          )}
        </div>
        <div style={{ padding: isMobile ? `${spacing.xxl} ${spacing.lg} ${spacing.lg}` : `${spacing.xxxl} ${spacing.xxxl} ${spacing.xxxl}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>
            <div
              style={{
                width: isMobile ? '140px' : '150px',
                height: isMobile ? '140px' : '150px',
                borderRadius: borderRadius.xxl,
                background: hostProfile.avatarUrl
                  ? `url(${hostProfile.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
                border: `3px solid rgba(212,175,55,0.3)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '42px' : '48px',
                fontWeight: typography.fontWeight.semibold,
                color: colors.gold.primary,
                flexShrink: 0,
              }}
            >
              {!hostProfile.avatarUrl && initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              <h1 style={{
                fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.xxl,
                fontWeight: typography.fontWeight.bold,
                color: '#fff',
                wordBreak: 'break-word',
              }}>
                {hostProfile.firstName} {hostProfile.lastName}
              </h1>
              {hostProfile.city && (
                <p style={{
                  color: colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg
                }}>
                  <MapPin size={isMobile ? 16 : 18} /> {hostProfile.city}{hostProfile.age ? `, ${hostProfile.age}` : ''}
                </p>
              )}
              {(() => {
                // For contestants, totalVotes already includes bonus votes (DB-level).
                // For nominees with 0 stats, use their client-side bonus votes earned.
                const statsVotes = competitionStats?.totalVotes || 0;
                const nomineeBonusVotes = (!statsVotes && bonusVotes?.totalEarned) ? bonusVotes.totalEarned : 0;
                const displayVotes = statsVotes + nomineeBonusVotes;
                const wins = competitionStats?.wins || 0;

                if (displayVotes <= 0 && wins <= 0) return null;

                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.md,
                    marginTop: spacing.md,
                    flexWrap: 'wrap',
                  }}>
                    {displayVotes > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        padding: `${spacing.xs} ${spacing.md}`,
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px solid rgba(212,175,55,0.2)',
                        borderRadius: borderRadius.pill,
                        fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.gold.primary,
                      }}>
                        <Heart size={isMobile ? 14 : 16} style={{ fill: colors.gold.primary }} />
                        {displayVotes.toLocaleString()} votes
                      </span>
                    )}
                    {wins > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        padding: `${spacing.xs} ${spacing.md}`,
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px solid rgba(212,175,55,0.2)',
                        borderRadius: borderRadius.pill,
                        fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.gold.primary,
                      }}>
                        <TrendingUp size={isMobile ? 14 : 16} />
                        {wins} {wins === 1 ? 'win' : 'wins'}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Competitions */}
        <div style={dividerStyle} />
        <div style={{ padding: sectionPadding }}>
          <ProfileCompetitions
            userId={hostProfile?.id}
            userEmail={hostProfile?.email}
            user={{ id: hostProfile?.id, email: hostProfile?.email }}
            profile={{
              first_name: hostProfile?.firstName,
              last_name: hostProfile?.lastName,
              avatar_url: hostProfile?.avatarUrl,
              bio: hostProfile?.bio,
              city: hostProfile?.city,
            }}
          />
        </div>

        {/* About */}
        <div style={dividerStyle} />
        <div style={{ padding: sectionPadding }}>
          <h3 style={{
            fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md
          }}>
            <FileText size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> About
          </h3>
          <p style={{
            color: colors.text.light,
            fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
            lineHeight: '1.7'
          }}>
            {hostProfile.bio || 'No bio added yet.'}
          </p>
        </div>

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <>
            <div style={dividerStyle} />
            <div style={{ padding: sectionPadding }}>
              <h3 style={{
                fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing.lg,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md
              }}>
                <Globe size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> Connect
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {socialLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: isMobile ? spacing.sm : spacing.md,
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: borderRadius.lg,
                      textDecoration: 'none',
                      color: colors.text.primary,
                    }}
                  >
                    <div
                      style={{
                        width: isMobile ? '36px' : '40px',
                        height: isMobile ? '36px' : '40px',
                        background: link.gradient || link.background,
                        borderRadius: borderRadius.md,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: link.icon === 'in' ? '14px' : '16px',
                        fontWeight: typography.fontWeight.bold,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {link.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontWeight: typography.fontWeight.medium,
                        fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md
                      }}>
                        {link.platform}
                      </p>
                      <p style={{
                        color: colors.text.secondary,
                        fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.base,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {link.handle}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Photo Gallery */}
        {gallery.length > 0 && (
          <>
            <div style={dividerStyle} />
            <div style={{ padding: sectionPadding }}>
              <h3 style={{
                fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing.lg,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md
              }}>
                <Camera size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> Gallery
              </h3>
              {isMobile ? (
                <div
                  className="hide-scrollbar"
                  style={{
                    display: 'flex',
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    gap: spacing.sm,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {gallery.map((imageUrl, index) => (
                    <div
                      key={index}
                      style={{
                        flex: '0 0 100%',
                        scrollSnapAlign: 'start',
                        aspectRatio: '4 / 3',
                        background: `url(${imageUrl}) center/cover`,
                        borderRadius: borderRadius.lg,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
                  {gallery.map((imageUrl, index) => (
                    <div
                      key={index}
                      style={{
                        aspectRatio: '1',
                        background: `url(${imageUrl}) center/cover`,
                        borderRadius: borderRadius.lg,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Bonus Votes + Video Prompts - only for own profile */}
        {onEdit && hostProfile?.id && (
          <>
            <div style={dividerStyle} />
            <div style={{ padding: sectionPadding }}>
              <BonusVotesEarnedBadge userId={hostProfile.id} bonusVotes={bonusVotes} />
              <ProfileRewardsCard userId={hostProfile.id} />
              <ProfileBonusVotes userId={hostProfile.id} userEmail={hostProfile.email} profile={hostProfile} onBonusVotesLoaded={handleBonusVotesLoaded} />
            </div>
          </>
        )}

      </Panel>
    </div>
  );
}

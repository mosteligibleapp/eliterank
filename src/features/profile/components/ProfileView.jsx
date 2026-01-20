import React, { useState, useEffect } from 'react';
import { Edit, MapPin, FileText, Heart, Camera, Globe, TrendingUp, Share2, Check } from 'lucide-react';
import { Panel, Button, InterestTag } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { getCompetitionStats } from '../../../lib/competition-history';
import { useResponsive } from '../../../hooks/useResponsive';
import ProfileCompetitions from './ProfileCompetitions';

export default function ProfileView({ hostProfile, onEdit }) {
  const { isMobile, isSmall } = useResponsive();
  const [competitionStats, setCompetitionStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hostProfile?.id) return;
    getCompetitionStats(hostProfile.id).then(setCompetitionStats).catch(console.error);
  }, [hostProfile?.id]);

  const handleShare = async () => {
    const url = window.location.href;
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
    { platform: 'Instagram', handle: hostProfile.instagram, icon: '📷', gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)' },
    { platform: 'Twitter / X', handle: hostProfile.twitter, icon: '𝕏', background: '#000' },
    { platform: 'LinkedIn', handle: hostProfile.linkedin, icon: 'in', background: '#0A66C2' },
    { platform: 'TikTok', handle: hostProfile.tiktok, icon: '♪', gradient: 'linear-gradient(135deg, #00f2ea, #ff0050)' },
  ].filter(link => link.handle);

  return (
    <div>
      {/* Hero Section */}
      <Panel style={{ marginBottom: isMobile ? spacing.lg : spacing.xxl }}>
        <div
          style={{
            height: isMobile ? '140px' : '200px',
            background: hostProfile.coverImage
              ? `url(${hostProfile.coverImage}) center/cover`
              : gradients.cover,
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: isMobile ? spacing.sm : spacing.lg, right: isMobile ? spacing.sm : spacing.lg, display: 'flex', gap: spacing.sm }}>
            <Button
              onClick={handleShare}
              icon={copied ? Check : Share2}
              size={isMobile ? 'sm' : 'md'}
              style={{
                background: copied ? 'rgba(34,197,94,0.8)' : 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                minWidth: isMobile ? 'auto' : '100px',
              }}
            >
              {copied ? 'Copied!' : 'Share'}
            </Button>
            <Button
              onClick={onEdit}
              icon={Edit}
              size={isMobile ? 'sm' : 'md'}
              style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {isMobile ? 'Edit' : 'Edit Profile'}
            </Button>
          </div>
        </div>
        <div style={{ padding: isMobile ? `0 ${spacing.lg} ${spacing.lg}` : `0 ${spacing.xxxl} ${spacing.xxxl}`, marginTop: isMobile ? '-40px' : '-60px' }}>
          <div style={{ display: 'flex', gap: isMobile ? spacing.md : spacing.xxl, alignItems: isMobile ? 'center' : 'flex-end', flexWrap: 'wrap' }}>
            <div
              style={{
                width: isMobile ? '100px' : '140px',
                height: isMobile ? '100px' : '140px',
                borderRadius: borderRadius.xxl,
                background: hostProfile.avatarUrl
                  ? `url(${hostProfile.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
                border: isMobile ? '3px solid #1a1a24' : '4px solid #1a1a24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '32px' : '42px',
                fontWeight: typography.fontWeight.semibold,
                color: colors.gold.primary,
                flexShrink: 0,
              }}
            >
              {!hostProfile.avatarUrl && initials}
            </div>
            <div style={{ flex: 1, paddingBottom: isMobile ? 0 : spacing.sm, minWidth: 0 }}>
              <h1 style={{
                fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.hero,
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
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg
                }}>
                  <MapPin size={isMobile ? 16 : 18} /> {hostProfile.city}
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '2fr 1fr', gap: isMobile ? spacing.lg : spacing.xxl }}>
        {/* Left Column */}
        <div>
          {/* Bio Section */}
          <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl }}>
            <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
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
          </Panel>

          {/* Hobbies Section */}
          {hostProfile.hobbies && hostProfile.hobbies.length > 0 && (
            <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl }}>
              <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
                <h3 style={{
                  fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  marginBottom: spacing.lg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md
                }}>
                  <Heart size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> Interests
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                  {hostProfile.hobbies.map((hobby) => (
                    <InterestTag key={hobby} size={isMobile ? 'md' : 'lg'}>
                      {hobby}
                    </InterestTag>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {/* Photo Gallery */}
          <Panel>
            <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? spacing.sm : spacing.md }}>
                {gallery.length > 0 ? (
                  gallery.map((imageUrl, index) => (
                    <div
                      key={index}
                      style={{
                        aspectRatio: '1',
                        background: `url(${imageUrl}) center/cover`,
                        borderRadius: borderRadius.lg,
                      }}
                    />
                  ))
                ) : (
                  // Show placeholders if no gallery images
                  [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1',
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(139,92,246,0.1))',
                        borderRadius: borderRadius.lg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={isMobile ? 20 : 24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column */}
        <div>
          {/* Social Links */}
          {socialLinks.length > 0 && (
            <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl }}>
              <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
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
                      href="#"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: isMobile ? spacing.sm : spacing.md,
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: borderRadius.lg,
                        textDecoration: 'none',
                        color: colors.text.primary,
                        transition: 'all 0.2s',
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
            </Panel>
          )}

          {/* Competitions Section - Shows all competitions user is part of */}
          <ProfileCompetitions userId={hostProfile?.id} />

          {/* Competition Stats */}
          {competitionStats && (competitionStats.totalCompetitions > 0 || competitionStats.totalVotes > 0) && (
            <Panel style={{ marginBottom: isMobile ? spacing.md : spacing.xl }}>
              <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
                <h3 style={{
                  fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
                  fontWeight: typography.fontWeight.semibold,
                  marginBottom: spacing.lg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md
                }}>
                  <TrendingUp size={isMobile ? 18 : 20} style={{ color: colors.gold.primary }} /> Stats
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? spacing.sm : spacing.md }}>
                  <div style={{
                    textAlign: 'center',
                    padding: isMobile ? spacing.sm : spacing.md,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: borderRadius.lg
                  }}>
                    <p style={{
                      fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.xxxl,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.gold.primary
                    }}>
                      {competitionStats.totalCompetitions}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Competitions</p>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: isMobile ? spacing.sm : spacing.md,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: borderRadius.lg
                  }}>
                    <p style={{
                      fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.xxxl,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.gold.primary
                    }}>
                      {competitionStats.totalVotes.toLocaleString()}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Total Votes</p>
                  </div>
                  {competitionStats.wins > 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: isMobile ? spacing.sm : spacing.md,
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                      borderRadius: borderRadius.lg,
                      border: '1px solid rgba(212,175,55,0.2)'
                    }}>
                      <p style={{
                        fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.xxxl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.gold.primary
                      }}>
                        {competitionStats.wins}
                      </p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary }}>Wins</p>
                    </div>
                  )}
                  {competitionStats.bestPlacement && (
                    <div style={{
                      textAlign: 'center',
                      padding: isMobile ? spacing.sm : spacing.md,
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: borderRadius.lg
                    }}>
                      <p style={{
                        fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.xxxl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.primary
                      }}>
                        #{competitionStats.bestPlacement}
                      </p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Best Finish</p>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}

        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowLeft, MapPin, FileText, Heart, Camera, Globe, Trophy, Crown, Award, Star, Instagram, Twitter, Linkedin, ChevronLeft } from 'lucide-react';
import { Panel, Button, Badge, InterestTag } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, transitions, gradients, components, styleHelpers } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';

// Role display configuration
const ROLE_CONFIG = {
  winner: { label: 'Winner', icon: Trophy, variant: 'gold', color: colors.gold.primary },
  contestant: { label: 'Contestant', icon: Star, variant: 'success', color: colors.status.success },
  judge: { label: 'Judge', icon: Award, variant: 'gold', color: colors.gold.primary },
  host: { label: 'Host', icon: Crown, variant: 'purple', color: colors.accent.purple },
  fan: { label: 'Member', icon: Star, variant: 'default', color: colors.text.tertiary },
};

export default function PublicProfileView({ profile, role = 'fan', onBack }) {
  const { isMobile, isTablet } = useResponsive();

  if (!profile) return null;

  // Get profile data with fallbacks
  const firstName = profile.first_name || profile.firstName || profile.name?.split(' ')[0] || '';
  const lastName = profile.last_name || profile.lastName || profile.name?.split(' ').slice(1).join(' ') || '';
  const fullName = profile.name || `${firstName} ${lastName}`.trim() || 'Unknown';
  const bio = profile.bio || '';
  const city = profile.city || profile.location || '';
  const avatarUrl = profile.avatar_url || profile.avatarUrl || profile.avatar || profile.image || '';
  const coverImage = profile.cover_image || profile.coverImage || '';
  const hobbies = profile.hobbies || profile.interests || [];
  const gallery = profile.gallery || [];

  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  // Role configuration
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.fan;
  const RoleIcon = roleConfig.icon;

  // Build social links
  const socialLinks = [];
  if (profile.instagram) {
    socialLinks.push({
      platform: 'Instagram',
      handle: profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram}`,
      icon: Instagram,
      url: `https://instagram.com/${profile.instagram.replace('@', '')}`,
      gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)',
    });
  }
  if (profile.twitter) {
    socialLinks.push({
      platform: 'Twitter / X',
      handle: profile.twitter.startsWith('@') ? profile.twitter : `@${profile.twitter}`,
      icon: Twitter,
      url: `https://twitter.com/${profile.twitter.replace('@', '')}`,
      background: colors.background.elevated,
    });
  }
  if (profile.linkedin) {
    socialLinks.push({
      platform: 'LinkedIn',
      handle: profile.linkedin,
      icon: Linkedin,
      url: `https://linkedin.com/in/${profile.linkedin}`,
      background: '#0A66C2',
    });
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: colors.background.primary,
      zIndex: 1000,
      overflow: 'auto',
      fontFamily: typography.fontFamily.sans,
    }}>
      {/* Sticky Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10, 10, 12, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.border.secondary}`,
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: isMobile ? `${spacing.md} ${spacing.lg}` : `${spacing.lg} ${spacing.xxl}`,
          ...styleHelpers.flexBetween,
        }}>
          <button
            onClick={onBack}
            style={{
              ...styleHelpers.flexCenter,
              gap: spacing.sm,
              background: 'none',
              border: 'none',
              color: colors.text.primary,
              cursor: 'pointer',
              padding: spacing.sm,
              marginLeft: `-${spacing.sm}`,
            }}
          >
            <ChevronLeft size={24} />
            {!isMobile && <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>Back</span>}
          </button>

          <Badge variant={roleConfig.variant} size="sm" pill>
            <RoleIcon size={12} />
            {roleConfig.label}
          </Badge>
        </div>
      </header>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: isMobile ? spacing.lg : spacing.xxl,
        paddingBottom: isMobile ? '100px' : spacing.xxxl,
      }}>
        {/* Hero Section */}
        <div style={{
          background: colors.background.card,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          marginBottom: spacing.xl,
          border: `1px solid ${colors.border.primary}`,
        }}>
          {/* Cover */}
          <div style={{
            height: isMobile ? '120px' : '180px',
            background: coverImage
              ? `url(${coverImage}) center/cover`
              : `linear-gradient(135deg, ${roleConfig.color}40, ${roleConfig.color}10)`,
          }} />

          {/* Profile Info */}
          <div style={{
            padding: isMobile ? spacing.lg : spacing.xl,
            paddingTop: 0,
            marginTop: isMobile ? '-40px' : '-50px',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? spacing.md : spacing.xl,
              alignItems: isMobile ? 'center' : 'flex-end',
            }}>
              {/* Avatar */}
              <div style={{
                width: isMobile ? '80px' : '100px',
                height: isMobile ? '80px' : '100px',
                borderRadius: borderRadius.xl,
                background: avatarUrl
                  ? `url(${avatarUrl}) center/cover`
                  : `linear-gradient(135deg, ${roleConfig.color}60, ${roleConfig.color}30)`,
                border: `4px solid ${colors.background.card}`,
                ...styleHelpers.flexCenter,
                fontSize: isMobile ? typography.fontSize['2xl'] : typography.fontSize['3xl'],
                fontWeight: typography.fontWeight.bold,
                color: roleConfig.color,
                flexShrink: 0,
              }}>
                {!avatarUrl && initials}
              </div>

              {/* Name and Details */}
              <div style={{
                flex: 1,
                textAlign: isMobile ? 'center' : 'left',
                paddingBottom: spacing.sm,
              }}>
                <h1 style={{
                  fontSize: isMobile ? typography.fontSize['2xl'] : typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}>
                  {fullName}
                </h1>

                <div style={{
                  ...styleHelpers.flexStart,
                  gap: spacing.md,
                  justifyContent: isMobile ? 'center' : 'flex-start',
                  flexWrap: 'wrap',
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                }}>
                  {city && (
                    <span style={{ ...styleHelpers.flexStart, gap: spacing.xs }}>
                      <MapPin size={14} /> {city}
                    </span>
                  )}
                  {profile.occupation && (
                    <span>{profile.occupation}</span>
                  )}
                  {profile.age && (
                    <span>{profile.age} years old</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <div style={{
            background: colors.background.card,
            borderRadius: borderRadius.xl,
            padding: isMobile ? spacing.lg : spacing.xl,
            marginBottom: spacing.lg,
            border: `1px solid ${colors.border.primary}`,
          }}>
            <h3 style={{
              ...styleHelpers.flexStart,
              gap: spacing.sm,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}>
              <FileText size={18} style={{ color: roleConfig.color }} />
              About
            </h3>
            <p style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.md,
              lineHeight: typography.lineHeight.relaxed,
            }}>
              {bio}
            </p>
          </div>
        )}

        {/* Interests */}
        {hobbies && hobbies.length > 0 && (
          <div style={{
            background: colors.background.card,
            borderRadius: borderRadius.xl,
            padding: isMobile ? spacing.lg : spacing.xl,
            marginBottom: spacing.lg,
            border: `1px solid ${colors.border.primary}`,
          }}>
            <h3 style={{
              ...styleHelpers.flexStart,
              gap: spacing.sm,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}>
              <Heart size={18} style={{ color: roleConfig.color }} />
              Interests
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
              {hobbies.map((hobby) => (
                <span
                  key={hobby}
                  style={{
                    padding: `${spacing.xs} ${spacing.md}`,
                    background: `${roleConfig.color}15`,
                    border: `1px solid ${roleConfig.color}30`,
                    borderRadius: borderRadius.pill,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                  }}
                >
                  {hobby}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div style={{
            background: colors.background.card,
            borderRadius: borderRadius.xl,
            padding: isMobile ? spacing.lg : spacing.xl,
            marginBottom: spacing.lg,
            border: `1px solid ${colors.border.primary}`,
          }}>
            <h3 style={{
              ...styleHelpers.flexStart,
              gap: spacing.sm,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}>
              <Globe size={18} style={{ color: roleConfig.color }} />
              Connect
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {socialLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...styleHelpers.flexStart,
                      gap: spacing.md,
                      padding: spacing.md,
                      background: colors.background.tertiary,
                      borderRadius: borderRadius.lg,
                      textDecoration: 'none',
                      color: colors.text.primary,
                      transition: `all ${transitions.fast}`,
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: link.gradient || link.background,
                      borderRadius: borderRadius.md,
                      ...styleHelpers.flexCenter,
                      color: '#fff',
                    }}>
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                        {link.platform}
                      </p>
                      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
                        {link.handle}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Gallery */}
        <div style={{
          background: colors.background.card,
          borderRadius: borderRadius.xl,
          padding: isMobile ? spacing.lg : spacing.xl,
          border: `1px solid ${colors.border.primary}`,
        }}>
          <h3 style={{
            ...styleHelpers.flexStart,
            gap: spacing.sm,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.md,
          }}>
            <Camera size={18} style={{ color: roleConfig.color }} />
            Photos
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: spacing.sm,
          }}>
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
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    background: colors.background.tertiary,
                    borderRadius: borderRadius.lg,
                    ...styleHelpers.flexCenter,
                  }}
                >
                  <Camera size={24} style={{ color: colors.text.muted }} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

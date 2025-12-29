import React from 'react';
import { ArrowLeft, MapPin, FileText, Heart, Camera, Globe, Trophy, Crown, Award, Star, Instagram, Twitter, Linkedin } from 'lucide-react';
import { Panel, Button, Badge, InterestTag } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';

// Role display configuration
const ROLE_CONFIG = {
  winner: { label: 'Winner', icon: Trophy, variant: 'gold', color: '#d4af37' },
  contestant: { label: 'Contestant', icon: Star, variant: 'success', color: '#22c55e' },
  judge: { label: 'Judge', icon: Award, variant: 'gold', color: '#d4af37' },
  host: { label: 'Host', icon: Crown, variant: 'warning', color: '#8b5cf6' },
  fan: { label: 'Member', icon: Star, variant: 'default', color: '#9ca3af' },
};

export default function PublicProfileView({ profile, role = 'fan', onBack }) {
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
      background: '#000',
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 1000,
        overflow: 'auto',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: spacing.xxl }}>
        {/* Back Button */}
        <div style={{ marginBottom: spacing.xl }}>
          <Button
            onClick={onBack}
            variant="secondary"
            icon={ArrowLeft}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Back to Competition
          </Button>
        </div>

        {/* Hero Section */}
        <Panel style={{ marginBottom: spacing.xxl }}>
          <div
            style={{
              height: '200px',
              background: coverImage
                ? `url(${coverImage}) center/cover`
                : gradients.cover,
              position: 'relative',
              borderRadius: `${borderRadius.xxl} ${borderRadius.xxl} 0 0`,
            }}
          />
          <div style={{ padding: `0 ${spacing.xxxl} ${spacing.xxxl}`, marginTop: '-60px' }}>
            <div style={{ display: 'flex', gap: spacing.xxl, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: borderRadius.xxl,
                  background: avatarUrl
                    ? `url(${avatarUrl}) center/cover`
                    : `linear-gradient(135deg, ${roleConfig.color}66, ${roleConfig.color}33)`,
                  border: '4px solid #1a1a24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '42px',
                  fontWeight: typography.fontWeight.semibold,
                  color: roleConfig.color,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {!avatarUrl && initials}
              </div>

              {/* Name and Info */}
              <div style={{ flex: 1, paddingBottom: spacing.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                    {fullName}
                  </h1>
                  <Badge
                    variant={roleConfig.variant}
                    size="lg"
                    icon={RoleIcon}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${roleConfig.color}80`,
                    }}
                  >
                    {roleConfig.label}
                  </Badge>
                </div>
                {city && (
                  <p style={{ color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, fontSize: typography.fontSize.lg }}>
                    <MapPin size={18} /> {city}
                  </p>
                )}
                {profile.occupation && (
                  <p style={{ color: colors.text.muted, marginTop: spacing.xs, fontSize: typography.fontSize.md }}>
                    {profile.occupation}
                  </p>
                )}
                {profile.age && (
                  <p style={{ color: colors.text.muted, marginTop: spacing.xs, fontSize: typography.fontSize.md }}>
                    {profile.age} years old
                  </p>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <div style={{ display: 'grid', gridTemplateColumns: socialLinks.length > 0 ? '2fr 1fr' : '1fr', gap: spacing.xxl }}>
          {/* Left Column */}
          <div>
            {/* Bio Section */}
            <Panel style={{ marginBottom: spacing.xl }}>
              <div style={{ padding: spacing.xxl }}>
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <FileText size={20} style={{ color: roleConfig.color }} /> About
                </h3>
                <p style={{ color: colors.text.light, fontSize: typography.fontSize.lg, lineHeight: '1.7' }}>
                  {bio || 'No bio added yet.'}
                </p>
              </div>
            </Panel>

            {/* Interests Section */}
            {hobbies && hobbies.length > 0 && (
              <Panel style={{ marginBottom: spacing.xl }}>
                <div style={{ padding: spacing.xxl }}>
                  <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <Heart size={20} style={{ color: roleConfig.color }} /> Interests
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md }}>
                    {hobbies.map((hobby) => (
                      <InterestTag key={hobby} size="lg">
                        {hobby}
                      </InterestTag>
                    ))}
                  </div>
                </div>
              </Panel>
            )}

            {/* Photo Gallery */}
            <Panel>
              <div style={{ padding: spacing.xxl }}>
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <Camera size={20} style={{ color: roleConfig.color }} /> Gallery
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
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
                          background: `linear-gradient(135deg, ${roleConfig.color}22, ${roleConfig.color}11)`,
                          borderRadius: borderRadius.lg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Camera size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Panel>
          </div>

          {/* Right Column - Social Links */}
          {socialLinks.length > 0 && (
            <div>
              <Panel>
                <div style={{ padding: spacing.xxl }}>
                  <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <Globe size={20} style={{ color: roleConfig.color }} /> Connect
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    {socialLinks.map((link) => {
                      const IconComponent = link.icon;
                      return (
                        <a
                          key={link.platform}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.md,
                            padding: spacing.md,
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: borderRadius.lg,
                            textDecoration: 'none',
                            color: colors.text.primary,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              background: link.gradient || link.background,
                              borderRadius: borderRadius.md,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.md }}>
                              {link.platform}
                            </p>
                            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
                              {link.handle}
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

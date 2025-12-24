import React from 'react';
import { X, MapPin, Star, FileText, Heart, Camera, Globe, Trophy, Crown, Award, Instagram, Twitter, Linkedin } from 'lucide-react';
import { Button, Badge, InterestTag } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { formatNumber } from '../../../utils/formatters';

// Profile images for variety
const PROFILE_IMAGES = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=600&fit=crop',
];

export default function ProfileModal({
  isOpen,
  onClose,
  profile,
  type = 'contestant', // 'contestant', 'host', or 'judge'
  onVote,
  rank,
  imageIndex = 0,
}) {
  if (!isOpen || !profile) return null;

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name[0];
  };

  const getBadgeConfig = () => {
    switch (type) {
      case 'host':
        return { variant: 'warning', icon: Crown, label: 'HOST' };
      case 'judge':
        return { variant: 'gold', icon: Award, label: 'JUDGE' };
      case 'contestant':
      default:
        return { variant: 'success', icon: Star, label: 'CONTESTANT' };
    }
  };

  const badgeConfig = getBadgeConfig();
  const profileImage = profile.image || profile.avatar || PROFILE_IMAGES[imageIndex % PROFILE_IMAGES.length];

  // Build social links
  const socialLinks = [];
  if (profile.instagram) {
    socialLinks.push({
      platform: 'Instagram',
      handle: profile.instagram,
      icon: Instagram,
      url: `https://instagram.com/${profile.instagram.replace('@', '')}`,
      gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)',
    });
  }
  if (profile.twitter) {
    socialLinks.push({
      platform: 'Twitter / X',
      handle: profile.twitter,
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

  // Get interests/hobbies
  const interests = profile.interests || profile.hobbies || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.background.primary,
          borderRadius: borderRadius.xxl,
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: spacing.lg,
            right: spacing.lg,
            width: '40px',
            height: '40px',
            borderRadius: borderRadius.full,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <X size={20} />
        </button>

        {/* Hero Section */}
        <div
          style={{
            height: '200px',
            background: type === 'host'
              ? 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(139,92,246,0.1))'
              : type === 'judge'
                ? 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))'
                : gradients.cover,
            position: 'relative',
          }}
        >
          {/* Rank badge for contestants */}
          {type === 'contestant' && rank && (
            <div
              style={{
                position: 'absolute',
                top: spacing.lg,
                left: spacing.lg,
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background:
                  rank === 1
                    ? 'linear-gradient(135deg, #d4af37, #f4d03f)'
                    : rank === 2
                      ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8)'
                      : rank === 3
                        ? 'linear-gradient(135deg, #cd7f32, #daa06d)'
                        : 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: rank <= 3 ? '#0a0a0f' : '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              #{rank}
            </div>
          )}
        </div>

        <div style={{ padding: `0 ${spacing.xxxl} ${spacing.xxxl}`, marginTop: '-60px' }}>
          <div style={{ display: 'flex', gap: spacing.xxl, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div
              style={{
                width: '140px',
                height: '140px',
                borderRadius: borderRadius.xxl,
                background: type === 'host'
                  ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)'
                  : type === 'judge'
                    ? 'linear-gradient(135deg, #d4af37, #f4d03f)'
                    : 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
                border: '4px solid #0a0a0f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '42px',
                fontWeight: typography.fontWeight.semibold,
                color: type === 'host' || type === 'judge' ? '#fff' : colors.gold.primary,
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={profile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span style="font-size: 42px; font-weight: 600;">${getInitials(profile.name)}</span>`;
                  }}
                />
              ) : (
                getInitials(profile.name)
              )}
            </div>

            {/* Name and Info */}
            <div style={{ flex: 1, paddingBottom: spacing.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                  {profile.name}
                </h1>
                <Badge
                  variant={badgeConfig.variant}
                  size="lg"
                  icon={badgeConfig.icon}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${type === 'host' ? 'rgba(139,92,246,0.5)' : 'rgba(212,175,55,0.5)'}`,
                  }}
                >
                  {badgeConfig.label}
                </Badge>
              </div>

              {/* Subtitle info based on type */}
              {type === 'contestant' && (
                <p style={{ color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, fontSize: typography.fontSize.lg }}>
                  <span>{profile.age} years old</span>
                  <span style={{ color: colors.border.light }}>•</span>
                  <span>{profile.occupation}</span>
                </p>
              )}

              {type === 'judge' && profile.title && (
                <p style={{ color: colors.gold.primary, marginTop: spacing.sm, fontSize: typography.fontSize.lg }}>
                  {profile.title}
                </p>
              )}

              {type === 'host' && profile.title && (
                <p style={{ color: '#8b5cf6', marginTop: spacing.sm, fontSize: typography.fontSize.lg }}>
                  {profile.title}
                </p>
              )}

              {profile.city && (
                <p style={{ color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, fontSize: typography.fontSize.md }}>
                  <MapPin size={16} /> {profile.city}
                </p>
              )}
            </div>

            {/* Vote count for contestants */}
            {type === 'contestant' && profile.votes !== undefined && (
              <div style={{ textAlign: 'right', paddingBottom: spacing.sm }}>
                <p style={{ fontSize: typography.fontSize.display, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
                  {formatNumber(profile.votes)}
                </p>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Total Votes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: socialLinks.length > 0 ? '2fr 1fr' : '1fr', gap: spacing.xxl, padding: `0 ${spacing.xxxl} ${spacing.xxxl}` }}>
          {/* Left Column */}
          <div>
            {/* Bio Section */}
            {profile.bio && (
              <div
                style={{
                  background: colors.background.card,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xxl,
                  marginBottom: spacing.xl,
                }}
              >
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <FileText size={20} style={{ color: type === 'host' ? '#8b5cf6' : colors.gold.primary }} /> About
                </h3>
                <p style={{ color: colors.text.light, fontSize: typography.fontSize.lg, lineHeight: '1.7' }}>
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Interests Section */}
            {interests.length > 0 && (
              <div
                style={{
                  background: colors.background.card,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xxl,
                  marginBottom: spacing.xl,
                }}
              >
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <Heart size={20} style={{ color: type === 'host' ? '#8b5cf6' : colors.gold.primary }} /> Interests
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md }}>
                  {interests.map((interest) => (
                    <InterestTag key={interest} size="lg">
                      {interest}
                    </InterestTag>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Gallery Placeholder */}
            <div
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xxl,
              }}
            >
              <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <Camera size={20} style={{ color: type === 'host' ? '#8b5cf6' : colors.gold.primary }} /> Gallery
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1',
                      background: i === 0 && profileImage
                        ? `url(${profileImage}) center/cover`
                        : type === 'host'
                          ? 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))'
                          : 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(139,92,246,0.1))',
                      borderRadius: borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {(i !== 0 || !profileImage) && (
                      <Camera size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Social Links */}
          {socialLinks.length > 0 && (
            <div>
              <div
                style={{
                  background: colors.background.card,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xxl,
                  marginBottom: spacing.xl,
                }}
              >
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <Globe size={20} style={{ color: type === 'host' ? '#8b5cf6' : colors.gold.primary }} /> Connect
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

              {/* Vote Button for Contestants */}
              {type === 'contestant' && onVote && (
                <Button
                  onClick={() => onVote(profile)}
                  style={{
                    width: '100%',
                    padding: `${spacing.lg} ${spacing.xl}`,
                    fontSize: typography.fontSize.lg,
                  }}
                >
                  Vote for {profile.name.split(' ')[0]}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Full-width Vote Button if no social links */}
        {type === 'contestant' && onVote && socialLinks.length === 0 && (
          <div style={{ padding: `0 ${spacing.xxxl} ${spacing.xxxl}` }}>
            <Button
              onClick={() => onVote(profile)}
              style={{
                width: '100%',
                padding: `${spacing.lg} ${spacing.xl}`,
                fontSize: typography.fontSize.lg,
              }}
            >
              Vote for {profile.name.split(' ')[0]}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

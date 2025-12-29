import React, { useState, useEffect } from 'react';
import { X, MapPin, Star, FileText, Heart, Camera, Trophy, User, Instagram, ExternalLink, Loader } from 'lucide-react';
import { Badge } from '../ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

// Role display configuration
const ROLE_CONFIG = {
  host: { label: 'Verified Host', icon: Star, variant: 'gold' },
  winner: { label: 'Winner', icon: Trophy, variant: 'gold' },
  contestant: { label: 'Contestant', icon: Trophy, variant: 'success' },
  fan: { label: 'Member', icon: User, variant: 'default' },
};

export default function ProfileViewModal({
  isOpen,
  onClose,
  profileId,
  profile: providedProfile,
  role = 'fan',
}) {
  const [profile, setProfile] = useState(providedProfile || null);
  const [loading, setLoading] = useState(!providedProfile && !!profileId);

  // Fetch profile if only ID is provided
  useEffect(() => {
    const fetchProfile = async () => {
      if (providedProfile) {
        setProfile(providedProfile);
        setLoading(false);
        return;
      }

      if (!profileId || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProfile();
    }
  }, [profileId, providedProfile, isOpen]);

  if (!isOpen) return null;

  // Transform profile data to consistent format
  const displayProfile = profile ? {
    firstName: profile.first_name || profile.firstName || '',
    lastName: profile.last_name || profile.lastName || '',
    avatarUrl: profile.avatar_url || profile.avatarUrl || profile.avatar || '',
    coverImage: profile.cover_image || profile.coverImage || '',
    city: profile.city || '',
    bio: profile.bio || '',
    instagram: profile.instagram || '',
    twitter: profile.twitter || '',
    linkedin: profile.linkedin || '',
    tiktok: profile.tiktok || '',
    interests: profile.interests || [],
    gallery: profile.gallery || [],
  } : null;

  const fullName = displayProfile
    ? `${displayProfile.firstName} ${displayProfile.lastName}`.trim() || 'Unknown'
    : 'Unknown';

  const initials = displayProfile
    ? `${(displayProfile.firstName || '?')[0]}${(displayProfile.lastName || '?')[0]}`
    : '??';

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.fan;
  const RoleIcon = roleConfig.icon;

  const socialLinks = displayProfile ? [
    { platform: 'Instagram', handle: displayProfile.instagram, icon: Instagram, url: displayProfile.instagram ? `https://instagram.com/${displayProfile.instagram.replace('@', '')}` : null },
    { platform: 'Twitter / X', handle: displayProfile.twitter, icon: ExternalLink, url: displayProfile.twitter ? `https://twitter.com/${displayProfile.twitter.replace('@', '')}` : null },
    { platform: 'LinkedIn', handle: displayProfile.linkedin, icon: ExternalLink, url: displayProfile.linkedin ? `https://linkedin.com/in/${displayProfile.linkedin}` : null },
    { platform: 'TikTok', handle: displayProfile.tiktok, icon: ExternalLink, url: displayProfile.tiktok ? `https://tiktok.com/@${displayProfile.tiktok.replace('@', '')}` : null },
  ].filter(link => link.handle) : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.background.primary,
          borderRadius: borderRadius.xxl,
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `1px solid ${colors.border.light}`,
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
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <X size={20} />
        </button>

        {loading ? (
          <div style={{ padding: spacing.xxxl, textAlign: 'center' }}>
            <Loader size={48} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary, marginBottom: spacing.lg }} />
            <p style={{ color: colors.text.secondary }}>Loading profile...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !displayProfile ? (
          <div style={{ padding: spacing.xxxl, textAlign: 'center' }}>
            <User size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <p style={{ color: colors.text.secondary }}>Profile not found</p>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div
              style={{
                height: '160px',
                background: displayProfile.coverImage
                  ? `url(${displayProfile.coverImage}) center/cover`
                  : gradients.cover,
                position: 'relative',
              }}
            />

            <div style={{ padding: `0 ${spacing.xxl} ${spacing.xxl}`, marginTop: '-50px' }}>
              {/* Avatar and Name */}
              <div style={{ display: 'flex', gap: spacing.xl, alignItems: 'flex-end', marginBottom: spacing.xl }}>
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: borderRadius.xl,
                    background: displayProfile.avatarUrl
                      ? `url(${displayProfile.avatarUrl}) center/cover`
                      : 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
                    border: '4px solid #1a1a24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.gold.primary,
                    flexShrink: 0,
                  }}
                >
                  {!displayProfile.avatarUrl && initials}
                </div>
                <div style={{ flex: 1, paddingBottom: spacing.xs }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                      {fullName}
                    </h1>
                    <Badge
                      variant={roleConfig.variant}
                      size="md"
                      icon={RoleIcon}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${roleConfig.variant === 'gold' ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.2)'}`,
                      }}
                    >
                      {roleConfig.label}
                    </Badge>
                  </div>
                  {displayProfile.city && (
                    <p style={{ color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                      <MapPin size={16} /> {displayProfile.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {displayProfile.bio && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{
                    fontSize: typography.fontSize.md,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    color: colors.text.secondary,
                  }}>
                    <FileText size={16} style={{ color: colors.gold.primary }} /> About
                  </h3>
                  <p style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.7' }}>
                    {displayProfile.bio}
                  </p>
                </div>
              )}

              {/* Interests */}
              {displayProfile.interests && displayProfile.interests.length > 0 && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{
                    fontSize: typography.fontSize.md,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    color: colors.text.secondary,
                  }}>
                    <Heart size={16} style={{ color: colors.gold.primary }} /> Interests
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                    {displayProfile.interests.map((interest, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: `${spacing.xs} ${spacing.md}`,
                          background: 'rgba(212,175,55,0.1)',
                          border: `1px solid rgba(212,175,55,0.3)`,
                          borderRadius: borderRadius.pill,
                          fontSize: typography.fontSize.sm,
                          color: colors.gold.primary,
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{
                    fontSize: typography.fontSize.md,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                    color: colors.text.secondary,
                  }}>
                    Social
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md }}>
                    {socialLinks.map((link) => (
                      <a
                        key={link.platform}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          padding: `${spacing.sm} ${spacing.lg}`,
                          background: colors.background.secondary,
                          borderRadius: borderRadius.lg,
                          color: colors.text.light,
                          textDecoration: 'none',
                          fontSize: typography.fontSize.sm,
                          transition: 'all 0.2s',
                        }}
                      >
                        <link.icon size={16} />
                        {link.handle}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {displayProfile.gallery && displayProfile.gallery.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: typography.fontSize.md,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    color: colors.text.secondary,
                  }}>
                    <Camera size={16} style={{ color: colors.gold.primary }} /> Gallery
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: spacing.md,
                  }}>
                    {displayProfile.gallery.slice(0, 6).map((image, idx) => (
                      <div
                        key={idx}
                        style={{
                          aspectRatio: '1',
                          borderRadius: borderRadius.lg,
                          background: `url(${image}) center/cover`,
                          border: `1px solid ${colors.border.light}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

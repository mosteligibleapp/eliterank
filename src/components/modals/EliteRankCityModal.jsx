import React, { useState } from 'react';
import { X, Crown, MapPin, Calendar, Trophy, Clock, ChevronRight, Sparkles, Users, Star } from 'lucide-react';
import { Button, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

const COMPETITIONS = [
  {
    id: 1,
    name: 'Most Eligible New York',
    city: 'New York',
    season: '2026',
    status: 'live',
    startDate: 'March 2026',
    contestants: 24,
    votes: 125500,
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop',
    available: true,
  },
  {
    id: 2,
    name: 'Most Eligible Chicago',
    city: 'Chicago',
    season: '2026',
    status: 'upcoming',
    startDate: 'May 2026',
    contestants: 0,
    votes: 0,
    image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&h=600&fit=crop',
    available: false,
  },
  {
    id: 3,
    name: 'Most Eligible Miami',
    city: 'Miami',
    season: '2026',
    status: 'upcoming',
    startDate: 'July 2026',
    contestants: 0,
    votes: 0,
    image: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&h=600&fit=crop',
    available: false,
  },
  {
    id: 4,
    name: 'Most Eligible USA',
    city: 'National',
    season: '2026',
    status: 'upcoming',
    startDate: 'October 2026',
    contestants: 0,
    votes: 0,
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop',
    available: false,
  },
];

const ENDED_COMPETITIONS = [
  {
    id: 5,
    name: 'Most Eligible Chicago',
    city: 'Chicago',
    season: '2025',
    status: 'ended',
    endDate: 'December 2025',
    winner: 'Sarah Mitchell',
    contestants: 18,
    votes: 89420,
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop',
    available: false,
  },
];

export default function EliteRankCityModal({ isOpen, onClose, onOpenCompetition }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  if (!isOpen) return null;

  const handleCompetitionClick = (competition) => {
    if (competition.available && onOpenCompetition) {
      onOpenCompetition(competition);
    }
  };

  const CompetitionCard = ({ competition, isEnded = false }) => {
    const isHovered = hoveredCard === competition.id;
    const isAvailable = competition.available;

    return (
      <div
        onClick={() => handleCompetitionClick(competition)}
        onMouseEnter={() => setHoveredCard(competition.id)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          position: 'relative',
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          cursor: isAvailable ? 'pointer' : 'default',
          transform: isHovered && isAvailable ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isHovered && isAvailable
            ? '0 20px 40px rgba(212,175,55,0.3), 0 0 0 2px rgba(212,175,55,0.5)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Background Image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${competition.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: isEnded ? 'grayscale(50%)' : 'none',
          }}
        />

        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isEnded
              ? 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)'
              : 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.95) 100%)',
          }}
        />

        {/* Status Badge */}
        <div style={{ position: 'absolute', top: spacing.lg, left: spacing.lg, zIndex: 2 }}>
          {competition.status === 'live' ? (
            <Badge variant="success" size="md" pill>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                LIVE NOW
              </span>
            </Badge>
          ) : competition.status === 'upcoming' ? (
            <Badge variant="warning" size="md" pill>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={12} />
                COMING SOON
              </span>
            </Badge>
          ) : (
            <Badge variant="secondary" size="md" pill>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={12} />
                COMPLETED
              </span>
            </Badge>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: spacing.xl,
            minHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* City Label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              marginBottom: spacing.sm,
            }}
          >
            <MapPin size={14} style={{ color: colors.gold.primary }} />
            <span
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.gold.primary,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              {competition.city}
            </span>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.sm,
              lineHeight: 1.2,
            }}
          >
            {competition.name}
          </h3>

          {/* Season */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              marginBottom: spacing.lg,
            }}
          >
            <Calendar size={14} style={{ color: colors.text.secondary }} />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Season {competition.season}
            </span>
          </div>

          {/* Stats or Winner */}
          {isEnded && competition.winner ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                background: 'rgba(212,175,55,0.15)',
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.gold}`,
              }}
            >
              <Trophy size={18} style={{ color: colors.gold.primary }} />
              <div>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Winner</span>
                <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary }}>
                  {competition.winner}
                </p>
              </div>
            </div>
          ) : competition.status === 'live' ? (
            <div style={{ display: 'flex', gap: spacing.lg }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: borderRadius.md,
                }}
              >
                <Users size={16} style={{ color: colors.gold.primary }} />
                <span style={{ fontSize: typography.fontSize.sm, color: '#fff' }}>
                  {competition.contestants} Contestants
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: borderRadius.md,
                }}
              >
                <Star size={16} style={{ color: colors.gold.primary }} />
                <span style={{ fontSize: typography.fontSize.sm, color: '#fff' }}>
                  {(competition.votes / 1000).toFixed(0)}K Votes
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: borderRadius.md,
                width: 'fit-content',
              }}
            >
              <Sparkles size={16} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.sm, color: '#fff' }}>
                {competition.startDate}
              </span>
            </div>
          )}

          {/* CTA for available competitions */}
          {isAvailable && (
            <div
              style={{
                marginTop: spacing.lg,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                color: colors.gold.primary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                opacity: isHovered ? 1 : 0.7,
                transition: 'opacity 0.2s',
              }}
            >
              View Competition
              <ChevronRight size={18} style={{ transform: isHovered ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}
    >
      {/* Animated Background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.8) 100%)',
          borderBottom: `1px solid rgba(212,175,55,0.2)`,
          padding: `${spacing.lg} ${spacing.xxl}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                borderRadius: borderRadius.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
              }}
            >
              <Crown size={26} style={{ color: '#0a0a0f' }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: typography.fontSize.xxl,
                  fontWeight: typography.fontWeight.bold,
                  color: '#fff',
                  margin: 0,
                }}
              >
                Elite Rank
              </h1>
              <p
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.gold.primary,
                  margin: 0,
                  letterSpacing: '1px',
                }}
              >
                Find Your City
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onClose} icon={X} style={{ width: 'auto', padding: `${spacing.sm} ${spacing.lg}` }}>
            Exit
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: `${spacing.xxxl} ${spacing.xxl}`,
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.lg,
            lineHeight: 1.2,
          }}
        >
          Discover the Most Eligible
          <span style={{ display: 'block', color: colors.gold.primary }}>In Your City</span>
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Vote for your favorites, attend exclusive events, and be part of the most exciting social competition in America.
        </p>
      </section>

      {/* Live & Upcoming Competitions */}
      <section style={{ padding: `0 ${spacing.xxl} ${spacing.xxxl}`, maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
          <Sparkles size={24} style={{ color: colors.gold.primary }} />
          <h3
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: '#fff',
            }}
          >
            Season 2026
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: spacing.xl,
          }}
        >
          {COMPETITIONS.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      </section>

      {/* Past Competitions */}
      <section
        style={{
          padding: `${spacing.xxxl} ${spacing.xxl}`,
          maxWidth: '1400px',
          margin: '0 auto',
          borderTop: `1px solid ${colors.border.light}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
          <Trophy size={24} style={{ color: colors.text.secondary }} />
          <h3
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.secondary,
            }}
          >
            Past Seasons
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: spacing.xl,
            maxWidth: '700px',
          }}
        >
          {ENDED_COMPETITIONS.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} isEnded />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: `${spacing.xxxl} ${spacing.xxl}`,
          textAlign: 'center',
          borderTop: `1px solid ${colors.border.light}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Crown size={20} style={{ color: colors.gold.primary }} />
          <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>
            Elite Rank
          </span>
        </div>
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
          © 2025 Elite Rank. All rights reserved.
        </p>
      </footer>

      {/* CSS Animation for pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .competition-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

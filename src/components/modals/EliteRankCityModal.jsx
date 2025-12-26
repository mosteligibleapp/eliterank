import React, { useState } from 'react';
import {
  X, Crown, MapPin, Calendar, Trophy, Clock, ChevronRight, Sparkles, Users, Star,
  Ticket, Activity, Info, Briefcase, Award, Heart, TrendingUp, CheckCircle,
  Mic, DollarSign, UserPlus, Building2, Megaphone, ArrowLeft, Globe, Instagram, ExternalLink
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

const TABS = [
  { id: 'competitions', label: 'Competitions', icon: Crown },
  { id: 'events', label: 'Events', icon: Ticket },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'about', label: 'About', icon: Info },
  { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
];

// ============================================
// Organizations Data
// ============================================
const ORGANIZATIONS = [
  {
    id: 'most-eligible',
    name: 'Most Eligible',
    logo: '👑',
    tagline: 'Find Your City\'s Most Eligible Singles',
    description: 'Most Eligible is the premier social competition celebrating ambitious singles in major cities across America. Our city-based competitions bring together accomplished professionals who compete for the title of their city\'s Most Eligible.',
    founded: '2024',
    website: 'mostelgible.com',
    instagram: '@mosteligible',
    stats: {
      cities: 5,
      contestants: 200,
      totalVotes: 500000,
      events: 50,
    },
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=400&fit=crop',
  },
  {
    id: 'elite-professionals',
    name: 'Elite Professionals',
    logo: '💼',
    tagline: 'Celebrating Excellence in Business',
    description: 'Elite Professionals showcases the brightest business minds and entrepreneurs in each city. Our competitions highlight innovation, leadership, and professional achievement.',
    founded: '2025',
    website: 'eliteprofessionals.com',
    instagram: '@eliteprofessionals',
    stats: {
      cities: 3,
      contestants: 75,
      totalVotes: 125000,
      events: 15,
    },
    coverImage: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1200&h=400&fit=crop',
  },
];

const COMPETITIONS = [
  {
    id: 1,
    name: 'Most Eligible New York',
    city: 'New York',
    season: '2026',
    status: 'live',
    phase: 'voting',
    startDate: 'March 2026',
    contestants: 24,
    votes: 125500,
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop',
    available: true,
    organizationId: 'most-eligible',
    host: {
      name: 'James Davidson',
      title: 'Competition Host',
      bio: 'James is a New York-based entrepreneur and socialite who has been connecting people in the city for over a decade. His passion for bringing together ambitious singles led him to become the host of Most Eligible New York.',
      instagram: '@jamesdavidson',
      linkedin: 'jamesdavidson',
    },
  },
  {
    id: 2,
    name: 'Most Eligible Chicago',
    city: 'Chicago',
    season: '2026',
    status: 'nomination',
    phase: 'nomination',
    startDate: 'Nominations Open',
    contestants: 0,
    votes: 0,
    image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&h=600&fit=crop',
    available: true,
    organizationId: 'most-eligible',
    host: {
      name: 'Sarah Miller',
      title: 'Competition Host',
      bio: 'Sarah is a Chicago native with deep roots in the city\'s social scene. As a successful event planner, she brings her expertise in creating memorable experiences to Most Eligible Chicago.',
      instagram: '@sarahmiller',
      linkedin: 'sarahmiller',
    },
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
    organizationId: 'most-eligible',
    host: null,
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
    organizationId: 'most-eligible',
    host: null,
  },
  {
    id: 6,
    name: 'Elite Professionals New York',
    city: 'New York',
    season: '2026',
    status: 'nomination',
    phase: 'nomination',
    startDate: 'Nominations Open',
    contestants: 12,
    votes: 0,
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
    available: true,
    organizationId: 'elite-professionals',
    host: {
      name: 'Victoria Sterling',
      title: 'Competition Host',
      bio: 'Victoria is a Wall Street executive with a passion for recognizing business excellence.',
      instagram: '@victoriastarling',
      linkedin: 'victoriastarling',
    },
  },
  {
    id: 7,
    name: 'Elite Professionals Los Angeles',
    city: 'Los Angeles',
    season: '2026',
    status: 'upcoming',
    startDate: 'August 2026',
    contestants: 0,
    votes: 0,
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop',
    available: false,
    organizationId: 'elite-professionals',
    host: null,
  },
];

const ENDED_COMPETITIONS = [
  {
    id: 5,
    name: 'Most Eligible Chicago',
    city: 'Chicago',
    season: '2025',
    status: 'ended',
    phase: 'completed',
    endDate: 'December 2025',
    winner: 'Sarah Mitchell',
    contestants: 18,
    votes: 89420,
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop',
    available: true,
    organizationId: 'most-eligible',
    host: {
      name: 'David Park',
      title: 'Competition Host',
      bio: 'David hosted the inaugural Most Eligible Chicago competition, bringing together the Windy City\'s finest singles for an unforgettable season.',
      instagram: '@davidpark',
      linkedin: 'davidpark',
    },
    winners: [
      { rank: 1, name: 'Sarah Mitchell', votes: 28450, occupation: 'Marketing Executive', instagram: '@sarahmitchell' },
      { rank: 2, name: 'James Rodriguez', votes: 24320, occupation: 'Tech Entrepreneur', instagram: '@jamesrodriguez' },
      { rank: 3, name: 'Emily Chen', votes: 21890, occupation: 'Fashion Designer', instagram: '@emilychen' },
      { rank: 4, name: 'Michael Thompson', votes: 19750, occupation: 'Investment Banker', instagram: '@michaelthompson' },
      { rank: 5, name: 'Olivia Williams', votes: 18420, occupation: 'Attorney', instagram: '@oliviawilliams' },
    ],
  },
];

const UPCOMING_EVENTS = [
  {
    id: 1,
    city: 'New York',
    name: 'Season Kickoff Gala',
    date: 'March 15, 2026',
    time: '7:00 PM',
    venue: 'The Plaza Hotel',
    type: 'Gala',
    description: 'Join us for the official launch of Most Eligible New York Season 2026',
  },
  {
    id: 2,
    city: 'New York',
    name: 'Meet the Contestants',
    date: 'March 22, 2026',
    time: '6:00 PM',
    venue: 'Rooftop at 230 Fifth',
    type: 'Mixer',
    description: 'An exclusive evening to meet this season\'s contestants',
  },
  {
    id: 3,
    city: 'Chicago',
    name: 'Chicago Launch Party',
    date: 'May 10, 2026',
    time: '8:00 PM',
    venue: 'The Signature Room',
    type: 'Launch',
    description: 'Celebrate the beginning of Most Eligible Chicago 2026',
  },
  {
    id: 4,
    city: 'Miami',
    name: 'Miami Beach Kickoff',
    date: 'July 5, 2026',
    time: '7:00 PM',
    venue: 'Fontainebleau Miami Beach',
    type: 'Launch',
    description: 'The hottest launch party of the summer',
  },
  {
    id: 5,
    city: 'National',
    name: 'USA Finals Announcement',
    date: 'October 1, 2026',
    time: '8:00 PM',
    venue: 'Virtual Event',
    type: 'Announcement',
    description: 'Announcing the finalists for Most Eligible USA',
  },
];

const ACTIVITY_FEED = [
  { id: 1, type: 'vote', user: 'Anonymous', action: 'cast 50 votes for', target: 'Jessica Chen', city: 'New York', time: '2 minutes ago' },
  { id: 2, type: 'contestant', user: 'Emma Williams', action: 'joined as a contestant in', target: 'Most Eligible New York', city: 'New York', time: '15 minutes ago' },
  { id: 3, type: 'sponsor', user: 'Luxe Hotels', action: 'became a Platinum sponsor for', target: 'Most Eligible New York', city: 'New York', time: '1 hour ago' },
  { id: 4, type: 'vote', user: 'Anonymous', action: 'cast 25 votes for', target: 'Michael Torres', city: 'New York', time: '2 hours ago' },
  { id: 5, type: 'event', user: 'Elite Rank', action: 'announced new event:', target: 'Season Kickoff Gala', city: 'New York', time: '3 hours ago' },
  { id: 6, type: 'milestone', user: 'Most Eligible New York', action: 'reached', target: '100,000 total votes', city: 'New York', time: '5 hours ago' },
  { id: 7, type: 'contestant', user: 'Sarah Johnson', action: 'joined as a contestant in', target: 'Most Eligible New York', city: 'New York', time: '6 hours ago' },
  { id: 8, type: 'host', user: 'David Park', action: 'was verified as host for', target: 'Most Eligible Chicago', city: 'Chicago', time: '1 day ago' },
];

const OPPORTUNITIES = [
  {
    id: 1,
    type: 'host',
    title: 'Become a Host',
    icon: Mic,
    description: 'Lead your city\'s Most Eligible competition. Hosts manage contestants, events, and build community.',
    benefits: ['Earn 15% of all revenue', 'Build your personal brand', 'Network with elite professionals', 'Access to exclusive events'],
    requirements: ['Strong local network', 'Event planning experience', 'Social media presence', 'Passion for community building'],
    cities: ['Los Angeles', 'Dallas', 'Atlanta', 'Boston'],
    cta: 'Apply to Host',
  },
  {
    id: 2,
    type: 'sponsor',
    title: 'Become a Sponsor',
    icon: Building2,
    description: 'Connect your brand with ambitious professionals aged 21-40. Multiple sponsorship tiers available.',
    benefits: ['Brand visibility to target demographic', 'Event presence and mentions', 'Social media features', 'Winner endorsements'],
    tiers: [
      { name: 'Platinum', price: '$5,000', perks: 'Full media coverage, "Presented by" headline' },
      { name: 'Gold', price: '$1,000', perks: 'Event materials, newsletter inclusion' },
      { name: 'Silver', price: '$500', perks: 'Logo placement, social mention' },
    ],
    cta: 'Sponsor Now',
  },
  {
    id: 3,
    type: 'judge',
    title: 'Become a Judge',
    icon: Award,
    description: 'Join our panel of distinguished judges who evaluate contestants and select winners.',
    benefits: ['VIP access to all events', 'Media recognition', 'Networking opportunities', 'Influence competition outcomes'],
    requirements: ['Professional achievement', 'Industry recognition', 'Commitment to fairness', 'Available for events'],
    cities: ['All Cities'],
    cta: 'Apply to Judge',
  },
  {
    id: 4,
    type: 'contestant',
    title: 'Become a Contestant',
    icon: UserPlus,
    description: 'Compete for the title of Most Eligible in your city. Gain visibility, attend exclusive events, and win prizes.',
    benefits: ['Professional photoshoot', 'Event invitations', 'Social media exposure', 'Networking with sponsors'],
    requirements: ['Ages 21-40', 'Professional background', 'Active in your community', 'Available for events'],
    cities: ['New York (Open)', 'Chicago (Coming Soon)', 'Miami (Coming Soon)'],
    cta: 'Apply Now',
  },
];

export default function EliteRankCityModal({ isOpen, onClose, onOpenCompetition }) {
  const [activeTab, setActiveTab] = useState('competitions');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedOrganization, setSelectedOrganization] = useState(null);

  if (!isOpen) return null;

  const handleCompetitionClick = (competition) => {
    if (competition.available && onOpenCompetition) {
      onOpenCompetition(competition);
    }
  };

  const handleOrganizationClick = (orgId, e) => {
    e.stopPropagation();
    const org = ORGANIZATIONS.find(o => o.id === orgId);
    if (org) {
      setSelectedOrganization(org);
    }
  };

  const handleBackToCompetitions = () => {
    setSelectedOrganization(null);
  };

  const getOrganizationName = (orgId) => {
    const org = ORGANIZATIONS.find(o => o.id === orgId);
    return org?.name || '';
  };

  const cities = ['All', 'New York', 'Chicago', 'Miami', 'Los Angeles', 'National'];
  const filteredEvents = selectedCity === 'All'
    ? UPCOMING_EVENTS
    : UPCOMING_EVENTS.filter(e => e.city === selectedCity);

  // ============================================
  // Competition Card Component
  // ============================================
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
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${competition.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: isEnded ? 'grayscale(50%)' : 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: isEnded ? 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)' : 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.95) 100%)' }} />

        <div style={{ position: 'absolute', top: spacing.lg, left: spacing.lg, zIndex: 2 }}>
          {competition.status === 'live' ? (
            <Badge variant="success" size="md" pill>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                LIVE NOW
              </span>
            </Badge>
          ) : competition.status === 'nomination' ? (
            <Badge variant="warning" size="md" pill>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={12} />
                NOMINATIONS OPEN
              </span>
            </Badge>
          ) : competition.status === 'upcoming' ? (
            <Badge variant="warning" size="md" pill><Clock size={12} /> COMING SOON</Badge>
          ) : (
            <Badge variant="secondary" size="md" pill><Trophy size={12} /> COMPLETED</Badge>
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: spacing.xl, minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
            <MapPin size={14} style={{ color: colors.gold.primary }} />
            <span style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: typography.fontWeight.semibold }}>{competition.city}</span>
          </div>
          {/* Organization name - clickable */}
          {competition.organizationId && (
            <button
              onClick={(e) => handleOrganizationClick(competition.organizationId, e)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                marginBottom: spacing.xs,
              }}
            >
              <span style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.color = colors.gold.primary}
              onMouseLeave={(e) => e.target.style.color = colors.text.secondary}
              >
                {getOrganizationName(competition.organizationId)}
              </span>
              <ExternalLink size={10} style={{ color: colors.text.muted }} />
            </button>
          )}
          <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.sm, lineHeight: 1.2 }}>{competition.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg }}>
            <Calendar size={14} style={{ color: colors.text.secondary }} />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Season {competition.season}</span>
          </div>

          {isEnded && competition.winner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.md, background: 'rgba(212,175,55,0.15)', borderRadius: borderRadius.lg, border: `1px solid ${colors.border.gold}` }}>
              <Trophy size={18} style={{ color: colors.gold.primary }} />
              <div>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Winner</span>
                <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary }}>{competition.winner}</p>
              </div>
            </div>
          ) : competition.status === 'live' ? (
            <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: `${spacing.sm} ${spacing.md}`, background: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.md }}>
                <Users size={16} style={{ color: colors.gold.primary }} />
                <span style={{ fontSize: typography.fontSize.sm, color: '#fff' }}>{competition.contestants} Contestants</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: `${spacing.sm} ${spacing.md}`, background: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.md }}>
                <Star size={16} style={{ color: colors.gold.primary }} />
                <span style={{ fontSize: typography.fontSize.sm, color: '#fff' }}>{(competition.votes / 1000).toFixed(0)}K Votes</span>
              </div>
            </div>
          ) : competition.status === 'nomination' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: `${spacing.sm} ${spacing.md}`, background: 'rgba(212,175,55,0.15)', borderRadius: borderRadius.md, border: `1px solid ${colors.border.gold}`, width: 'fit-content' }}>
              <UserPlus size={16} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary }}>Nominate yourself or someone you know</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: `${spacing.sm} ${spacing.md}`, background: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.md, width: 'fit-content' }}>
              <Sparkles size={16} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.sm, color: '#fff' }}>{competition.startDate}</span>
            </div>
          )}

          {isAvailable && (
            <div style={{ marginTop: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.gold.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, opacity: isHovered ? 1 : 0.7, transition: 'opacity 0.2s' }}>
              {competition.status === 'ended' ? 'View Winners' : competition.status === 'nomination' ? 'Nominate Now' : 'View Competition'}
              <ChevronRight size={18} style={{ transform: isHovered ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Organization Page Component
  // ============================================
  const OrganizationPage = ({ organization }) => {
    const orgCompetitions = COMPETITIONS.filter(c => c.organizationId === organization.id);
    const orgEndedCompetitions = ENDED_COMPETITIONS.filter(c => c.organizationId === organization.id);
    const allOrgCompetitions = [...orgCompetitions, ...orgEndedCompetitions];

    return (
      <div style={{ minHeight: '100vh' }}>
        {/* Cover Image */}
        <div style={{ position: 'relative', height: '300px', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${organization.coverImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.95) 100%)',
          }} />

          {/* Back Button */}
          <button
            onClick={handleBackToCompetitions}
            style={{
              position: 'absolute',
              top: spacing.xl,
              left: spacing.xxl,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.lg}`,
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.pill,
              color: '#fff',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.2)';
              e.currentTarget.style.borderColor = colors.gold.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
              e.currentTarget.style.borderColor = colors.border.light;
            }}
          >
            <ArrowLeft size={16} />
            Back to All Competitions
          </button>

          {/* Organization Header */}
          <div style={{
            position: 'absolute',
            bottom: spacing.xxxl,
            left: spacing.xxl,
            right: spacing.xxl,
            display: 'flex',
            alignItems: 'flex-end',
            gap: spacing.xl,
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
              borderRadius: borderRadius.xxl,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '4px solid rgba(255,255,255,0.2)',
            }}>
              {organization.logo}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: typography.fontSize.hero,
                fontWeight: typography.fontWeight.bold,
                color: '#fff',
                marginBottom: spacing.xs,
              }}>
                {organization.name}
              </h1>
              <p style={{
                fontSize: typography.fontSize.lg,
                color: colors.gold.primary,
                margin: 0,
              }}>
                {organization.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Organization Info */}
        <div style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, maxWidth: '1400px', margin: '0 auto' }}>
          {/* Description & Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: spacing.xxl,
            marginBottom: spacing.xxxl,
          }}>
            <div>
              <h2 style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: '#fff',
                marginBottom: spacing.lg,
              }}>
                About {organization.name}
              </h2>
              <p style={{
                fontSize: typography.fontSize.md,
                color: colors.text.secondary,
                lineHeight: 1.8,
                marginBottom: spacing.xl,
              }}>
                {organization.description}
              </p>
              <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <Calendar size={18} style={{ color: colors.gold.primary }} />
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.light }}>
                    Founded {organization.founded}
                  </span>
                </div>
                {organization.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <Globe size={18} style={{ color: colors.gold.primary }} />
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.text.light }}>
                      {organization.website}
                    </span>
                  </div>
                )}
                {organization.instagram && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <Instagram size={18} style={{ color: colors.gold.primary }} />
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.text.light }}>
                      {organization.instagram}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.xxl,
              padding: spacing.xl,
            }}>
              <h3 style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                color: colors.gold.primary,
                marginBottom: spacing.lg,
                textAlign: 'center',
              }}>
                Platform Stats
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: typography.fontSize.xxxl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.gold.primary,
                  }}>
                    {organization.stats.cities}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Cities
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: typography.fontSize.xxxl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.gold.primary,
                  }}>
                    {organization.stats.contestants}+
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Contestants
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: typography.fontSize.xxxl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.gold.primary,
                  }}>
                    {(organization.stats.totalVotes / 1000).toFixed(0)}K
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Total Votes
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: typography.fontSize.xxxl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.gold.primary,
                  }}>
                    {organization.stats.events}+
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Events
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Competitions */}
          {orgCompetitions.length > 0 && (
            <section style={{ marginBottom: spacing.xxxl }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                <Sparkles size={24} style={{ color: colors.gold.primary }} />
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>
                  Current Competitions
                </h3>
                <Badge variant="warning" size="sm">{orgCompetitions.length} Active</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl }}>
                {orgCompetitions.map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            </section>
          )}

          {/* Past Competitions */}
          {orgEndedCompetitions.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                <Trophy size={24} style={{ color: colors.text.secondary }} />
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                  Past Competitions
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl }}>
                {orgEndedCompetitions.map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} isEnded />
                ))}
              </div>
            </section>
          )}

          {/* No competitions message */}
          {allOrgCompetitions.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: spacing.xxxl,
              background: colors.background.card,
              borderRadius: borderRadius.xxl,
              border: `1px solid ${colors.border.light}`,
            }}>
              <Crown size={48} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
              <h3 style={{ fontSize: typography.fontSize.xl, color: '#fff', marginBottom: spacing.sm }}>
                No Competitions Yet
              </h3>
              <p style={{ fontSize: typography.fontSize.md, color: colors.text.secondary }}>
                Stay tuned for upcoming competitions from {organization.name}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Render Tab Content
  // ============================================
  const renderContent = () => {
    switch (activeTab) {
      case 'competitions':
        return (
          <>
            <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.lg, lineHeight: 1.2 }}>
                Discover the Most Eligible
                <span style={{ display: 'block', color: colors.gold.primary }}>In Your City</span>
              </h2>
              <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                Vote for your favorites, attend exclusive events, and be part of the most exciting social competition in America.
              </p>
            </section>

            <section style={{ padding: `0 ${spacing.xxl} ${spacing.xxxl}`, maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                <Sparkles size={24} style={{ color: colors.gold.primary }} />
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>Season 2026</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl }}>
                {COMPETITIONS.map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            </section>

            <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, maxWidth: '1400px', margin: '0 auto', borderTop: `1px solid ${colors.border.light}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                <Trophy size={24} style={{ color: colors.text.secondary }} />
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>Past Seasons</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl, maxWidth: '700px' }}>
                {ENDED_COMPETITIONS.map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} isEnded />
                ))}
              </div>
            </section>
          </>
        );

      case 'events':
        return (
          <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <h2 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.md }}>Upcoming Events</h2>
              <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary }}>Exclusive gatherings across all cities</p>
            </div>

            {/* City Filter */}
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.xxxl, flexWrap: 'wrap' }}>
              {cities.map(city => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    background: selectedCity === city ? colors.gold.primary : 'transparent',
                    border: `1px solid ${selectedCity === city ? colors.gold.primary : colors.border.light}`,
                    borderRadius: borderRadius.pill,
                    color: selectedCity === city ? '#000' : colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Events List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              {filteredEvents.map(event => (
                <div
                  key={event.id}
                  style={{
                    background: colors.background.card,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.xl,
                    padding: spacing.xl,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: spacing.xl,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                      <Badge variant="warning" size="sm">{event.type}</Badge>
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary }}>{event.city}</span>
                    </div>
                    <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.sm }}>{event.name}</h3>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md }}>{event.description}</p>
                    <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.text.light }}>
                        <Calendar size={14} /> {event.date}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.text.light }}>
                        <Clock size={14} /> {event.time}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.text.light }}>
                        <MapPin size={14} /> {event.venue}
                      </span>
                    </div>
                  </div>
                  <Button variant="secondary" style={{ whiteSpace: 'nowrap' }}>Learn More</Button>
                </div>
              ))}
            </div>
          </section>
        );

      case 'activity':
        return (
          <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <h2 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.md }}>Activity Feed</h2>
              <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary }}>Real-time updates from across the Elite Rank network</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {ACTIVITY_FEED.map(item => {
                const getIcon = () => {
                  switch (item.type) {
                    case 'vote': return <Heart size={18} style={{ color: colors.status.error }} />;
                    case 'contestant': return <UserPlus size={18} style={{ color: colors.status.success }} />;
                    case 'sponsor': return <Building2 size={18} style={{ color: colors.gold.primary }} />;
                    case 'event': return <Megaphone size={18} style={{ color: colors.status.info }} />;
                    case 'milestone': return <TrendingUp size={18} style={{ color: colors.status.purple }} />;
                    case 'host': return <CheckCircle size={18} style={{ color: colors.status.success }} />;
                    default: return <Activity size={18} />;
                  }
                };

                return (
                  <div
                    key={item.id}
                    style={{
                      background: colors.background.card,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.lg,
                      padding: spacing.lg,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: borderRadius.md, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {getIcon()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>
                        <span style={{ fontWeight: typography.fontWeight.semibold }}>{item.user}</span>{' '}
                        {item.action}{' '}
                        <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>{item.target}</span>
                      </p>
                      <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.xs }}>
                        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{item.time}</span>
                        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>• {item.city}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case 'about':
        return (
          <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, maxWidth: '1000px', margin: '0 auto' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', borderRadius: borderRadius.xl, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: spacing.xl }}>
                <Crown size={40} style={{ color: '#0a0a0f' }} />
              </div>
              <h2 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.lg }}>About Elite Rank</h2>
              <p style={{ fontSize: typography.fontSize.xl, color: colors.text.secondary, maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                Elite Rank is America's premier social competition platform, connecting ambitious professionals through city-based competitions, exclusive events, and meaningful networking opportunities.
              </p>
            </div>

            {/* Mission */}
            <div style={{ background: colors.background.card, border: `1px solid ${colors.border.gold}`, borderRadius: borderRadius.xxl, padding: spacing.xxxl, marginBottom: spacing.xxxl }}>
              <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary, marginBottom: spacing.lg, textAlign: 'center' }}>Our Mission</h3>
              <p style={{ fontSize: typography.fontSize.lg, color: colors.text.primary, textAlign: 'center', lineHeight: 1.8 }}>
                To celebrate and elevate exceptional individuals in every major city. We believe that recognition, community, and connection are powerful catalysts for personal and professional growth.
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.xl, marginBottom: spacing.xxxl }}>
              {[
                { value: '5', label: 'Cities' },
                { value: '200+', label: 'Contestants' },
                { value: '500K+', label: 'Votes Cast' },
                { value: '50+', label: 'Events Hosted' },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', padding: spacing.xl, background: colors.background.card, borderRadius: borderRadius.xl, border: `1px solid ${colors.border.light}` }}>
                  <div style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: colors.gold.primary, marginBottom: spacing.sm }}>{stat.value}</div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* How It Works */}
            <div style={{ marginBottom: spacing.xxxl }}>
              <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.xl, textAlign: 'center' }}>How It Works</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.xl }}>
                {[
                  { step: '1', title: 'Compete', desc: 'Contestants are nominated and compete for votes in their city' },
                  { step: '2', title: 'Vote', desc: 'The public votes for their favorites throughout the season' },
                  { step: '3', title: 'Win', desc: 'Winners are crowned at exclusive finale events' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: spacing.xl }}>
                    <div style={{ width: '48px', height: '48px', background: colors.gold.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#0a0a0f' }}>{item.step}</div>
                    <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.sm }}>{item.title}</h4>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Values */}
            <div>
              <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.xl, textAlign: 'center' }}>Our Values</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.lg }}>
                {[
                  { icon: Star, title: 'Excellence', desc: 'We celebrate those who strive for greatness in all aspects of life' },
                  { icon: Users, title: 'Community', desc: 'Building meaningful connections that last beyond the competition' },
                  { icon: Heart, title: 'Authenticity', desc: 'Encouraging genuine self-expression and personal branding' },
                  { icon: Award, title: 'Recognition', desc: 'Providing a platform to showcase exceptional individuals' },
                ].map((value, i) => (
                  <div key={i} style={{ display: 'flex', gap: spacing.lg, padding: spacing.xl, background: colors.background.card, borderRadius: borderRadius.xl, border: `1px solid ${colors.border.light}` }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(212,175,55,0.1)', borderRadius: borderRadius.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <value.icon size={24} style={{ color: colors.gold.primary }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: '#fff', marginBottom: spacing.xs }}>{value.title}</h4>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{value.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'opportunities':
        return (
          <section style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <h2 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff', marginBottom: spacing.md }}>Join Elite Rank</h2>
              <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary, maxWidth: '600px', margin: '0 auto' }}>
                Multiple ways to be part of America's most exciting social competition
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.xl }}>
              {OPPORTUNITIES.map(opp => (
                <div
                  key={opp.id}
                  style={{
                    background: colors.background.card,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.xxl,
                    padding: spacing.xxl,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                    <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', borderRadius: borderRadius.xl, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <opp.icon size={28} style={{ color: colors.gold.primary }} />
                    </div>
                    <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>{opp.title}</h3>
                  </div>

                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.lg, lineHeight: 1.6 }}>{opp.description}</p>

                  <div style={{ marginBottom: spacing.lg }}>
                    <h4 style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: spacing.sm }}>Benefits</h4>
                    <ul style={{ margin: 0, paddingLeft: spacing.lg }}>
                      {opp.benefits.map((b, i) => (
                        <li key={i} style={{ fontSize: typography.fontSize.sm, color: colors.text.light, marginBottom: spacing.xs }}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  {opp.tiers && (
                    <div style={{ marginBottom: spacing.lg }}>
                      <h4 style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: spacing.sm }}>Sponsorship Tiers</h4>
                      {opp.tiers.map((tier, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm, background: 'rgba(255,255,255,0.03)', borderRadius: borderRadius.md, marginBottom: spacing.xs }}>
                          <span style={{ fontSize: typography.fontSize.sm, color: '#fff', fontWeight: typography.fontWeight.medium }}>{tier.name}</span>
                          <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>{tier.price}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {opp.requirements && (
                    <div style={{ marginBottom: spacing.lg }}>
                      <h4 style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: spacing.sm }}>Requirements</h4>
                      <ul style={{ margin: 0, paddingLeft: spacing.lg }}>
                        {opp.requirements.map((r, i) => (
                          <li key={i} style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.xs }}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {opp.cities && (
                    <div style={{ marginBottom: spacing.lg }}>
                      <h4 style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: spacing.sm }}>Open Cities</h4>
                      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                        {opp.cities.map((city, i) => (
                          <span key={i} style={{ fontSize: typography.fontSize.xs, padding: `${spacing.xs} ${spacing.sm}`, background: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, color: colors.text.light }}>{city}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto' }}>
                    <Button fullWidth>{opp.cta}</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  // If organization is selected, show organization page
  if (selectedOrganization) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 100, overflow: 'auto' }}>
        {/* Animated Background */}
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />

        {/* Header */}
        <header style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.8) 100%)', borderBottom: `1px solid rgba(212,175,55,0.2)`, padding: `${spacing.lg} ${spacing.xxl}`, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                borderRadius: borderRadius.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
              }}>
                {selectedOrganization.logo}
              </div>
              <div>
                <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: '#fff', margin: 0 }}>{selectedOrganization.name}</h1>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, margin: 0, letterSpacing: '1px' }}>Organization</p>
              </div>
            </div>
            <Button variant="secondary" onClick={onClose} icon={X} style={{ width: 'auto', padding: `${spacing.sm} ${spacing.lg}` }}>Exit</Button>
          </div>
        </header>

        {/* Organization Content */}
        <OrganizationPage organization={selectedOrganization} />

        {/* Footer */}
        <footer style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, textAlign: 'center', borderTop: `1px solid ${colors.border.light}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <span style={{ fontSize: '20px' }}>{selectedOrganization.logo}</span>
            <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>{selectedOrganization.name}</span>
          </div>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>© 2025 {selectedOrganization.name}. All rights reserved.</p>
        </footer>

        {/* CSS Animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 100, overflow: 'auto' }}>
      {/* Animated Background */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />

      {/* Header */}
      <header style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.8) 100%)', borderBottom: `1px solid rgba(212,175,55,0.2)`, padding: `${spacing.lg} ${spacing.xxl}`, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', borderRadius: borderRadius.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(212,175,55,0.4)' }}>
              <Crown size={26} style={{ color: '#0a0a0f' }} />
            </div>
            <div>
              <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: '#fff', margin: 0 }}>Elite Rank</h1>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, margin: 0, letterSpacing: '1px' }}>Find Your City</p>
            </div>
          </div>
          <Button variant="secondary" onClick={onClose} icon={X} style={{ width: 'auto', padding: `${spacing.sm} ${spacing.lg}` }}>Exit</Button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ background: 'rgba(20,20,30,0.8)', borderBottom: `1px solid ${colors.border.lighter}`, padding: `0 ${spacing.xxl}`, position: 'sticky', top: '81px', zIndex: 9, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '0', overflowX: 'auto' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: `${spacing.md} ${spacing.xl}`,
                  color: isActive ? colors.gold.primary : colors.text.secondary,
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                  borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: '2px',
                  borderBottomStyle: 'solid',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      {renderContent()}

      {/* Footer */}
      <footer style={{ padding: `${spacing.xxxl} ${spacing.xxl}`, textAlign: 'center', borderTop: `1px solid ${colors.border.light}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Crown size={20} style={{ color: colors.gold.primary }} />
          <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: '#fff' }}>Elite Rank</span>
        </div>
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>© 2025 Elite Rank. All rights reserved.</p>
      </footer>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

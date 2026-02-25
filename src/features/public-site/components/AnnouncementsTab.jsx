import React, { useState } from 'react';
import { Sparkles, Check, FileText, MapPin, ChevronDown, ChevronUp, Clock, Newspaper } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, transitions, gradients } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';

const TYPE_CONFIG = {
  announcement: { icon: Sparkles, label: 'ANNOUNCEMENT', color: colors.gold.primary, bgColor: 'rgba(212,175,55,0.12)' },
  update: { icon: Check, label: 'UPDATE', color: colors.status.success, bgColor: 'rgba(34,197,94,0.10)' },
  news: { icon: FileText, label: 'PRESS RELEASE', color: colors.status.info, bgColor: 'rgba(59,130,246,0.10)' },
};

function formatArticleDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return null;
}

/**
 * Split content into paragraphs intelligently.
 * Tries double-newlines first, then single newlines, then splits long
 * single-block text into ~2-sentence chunks so expanded articles are readable.
 */
function splitIntoParagraphs(content) {
  if (!content) return [];

  // First try double newlines
  let parts = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  // Try single newlines
  parts = content.split(/\n/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  // Single block — split by sentences, group every 2-3
  const sentences = content.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length <= 2) return [content];

  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const chunk = sentences.slice(i, i + 2).join(' ').trim();
    if (chunk) paragraphs.push(chunk);
  }
  return paragraphs;
}

/** Extract the first sentence as a lead/summary */
function extractLead(content) {
  if (!content) return { lead: '', rest: '' };
  const match = content.match(/^(.+?[.!?])\s+(.+)$/s);
  if (match) return { lead: match[1].trim(), rest: match[2].trim() };
  // If no sentence boundary found, take first 120 chars
  if (content.length > 120) {
    const breakpoint = content.lastIndexOf(' ', 120);
    return {
      lead: content.slice(0, breakpoint > 60 ? breakpoint : 120) + '...',
      rest: content.slice(breakpoint > 60 ? breakpoint : 120).trim(),
    };
  }
  return { lead: content, rest: '' };
}

/** Category badge */
function TypeBadge({ type }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.announcement;
  const Icon = config.icon;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        background: config.bgColor,
        borderRadius: borderRadius.sm,
      }}
    >
      <Icon size={11} style={{ color: config.color }} />
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: typography.fontWeight.bold,
          color: config.color,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {config.label}
      </span>
    </div>
  );
}

/** Featured/hero article — first or pinned announcement */
function FeaturedArticle({ post, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const { lead, rest } = extractLead(post.content || '');
  const timeAgo = getTimeAgo(post.date);
  const hasMore = rest.length > 0;
  const paragraphs = splitIntoParagraphs(rest);

  return (
    <article
      style={{
        position: 'relative',
        background: colors.background.card,
        border: `1px solid rgba(212,175,55,0.25)`,
        borderRadius: borderRadius.xxl,
        overflow: 'hidden',
        marginBottom: spacing.xl,
      }}
    >
      {/* Gold top bar */}
      <div style={{ height: '3px', background: gradients.gold }} />

      <div style={{ padding: isMobile ? spacing.xl : `${spacing.xxl} ${spacing.xxxl}` }}>
        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.lg,
            flexWrap: 'wrap',
          }}
        >
          <TypeBadge type={post.type} />
          {post.pinned && (
            <Badge variant="gold" size="sm" uppercase icon={MapPin}>
              PINNED
            </Badge>
          )}
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginLeft: 'auto' }}>
            {timeAgo || formatArticleDate(post.date)}
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: isMobile ? typography.fontSize['2xl'] : typography.fontSize['4xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: '1.2',
            marginBottom: spacing.lg,
            letterSpacing: '-0.02em',
          }}
        >
          {post.title}
        </h2>

        {/* Dateline divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xl,
            paddingBottom: spacing.md,
            borderBottom: `1px solid ${colors.border.primary}`,
          }}
        >
          <Clock size={12} style={{ color: colors.text.muted }} />
          <span style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
            {formatArticleDate(post.date)}
          </span>
        </div>

        {/* Lead sentence — larger, lighter color */}
        <p
          style={{
            fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
            lineHeight: '1.7',
            color: colors.text.secondary,
            marginBottom: hasMore ? spacing.lg : 0,
            fontWeight: typography.fontWeight.normal,
          }}
        >
          {lead}
        </p>

        {/* Expanded body */}
        {hasMore && expanded && (
          <div style={{ marginTop: spacing.md }}>
            {paragraphs.map((p, idx) => (
              <p
                key={idx}
                style={{
                  fontSize: typography.fontSize.md,
                  lineHeight: '1.8',
                  color: colors.text.secondary,
                  marginBottom: idx < paragraphs.length - 1 ? spacing.lg : 0,
                }}
              >
                {p}
              </p>
            ))}
          </div>
        )}

        {/* Toggle */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: spacing.lg,
              padding: `${spacing.sm} ${spacing.lg}`,
              background: 'rgba(212,175,55,0.08)',
              border: `1px solid rgba(212,175,55,0.2)`,
              borderRadius: borderRadius.pill,
              color: colors.gold.primary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: `all ${transitions.fast}`,
            }}
          >
            {expanded ? (
              <>Show less <ChevronUp size={14} /></>
            ) : (
              <>Continue reading <ChevronDown size={14} /></>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

/** Standard article card */
function ArticleCard({ post, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const { lead, rest } = extractLead(post.content || '');
  const timeAgo = getTimeAgo(post.date);
  const hasMore = rest.length > 0;
  const paragraphs = splitIntoParagraphs(rest);
  const postDate = new Date(post.date);
  const isNew = (new Date() - postDate) / (1000 * 60 * 60) < 24;

  return (
    <article
      style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        transition: `border-color ${transitions.fast}`,
      }}
    >
      {/* Thin accent line based on type */}
      <div
        style={{
          height: '2px',
          background: (TYPE_CONFIG[post.type] || TYPE_CONFIG.announcement).color,
          opacity: 0.5,
        }}
      />

      <div style={{ padding: isMobile ? spacing.lg : spacing.xl }}>
        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md,
            flexWrap: 'wrap',
          }}
        >
          <TypeBadge type={post.type} />
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
            {formatArticleDate(post.date)}
          </span>
          {post.pinned && (
            <Badge variant="gold" size="sm" uppercase icon={MapPin}>PINNED</Badge>
          )}
          {isNew && !post.pinned && (
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: typography.fontWeight.bold,
                color: colors.gold.primary,
                letterSpacing: '0.05em',
                background: 'rgba(212,175,55,0.1)',
                padding: '2px 6px',
                borderRadius: borderRadius.sm,
              }}
            >
              NEW
            </span>
          )}
          {timeAgo && (
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginLeft: 'auto' }}>
              {timeAgo}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: '1.3',
            marginBottom: spacing.sm,
            letterSpacing: '-0.01em',
          }}
        >
          {post.title}
        </h3>

        {/* Lead preview — always visible, 2 lines max */}
        <p
          style={{
            fontSize: typography.fontSize.base,
            lineHeight: '1.6',
            color: colors.text.secondary,
            marginBottom: 0,
            ...(!expanded ? {
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            } : {}),
          }}
        >
          {lead}
        </p>

        {/* Expanded body */}
        {hasMore && expanded && (
          <div style={{ marginTop: spacing.md }}>
            {paragraphs.map((p, idx) => (
              <p
                key={idx}
                style={{
                  fontSize: typography.fontSize.base,
                  lineHeight: '1.7',
                  color: colors.text.secondary,
                  marginBottom: idx < paragraphs.length - 1 ? spacing.md : 0,
                }}
              >
                {p}
              </p>
            ))}
          </div>
        )}

        {/* Toggle */}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: spacing.md,
              padding: 0,
              background: 'none',
              border: 'none',
              color: colors.gold.primary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
            }}
          >
            {expanded ? (
              <>Show less <ChevronUp size={14} /></>
            ) : (
              <>Read more <ChevronDown size={14} /></>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

export default function AnnouncementsTab({ announcements = [], city = 'Your City', season }) {
  const { isMobile } = useResponsive();

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const competitionName = season ? `Most Eligible ${city} ${season}` : `Most Eligible ${city}`;
  const featured = sortedAnnouncements[0];
  const remaining = sortedAnnouncements.slice(1);

  return (
    <div>
      {/* Page header */}
      <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <div style={{ width: 24, height: 1, background: colors.gold.primary, opacity: 0.4 }} />
          <Newspaper size={14} style={{ color: colors.gold.primary, opacity: 0.6 }} />
          <div style={{ width: 24, height: 1, background: colors.gold.primary, opacity: 0.4 }} />
        </div>
        <h1
          style={{
            fontSize: isMobile ? typography.fontSize['3xl'] : typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.xs,
            letterSpacing: '-0.02em',
            lineHeight: '1.1',
          }}
        >
          News & Updates
        </h1>
        <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
          Latest from {competitionName}
        </p>
      </div>

      {/* Content */}
      {sortedAnnouncements.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: spacing.xxxl,
            background: colors.background.card,
            borderRadius: borderRadius.xxl,
            border: `1px solid ${colors.border.secondary}`,
          }}
        >
          <Newspaper size={40} style={{ color: colors.text.muted, marginBottom: spacing.lg, opacity: 0.3 }} />
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg, marginBottom: spacing.xs }}>
            No articles yet
          </p>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
            Check back soon for updates
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {featured && <FeaturedArticle post={featured} isMobile={isMobile} />}
          {remaining.map((post) => (
            <ArticleCard key={post.id} post={post} isMobile={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
}

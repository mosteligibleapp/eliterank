import React, { useState } from 'react';
import { Sparkles, Check, FileText, MapPin, Clock, ArrowLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Badge, OrganizationLogo } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, transitions, gradients } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';

const TYPE_CONFIG = {
  announcement: { icon: Sparkles, label: 'Announcement', color: colors.gold.primary, bgColor: 'rgba(212,175,55,0.10)' },
  update: { icon: Check, label: 'Update', color: colors.status.success, bgColor: 'rgba(34,197,94,0.08)' },
  news: { icon: FileText, label: 'Press Release', color: colors.status.info, bgColor: 'rgba(59,130,246,0.08)' },
};

function formatArticleDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatArticleDate(dateString);
}

/**
 * Parse article content into structured blocks.
 * Detects ALL-CAPS section headers, "Title:" sub-headers,
 * bullet/number lists, and regular paragraphs.
 * Returns [{ type: 'heading'|'paragraph'|'list-item', text }]
 */
function parseArticleContent(content) {
  if (!content) return [];

  // First, try splitting on newlines
  let lines = content.split(/\n/).map(s => s.trim()).filter(Boolean);

  // If it's a single block, split on ALL-CAPS headers embedded in text
  // e.g. "...some text. HOW IT WORKS Contestants are..." → split before "HOW IT WORKS"
  if (lines.length <= 1 && content.length > 200) {
    // Split before ALL-CAPS headers (2+ words, all uppercase, preceded by sentence-end)
    const withBreaks = content.replace(
      /([.!?])\s+([A-Z][A-Z\s&':]{4,}?)(?=\s+[A-Z][a-z])/g,
      '$1\n\n$2\n\n'
    );
    // Also split before "Title:" patterns
    const withMoreBreaks = withBreaks.replace(
      /([.!?])\s+([A-Z][A-Za-z\s&']+:)\s+/g,
      '$1\n\n$2\n\n'
    );
    lines = withMoreBreaks.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }

  // If still a single block, split by sentences into groups of 2-3
  if (lines.length <= 1) {
    const sentences = content.match(/[^.!?]+[.!?]+/g);
    if (!sentences || sentences.length <= 2) return [{ type: 'paragraph', text: content }];
    const blocks = [];
    for (let i = 0; i < sentences.length; i += 2) {
      blocks.push({ type: 'paragraph', text: sentences.slice(i, i + 2).join(' ').trim() });
    }
    return blocks;
  }

  // Parse each line into typed blocks
  const blocks = [];
  for (const line of lines) {
    // ALL-CAPS heading (at least 3 chars, all uppercase letters/spaces/&)
    if (/^[A-Z][A-Z\s&':\-]{2,}$/.test(line.replace(/:$/, ''))) {
      blocks.push({ type: 'heading', text: line.replace(/:$/, '') });
    }
    // "Title:" style sub-header (short, ends with colon)
    else if (/^[A-Z][A-Za-z\s&']+:$/.test(line) && line.length < 50) {
      blocks.push({ type: 'heading', text: line.replace(/:$/, '') });
    }
    // Bullet or numbered list item
    else if (/^[-•●◦]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
      blocks.push({ type: 'list-item', text: line.replace(/^[-•●◦]\s*/, '').replace(/^\d+[.)]\s*/, '') });
    }
    // Regular paragraph
    else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  return blocks;
}

/* ─── Organization Byline ─── */
function OrgByline({ competition, size = 'md' }) {
  const orgName = competition?.organization?.name || 'Most Eligible';
  const orgLogo = competition?.organization?.logo_url;
  const logoSize = size === 'sm' ? 20 : 28;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? '6px' : spacing.sm }}>
      <OrganizationLogo
        logo={orgLogo}
        size={logoSize}
        style={{ borderRadius: borderRadius.sm }}
      />
      <span
        style={{
          fontSize: size === 'sm' ? typography.fontSize.xs : typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.secondary,
        }}
      >
        {orgName}
      </span>
    </div>
  );
}

/* ─── Full Article Detail View ─── */
function ArticleDetail({ post, onBack, isMobile, competition }) {
  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.announcement;
  const TypeIcon = typeConfig.icon;
  const blocks = parseArticleContent(post.content || '');
  let isFirstParagraph = true;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: `${spacing.sm} 0`,
          marginBottom: spacing.xl,
          background: 'none',
          border: 'none',
          color: colors.gold.primary,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={16} />
        Back to News
      </button>

      <article style={{ maxWidth: '680px' }}>
        {/* Org byline + category row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }}>
          <OrgByline competition={competition} />
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: typeConfig.bgColor,
                borderRadius: borderRadius.md,
              }}
            >
              <TypeIcon size={12} style={{ color: typeConfig.color }} />
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  color: typeConfig.color,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {typeConfig.label}
              </span>
            </div>
            {post.pinned && (
              <Badge variant="gold" size="sm" uppercase icon={MapPin}>PINNED</Badge>
            )}
          </div>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: isMobile ? typography.fontSize['3xl'] : typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.extrabold,
            color: colors.text.primary,
            lineHeight: '1.15',
            marginBottom: spacing.lg,
            letterSpacing: '-0.025em',
          }}
        >
          {post.title}
        </h1>

        {/* Dateline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            paddingBottom: spacing.xl,
            marginBottom: spacing.xl,
            borderBottom: `1px solid ${colors.border.primary}`,
          }}
        >
          <Clock size={13} style={{ color: colors.text.muted }} />
          <span style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
            {formatArticleDate(post.date)}
          </span>
        </div>

        {/* Article body — structured blocks */}
        <div>
          {blocks.map((block, idx) => {
            if (block.type === 'heading') {
              return (
                <h3
                  key={idx}
                  style={{
                    fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text.primary,
                    marginTop: idx > 0 ? spacing.xxl : 0,
                    marginBottom: spacing.md,
                    paddingBottom: spacing.sm,
                    borderBottom: `1px solid ${colors.border.secondary}`,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {block.text}
                </h3>
              );
            }

            if (block.type === 'list-item') {
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: spacing.md,
                    marginBottom: spacing.sm,
                    paddingLeft: spacing.md,
                  }}
                >
                  <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.bold, flexShrink: 0 }}>
                    &bull;
                  </span>
                  <p style={{ fontSize: typography.fontSize.md, lineHeight: '1.7', color: colors.text.secondary, margin: 0 }}>
                    {block.text}
                  </p>
                </div>
              );
            }

            // Paragraph — first one is styled as the lede
            const isLede = isFirstParagraph;
            if (isLede) isFirstParagraph = false;

            return (
              <p
                key={idx}
                style={{
                  fontSize: isLede
                    ? (isMobile ? typography.fontSize.lg : typography.fontSize.xl)
                    : typography.fontSize.md,
                  lineHeight: '1.8',
                  color: isLede ? colors.text.primary : colors.text.secondary,
                  marginBottom: spacing.lg,
                }}
              >
                {block.text}
              </p>
            );
          })}
        </div>
      </article>
    </div>
  );
}

/* ─── Feed: Featured Hero Card ─── */
function FeaturedCard({ post, onClick, isMobile, competition }) {
  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.announcement;
  const TypeIcon = typeConfig.icon;
  const timeAgo = getTimeAgo(post.date);

  // Grab just the first sentence for a subtitle
  const firstSentence = (post.content || '').match(/^(.+?[.!?])/)?.[1] || '';

  return (
    <article
      onClick={onClick}
      style={{
        position: 'relative',
        background: colors.background.card,
        border: `1px solid rgba(212,175,55,0.2)`,
        borderRadius: borderRadius.xxl,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: `all ${transitions.normal}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Gold top bar */}
      <div style={{ height: '3px', background: gradients.gold }} />

      <div style={{ padding: isMobile ? spacing.xl : spacing.xxl }}>
        {/* Top row: org byline + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <OrgByline competition={competition} size="sm" />
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
            {timeAgo}
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: isMobile ? typography.fontSize['2xl'] : typography.fontSize['4xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
            marginBottom: firstSentence ? spacing.md : spacing.sm,
          }}
        >
          {post.title}
        </h2>

        {/* One-line subtitle */}
        {firstSentence && (
          <p
            style={{
              fontSize: typography.fontSize.md,
              lineHeight: '1.5',
              color: colors.text.tertiary,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: spacing.md,
            }}
          >
            {firstSentence}
          </p>
        )}

        {/* Read arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>
            Read article
          </span>
          <ChevronRight size={14} style={{ color: colors.gold.primary }} />
        </div>
      </div>
    </article>
  );
}

/* ─── Feed: Compact Headline Card ─── */
function HeadlineCard({ post, onClick, isMobile, competition }) {
  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.announcement;
  const TypeIcon = typeConfig.icon;
  const timeAgo = getTimeAgo(post.date);
  const isNew = (new Date() - new Date(post.date)) / (1000 * 60 * 60) < 24;

  return (
    <article
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? spacing.md : spacing.lg,
        background: colors.background.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: borderRadius.xl,
        padding: isMobile ? spacing.lg : spacing.xl,
        cursor: 'pointer',
        transition: `all ${transitions.normal}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = colors.border.focus;
        e.currentTarget.style.background = colors.background.cardHover;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = colors.border.primary;
        e.currentTarget.style.background = colors.background.card;
      }}
    >
      {/* Left: org logo */}
      <OrganizationLogo
        logo={competition?.organization?.logo_url}
        size={isMobile ? 40 : 48}
        style={{ borderRadius: borderRadius.lg }}
      />

      {/* Center: headline + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: isMobile ? typography.fontSize.base : typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            lineHeight: '1.3',
            marginBottom: '4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
            {competition?.organization?.name || 'Most Eligible'}
          </span>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, opacity: 0.4 }}>·</span>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
            {timeAgo}
          </span>
          {post.pinned && (
            <span style={{ fontSize: '0.625rem', fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
              PINNED
            </span>
          )}
          {isNew && !post.pinned && (
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: typography.fontWeight.bold,
                color: colors.gold.primary,
                background: 'rgba(212,175,55,0.1)',
                padding: '1px 5px',
                borderRadius: borderRadius.xs,
              }}
            >
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Right: chevron */}
      <ChevronRight size={18} style={{ color: colors.text.muted, flexShrink: 0 }} />
    </article>
  );
}

/* ─── Main Component ─── */
export default function AnnouncementsTab({ announcements = [], city = 'Your City', season, competition }) {
  const { isMobile } = useResponsive();
  const [selectedPost, setSelectedPost] = useState(null);

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const competitionName = season ? `Most Eligible ${city} ${season}` : `Most Eligible ${city}`;

  // If an article is selected, show the full detail view
  if (selectedPost) {
    return (
      <ArticleDetail
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
        isMobile={isMobile}
        competition={competition}
      />
    );
  }

  const featured = sortedAnnouncements[0];
  const remaining = sortedAnnouncements.slice(1);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: spacing.xl }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
          <Newspaper size={16} style={{ color: colors.gold.primary }} />
          <span
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.gold.primary,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Newsroom
          </span>
        </div>
        <h1
          style={{
            fontSize: isMobile ? typography.fontSize['2xl'] : typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            letterSpacing: '-0.02em',
          }}
        >
          News & Updates
        </h1>
      </div>

      {/* Feed */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {/* Featured hero card */}
          {featured && (
            <FeaturedCard
              post={featured}
              onClick={() => setSelectedPost(featured)}
              isMobile={isMobile}
              competition={competition}
            />
          )}

          {/* Headline list */}
          {remaining.map(post => (
            <HeadlineCard
              key={post.id}
              post={post}
              onClick={() => setSelectedPost(post)}
              isMobile={isMobile}
              competition={competition}
            />
          ))}
        </div>
      )}
    </div>
  );
}

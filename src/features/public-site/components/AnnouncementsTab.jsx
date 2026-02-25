import React, { useState } from 'react';
import { Sparkles, Check, FileText, MapPin, ChevronDown, ChevronUp, Clock } from 'lucide-react';
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
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
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

/** Format content into paragraphs by splitting on double-newlines */
function ContentBody({ content, collapsed, maxLines = 4 }) {
  if (!content) return null;

  const paragraphs = content.split(/\n\n+/).filter(Boolean);

  return (
    <div
      style={{
        ...(collapsed
          ? {
              display: '-webkit-box',
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }
          : {}),
      }}
    >
      {paragraphs.map((paragraph, idx) => (
        <p
          key={idx}
          style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.md,
            lineHeight: '1.75',
            marginBottom: idx < paragraphs.length - 1 ? spacing.lg : 0,
          }}
        >
          {paragraph.trim()}
        </p>
      ))}
    </div>
  );
}

/** Featured/hero article for the first or pinned announcement */
function FeaturedArticle({ post }) {
  const [expanded, setExpanded] = useState(false);
  const { isMobile } = useResponsive();
  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.announcement;
  const TypeIcon = typeConfig.icon;
  const timeAgo = getTimeAgo(post.date);
  const isLongContent = post.content && post.content.length > 300;

  return (
    <article
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(28,28,31,0.95) 60%)`,
        border: `1px solid rgba(212,175,55,0.2)`,
        borderRadius: borderRadius.xxl,
        padding: isMobile ? spacing.xl : spacing.xxxl,
        marginBottom: spacing.xxl,
      }}
    >
      {/* Gold accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: isMobile ? spacing.xl : spacing.xxxl,
          right: isMobile ? spacing.xl : spacing.xxxl,
          height: '2px',
          background: gradients.gold,
          borderRadius: '0 0 2px 2px',
        }}
      />

      {/* Category & badges row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.sm}`,
            background: typeConfig.bgColor,
            borderRadius: borderRadius.sm,
          }}
        >
          <TypeIcon size={12} style={{ color: typeConfig.color }} />
          <span
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: typeConfig.color,
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
            }}
          >
            {typeConfig.label}
          </span>
        </div>

        {post.pinned && (
          <Badge variant="gold" size="sm" uppercase icon={MapPin}>
            PINNED
          </Badge>
        )}
        {timeAgo && (
          <span
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.gold.primary,
              fontWeight: typography.fontWeight.semibold,
              marginLeft: 'auto',
            }}
          >
            {timeAgo}
          </span>
        )}
      </div>

      {/* Headline */}
      <h2
        style={{
          fontSize: isMobile ? typography.fontSize['2xl'] : typography.fontSize['4xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.tight,
          marginBottom: spacing.md,
          letterSpacing: typography.letterSpacing.tight,
        }}
      >
        {post.title}
      </h2>

      {/* Dateline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.xl,
          paddingBottom: spacing.lg,
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
        }}
      >
        <Clock size={13} style={{ color: colors.text.muted }} />
        <span
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          {formatArticleDate(post.date)}
        </span>
      </div>

      {/* Body */}
      <ContentBody content={post.content} collapsed={!expanded && isLongContent} maxLines={6} />

      {/* Read more toggle */}
      {isLongContent && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.lg,
            padding: 0,
            background: 'none',
            border: 'none',
            color: colors.gold.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
            transition: `opacity ${transitions.fast}`,
          }}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Continue reading <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </article>
  );
}

/** Standard article card for non-featured announcements */
function ArticleCard({ post, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const { isMobile } = useResponsive();
  const typeConfig = TYPE_CONFIG[post.type] || TYPE_CONFIG.announcement;
  const TypeIcon = typeConfig.icon;
  const timeAgo = getTimeAgo(post.date);
  const isLongContent = post.content && post.content.length > 200;
  const postDate = new Date(post.date);
  const now = new Date();
  const diffHours = Math.floor((now - postDate) / (1000 * 60 * 60));
  const isNew = diffHours < 24;

  return (
    <article
      style={{
        padding: isMobile ? `${spacing.xl} 0` : `${spacing.xxl} 0`,
        borderBottom: isLast ? 'none' : `1px solid rgba(255,255,255,0.06)`,
      }}
    >
      {/* Category & meta row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `3px ${spacing.sm}`,
            background: typeConfig.bgColor,
            borderRadius: borderRadius.sm,
          }}
        >
          <TypeIcon size={11} style={{ color: typeConfig.color }} />
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: typography.fontWeight.bold,
              color: typeConfig.color,
              letterSpacing: typography.letterSpacing.wider,
              textTransform: 'uppercase',
            }}
          >
            {typeConfig.label}
          </span>
        </div>

        <span
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
          }}
        >
          {formatShortDate(post.date)}
        </span>

        {post.pinned && (
          <Badge variant="gold" size="sm" uppercase icon={MapPin}>
            PINNED
          </Badge>
        )}
        {isNew && !post.pinned && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: typography.fontWeight.bold,
              color: colors.gold.primary,
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            NEW
          </span>
        )}

        {timeAgo && (
          <span
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.muted,
              marginLeft: 'auto',
            }}
          >
            {timeAgo}
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: isMobile ? typography.fontSize.xl : typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.snug,
          marginBottom: spacing.md,
          letterSpacing: typography.letterSpacing.tight,
        }}
      >
        {post.title}
      </h3>

      {/* Body */}
      <ContentBody content={post.content} collapsed={!expanded && isLongContent} maxLines={3} />

      {/* Read more toggle */}
      {isLongContent && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.md,
            padding: 0,
            background: 'none',
            border: 'none',
            color: colors.gold.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
            transition: `opacity ${transitions.fast}`,
          }}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Read more <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
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
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Page header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: spacing.xxxl,
          paddingBottom: spacing.xl,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <div
            style={{
              width: '32px',
              height: '1px',
              background: colors.gold.primary,
              opacity: 0.4,
            }}
          />
          <span
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.bold,
              color: colors.gold.primary,
              letterSpacing: typography.letterSpacing.widest,
              textTransform: 'uppercase',
            }}
          >
            Newsroom
          </span>
          <div
            style={{
              width: '32px',
              height: '1px',
              background: colors.gold.primary,
              opacity: 0.4,
            }}
          />
        </div>
        <h1
          style={{
            fontSize: isMobile ? typography.fontSize['3xl'] : typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
            letterSpacing: typography.letterSpacing.tight,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          News & Announcements
        </h1>
        <p
          style={{
            color: colors.text.tertiary,
            fontSize: typography.fontSize.md,
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          The latest updates from {competitionName}
        </p>
      </div>

      {/* Content */}
      {sortedAnnouncements.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: isMobile ? spacing.xxl : spacing.xxxl,
            background: colors.background.card,
            borderRadius: borderRadius.xxl,
            border: `1px solid ${colors.border.secondary}`,
          }}
        >
          <FileText
            size={40}
            style={{ color: colors.text.muted, marginBottom: spacing.lg, opacity: 0.4 }}
          />
          <p
            style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.lg,
              marginBottom: spacing.xs,
            }}
          >
            No articles yet
          </p>
          <p
            style={{
              color: colors.text.muted,
              fontSize: typography.fontSize.sm,
            }}
          >
            Check back soon for updates
          </p>
        </div>
      ) : (
        <div>
          {/* Featured article */}
          {featured && <FeaturedArticle post={featured} />}

          {/* Remaining articles */}
          {remaining.length > 0 && (
            <div
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.secondary}`,
                borderRadius: borderRadius.xxl,
                padding: isMobile ? `0 ${spacing.xl}` : `0 ${spacing.xxl}`,
              }}
            >
              {remaining.map((post, i) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  isLast={i === remaining.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

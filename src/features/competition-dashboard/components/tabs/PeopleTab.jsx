import React, { useState, useEffect } from 'react';
import {
  Crown, Archive, RotateCcw, ExternalLink, UserCheck, Users, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Plus, Hash, TrendingUp, Scale, User, Star, FileText, MapPin, UserPlus
} from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { supabase } from '../../../../lib/supabase';
import WinnersManager from '../../../super-admin/components/WinnersManager';

/**
 * PeopleTab - Combined Contestants + Advancement + Host Profile tab
 * Manages winners, nominees, contestants, voting rankings, and host profile
 */
export default function PeopleTab({
  competition,
  competitionId,
  nominees,
  contestants,
  host,
  isSuperAdmin = false,
  onRefresh,
  onApproveNominee,
  onRejectNominee,
  onArchiveNominee,
  onRestoreNominee,
  onOpenAddPersonModal,
  onShowHostAssignment,
  onRemoveHost,
}) {
  const { isMobile } = useResponsive();
  const [expandedSections, setExpandedSections] = useState({
    contestants: true,
    withProfile: true,
    external: false,
    archived: false,
    rankings: true,
  });
  const [processingId, setProcessingId] = useState(null);

  // Advancement state
  const [activeRound, setActiveRound] = useState(null);
  const [votingRounds, setVotingRounds] = useState([]);
  const [advanceCount, setAdvanceCount] = useState(10);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch voting rounds
  useEffect(() => {
    const fetchRounds = async () => {
      if (!supabase || !competitionId) return;
      const { data: rounds } = await supabase
        .from('voting_rounds')
        .select('*')
        .eq('competition_id', competitionId)
        .order('round_order');
      if (rounds && rounds.length > 0) {
        setVotingRounds(rounds);
        const now = new Date();
        const active = rounds.find(r => {
          const start = r.start_date ? new Date(r.start_date) : null;
          const end = r.end_date ? new Date(r.end_date) : null;
          return start && end && start <= now && now <= end;
        }) || rounds[rounds.length - 1];
        setActiveRound(active);
        setAdvanceCount(active?.contestants_advance || 10);
      }
    };
    fetchRounds();
  }, [competitionId]);

  // Categorize nominees
  const activeNominees = nominees.filter(n =>
    n.status === 'pending' || n.status === 'profile_complete' || n.status === 'awaiting_profile'
  );
  const nomineesWithProfile = activeNominees.filter(n => n.hasProfile);
  const externalNominees = activeNominees.filter(n => !n.hasProfile);
  const archivedNominees = nominees.filter(n => n.status === 'archived');

  // Stats
  const stats = [
    { label: 'Total Nominees', value: nominees.length, color: colors.gold.primary },
    { label: 'With Profile', value: nomineesWithProfile.length, color: '#3b82f6' },
    { label: 'External', value: externalNominees.length, color: '#f59e0b' },
    { label: 'Approved', value: contestants.length, color: '#22c55e' },
    { label: 'Archived', value: archivedNominees.length, color: '#6b7280' },
  ];

  // Sort contestants by votes for rankings
  const sortedContestants = [...contestants].sort((a, b) => (b.votes || 0) - (a.votes || 0));

  // Detect ties at the advancement cutoff
  const detectTies = () => {
    if (sortedContestants.length <= advanceCount) return [];
    const cutoffVotes = sortedContestants[advanceCount - 1]?.votes || 0;
    const tied = sortedContestants.filter((c, idx) => {
      return c.votes === cutoffVotes && (idx >= advanceCount - 1);
    });
    return tied.length > 1 ? tied : [];
  };

  const ties = detectTies();

  // Section Header Component
  const SectionHeader = ({ title, count, icon: Icon, iconColor, sectionKey, badge, action }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <div style={{
          width: 36, height: 36, borderRadius: borderRadius.md,
          background: `${iconColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>{title}</span>
        <Badge variant={badge} size="sm">{count}</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        {action}
        {expandedSections[sectionKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
    </button>
  );

  // Contestant Row Component
  const ContestantRow = ({ contestant }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md,
      background: colors.background.secondary, borderRadius: borderRadius.lg, marginBottom: spacing.sm,
    }}>
      <Avatar name={contestant.name} size={40} avatarUrl={contestant.avatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: typography.fontWeight.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {contestant.name}
        </p>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
          {contestant.votes || 0} votes
        </p>
      </div>
      {contestant.instagram && (
        <a href={`https://instagram.com/${contestant.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
           style={{ color: colors.text.muted, padding: spacing.xs }}>
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );

  // Nominee Row Component
  const NomineeRow = ({ nominee }) => {
    const isProcessing = processingId === nominee.id;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md,
        background: colors.background.secondary, borderRadius: borderRadius.lg, marginBottom: spacing.sm,
      }}>
        <Avatar name={nominee.name} size={40} avatarUrl={nominee.avatarUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: typography.fontWeight.medium }}>{nominee.name}</p>
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{nominee.email}</p>
        </div>
        <div style={{ display: 'flex', gap: spacing.xs }}>
          <button
            onClick={async () => { setProcessingId(nominee.id); await onApproveNominee(nominee.id); setProcessingId(null); }}
            disabled={isProcessing}
            style={{
              padding: spacing.xs, background: 'rgba(34,197,94,0.1)', border: 'none',
              borderRadius: borderRadius.sm, cursor: 'pointer', color: '#22c55e',
            }}
          >
            <CheckCircle size={16} />
          </button>
          <button
            onClick={async () => { setProcessingId(nominee.id); await onRejectNominee(nominee.id); setProcessingId(null); }}
            disabled={isProcessing}
            style={{
              padding: spacing.xs, background: 'rgba(239,68,68,0.1)', border: 'none',
              borderRadius: borderRadius.sm, cursor: 'pointer', color: '#ef4444',
            }}
          >
            <XCircle size={16} />
          </button>
          <button
            onClick={async () => { setProcessingId(nominee.id); await onArchiveNominee(nominee.id); setProcessingId(null); }}
            disabled={isProcessing}
            style={{
              padding: spacing.xs, background: 'rgba(107,114,128,0.1)', border: 'none',
              borderRadius: borderRadius.sm, cursor: 'pointer', color: '#6b7280',
            }}
          >
            <Archive size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Archived Row Component
  const ArchivedRow = ({ nominee }) => {
    const isProcessing = processingId === nominee.id;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md,
        background: colors.background.secondary, borderRadius: borderRadius.lg, marginBottom: spacing.sm, opacity: 0.7,
      }}>
        <Avatar name={nominee.name} size={40} avatarUrl={nominee.avatarUrl} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: typography.fontWeight.medium }}>{nominee.name}</p>
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{nominee.email}</p>
        </div>
        <button
          onClick={async () => { setProcessingId(nominee.id); await onRestoreNominee(nominee.id); setProcessingId(null); }}
          disabled={isProcessing}
          style={{
            padding: spacing.xs, background: 'rgba(34,197,94,0.1)', border: 'none',
            borderRadius: borderRadius.sm, cursor: 'pointer', color: '#22c55e', display: 'flex', alignItems: 'center', gap: spacing.xs,
          }}
        >
          <RotateCcw size={14} /> Restore
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Host Profile Section */}
      <Panel
        title="Host Profile"
        icon={User}
        action={
          host && isSuperAdmin ? (
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button size="sm" variant="secondary" onClick={onShowHostAssignment}>Reassign</Button>
              <Button
                size="sm"
                variant="secondary"
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}
                onClick={onRemoveHost}
              >
                Remove
              </Button>
            </div>
          ) : (
            isSuperAdmin && <Button size="sm" icon={UserPlus} onClick={onShowHostAssignment}>Assign Host</Button>
          )
        }
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!host ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <User size={64} style={{ marginBottom: spacing.lg, opacity: 0.5 }} />
              <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.md }}>No Host Assigned</h3>
              <p style={{ marginBottom: spacing.xl }}>
                This competition doesn't have a host assigned yet.
              </p>
              {isSuperAdmin && (
                <Button icon={UserPlus} onClick={onShowHostAssignment}>Assign Host</Button>
              )}
            </div>
          ) : (
            <div>
              {/* Host Header */}
              <div style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: spacing.xl,
                marginBottom: spacing.xl,
                flexDirection: isMobile ? 'column' : 'row',
              }}>
                <Avatar name={host.name} avatarUrl={host.avatar} size={isMobile ? 80 : 100} />
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.display, fontWeight: typography.fontWeight.bold }}>
                    {host.name}
                  </h2>
                  {host.city && (
                    <p style={{ color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                      <MapPin size={16} /> {host.city}
                    </p>
                  )}
                  <Badge variant="gold" size="md" style={{ marginTop: spacing.md }}>
                    <Star size={14} style={{ marginRight: spacing.xs }} /> Verified Host
                  </Badge>
                </div>
              </div>

              {/* Host Details */}
              {host.bio && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <FileText size={18} /> About
                  </h3>
                  <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>{host.bio}</p>
                </div>
              )}

              {host.instagram && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
                    Social
                  </h3>
                  <a
                    href={`https://instagram.com/${host.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: colors.text.primary,
                      textDecoration: 'none',
                      minHeight: '44px',
                    }}
                  >
                    @{host.instagram.replace('@', '')}
                  </a>
                </div>
              )}

              {host.gallery && host.gallery.length > 0 && (
                <div>
                  <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
                    Gallery
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))', gap: spacing.md }}>
                    {host.gallery.map((img, i) => (
                      <img
                        key={i}
                        src={typeof img === 'string' ? img : img.url}
                        alt={`Gallery ${i + 1}`}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          borderRadius: borderRadius.lg,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${colors.border.light}`, margin: `${spacing.xxl} 0` }} />

      {/* Winners Manager */}
      <WinnersManager competition={competition} onUpdate={onRefresh} allowEdit={true} />

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: isMobile ? spacing.sm : spacing.lg,
        marginBottom: isMobile ? spacing.lg : spacing.xxl,
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.lg,
            padding: isMobile ? spacing.md : spacing.lg,
            ...(isMobile && i === stats.length - 1 && stats.length % 2 === 1 ? { gridColumn: 'span 2' } : {}),
          }}>
            <p style={{ color: colors.text.secondary, fontSize: isMobile ? '10px' : typography.fontSize.xs, marginBottom: spacing.xs }}>
              {stat.label}
            </p>
            <p style={{ fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Contestants Section */}
      <div style={{
        background: colors.background.card,
        border: `1px solid rgba(34,197,94,0.3)`,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg }}>
          <SectionHeader title="Contestants" count={contestants.length} icon={Crown} iconColor="#22c55e" sectionKey="contestants" badge="success" />
          <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('contestant')}>
            Add
          </Button>
        </div>
        {expandedSections.contestants && (
          <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
            {contestants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Crown size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                <p>No contestants yet. Approve nominees or add manually.</p>
              </div>
            ) : contestants.map(c => <ContestantRow key={c.id} contestant={c} />)}
          </div>
        )}
      </div>

      {/* Nominees with Profile */}
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg }}>
          <SectionHeader title="Nominees with Profile" count={nomineesWithProfile.length} icon={UserCheck} iconColor="#3b82f6" sectionKey="withProfile" badge="info" />
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => onOpenAddPersonModal('nominee')}>
            Add
          </Button>
        </div>
        {expandedSections.withProfile && (
          <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
            {nomineesWithProfile.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <UserCheck size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                <p>No nominees with linked profiles</p>
              </div>
            ) : nomineesWithProfile.map(n => <NomineeRow key={n.id} nominee={n} />)}
          </div>
        )}
      </div>

      {/* External Nominees */}
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
        overflow: 'hidden',
      }}>
        <SectionHeader title="External Nominees" count={externalNominees.length} icon={Users} iconColor="#f59e0b" sectionKey="external" badge="warning" />
        {expandedSections.external && (
          <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
            {externalNominees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Users size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                <p>No external nominees</p>
              </div>
            ) : externalNominees.map(n => <NomineeRow key={n.id} nominee={n} />)}
          </div>
        )}
      </div>

      {/* Archived */}
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.xxl,
        overflow: 'hidden',
      }}>
        <SectionHeader title="Archived" count={archivedNominees.length} icon={Archive} iconColor="#6b7280" sectionKey="archived" badge="secondary" />
        {expandedSections.archived && (
          <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
            {archivedNominees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Archive size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                <p>No archived nominees</p>
              </div>
            ) : archivedNominees.map(n => <ArchivedRow key={n.id} nominee={n} />)}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${colors.border.light}`, marginBottom: spacing.xxl }} />

      {/* Tie Alert */}
      {ties.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <Scale size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={{ fontWeight: typography.fontWeight.semibold, color: '#f59e0b' }}>
              Tie Detected at Position {advanceCount}
            </p>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              {ties.length} contestants are tied with {ties[0]?.votes} votes.
            </p>
          </div>
        </div>
      )}

      {/* Voting Round Selector */}
      {votingRounds.length > 0 && (
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
        }}>
          <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <Hash size={18} />
            Voting Round
          </h4>
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            {votingRounds.map((round) => (
              <button
                key={round.id}
                onClick={() => {
                  setActiveRound(round);
                  setAdvanceCount(round.contestants_advance || 10);
                }}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: activeRound?.id === round.id ? 'rgba(212,175,55,0.2)' : 'transparent',
                  border: `1px solid ${activeRound?.id === round.id ? colors.gold.primary : colors.border.light}`,
                  borderRadius: borderRadius.md,
                  color: activeRound?.id === round.id ? colors.gold.primary : colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                }}
              >
                {round.title}
                <span style={{ marginLeft: spacing.sm, opacity: 0.7 }}>
                  (Top {round.contestants_advance} advance)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contestant Rankings */}
      <Panel title="Contestant Rankings" icon={TrendingUp}>
        <div style={{ padding: spacing.lg }}>
          {sortedContestants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.text.secondary }}>
              <Users size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No contestants yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {sortedContestants.map((contestant, index) => {
                const isInAdvanceZone = index < advanceCount;
                const isTied = ties.some(t => t.id === contestant.id);

                return (
                  <div
                    key={contestant.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? spacing.sm : spacing.lg,
                      padding: isMobile ? spacing.md : spacing.lg,
                      background: isTied
                        ? 'rgba(245,158,11,0.1)'
                        : isInAdvanceZone
                          ? 'rgba(34,197,94,0.05)'
                          : colors.background.secondary,
                      border: `1px solid ${isTied ? 'rgba(245,158,11,0.3)' : isInAdvanceZone ? 'rgba(34,197,94,0.2)' : colors.border.light}`,
                      borderRadius: borderRadius.lg,
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      width: isMobile ? 32 : 40,
                      height: isMobile ? 32 : 40,
                      borderRadius: borderRadius.full,
                      background: index < 3 ? 'linear-gradient(135deg, #d4af37, #f4d03f)' : colors.background.card,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: typography.fontWeight.bold,
                      color: index < 3 ? '#0a0a0f' : colors.text.primary,
                      fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.base,
                      flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>

                    {/* Avatar & Name */}
                    <Avatar name={contestant.name} size={isMobile ? 36 : 48} avatarUrl={contestant.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                        <p style={{
                          fontWeight: typography.fontWeight.medium,
                          fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.base,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {contestant.name}
                        </p>
                        {isInAdvanceZone && !isTied && (
                          <Badge variant="success" size="sm">Advancing</Badge>
                        )}
                        {isTied && (
                          <Badge variant="warning" size="sm">Tied</Badge>
                        )}
                      </div>
                      {!isMobile && contestant.instagram && (
                        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                          @{contestant.instagram.replace('@', '')}
                        </p>
                      )}
                    </div>

                    {/* Current Votes */}
                    <div style={{ textAlign: 'center', minWidth: isMobile ? 50 : 80 }}>
                      <p style={{
                        fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.gold.primary,
                      }}>
                        {contestant.votes || 0}
                      </p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>votes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

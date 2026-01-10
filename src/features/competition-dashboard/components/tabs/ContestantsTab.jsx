import React, { useState } from 'react';
import {
  Crown, Archive, RotateCcw, ExternalLink,
  UserCheck, Users, CheckCircle, XCircle, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import { Button, Badge, Avatar } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import WinnersManager from '../../../super-admin/components/WinnersManager';

export default function ContestantsTab({
  competition,
  nominees,
  contestants,
  onRefresh,
  onApproveNominee,
  onRejectNominee,
  onArchiveNominee,
  onRestoreNominee,
  onOpenAddPersonModal,
}) {
  const [expandedSections, setExpandedSections] = useState({
    contestants: true,
    withProfile: true,
    external: true,
    archived: false,
  });
  const [processingId, setProcessingId] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  const SectionHeader = ({ title, count, icon: Icon, iconColor, sectionKey, badge }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <Icon size={20} style={{ color: iconColor }} />
        <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
          {title}
        </h3>
        <Badge variant={badge || 'secondary'} size="sm">{count}</Badge>
      </div>
      {expandedSections[sectionKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
  );

  const NomineeRow = ({ nominee, showActions = true, isArchived = false }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      background: colors.background.secondary,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
      opacity: isArchived ? 0.7 : 1,
    }}>
      <Avatar name={nominee.name} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <p style={{ fontWeight: typography.fontWeight.medium }}>{nominee.name}</p>
          {nominee.age && (
            <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              ({nominee.age})
            </span>
          )}
          {nominee.hasProfile && (
            <Badge variant="info" size="sm" style={{ cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ExternalLink size={10} /> View Profile
              </span>
            </Badge>
          )}
        </div>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
          {nominee.nominatedBy === 'self' ? 'Self-nominated' :
            nominee.nominatorName ? `Nominated by ${nominee.nominatorName}` : 'Third-party nomination'}
          {nominee.email && ` • ${nominee.email}`}
        </p>
      </div>
      <Badge variant={nominee.nominatedBy === 'self' ? 'gold' : 'secondary'} size="sm">
        {nominee.nominatedBy === 'self' ? 'Self' : 'Third Party'}
      </Badge>
      {showActions && !isArchived && (
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button
            variant="approve"
            size="sm"
            onClick={() => { setProcessingId(nominee.id); onApproveNominee(nominee).then(() => setProcessingId(null)); }}
            disabled={processingId === nominee.id}
          >
            <CheckCircle size={14} />
          </Button>
          <Button
            variant="reject"
            size="sm"
            onClick={() => { setProcessingId(nominee.id); onRejectNominee(nominee.id).then(() => setProcessingId(null)); }}
            disabled={processingId === nominee.id}
          >
            <XCircle size={14} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setProcessingId(nominee.id); onArchiveNominee(nominee.id).then(() => setProcessingId(null)); }}
            disabled={processingId === nominee.id}
          >
            <Archive size={14} />
          </Button>
        </div>
      )}
      {isArchived && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setProcessingId(nominee.id); onRestoreNominee(nominee.id).then(() => setProcessingId(null)); }}
          disabled={processingId === nominee.id}
        >
          <RotateCcw size={14} style={{ marginRight: spacing.xs }} /> Restore
        </Button>
      )}
    </div>
  );

  const ContestantRow = ({ contestant }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      background: 'rgba(34,197,94,0.1)',
      border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    }}>
      <Avatar name={contestant.name} size={48} avatarUrl={contestant.avatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <p style={{ fontWeight: typography.fontWeight.medium }}>{contestant.name}</p>
          {contestant.age && (
            <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              ({contestant.age})
            </span>
          )}
          <Badge variant="success" size="sm">Competing</Badge>
        </div>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
          {contestant.instagram && `@${contestant.instagram.replace('@', '')}`}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold }}>
          {contestant.votes || 0}
        </p>
        <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>votes</p>
      </div>
      <Badge variant="gold" size="sm">#{contestant.rank}</Badge>
    </div>
  );

  return (
    <div>
      {/* Winners Manager */}
      <WinnersManager competition={competition} onUpdate={onRefresh} allowEdit={true} />

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: spacing.lg,
        marginBottom: spacing.xxl,
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            padding: spacing.lg,
          }}>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, marginBottom: spacing.xs }}>{stat.label}</p>
            <p style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: stat.color }}>{stat.value}</p>
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
            Add Contestant
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
            Add Nominee
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
        overflow: 'hidden',
      }}>
        <SectionHeader title="Archived" count={archivedNominees.length} icon={Archive} iconColor="#6b7280" sectionKey="archived" />
        {expandedSections.archived && (
          <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
            {archivedNominees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Archive size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                <p>No archived nominees</p>
              </div>
            ) : archivedNominees.map(n => <NomineeRow key={n.id} nominee={n} showActions={false} isArchived />)}
          </div>
        )}
      </div>
    </div>
  );
}

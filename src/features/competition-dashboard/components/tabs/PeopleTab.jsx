import React, { useState } from 'react';
import {
  Crown, Archive, RotateCcw, ExternalLink, UserCheck, Users, CheckCircle, XCircle,
  Plus, User, Star, FileText, MapPin, UserPlus
} from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import WinnersManager from '../../../super-admin/components/WinnersManager';

/**
 * PeopleTab - Manages winners, nominees, contestants, and host profile
 */
export default function PeopleTab({
  competition,
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
  const [processingId, setProcessingId] = useState(null);

  // Categorize nominees
  const activeNominees = nominees.filter(n =>
    n.status === 'pending' || n.status === 'profile_complete' || n.status === 'awaiting_profile'
  );
  const nomineesWithProfile = activeNominees.filter(n => n.hasProfile);
  const externalNominees = activeNominees.filter(n => !n.hasProfile);
  const archivedNominees = nominees.filter(n => n.status === 'archived');

  // Action buttons for nominee rows
  const NomineeActions = ({ nominee }) => {
    const isProcessing = processingId === nominee.id;
    return (
      <div style={{ display: 'flex', gap: spacing.xs }}>
        <button
          onClick={async () => { setProcessingId(nominee.id); await onApproveNominee(nominee.id); setProcessingId(null); }}
          disabled={isProcessing}
          style={{
            padding: spacing.xs,
            background: 'rgba(34,197,94,0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: 'pointer',
            color: '#22c55e',
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle size={16} />
        </button>
        <button
          onClick={async () => { setProcessingId(nominee.id); await onRejectNominee(nominee.id); setProcessingId(null); }}
          disabled={isProcessing}
          style={{
            padding: spacing.xs,
            background: 'rgba(239,68,68,0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: 'pointer',
            color: '#ef4444',
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XCircle size={16} />
        </button>
        <button
          onClick={async () => { setProcessingId(nominee.id); await onArchiveNominee(nominee.id); setProcessingId(null); }}
          disabled={isProcessing}
          style={{
            padding: spacing.xs,
            background: 'rgba(107,114,128,0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: 'pointer',
            color: '#6b7280',
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Archive size={16} />
        </button>
      </div>
    );
  };

  // Person row component - shared between contestants and nominees
  const PersonRow = ({ person, actions, dimmed }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      background: colors.background.secondary,
      borderRadius: borderRadius.lg,
      opacity: dimmed ? 0.7 : 1,
    }}>
      <Avatar name={person.name} size={40} src={person.avatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: typography.fontWeight.medium,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {person.name}
        </p>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
          {person.email || `${person.votes || 0} votes`}
        </p>
      </div>
      {person.instagram && (
        <a
          href={`https://instagram.com/${person.instagram.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: colors.text.muted, padding: spacing.xs }}
        >
          <ExternalLink size={14} />
        </a>
      )}
      {actions}
    </div>
  );

  return (
    <div>
      {/* Host Profile Section */}
      <Panel
        title="Host Profile"
        icon={User}
        collapsible
        action={
          host && isSuperAdmin ? (
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onShowHostAssignment(); }}>
                Reassign
              </Button>
              <Button
                size="sm"
                variant="secondary"
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}
                onClick={(e) => { e.stopPropagation(); onRemoveHost(); }}
              >
                Remove
              </Button>
            </div>
          ) : isSuperAdmin ? (
            <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowHostAssignment(); }}>
              Assign Host
            </Button>
          ) : null
        }
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!host ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <User size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p style={{ marginBottom: spacing.lg }}>No host assigned yet</p>
              {isSuperAdmin && (
                <Button icon={UserPlus} onClick={onShowHostAssignment}>Assign Host</Button>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: spacing.xl,
                marginBottom: spacing.xl,
                flexDirection: isMobile ? 'column' : 'row',
              }}>
                <Avatar name={host.name} src={host.avatar} size={isMobile ? 80 : 100} />
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.display,
                    fontWeight: typography.fontWeight.bold,
                  }}>
                    {host.name}
                  </h2>
                  {host.city && (
                    <p style={{
                      color: colors.text.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginTop: spacing.sm,
                    }}>
                      <MapPin size={16} /> {host.city}
                    </p>
                  )}
                  <Badge variant="gold" size="md" style={{ marginTop: spacing.md }}>
                    <Star size={14} style={{ marginRight: spacing.xs }} /> Verified Host
                  </Badge>
                </div>
              </div>

              {host.bio && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}>
                    <FileText size={18} /> About
                  </h3>
                  <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>{host.bio}</p>
                </div>
              )}

              {host.instagram && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                  }}>
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
                  <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                  }}>
                    Gallery
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: spacing.md,
                  }}>
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

      {/* Winners Manager */}
      <WinnersManager competition={competition} onUpdate={onRefresh} allowEdit={true} />

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: spacing.sm,
        marginBottom: spacing.xl,
      }}>
        {[
          { label: 'Total Nominees', value: nominees.length, color: colors.gold.primary },
          { label: 'With Profile', value: nomineesWithProfile.length, color: '#3b82f6' },
          { label: 'External', value: externalNominees.length, color: '#f59e0b' },
          { label: 'Approved', value: contestants.length, color: '#22c55e' },
          { label: 'Archived', value: archivedNominees.length, color: '#6b7280' },
        ].map((stat, i, arr) => (
          <div
            key={stat.label}
            style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              ...(isMobile && i === arr.length - 1 && arr.length % 2 === 1 ? { gridColumn: 'span 2' } : {}),
            }}
          >
            <p style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.xs,
              marginBottom: spacing.xs,
            }}>
              {stat.label}
            </p>
            <p style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: stat.color,
            }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Contestants Section */}
      <Panel
        title={`Contestants (${contestants.length})`}
        icon={Crown}
        action={
          <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('contestant')}>
            Add
          </Button>
        }
        collapsible
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {contestants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Crown size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No contestants yet. Approve nominees or add manually.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {contestants.map(c => (
                <PersonRow key={c.id} person={c} />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Nominees with Profile */}
      <Panel
        title={`Nominees with Profile (${nomineesWithProfile.length})`}
        icon={UserCheck}
        action={
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => onOpenAddPersonModal('nominee')}>
            Add
          </Button>
        }
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {nomineesWithProfile.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <UserCheck size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No nominees with linked profiles</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {nomineesWithProfile.map(n => (
                <PersonRow key={n.id} person={n} actions={<NomineeActions nominee={n} />} />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* External Nominees */}
      <Panel
        title={`External Nominees (${externalNominees.length})`}
        icon={Users}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {externalNominees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Users size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No external nominees</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {externalNominees.map(n => (
                <PersonRow key={n.id} person={n} actions={<NomineeActions nominee={n} />} />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Archived */}
      <Panel
        title={`Archived (${archivedNominees.length})`}
        icon={Archive}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {archivedNominees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Archive size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No archived nominees</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {archivedNominees.map(n => (
                <PersonRow
                  key={n.id}
                  person={n}
                  dimmed
                  actions={
                    <button
                      onClick={async () => {
                        setProcessingId(n.id);
                        await onRestoreNominee(n.id);
                        setProcessingId(null);
                      }}
                      disabled={processingId === n.id}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        background: 'rgba(34,197,94,0.1)',
                        border: 'none',
                        borderRadius: borderRadius.sm,
                        cursor: 'pointer',
                        color: '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      <RotateCcw size={14} /> Restore
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

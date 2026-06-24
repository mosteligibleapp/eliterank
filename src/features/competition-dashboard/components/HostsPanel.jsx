import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserPlus, Star, ExternalLink } from 'lucide-react';
import { Panel, Button, Avatar, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

/**
 * HostsPanel — the competition's host (creator) + co-hosts, shown on the Setup
 * tab. The host is the person who created the competition; assignment/removal
 * actions are super-admin only (a regular host sees a read-only roster).
 */
export default function HostsPanel({
  host,
  coHosts = [],
  isSuperAdmin = false,
  isMobile = false,
  onShowHostAssignment,
  onShowAddCoHost,
  onRemoveHost,
  onRemoveCoHost,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const viewProfile = (id) => { if (id) navigate(`/profile/${id}${location.search || ''}`); };

  const personRow = (person, isHost) => (
    <div
      key={person.id || person.email}
      style={{ display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md, background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border.light}`, borderRadius: borderRadius.md }}
    >
      <Avatar name={person.name} src={person.avatar} size={44} />
      <button
        onClick={() => viewProfile(person.id)}
        disabled={!person.id}
        title={person.id ? `View ${isHost ? 'host' : 'co-host'} profile` : undefined}
        style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: person.id ? 'pointer' : 'default', color: 'inherit' }}
      >
        <p style={{ fontWeight: typography.fontWeight.medium, display: 'flex', alignItems: 'center', gap: spacing.xs, color: '#fff' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</span>
          {person.id && <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
        </p>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isHost ? (person.city || '') : person.email}
        </p>
      </button>
      <Badge variant="gold" size="sm">
        <Star size={12} style={{ marginRight: spacing.xs }} /> {isHost ? 'Host' : 'Co-Host'}
      </Badge>
      {isSuperAdmin && isHost && (
        <>
          <Button size="sm" variant="secondary" onClick={onShowHostAssignment}>Reassign</Button>
          <Button size="sm" variant="secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }} onClick={onRemoveHost}>Remove</Button>
        </>
      )}
      {isSuperAdmin && !isHost && (
        <Button size="sm" variant="secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }} onClick={() => onRemoveCoHost?.(person.id)}>Remove</Button>
      )}
    </div>
  );

  return (
    <Panel
      title={`Hosts${host ? ` (${1 + coHosts.length})` : coHosts.length ? ` (${coHosts.length})` : ''}`}
      icon={User}
      action={
        isSuperAdmin ? (
          host ? (
            <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowAddCoHost?.(); }}>Add Co-Host</Button>
          ) : (
            <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowHostAssignment?.(); }}>Assign Host</Button>
          )
        ) : null
      }
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
        {!host && coHosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            <User size={40} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p style={{ marginBottom: spacing.md, fontSize: typography.fontSize.sm }}>The competition creator is the host.</p>
            {isSuperAdmin && <Button icon={UserPlus} onClick={onShowHostAssignment}>Assign Host</Button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {host && personRow(host, true)}
            {coHosts.map((coHost) => personRow(coHost, false))}
          </div>
        )}
      </div>
    </Panel>
  );
}

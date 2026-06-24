import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, UserPlus, Star, ExternalLink, RefreshCw, EyeOff, Eye } from 'lucide-react';
import { Panel, Button, Avatar, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';

/**
 * HostsPanel — the competition's forward-facing host (creator) + co-hosts, on
 * the Setup tab. The host is the "face" of the competition shown publicly; it's
 * recommended but optional. The manager (host/super-admin) can hide themselves
 * from the public page, set a different forward-facing host, or add co-hosts.
 */
export default function HostsPanel({
  host,
  coHosts = [],
  competition,
  canManage = false,
  isMobile = false,
  onShowHostAssignment,
  onShowAddCoHost,
  onRemoveCoHost,
  onRefresh,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [savingVis, setSavingVis] = useState(false);
  const viewProfile = (id) => { if (id) navigate(`/profile/${id}${location.search || ''}`); };

  const showPublicHost = competition?.showPublicHost !== false;

  const toggleVisibility = async () => {
    if (!competition?.id) return;
    setSavingVis(true);
    try {
      await supabase.from('competitions').update({ show_public_host: !showPublicHost }).eq('id', competition.id);
      onRefresh?.();
    } finally {
      setSavingVis(false);
    }
  };

  const personRow = (person, isHost) => {
    const dimmed = isHost && !showPublicHost;
    return (
      <div
        key={person.id || person.email}
        style={{ display: 'flex', alignItems: 'center', gap: spacing.md, padding: spacing.md, background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border.light}`, borderRadius: borderRadius.md }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0, opacity: dimmed ? 0.45 : 1, transition: 'opacity 0.15s' }}>
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
        </div>
        {canManage && isHost && (
          <>
            <button
              onClick={toggleVisibility}
              disabled={savingVis}
              title={showPublicHost ? 'Hide from the public page' : 'Show on the public page'}
              aria-label={showPublicHost ? 'Hide from the public page' : 'Show on the public page'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0, background: 'transparent', border: `1px solid ${colors.border.primary}`, borderRadius: borderRadius.md, color: showPublicHost ? colors.text.secondary : colors.gold.primary, cursor: savingVis ? 'default' : 'pointer' }}
            >
              {showPublicHost ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onShowHostAssignment}>Change</Button>
          </>
        )}
        {canManage && !isHost && (
          <Button size="sm" variant="secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }} onClick={() => onRemoveCoHost?.(person.id)}>Remove</Button>
        )}
      </div>
    );
  };

  return (
    <Panel
      title={`Hosts${host ? ` (${1 + coHosts.length})` : coHosts.length ? ` (${coHosts.length})` : ''}`}
      icon={User}
      action={
        canManage ? (
          host ? (
            <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowAddCoHost?.(); }}>Add co-host</Button>
          ) : (
            <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowHostAssignment?.(); }}>Set host</Button>
          )
        ) : null
      }
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, margin: `0 0 ${spacing.lg}`, lineHeight: 1.5 }}>
          This is the <strong>face of your competition</strong> — shown publicly as the host. We recommend having a forward-facing host, but it’s not required.
        </p>

        {host || coHosts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {host && personRow(host, true)}
            {coHosts.map((coHost) => personRow(coHost, false))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            <User size={40} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p style={{ marginBottom: spacing.md, fontSize: typography.fontSize.sm }}>No forward-facing host set.</p>
            {canManage && <Button icon={UserPlus} onClick={onShowHostAssignment}>Set a host</Button>}
          </div>
        )}

        {host && canManage && !showPublicHost && (
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.md }}>
            Hidden — not shown on your public page. Click the eye to show again.
          </p>
        )}
      </div>
    </Panel>
  );
}

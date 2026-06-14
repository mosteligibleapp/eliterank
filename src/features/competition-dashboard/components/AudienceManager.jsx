import React, { useState } from 'react';
import { Heart, Star, Download } from 'lucide-react';
import { Panel, Button, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { supabase } from '../../../lib/supabase';
import SubscribersManager from './SubscribersManager';

/**
 * AudienceManager — the reachable audience around a competition (as opposed to
 * the stakeholders inside it, which live on the People tab). Groups the people a
 * host can broadcast to: nominators, voters, and coming-soon subscribers.
 * Rendered on the Communications tab next to announcements + the email log.
 */
export default function AudienceManager({ competition, subscribers = [], onRemoveSubscriber }) {
  const { isMobile } = useResponsive();
  const [nominators, setNominators] = useState([]);
  const [voters, setVoters] = useState([]);
  const [nominatorsLoaded, setNominatorsLoaded] = useState(false);
  const [votersLoaded, setVotersLoaded] = useState(false);

  const loadNominators = async () => {
    if (nominatorsLoaded || !competition?.id) return;
    const { data } = await supabase
      .from('nominees')
      .select('nominator_name, nominator_email, nominated_by, nomination_reason, created_at')
      .eq('competition_id', competition.id)
      .eq('nominated_by', 'third_party')
      .not('nominator_email', 'is', null)
      .order('created_at', { ascending: false });
    setNominators(data || []);
    setNominatorsLoaded(true);
  };

  const loadVoters = async () => {
    if (votersLoaded || !competition?.id) return;
    const { data } = await supabase
      .from('votes')
      .select('voter_email, vote_count, amount_paid, created_at')
      .eq('competition_id', competition.id)
      .order('created_at', { ascending: false });
    // Aggregate by email
    const byEmail = {};
    (data || []).forEach(v => {
      const email = v.voter_email || 'Anonymous';
      if (!byEmail[email]) byEmail[email] = { email, totalVotes: 0, totalPaid: 0, count: 0 };
      byEmail[email].totalVotes += v.vote_count || 1;
      byEmail[email].totalPaid += parseFloat(v.amount_paid) || 0;
      byEmail[email].count++;
    });
    setVoters(Object.values(byEmail).sort((a, b) => b.totalVotes - a.totalVotes));
    setVotersLoaded(true);
  };

  const downloadCSV = (rows, filename) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Nominators */}
      <Panel
        title={`Nominators${nominatorsLoaded ? ` (${nominators.length})` : ''}`}
        icon={Heart}
        collapsible
        defaultCollapsed
        action={nominators.length > 0 && (
          <Button size="sm" icon={Download} variant="secondary" onClick={(e) => {
            e.stopPropagation();
            downloadCSV(nominators.map(n => ({
              name: n.nominator_name || '',
              email: n.nominator_email || '',
              reason: n.nomination_reason || '',
              date: n.created_at ? new Date(n.created_at).toLocaleDateString() : '',
            })), 'nominators.csv');
          }}>
            Export
          </Button>
        )}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!nominatorsLoaded ? (
            <div style={{ textAlign: 'center', padding: spacing.lg }}>
              <Button size="sm" variant="secondary" onClick={loadNominators}>Load Nominators</Button>
            </div>
          ) : nominators.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm, padding: spacing.lg }}>
              No third-party nominations yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {nominators.map((n, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: spacing.md,
                  padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.lg,
                }}>
                  <Avatar name={n.nominator_name || n.nominator_email} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                      {n.nominator_name || 'Anonymous'}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.nominator_email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Voters */}
      <Panel
        title={`Voters${votersLoaded ? ` (${voters.length})` : ''}`}
        icon={Star}
        collapsible
        defaultCollapsed
        action={voters.length > 0 && (
          <Button size="sm" icon={Download} variant="secondary" onClick={(e) => {
            e.stopPropagation();
            downloadCSV(voters.map(v => ({
              email: v.email,
              total_votes: v.totalVotes,
              total_paid: v.totalPaid > 0 ? `$${v.totalPaid.toFixed(2)}` : '$0',
              transactions: v.count,
            })), 'voters.csv');
          }}>
            Export
          </Button>
        )}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!votersLoaded ? (
            <div style={{ textAlign: 'center', padding: spacing.lg }}>
              <Button size="sm" variant="secondary" onClick={loadVoters}>Load Voters</Button>
            </div>
          ) : voters.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm, padding: spacing.lg }}>
              No votes yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {voters.map((v, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: spacing.md,
                  padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.lg,
                }}>
                  <Avatar name={v.email} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.email}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                      {v.totalVotes} {v.totalVotes === 1 ? 'vote' : 'votes'}
                      {v.totalPaid > 0 && ` · $${v.totalPaid.toFixed(2)} spent`}
                    </p>
                  </div>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.gold.primary,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: 'rgba(212,175,55,0.1)',
                    borderRadius: borderRadius.sm,
                  }}>
                    {v.totalVotes}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Subscribers — coming-soon opt-ins */}
      <SubscribersManager subscribers={subscribers} onRemoveSubscriber={onRemoveSubscriber} />
    </>
  );
}

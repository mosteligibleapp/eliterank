import React, { useState, useEffect } from 'react';
import { Award, Building, Calendar, Plus, Edit, Trash2, Check, Info, Link, Image, Clock, UserPlus, Vote, Trophy, Save, Loader, AlertCircle, Zap } from 'lucide-react';
import { Panel, Avatar, Badge, Button } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { formatCurrency, formatEventDateRange } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import { computeCompetitionPhase, COMPETITION_STATUSES } from '../../utils/competitionPhase';
import { useToast } from '../../contexts/ToastContext';

export default function SettingsPage({
  judges,
  sponsors,
  events,
  hostCompetition,
  onAddJudge,
  onEditJudge,
  onDeleteJudge,
  onAddSponsor,
  onEditSponsor,
  onDeleteSponsor,
  onEditEvent,
  onShowSponsorInfo,
  onCompetitionUpdate,
}) {
  const toast = useToast();

  // Timeline editing state
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [timelineData, setTimelineData] = useState({
    nominationStart: '',
    nominationEnd: '',
    votingStart: '',
    votingEnd: '',
    finalsDate: '',
  });

  // Initialize timeline data from hostCompetition
  useEffect(() => {
    if (hostCompetition) {
      setTimelineData({
        nominationStart: hostCompetition.nomination_start || '',
        nominationEnd: hostCompetition.nomination_end || '',
        votingStart: hostCompetition.voting_start || '',
        votingEnd: hostCompetition.voting_end || '',
        finalsDate: hostCompetition.finals_date || '',
      });
    }
  }, [hostCompetition]);

  // Format date for input
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  // Format date for display
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return 'Not set';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Save timeline changes
  const handleSaveTimeline = async () => {
    if (!hostCompetition?.id || !supabase) return;

    setSavingTimeline(true);
    try {
      const updates = {
        nomination_start: timelineData.nominationStart || null,
        nomination_end: timelineData.nominationEnd || null,
        voting_start: timelineData.votingStart || null,
        voting_end: timelineData.votingEnd || null,
        finals_date: timelineData.finalsDate || null,
      };

      const { error } = await supabase
        .from('competitions')
        .update(updates)
        .eq('id', hostCompetition.id);

      if (error) throw error;

      setEditingTimeline(false);
      toast.success('Timeline saved successfully!');
      // Notify parent to refresh competition data
      if (onCompetitionUpdate) {
        onCompetitionUpdate();
      }
    } catch (err) {
      console.error('Error saving timeline:', err);
      toast.error('Failed to save timeline. Please try again.');
    } finally {
      setSavingTimeline(false);
    }
  };
  const getTierStyle = (tier) => {
    const tierMap = {
      Platinum: { bg: 'rgba(200,200,200,0.1)', color: colors.tier.platinum },
      Gold: { bg: 'rgba(212,175,55,0.1)', color: colors.tier.gold },
      Silver: { bg: 'rgba(139,92,246,0.1)', color: colors.tier.silver },
    };
    return tierMap[tier] || tierMap.Gold;
  };

  const sponsorshipTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div>
      {/* Competition Status Banner */}
      {hostCompetition && (
        <div style={{
          padding: spacing.lg,
          marginBottom: spacing.xl,
          borderRadius: borderRadius.xl,
          background: hostCompetition.status === COMPETITION_STATUSES.ACTIVE
            ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
            : hostCompetition.status === COMPETITION_STATUSES.PUBLISH
              ? 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))'
              : 'linear-gradient(135deg, rgba(100,100,100,0.15), rgba(100,100,100,0.05))',
          border: `1px solid ${
            hostCompetition.status === COMPETITION_STATUSES.ACTIVE
              ? 'rgba(34,197,94,0.3)'
              : hostCompetition.status === COMPETITION_STATUSES.PUBLISH
                ? 'rgba(251,191,36,0.3)'
                : 'rgba(100,100,100,0.3)'
          }`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              {hostCompetition.status === COMPETITION_STATUSES.ACTIVE ? (
                <Zap size={24} style={{ color: '#22c55e' }} />
              ) : (
                <AlertCircle size={24} style={{ color: hostCompetition.status === COMPETITION_STATUSES.PUBLISH ? '#fbbf24' : colors.text.muted }} />
              )}
              <div>
                <p style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: hostCompetition.status === COMPETITION_STATUSES.ACTIVE ? '#22c55e' : hostCompetition.status === COMPETITION_STATUSES.PUBLISH ? '#fbbf24' : colors.text.secondary,
                  marginBottom: spacing.xs,
                }}>
                  {hostCompetition.status === COMPETITION_STATUSES.ACTIVE
                    ? `Competition is LIVE — Current Phase: ${computeCompetitionPhase(hostCompetition).toUpperCase()}`
                    : hostCompetition.status === COMPETITION_STATUSES.PUBLISH
                      ? 'Competition is Published (Coming Soon)'
                      : hostCompetition.status === COMPETITION_STATUSES.COMPLETE
                        ? 'Competition Complete'
                        : 'Competition is in Draft Mode'}
                </p>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  {hostCompetition.status === COMPETITION_STATUSES.ACTIVE
                    ? 'Your timeline dates are active and controlling the competition phases.'
                    : hostCompetition.status === COMPETITION_STATUSES.PUBLISH
                      ? 'Visible to public as "Coming Soon". Contact admin to activate when ready.'
                      : hostCompetition.status === COMPETITION_STATUSES.COMPLETE
                        ? 'Winners have been announced.'
                        : 'Timeline dates are saved but not active. Contact admin to publish or activate.'}
                </p>
              </div>
            </div>
            <Badge
              variant={hostCompetition.status === COMPETITION_STATUSES.ACTIVE ? 'success' : hostCompetition.status === COMPETITION_STATUSES.PUBLISH ? 'warning' : 'secondary'}
              size="lg"
            >
              {hostCompetition.status?.toUpperCase() || 'DRAFT'}
            </Badge>
          </div>
        </div>
      )}

      {/* Competition Timeline Section */}
      {hostCompetition && (
        <Panel
          title="Competition Timeline"
          icon={Clock}
          action={
            editingTimeline ? (
              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setEditingTimeline(false);
                    // Reset to original data
                    setTimelineData({
                      nominationStart: hostCompetition.nomination_start || '',
                      nominationEnd: hostCompetition.nomination_end || '',
                      votingStart: hostCompetition.voting_start || '',
                      votingEnd: hostCompetition.voting_end || '',
                      finalsDate: hostCompetition.finals_date || '',
                    });
                  }}
                  disabled={savingTimeline}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTimeline}
                  icon={savingTimeline ? Loader : Save}
                  size="md"
                  disabled={savingTimeline}
                >
                  {savingTimeline ? 'Saving...' : 'Save Timeline'}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setEditingTimeline(true)} icon={Edit} size="md">
                Edit Timeline
              </Button>
            )
          }
        >
          <div style={{ padding: spacing.xl }}>
            {editingTimeline ? (
              /* Edit Mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
                {/* Nomination Period */}
                <div style={{
                  padding: spacing.lg,
                  background: 'rgba(212,175,55,0.05)',
                  borderRadius: borderRadius.lg,
                  border: '1px solid rgba(212,175,55,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                    <UserPlus size={18} style={{ color: '#d4af37' }} />
                    <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: '#d4af37' }}>
                      Nomination Period
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
                    <div>
                      <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateForInput(timelineData.nominationStart)}
                        onChange={(e) => setTimelineData({ ...timelineData, nominationStart: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        style={{
                          width: '100%',
                          padding: spacing.md,
                          background: colors.background.secondary,
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: '#fff',
                          fontSize: typography.fontSize.md,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateForInput(timelineData.nominationEnd)}
                        onChange={(e) => setTimelineData({ ...timelineData, nominationEnd: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        style={{
                          width: '100%',
                          padding: spacing.md,
                          background: colors.background.secondary,
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: '#fff',
                          fontSize: typography.fontSize.md,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Voting Period */}
                <div style={{
                  padding: spacing.lg,
                  background: 'rgba(139,92,246,0.05)',
                  borderRadius: borderRadius.lg,
                  border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                    <Vote size={18} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: '#8b5cf6' }}>
                      Voting Period
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
                    <div>
                      <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateForInput(timelineData.votingStart)}
                        onChange={(e) => setTimelineData({ ...timelineData, votingStart: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        style={{
                          width: '100%',
                          padding: spacing.md,
                          background: colors.background.secondary,
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: '#fff',
                          fontSize: typography.fontSize.md,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateForInput(timelineData.votingEnd)}
                        onChange={(e) => setTimelineData({ ...timelineData, votingEnd: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        style={{
                          width: '100%',
                          padding: spacing.md,
                          background: colors.background.secondary,
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: '#fff',
                          fontSize: typography.fontSize.md,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Finals Date */}
                <div style={{
                  padding: spacing.lg,
                  background: 'rgba(34,197,94,0.05)',
                  borderRadius: borderRadius.lg,
                  border: '1px solid rgba(34,197,94,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                    <Trophy size={18} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: '#22c55e' }}>
                      Finals / Award Ceremony
                    </span>
                  </div>
                  <div style={{ maxWidth: '300px' }}>
                    <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs }}>
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateForInput(timelineData.finalsDate)}
                      onChange={(e) => setTimelineData({ ...timelineData, finalsDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      style={{
                        width: '100%',
                        padding: spacing.md,
                        background: colors.background.secondary,
                        border: `1px solid ${colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: '#fff',
                        fontSize: typography.fontSize.md,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                {/* Nomination Period */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: 'rgba(212,175,55,0.05)',
                  borderRadius: borderRadius.lg,
                  border: '1px solid rgba(212,175,55,0.1)',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: borderRadius.lg,
                    background: 'rgba(212,175,55,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <UserPlus size={20} style={{ color: '#d4af37' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: typography.fontSize.sm, color: '#d4af37', fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      Nomination Period
                    </p>
                    <p style={{ fontSize: typography.fontSize.md, color: colors.text.primary }}>
                      {formatDateForDisplay(hostCompetition.nomination_start)}
                      {' → '}
                      {formatDateForDisplay(hostCompetition.nomination_end)}
                    </p>
                  </div>
                  {hostCompetition.nomination_start && hostCompetition.nomination_end && (
                    <Badge variant="warning" size="sm">
                      {new Date() >= new Date(hostCompetition.nomination_start) && new Date() <= new Date(hostCompetition.nomination_end) ? 'Active' :
                       new Date() < new Date(hostCompetition.nomination_start) ? 'Upcoming' : 'Ended'}
                    </Badge>
                  )}
                </div>

                {/* Voting Period */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: 'rgba(139,92,246,0.05)',
                  borderRadius: borderRadius.lg,
                  border: '1px solid rgba(139,92,246,0.1)',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: borderRadius.lg,
                    background: 'rgba(139,92,246,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Vote size={20} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: typography.fontSize.sm, color: '#8b5cf6', fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      Voting Period
                    </p>
                    <p style={{ fontSize: typography.fontSize.md, color: colors.text.primary }}>
                      {formatDateForDisplay(hostCompetition.voting_start)}
                      {' → '}
                      {formatDateForDisplay(hostCompetition.voting_end)}
                    </p>
                  </div>
                  {hostCompetition.voting_start && hostCompetition.voting_end && (
                    <Badge variant="info" size="sm">
                      {new Date() >= new Date(hostCompetition.voting_start) && new Date() <= new Date(hostCompetition.voting_end) ? 'Active' :
                       new Date() < new Date(hostCompetition.voting_start) ? 'Upcoming' : 'Ended'}
                    </Badge>
                  )}
                </div>

                {/* Finals Date */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: 'rgba(34,197,94,0.05)',
                  borderRadius: borderRadius.lg,
                  border: '1px solid rgba(34,197,94,0.1)',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: borderRadius.lg,
                    background: 'rgba(34,197,94,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Trophy size={20} style={{ color: '#22c55e' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: typography.fontSize.sm, color: '#22c55e', fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      Finals / Award Ceremony
                    </p>
                    <p style={{ fontSize: typography.fontSize.md, color: colors.text.primary }}>
                      {formatDateForDisplay(hostCompetition.finals_date)}
                    </p>
                  </div>
                  {hostCompetition.finals_date && (
                    <Badge variant="success" size="sm">
                      {new Date() >= new Date(hostCompetition.finals_date) ? 'Completed' : 'Upcoming'}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Judges Section */}
      <Panel
        title="Judges"
        icon={Award}
        action={
          <Button onClick={onAddJudge} icon={Plus} size="md">
            Add Judge
          </Button>
        }
      >
        <div style={{ padding: spacing.xl }}>
          {judges.map((judge) => (
            <div
              key={judge.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                padding: spacing.lg,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: borderRadius.lg,
                marginBottom: spacing.sm,
              }}
            >
              <Avatar name={judge.name} size={44} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{judge.name}</p>
                <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>{judge.title}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={Edit}
                onClick={() => onEditJudge(judge)}
                style={{ width: 'auto', padding: `${spacing.sm} ${spacing.md}` }}
              >
                Edit
              </Button>
              <Button
                variant="reject"
                size="sm"
                onClick={() => onDeleteJudge(judge.id)}
                style={{ padding: `${spacing.sm} ${spacing.md}` }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          {judges.length === 0 && (
            <div style={{ textAlign: 'center', padding: spacing.xxxl, color: colors.text.muted }}>
              <Award size={32} style={{ marginBottom: spacing.md, opacity: 0.3 }} />
              <p>No judges added yet</p>
            </div>
          )}
        </div>
      </Panel>

      {/* Sponsors Section */}
      <Panel
        title="Sponsors"
        icon={Building}
        action={
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button
              variant="secondary"
              size="md"
              icon={Info}
              onClick={onShowSponsorInfo}
              style={{ width: 'auto' }}
            >
              Sponsorship Guide
            </Button>
            <Button onClick={onAddSponsor} icon={Plus} size="md">
              Add Sponsor
            </Button>
          </div>
        }
      >
        <div style={{ padding: spacing.xl }}>
          {sponsors.map((sponsor) => {
            const tierStyle = getTierStyle(sponsor.tier);
            return (
              <div
                key={sponsor.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.lg,
                  background: sponsor.tier === 'Platinum' ? 'rgba(200,200,200,0.05)' : 'rgba(255,255,255,0.02)',
                  border: sponsor.tier === 'Platinum' ? '1px solid rgba(200,200,200,0.2)' : 'none',
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.sm,
                }}
              >
                {/* Logo or Icon */}
                {sponsor.logoUrl ? (
                  <div
                    style={{
                      width: '60px',
                      height: '40px',
                      borderRadius: borderRadius.md,
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={sponsor.logoUrl}
                      alt={`${sponsor.name} logo`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '60px',
                      height: '40px',
                      borderRadius: borderRadius.md,
                      background: tierStyle.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building size={20} style={{ color: tierStyle.color }} />
                  </div>
                )}

                {/* Sponsor Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>{sponsor.name}</p>
                    <Badge
                      variant={sponsor.tier === 'Platinum' ? 'platinum' : sponsor.tier === 'Gold' ? 'gold' : 'silver'}
                      size="sm"
                      uppercase
                    >
                      {sponsor.tier}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
                    {sponsor.websiteUrl && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        <Link size={12} />
                        <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sponsor.websiteUrl.replace(/^https?:\/\//, '')}
                        </span>
                      </span>
                    )}
                    {sponsor.logoUrl && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.status.success }}>
                        <Image size={12} /> Logo uploaded
                      </span>
                    )}
                    {!sponsor.logoUrl && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                        <Image size={12} /> No logo
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.lg }}>
                  {formatCurrency(sponsor.amount)}
                </span>

                {/* Actions */}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit}
                  onClick={() => onEditSponsor(sponsor)}
                  style={{ width: 'auto', padding: `${spacing.sm} ${spacing.md}` }}
                >
                  Edit
                </Button>
                <Button
                  variant="reject"
                  size="sm"
                  onClick={() => onDeleteSponsor(sponsor.id)}
                  style={{ padding: `${spacing.sm} ${spacing.md}` }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            );
          })}
          {sponsors.length === 0 && (
            <div style={{ textAlign: 'center', padding: spacing.xxxl, color: colors.text.muted }}>
              <Building size={32} style={{ marginBottom: spacing.md, opacity: 0.3 }} />
              <p style={{ marginBottom: spacing.md }}>No sponsors added yet</p>
              <Button variant="secondary" onClick={onShowSponsorInfo} icon={Info} style={{ width: 'auto' }}>
                View Sponsorship Guide
              </Button>
            </div>
          )}
          {sponsors.length > 0 && (
            <div
              style={{
                marginTop: spacing.lg,
                padding: spacing.lg,
                background: 'rgba(34,197,94,0.1)',
                borderRadius: borderRadius.lg,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: colors.text.secondary }}>Total Sponsorship Revenue</span>
              <span style={{ color: colors.status.success, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.xxl }}>
                {formatCurrency(sponsorshipTotal)}
              </span>
            </div>
          )}
        </div>
      </Panel>

      {/* Event Timeline Section */}
      <Panel title="Event Timeline" icon={Calendar}>
        <div style={{ padding: spacing.xl }}>
          {events.map((event, i) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                padding: spacing.lg,
                background: event.status === 'active' ? 'rgba(212,175,55,0.05)' : 'transparent',
                borderRadius: borderRadius.lg,
                borderBottom: i < events.length - 1 ? `1px solid ${colors.border.lighter}` : 'none',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: borderRadius.full,
                  background:
                    event.status === 'completed'
                      ? 'rgba(34,197,94,0.2)'
                      : event.status === 'active'
                        ? 'rgba(212,175,55,0.2)'
                        : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${
                    event.status === 'completed'
                      ? colors.status.success
                      : event.status === 'active'
                        ? colors.gold.primary
                        : 'rgba(255,255,255,0.2)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {event.status === 'completed' && <Check size={14} style={{ color: colors.status.success }} />}
                {event.status === 'active' && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: borderRadius.full,
                      background: colors.gold.primary,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontWeight: typography.fontWeight.medium,
                    color: event.status === 'active' ? colors.gold.primary : '#fff',
                  }}
                >
                  {event.name}
                </p>
                <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>
                  {formatEventDateRange(event)}
                  {event.time && ` at ${event.time}`}
                  {event.location && ` • ${event.location}`}
                </p>
              </div>
              <Badge
                variant={event.status === 'completed' ? 'success' : event.status === 'active' ? 'gold' : 'default'}
                size="md"
                uppercase
              >
                {event.status === 'completed' ? 'Completed' : event.status === 'active' ? 'Live Now' : 'Upcoming'}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                icon={Edit}
                onClick={() => onEditEvent(event)}
                style={{ width: 'auto', padding: `${spacing.sm} ${spacing.md}` }}
              >
                Edit
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

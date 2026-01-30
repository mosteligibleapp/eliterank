import React, { useState, useEffect, useCallback } from 'react';
import { Check, Users, Search, Loader } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

export default function AssignRewardModal({
  isOpen,
  onClose,
  reward,
  competitions,
  onAssign,
}) {
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [contestants, setContestants] = useState([]);
  const [selectedContestants, setSelectedContestants] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCompetition('');
      setContestants([]);
      setSelectedContestants([]);
      setSelectAll(false);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Fetch contestants when competition is selected
  const fetchContestants = useCallback(async (competitionId) => {
    if (!competitionId || !supabase) {
      setContestants([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contestants')
        .select(`
          id,
          name,
          user_id,
          profile:profiles(first_name, last_name, email, avatar_url)
        `)
        .eq('competition_id', competitionId)
        .order('name');

      if (error) throw error;

      // Also check existing assignments to filter out already assigned
      const { data: existingAssignments } = await supabase
        .from('reward_assignments')
        .select('contestant_id')
        .eq('reward_id', reward?.id);

      const assignedIds = new Set((existingAssignments || []).map(a => a.contestant_id));

      setContestants((data || []).map(c => ({
        ...c,
        displayName: c.profile
          ? `${c.profile.first_name || ''} ${c.profile.last_name || ''}`.trim() || c.name
          : c.name,
        email: c.profile?.email,
        avatarUrl: c.profile?.avatar_url,
        alreadyAssigned: assignedIds.has(c.id),
      })));
    } catch (err) {
      console.error('Error fetching contestants:', err);
      setContestants([]);
    } finally {
      setLoading(false);
    }
  }, [reward?.id]);

  // Handle competition selection
  const handleCompetitionChange = (e) => {
    const compId = e.target.value;
    setSelectedCompetition(compId);
    setSelectedContestants([]);
    setSelectAll(false);
    if (compId) {
      fetchContestants(compId);
    } else {
      setContestants([]);
    }
  };

  // Filter contestants by search query
  const filteredContestants = contestants.filter(c =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Available contestants (not already assigned)
  const availableContestants = filteredContestants.filter(c => !c.alreadyAssigned);

  // Toggle individual contestant selection
  const toggleContestant = (contestantId) => {
    setSelectedContestants(prev => {
      if (prev.includes(contestantId)) {
        return prev.filter(id => id !== contestantId);
      } else {
        return [...prev, contestantId];
      }
    });
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedContestants([]);
    } else {
      setSelectedContestants(availableContestants.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle assignment
  const handleAssign = () => {
    if (selectedContestants.length === 0) return;

    onAssign({
      competitionId: selectedCompetition,
      contestantIds: selectedContestants,
    });
  };

  if (!reward) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign: ${reward.name}`}
      maxWidth="600px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            icon={Check}
            disabled={selectedContestants.length === 0}
          >
            Assign to {selectedContestants.length} Contestant{selectedContestants.length !== 1 ? 's' : ''}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Reward Info */}
        <div style={{
          display: 'flex',
          gap: spacing.md,
          padding: spacing.md,
          background: colors.background.secondary,
          borderRadius: borderRadius.lg,
        }}>
          {reward.image_url && (
            <div style={{
              width: '60px',
              height: '60px',
              background: `url(${reward.image_url}) center/cover`,
              borderRadius: borderRadius.md,
              flexShrink: 0,
            }} />
          )}
          <div>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, marginBottom: spacing.xs }}>
              {reward.brand_name}
            </p>
            <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>
              {reward.name}
            </p>
          </div>
        </div>

        {/* Competition Select */}
        <div>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}>
            Select Competition *
          </label>
          <select
            value={selectedCompetition}
            onChange={handleCompetitionChange}
            style={{
              width: '100%',
              padding: spacing.md,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.md,
              color: colors.text.primary,
              fontSize: typography.fontSize.md,
              cursor: 'pointer',
            }}
          >
            <option value="">Choose a competition...</option>
            {competitions.map(comp => (
              <option key={comp.id} value={comp.id}>
                {comp.name || `${comp.city} ${comp.season}`}
              </option>
            ))}
          </select>
        </div>

        {/* Contestant Selection */}
        {selectedCompetition && (
          <>
            {/* Search & Select All */}
            <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={18} style={{
                  position: 'absolute',
                  left: spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text.muted,
                }} />
                <input
                  type="text"
                  placeholder="Search contestants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    paddingLeft: '40px',
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: colors.text.primary,
                    fontSize: typography.fontSize.sm,
                  }}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSelectAll}
                disabled={availableContestants.length === 0}
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Contestants List */}
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
            }}>
              {loading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.xl,
                  color: colors.text.secondary,
                }}>
                  <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginRight: spacing.sm }} />
                  Loading contestants...
                </div>
              ) : filteredContestants.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: spacing.xl,
                  color: colors.text.muted,
                }}>
                  {contestants.length === 0
                    ? 'No contestants in this competition'
                    : 'No contestants match your search'}
                </div>
              ) : (
                filteredContestants.map((contestant, index) => (
                  <div
                    key={contestant.id}
                    onClick={() => !contestant.alreadyAssigned && toggleContestant(contestant.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderBottom: index < filteredContestants.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                      cursor: contestant.alreadyAssigned ? 'not-allowed' : 'pointer',
                      background: selectedContestants.includes(contestant.id)
                        ? 'rgba(212,175,55,0.1)'
                        : contestant.alreadyAssigned
                          ? 'rgba(107,114,128,0.1)'
                          : 'transparent',
                      opacity: contestant.alreadyAssigned ? 0.6 : 1,
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: borderRadius.sm,
                      border: `2px solid ${
                        contestant.alreadyAssigned
                          ? colors.text.muted
                          : selectedContestants.includes(contestant.id)
                            ? colors.gold.primary
                            : colors.border.light
                      }`,
                      background: selectedContestants.includes(contestant.id) ? colors.gold.primary : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {selectedContestants.includes(contestant.id) && (
                        <Check size={14} style={{ color: '#000' }} />
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: borderRadius.full,
                      background: contestant.avatarUrl
                        ? `url(${contestant.avatarUrl}) center/cover`
                        : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {!contestant.avatarUrl && contestant.displayName.charAt(0)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {contestant.displayName}
                      </p>
                      {contestant.email && (
                        <p style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.muted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {contestant.email}
                        </p>
                      )}
                    </div>

                    {/* Already Assigned Badge */}
                    {contestant.alreadyAssigned && (
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.muted,
                        background: colors.background.secondary,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                      }}>
                        Already assigned
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Selection Summary */}
            {selectedContestants.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                background: 'rgba(212,175,55,0.1)',
                borderRadius: borderRadius.md,
                color: colors.gold.primary,
                fontSize: typography.fontSize.sm,
              }}>
                <Users size={18} />
                {selectedContestants.length} contestant{selectedContestants.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Check, Users, Search, Loader, ChevronRight, ChevronLeft, Crown } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

const STEPS = {
  COMPETITIONS: 'competitions',
  CONTESTANTS: 'contestants',
};

export default function AssignRewardModal({
  isOpen,
  onClose,
  reward,
  competitions,
  existingCompetitionAssignments = [],
  onAssign,
}) {
  const [step, setStep] = useState(STEPS.COMPETITIONS);
  const [selectedCompetitions, setSelectedCompetitions] = useState([]);
  const [contestants, setContestants] = useState([]);
  const [selectedContestants, setSelectedContestants] = useState([]);
  const [selectAllContestants, setSelectAllContestants] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [competitionSearchQuery, setCompetitionSearchQuery] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(STEPS.COMPETITIONS);
      setSelectedCompetitions([]);
      setContestants([]);
      setSelectedContestants([]);
      setSelectAllContestants(false);
      setSearchQuery('');
      setCompetitionSearchQuery('');
    }
  }, [isOpen]);

  // Fetch contestants for selected competitions
  const fetchContestants = useCallback(async () => {
    if (selectedCompetitions.length === 0 || !supabase) {
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
          competition_id,
          profile:profiles(first_name, last_name, email, avatar_url)
        `)
        .in('competition_id', selectedCompetitions)
        .order('name');

      if (error) throw error;

      // Check existing individual assignments
      const { data: existingAssignments } = await supabase
        .from('reward_assignments')
        .select('contestant_id')
        .eq('reward_id', reward?.id);

      const assignedIds = new Set((existingAssignments || []).map(a => a.contestant_id));

      // Get competition names for display
      const competitionMap = {};
      competitions.forEach(c => {
        competitionMap[c.id] = c.name || `${c.city} ${c.season}`;
      });

      setContestants((data || []).map(c => ({
        ...c,
        displayName: c.profile
          ? `${c.profile.first_name || ''} ${c.profile.last_name || ''}`.trim() || c.name
          : c.name,
        email: c.profile?.email,
        avatarUrl: c.profile?.avatar_url,
        competitionName: competitionMap[c.competition_id] || 'Unknown',
        alreadyAssigned: assignedIds.has(c.id),
      })));
    } catch (err) {
      console.error('Error fetching contestants:', err);
      setContestants([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompetitions, reward?.id, competitions]);

  // Toggle competition selection
  const toggleCompetition = (competitionId) => {
    setSelectedCompetitions(prev => {
      if (prev.includes(competitionId)) {
        return prev.filter(id => id !== competitionId);
      } else {
        return [...prev, competitionId];
      }
    });
  };

  // Filter competitions by search
  const filteredCompetitions = competitions.filter(c => {
    const name = c.name || `${c.city} ${c.season}`;
    return name.toLowerCase().includes(competitionSearchQuery.toLowerCase());
  });

  // Check if competition already has this reward assigned
  const isCompetitionAlreadyAssigned = (competitionId) => {
    return existingCompetitionAssignments.includes(competitionId);
  };

  // Filter contestants by search
  const filteredContestants = contestants.filter(c =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.competitionName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Available contestants (not already individually assigned)
  const availableContestants = filteredContestants.filter(c => !c.alreadyAssigned);

  // Toggle contestant selection
  const toggleContestant = (contestantId) => {
    setSelectedContestants(prev => {
      if (prev.includes(contestantId)) {
        return prev.filter(id => id !== contestantId);
      } else {
        return [...prev, contestantId];
      }
    });
  };

  // Toggle select all contestants
  const handleSelectAllContestants = () => {
    if (selectAllContestants) {
      setSelectedContestants([]);
    } else {
      setSelectedContestants(availableContestants.map(c => c.id));
    }
    setSelectAllContestants(!selectAllContestants);
  };

  // Move to contestant selection step
  const handleNextStep = () => {
    if (selectedCompetitions.length === 0) return;
    fetchContestants();
    setStep(STEPS.CONTESTANTS);
  };

  // Go back to competition selection
  const handlePrevStep = () => {
    setStep(STEPS.COMPETITIONS);
    setSelectedContestants([]);
    setSelectAllContestants(false);
    setSearchQuery('');
  };

  // Assign to competitions only (make visible)
  const handleAssignToCompetitions = () => {
    if (selectedCompetitions.length === 0) return;
    onAssign({
      competitionIds: selectedCompetitions,
      contestantIds: [],
    });
  };

  // Assign to specific contestants
  const handleAssignToContestants = () => {
    onAssign({
      competitionIds: selectedCompetitions,
      contestantIds: selectedContestants,
    });
  };

  if (!reward) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign: ${reward.name}`}
      maxWidth="650px"
      footer={
        step === STEPS.COMPETITIONS ? (
          <>
            <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleAssignToCompetitions}
              disabled={selectedCompetitions.length === 0}
            >
              Assign to {selectedCompetitions.length} Competition{selectedCompetitions.length !== 1 ? 's' : ''} Only
            </Button>
            <Button
              onClick={handleNextStep}
              icon={ChevronRight}
              disabled={selectedCompetitions.length === 0}
            >
              Select Contestants
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handlePrevStep} icon={ChevronLeft} style={{ width: 'auto' }}>
              Back
            </Button>
            <Button
              onClick={handleAssignToContestants}
              icon={Check}
              disabled={selectedContestants.length === 0}
            >
              Assign to {selectedContestants.length} Contestant{selectedContestants.length !== 1 ? 's' : ''}
            </Button>
          </>
        )
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

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.md}`,
            background: step === STEPS.COMPETITIONS ? 'rgba(212,175,55,0.2)' : colors.background.secondary,
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.sm,
            color: step === STEPS.COMPETITIONS ? colors.gold.primary : colors.text.muted,
            fontWeight: typography.fontWeight.medium,
          }}>
            <Crown size={14} />
            1. Competitions
          </div>
          <ChevronRight size={16} style={{ color: colors.text.muted }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.md}`,
            background: step === STEPS.CONTESTANTS ? 'rgba(212,175,55,0.2)' : colors.background.secondary,
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.sm,
            color: step === STEPS.CONTESTANTS ? colors.gold.primary : colors.text.muted,
            fontWeight: typography.fontWeight.medium,
          }}>
            <Users size={14} />
            2. Contestants
          </div>
        </div>

        {/* Step 1: Competition Selection */}
        {step === STEPS.COMPETITIONS && (
          <>
            <div>
              <label style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.sm,
              }}>
                Select competitions to make this reward visible
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{
                  position: 'absolute',
                  left: spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text.muted,
                }} />
                <input
                  type="text"
                  placeholder="Search competitions..."
                  value={competitionSearchQuery}
                  onChange={(e) => setCompetitionSearchQuery(e.target.value)}
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
            </div>

            {/* Competitions List */}
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
            }}>
              {filteredCompetitions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: spacing.xl,
                  color: colors.text.muted,
                }}>
                  No competitions found
                </div>
              ) : (
                filteredCompetitions.map((comp, index) => {
                  const alreadyAssigned = isCompetitionAlreadyAssigned(comp.id);
                  const isSelected = selectedCompetitions.includes(comp.id);

                  return (
                    <div
                      key={comp.id}
                      onClick={() => !alreadyAssigned && toggleCompetition(comp.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.md,
                        borderBottom: index < filteredCompetitions.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                        cursor: alreadyAssigned ? 'not-allowed' : 'pointer',
                        background: isSelected
                          ? 'rgba(212,175,55,0.1)'
                          : alreadyAssigned
                            ? 'rgba(34,197,94,0.05)'
                            : 'transparent',
                        opacity: alreadyAssigned ? 0.7 : 1,
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: borderRadius.sm,
                        border: `2px solid ${
                          alreadyAssigned
                            ? '#22c55e'
                            : isSelected
                              ? colors.gold.primary
                              : colors.border.light
                        }`,
                        background: isSelected ? colors.gold.primary : alreadyAssigned ? '#22c55e' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {(isSelected || alreadyAssigned) && (
                          <Check size={14} style={{ color: alreadyAssigned ? '#fff' : '#000' }} />
                        )}
                      </div>

                      {/* Competition Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                          <p style={{
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.medium,
                          }}>
                            {comp.name || `${comp.city} ${comp.season}`}
                          </p>
                          <Badge
                            size="sm"
                            style={{
                              background: comp.status === 'live' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                              color: comp.status === 'live' ? '#22c55e' : '#6b7280',
                            }}
                          >
                            {comp.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Already Assigned Badge */}
                      {alreadyAssigned && (
                        <span style={{
                          fontSize: typography.fontSize.xs,
                          color: '#22c55e',
                          background: 'rgba(34,197,94,0.1)',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                        }}>
                          Already visible
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Selection Summary */}
            {selectedCompetitions.length > 0 && (
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
                <Crown size={18} />
                {selectedCompetitions.length} competition{selectedCompetitions.length !== 1 ? 's' : ''} selected
              </div>
            )}

            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              Assigning to competitions makes the reward visible to all contestants.
              Click "Select Contestants" to also enable claiming for specific people.
            </p>
          </>
        )}

        {/* Step 2: Contestant Selection */}
        {step === STEPS.CONTESTANTS && (
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
                onClick={handleSelectAllContestants}
                disabled={availableContestants.length === 0}
              >
                {selectAllContestants ? 'Deselect All' : 'Select All'}
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
                    ? 'No contestants in selected competitions'
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
                      <p style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {contestant.competitionName}
                      </p>
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
                        Can claim
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
                {selectedContestants.length} contestant{selectedContestants.length !== 1 ? 's' : ''} will be able to claim
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

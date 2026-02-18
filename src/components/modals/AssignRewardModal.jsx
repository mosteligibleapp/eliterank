import React, { useState, useEffect, useCallback } from 'react';
import { Check, Users, Search, Loader, ChevronRight, ChevronLeft, Crown, UserPlus } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

const STEPS = {
  COMPETITIONS: 'competitions',
  PEOPLE: 'people',
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
  const [people, setPeople] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [selectAllPeople, setSelectAllPeople] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [competitionSearchQuery, setCompetitionSearchQuery] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(STEPS.COMPETITIONS);
      setSelectedCompetitions([...existingCompetitionAssignments]);
      setPeople([]);
      setSelectedPeople([]);
      setSelectAllPeople(false);
      setSearchQuery('');
      setCompetitionSearchQuery('');
    }
  }, [isOpen, existingCompetitionAssignments]);

  // Fetch contestants and nominees for selected competitions
  const fetchPeople = useCallback(async () => {
    if (selectedCompetitions.length === 0 || !supabase) {
      setPeople([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch contestants and nominees in parallel
      const [contestantsRes, nomineesRes, existingAssignmentsRes] = await Promise.all([
        supabase
          .from('contestants')
          .select(`
            id,
            name,
            user_id,
            competition_id,
            profile:profiles(first_name, last_name, email, avatar_url)
          `)
          .in('competition_id', selectedCompetitions)
          .order('name'),
        supabase
          .from('nominees')
          .select(`
            id,
            name,
            email,
            avatar_url,
            user_id,
            competition_id,
            status,
            converted_to_contestant
          `)
          .in('competition_id', selectedCompetitions)
          .not('status', 'in', '("rejected","declined")')
          .order('name'),
        supabase
          .from('reward_assignments')
          .select('contestant_id, nominee_id')
          .eq('reward_id', reward?.id),
      ]);

      if (contestantsRes.error) throw contestantsRes.error;

      const assignedContestantIds = new Set((existingAssignmentsRes.data || []).filter(a => a.contestant_id).map(a => a.contestant_id));
      const assignedNomineeIds = new Set((existingAssignmentsRes.data || []).filter(a => a.nominee_id).map(a => a.nominee_id));

      // Get competition names for display
      const competitionMap = {};
      competitions.forEach(c => {
        competitionMap[c.id] = c.name || `${c.cityName || c.city} ${c.season}`;
      });

      // Build contestants list
      const contestantPeople = (contestantsRes.data || []).map(c => ({
        id: `contestant-${c.id}`,
        sourceId: c.id,
        type: 'contestant',
        displayName: c.profile
          ? `${c.profile.first_name || ''} ${c.profile.last_name || ''}`.trim() || c.name
          : c.name,
        email: c.profile?.email,
        avatarUrl: c.profile?.avatar_url,
        competitionId: c.competition_id,
        competitionName: competitionMap[c.competition_id] || 'Unknown',
        alreadyAssigned: assignedContestantIds.has(c.id),
      }));

      // Build nominees list (exclude those already converted to contestants)
      const convertedNomineeIds = new Set(
        (nomineesRes.data || [])
          .filter(n => n.converted_to_contestant)
          .map(n => n.id)
      );

      const nomineePeople = (nomineesRes.data || [])
        .filter(n => !n.converted_to_contestant)
        .map(n => ({
          id: `nominee-${n.id}`,
          sourceId: n.id,
          type: 'nominee',
          displayName: n.name || n.email || 'Unknown',
          email: n.email,
          avatarUrl: n.avatar_url,
          competitionId: n.competition_id,
          competitionName: competitionMap[n.competition_id] || 'Unknown',
          alreadyAssigned: assignedNomineeIds.has(n.id),
        }));

      setPeople([...contestantPeople, ...nomineePeople]);
    } catch (err) {
      console.error('Error fetching people:', err);
      setPeople([]);
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
    const name = c.name || `${c.cityName || c.city} ${c.season}`;
    return name.toLowerCase().includes(competitionSearchQuery.toLowerCase());
  });

  // Check if competition already has this reward assigned
  const isCompetitionAlreadyAssigned = (competitionId) => {
    return existingCompetitionAssignments.includes(competitionId);
  };

  // Filter people by search
  const filteredPeople = people.filter(p =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.competitionName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Available people (not already individually assigned)
  const availablePeople = filteredPeople.filter(p => !p.alreadyAssigned);

  // Toggle person selection
  const togglePerson = (personId) => {
    setSelectedPeople(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  // Toggle select all people
  const handleSelectAllPeople = () => {
    if (selectAllPeople) {
      setSelectedPeople([]);
    } else {
      setSelectedPeople(availablePeople.map(p => p.id));
    }
    setSelectAllPeople(!selectAllPeople);
  };

  // Move to people selection step
  const handleNextStep = () => {
    if (selectedCompetitions.length === 0) return;
    fetchPeople();
    setStep(STEPS.PEOPLE);
  };

  // Go back to competition selection
  const handlePrevStep = () => {
    setStep(STEPS.COMPETITIONS);
    setSelectedPeople([]);
    setSelectAllPeople(false);
    setSearchQuery('');
  };

  // Compute which existing assignments were removed
  const removedCompetitionIds = existingCompetitionAssignments.filter(
    id => !selectedCompetitions.includes(id)
  );

  // Extract contestant and nominee IDs from selected people
  const getAssignmentIds = () => {
    const contestantIds = [];
    const nomineeIds = [];
    selectedPeople.forEach(id => {
      const person = people.find(p => p.id === id);
      if (!person) return;
      if (person.type === 'contestant') contestantIds.push(person.sourceId);
      else if (person.type === 'nominee') nomineeIds.push(person.sourceId);
    });
    return { contestantIds, nomineeIds };
  };

  // Assign to competitions only (make visible)
  const handleAssignToCompetitions = () => {
    onAssign({
      competitionIds: selectedCompetitions,
      removedCompetitionIds,
      contestantIds: [],
      nomineeIds: [],
    });
  };

  // Assign to specific people
  const handleAssignToPeople = () => {
    const { contestantIds, nomineeIds } = getAssignmentIds();
    onAssign({
      competitionIds: selectedCompetitions,
      removedCompetitionIds,
      contestantIds,
      nomineeIds,
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
              disabled={selectedCompetitions.length === 0 && removedCompetitionIds.length === 0}
            >
              {selectedCompetitions.length === 0 && removedCompetitionIds.length > 0
                ? `Remove from ${removedCompetitionIds.length} Competition${removedCompetitionIds.length !== 1 ? 's' : ''}`
                : `Assign to ${selectedCompetitions.length} Competition${selectedCompetitions.length !== 1 ? 's' : ''} Only`}
            </Button>
            <Button
              onClick={handleNextStep}
              icon={ChevronRight}
              disabled={selectedCompetitions.length === 0}
            >
              Select People
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handlePrevStep} icon={ChevronLeft} style={{ width: 'auto' }}>
              Back
            </Button>
            <Button
              onClick={handleAssignToPeople}
              icon={Check}
              disabled={selectedPeople.length === 0}
            >
              Assign to {selectedPeople.length} {selectedPeople.length !== 1 ? 'People' : 'Person'}
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
            background: step === STEPS.PEOPLE ? 'rgba(212,175,55,0.2)' : colors.background.secondary,
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.sm,
            color: step === STEPS.PEOPLE ? colors.gold.primary : colors.text.muted,
            fontWeight: typography.fontWeight.medium,
          }}>
            <Users size={14} />
            2. People
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
                      onClick={() => toggleCompetition(comp.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.md,
                        borderBottom: index < filteredCompetitions.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                        cursor: 'pointer',
                        background: isSelected
                          ? alreadyAssigned
                            ? 'rgba(34,197,94,0.1)'
                            : 'rgba(212,175,55,0.1)'
                          : 'transparent',
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: borderRadius.sm,
                        border: `2px solid ${
                          isSelected
                            ? alreadyAssigned ? '#22c55e' : colors.gold.primary
                            : colors.border.light
                        }`,
                        background: isSelected
                          ? alreadyAssigned ? '#22c55e' : colors.gold.primary
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isSelected && (
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
                            {comp.name || `${comp.cityName || comp.city} ${comp.season}`}
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
                          color: isSelected ? '#22c55e' : colors.text.muted,
                          background: isSelected ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                          padding: `${spacing.xs} ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                        }}>
                          {isSelected ? 'Already visible' : 'Will be removed'}
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
              Assigning to competitions makes the reward visible to all contestants and nominees.
              Click "Select People" to also enable claiming for specific individuals.
            </p>
          </>
        )}

        {/* Step 2: People Selection (Contestants + Nominees) */}
        {step === STEPS.PEOPLE && (
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
                  placeholder="Search contestants & nominees..."
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
                onClick={handleSelectAllPeople}
                disabled={availablePeople.length === 0}
              >
                {selectAllPeople ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* People List */}
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
                  Loading contestants & nominees...
                </div>
              ) : filteredPeople.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: spacing.xl,
                  color: colors.text.muted,
                }}>
                  {people.length === 0
                    ? 'No contestants or nominees in selected competitions'
                    : 'No people match your search'}
                </div>
              ) : (
                filteredPeople.map((person, index) => (
                  <div
                    key={person.id}
                    onClick={() => !person.alreadyAssigned && togglePerson(person.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderBottom: index < filteredPeople.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                      cursor: person.alreadyAssigned ? 'not-allowed' : 'pointer',
                      background: selectedPeople.includes(person.id)
                        ? 'rgba(212,175,55,0.1)'
                        : person.alreadyAssigned
                          ? 'rgba(107,114,128,0.1)'
                          : 'transparent',
                      opacity: person.alreadyAssigned ? 0.6 : 1,
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: borderRadius.sm,
                      border: `2px solid ${
                        person.alreadyAssigned
                          ? colors.text.muted
                          : selectedPeople.includes(person.id)
                            ? colors.gold.primary
                            : colors.border.light
                      }`,
                      background: selectedPeople.includes(person.id) ? colors.gold.primary : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {selectedPeople.includes(person.id) && (
                        <Check size={14} style={{ color: '#000' }} />
                      )}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: borderRadius.full,
                      background: person.avatarUrl
                        ? `url(${person.avatarUrl}) center/cover`
                        : person.type === 'nominee'
                          ? 'linear-gradient(135deg, #d4af37, #f5d669)'
                          : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {!person.avatarUrl && person.displayName.charAt(0)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                        <p style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {person.displayName}
                        </p>
                        <Badge
                          size="sm"
                          style={{
                            background: person.type === 'nominee'
                              ? 'rgba(212,175,55,0.15)'
                              : 'rgba(34,197,94,0.15)',
                            color: person.type === 'nominee'
                              ? colors.gold.primary
                              : '#22c55e',
                            flexShrink: 0,
                          }}
                        >
                          {person.type === 'nominee' ? 'Nominee' : 'Contestant'}
                        </Badge>
                      </div>
                      <p style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {person.competitionName}
                      </p>
                    </div>

                    {/* Already Assigned Badge */}
                    {person.alreadyAssigned && (
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
            {selectedPeople.length > 0 && (
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
                {selectedPeople.length} {selectedPeople.length !== 1 ? 'people' : 'person'} will be able to claim
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

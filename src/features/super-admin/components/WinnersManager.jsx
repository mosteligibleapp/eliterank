import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Search, X, Loader, User, AlertCircle, Check, Crown
} from 'lucide-react';
import { Button, Badge, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { COMPETITION_STATUS } from '../../../types/competition';

export default function WinnersManager({ competition, onUpdate, allowEdit = false }) {
  const [winners, setWinners] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const maxWinners = competition?.number_of_winners || 5;
  const isCompleted = competition?.status === COMPETITION_STATUS.COMPLETED;
  // Allow editing if explicitly allowed or if competition is completed
  const canEdit = allowEdit || isCompleted;

  // Load existing winners on mount
  useEffect(() => {
    loadWinners();
  }, [competition?.id]);

  const loadWinners = async () => {
    if (!competition?.id || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get winner IDs from competition
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .select('winners')
        .eq('id', competition.id)
        .single();

      if (compError) throw compError;

      const winnerIds = compData?.winners || [];

      if (winnerIds.length > 0) {
        // Fetch winner profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url')
          .in('id', winnerIds);

        if (profilesError) throw profilesError;

        // Maintain order from winner IDs
        const orderedWinners = winnerIds
          .map(id => profiles.find(p => p.id === id))
          .filter(Boolean);

        setWinners(orderedWinners);
      } else {
        setWinners([]);
      }
    } catch (err) {
      console.error('Error loading winners:', err);
      setError('Failed to load winners');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const searchProfiles = useCallback(async (query) => {
    if (!query.trim() || !supabase) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const searchTerm = query.toLowerCase().trim();

      // Fetch profiles and filter client-side for more reliable search
      // This works around RLS and query syntax issues
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .limit(100);

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError(`Search error: ${fetchError.message}`);
        setSearchResults([]);
        return;
      }

      if (!data || data.length === 0) {
        setSearchResults([]);
        return;
      }

      // Filter out already selected winners
      const winnerIds = winners.map(w => w.id);

      // Client-side search filtering
      const filtered = data.filter(p => {
        // Skip already selected winners
        if (winnerIds.includes(p.id)) return false;

        // Search across multiple fields
        const email = (p.email || '').toLowerCase();
        const firstName = (p.first_name || '').toLowerCase();
        const lastName = (p.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();

        return (
          email.includes(searchTerm) ||
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm)
        );
      }).slice(0, 10);

      setSearchResults(filtered);
    } catch (err) {
      console.error('Error searching profiles:', err);
      setError('Failed to search profiles');
    } finally {
      setSearching(false);
    }
  }, [winners]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProfiles(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchProfiles]);

  const addWinner = async (profile) => {
    if (winners.length >= maxWinners) {
      setError(`Maximum ${maxWinners} winners allowed`);
      return;
    }

    const newWinners = [...winners, profile];
    setWinners(newWinners);
    setSearchQuery('');
    setSearchResults([]);

    // Save to database
    await saveWinners(newWinners);
  };

  const removeWinner = async (profileId) => {
    const newWinners = winners.filter(w => w.id !== profileId);
    setWinners(newWinners);

    // Save to database
    await saveWinners(newWinners);
  };

  const saveWinners = async (winnersList) => {
    if (!competition?.id || !supabase) return;

    setSaving(true);
    setError(null);

    try {
      const winnerIds = winnersList.map(w => w.id);

      const { error } = await supabase
        .from('competitions')
        .update({ winners: winnerIds })
        .eq('id', competition.id);

      if (error) throw error;

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error saving winners:', err);
      setError('Failed to save winners');
    } finally {
      setSaving(false);
    }
  };

  const getProfileName = (profile) => {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || profile.email || 'Unknown';
  };

  // Show locked state only if editing is not allowed
  if (!canEdit) {
    return (
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: borderRadius.lg,
            background: 'rgba(107,114,128,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Trophy size={24} style={{ color: '#6b7280' }} />
          </div>
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
              Winners Management
            </h3>
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              Available when competition is completed
            </p>
          </div>
        </div>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
          Winners can only be assigned after the competition status is set to "Completed".
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        background: colors.background.card,
        border: `1px solid rgba(212,175,55,0.3)`,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        textAlign: 'center',
      }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
        <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading winners...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: colors.background.card,
      border: `1px solid rgba(212,175,55,0.3)`,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.xl,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: borderRadius.lg,
            background: 'rgba(212,175,55,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Trophy size={24} style={{ color: colors.gold.primary }} />
          </div>
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
              Competition Winners
            </h3>
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              {winners.length} of {maxWinners} winners selected
            </p>
          </div>
        </div>

        {saving && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.gold.primary }}>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: typography.fontSize.sm }}>Saving...</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: borderRadius.md,
          marginBottom: spacing.lg,
          color: '#ef4444',
          fontSize: typography.fontSize.sm,
        }}>
          <AlertCircle size={16} />
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search input */}
      {winners.length < maxWinners && (
        <div style={{ position: 'relative', marginBottom: spacing.lg }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.lg,
          }}>
            <Search size={18} style={{ color: colors.text.muted }} />
            <input
              type="text"
              placeholder="Search by name, email, or Instagram..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: colors.text.primary,
                fontSize: typography.fontSize.md,
              }}
            />
            {searching && <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: spacing.xs,
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              zIndex: 50,
              maxHeight: 300,
              overflow: 'auto',
            }}>
              {searchResults.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => addWinner(profile)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${colors.border.lighter}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.background.secondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Avatar
                    name={getProfileName(profile)}
                    size={40}
                    avatarUrl={profile.avatar_url}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                      {getProfileName(profile)}
                    </p>
                    <p style={{
                      color: colors.text.secondary,
                      fontSize: typography.fontSize.sm,
                    }}>
                      {profile.email}
                    </p>
                  </div>
                  <div style={{
                    padding: spacing.sm,
                    background: 'rgba(34,197,94,0.1)',
                    borderRadius: borderRadius.full,
                    color: '#22c55e',
                  }}>
                    <Check size={16} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {searchQuery.trim() && !searching && searchResults.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: spacing.xs,
              padding: spacing.lg,
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              textAlign: 'center',
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
            }}>
              <User size={24} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
              <p>No profiles found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Winners list */}
      {winners.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {winners.map((winner, index) => (
            <div
              key={winner.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: borderRadius.lg,
              }}
            >
              {/* Rank indicator */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: borderRadius.full,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Crown size={16} style={{ color: colors.gold.primary }} />
              </div>

              <Avatar
                name={getProfileName(winner)}
                size={44}
                avatarUrl={winner.avatar_url}
                variant="gold"
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  {getProfileName(winner)}
                </p>
                <p style={{
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                }}>
                  {winner.email}
                </p>
              </div>

              <Badge variant="gold" size="sm">Winner</Badge>

              <button
                onClick={() => removeWinner(winner.id)}
                style={{
                  padding: spacing.sm,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Remove winner"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: spacing.xl,
          color: colors.text.secondary,
        }}>
          <Crown size={48} style={{ marginBottom: spacing.md, opacity: 0.3, color: colors.gold.primary }} />
          <p>No winners selected yet</p>
          <p style={{ fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
            Use the search above to find and add winners
          </p>
        </div>
      )}

      {/* Max winners indicator */}
      {winners.length >= maxWinners && (
        <div style={{
          marginTop: spacing.lg,
          padding: spacing.md,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: borderRadius.md,
          textAlign: 'center',
          color: '#22c55e',
          fontSize: typography.fontSize.sm,
        }}>
          <Check size={16} style={{ marginRight: spacing.xs, verticalAlign: 'middle' }} />
          All {maxWinners} winners have been selected
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

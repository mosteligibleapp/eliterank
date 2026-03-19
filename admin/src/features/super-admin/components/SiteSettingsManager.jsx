import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy, Plus, Trash2, Loader, User, Save, Search, X, Check, GripVertical
} from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '@shared/styles/theme';
import { useToast } from '@shared/contexts/ToastContext';
import useAppSettings from '@shared/hooks/useAppSettings';
import { supabase } from '@shared/lib/supabase';
import { FormSection, FormField, TextInput, FormGrid } from '../../../components/FormField';
import DataTable from '../../../components/DataTable';
import ActionMenu from '../../../components/ActionMenu';

export default function SiteSettingsManager() {
  const toast = useToast();

  const {
    data: hallOfWinners,
    loading,
    error,
    update: updateHallOfWinners,
  } = useAppSettings('hall_of_winners');

  const [formData, setFormData] = useState({
    year: new Date().getFullYear() - 1,
    totalAwarded: '$75K+',
    winners: [],
    displayOnCompetitions: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // User search
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  // Competitions
  const [competitions, setCompetitions] = useState([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);

  // Sync form data
  useEffect(() => {
    if (hallOfWinners) {
      setFormData({
        year: hallOfWinners.year || new Date().getFullYear() - 1,
        totalAwarded: hallOfWinners.totalAwarded || '$75K+',
        winners: hallOfWinners.winners || [],
        displayOnCompetitions: hallOfWinners.displayOnCompetitions || [],
      });
    }
  }, [hallOfWinners]);

  // Fetch competitions
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoadingCompetitions(true);
        const { data, error } = await supabase
          .from('competitions')
          .select('id, slug, season, status, city:cities(id, name, state)')
          .in('status', ['draft', 'publish', 'live'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCompetitions(data || []);
      } catch (err) {
        console.error('Error fetching competitions:', err);
      } finally {
        setLoadingCompetitions(false);
      }
    };
    fetch();
  }, []);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, city')
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowUserSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSelectUser = (profile) => {
    const displayName = `${profile.first_name || ''} ${profile.last_name ? profile.last_name.charAt(0) + '.' : ''}`.trim();
    const newWinner = {
      id: Date.now(),
      profileId: profile.id,
      name: displayName || 'Unknown',
      city: profile.city || '',
      imageUrl: profile.avatar_url || '',
      featured: formData.winners.length === 0,
    };
    setFormData(prev => ({ ...prev, winners: [...prev.winners, newWinner] }));
    setHasChanges(true);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveWinner = (id) => {
    setFormData(prev => ({ ...prev, winners: prev.winners.filter(w => w.id !== id) }));
    setHasChanges(true);
  };

  const handleSetFeatured = (id) => {
    setFormData(prev => ({
      ...prev,
      winners: prev.winners.map(w => ({ ...w, featured: w.id === id })),
    }));
    setHasChanges(true);
  };

  const handleMoveWinner = (index, direction) => {
    setFormData(prev => {
      const arr = [...prev.winners];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...prev, winners: arr };
    });
    setHasChanges(true);
  };

  const handleToggleCompetition = (competitionId) => {
    setFormData(prev => {
      const current = prev.displayOnCompetitions || [];
      const isSelected = current.includes(competitionId);
      return {
        ...prev,
        displayOnCompetitions: isSelected
          ? current.filter(id => id !== competitionId)
          : [...current, competitionId],
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateHallOfWinners(formData);
      if (result.success) {
        toast.success('Hall of Winners updated successfully');
        setHasChanges(false);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getCompetitionDisplayName = (comp) => {
    const cityName = comp.city?.name || 'Unknown City';
    const stateName = comp.city?.state ? `, ${comp.city.state}` : '';
    return `${cityName}${stateName} - Season ${comp.season}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxxl }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl, color: colors.status.error }}>
        Error loading settings: {error}
      </div>
    );
  }

  // Winners table data
  const winnersTableData = formData.winners.map((w, idx) => ({ ...w, _index: idx }));

  const winnersColumns = [
    {
      key: '_index', label: '#', width: '48px', sortable: false,
      render: (val, row) => (
        <div style={{
          width: '24px', height: '24px', borderRadius: borderRadius.full,
          background: row.featured ? colors.gold.primary : colors.background.elevated,
          color: row.featured ? '#000' : colors.text.secondary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold,
        }}>
          {val + 1}
        </div>
      ),
    },
    {
      key: 'name', label: 'Winner', sortable: false,
      render: (val, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{
            width: '28px', height: '28px', borderRadius: borderRadius.full, flexShrink: 0,
            background: row.imageUrl ? `url(${row.imageUrl}) center/cover` : colors.background.elevated,
            border: `1px solid ${colors.border.secondary}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {!row.imageUrl && <User size={14} style={{ color: colors.text.tertiary }} />}
            {row.imageUrl && <img src={row.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </span>
          <span>
            <span style={{ fontWeight: typography.fontWeight.medium, display: 'block' }}>{val}</span>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{row.city || 'No city'}</span>
          </span>
          {row.featured && (
            <Trophy size={12} style={{ color: colors.gold.primary, marginLeft: spacing.xs }} />
          )}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl, maxWidth: '800px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div style={{
            width: '36px', height: '36px',
            background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.secondary})`,
            borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy size={18} style={{ color: '#000' }} />
          </div>
          <div>
            <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary, margin: 0 }}>
              Hall of Winners
            </h2>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, margin: 0 }}>
              Showcase past champions on the explore page
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: spacing.xs,
            height: '36px', padding: `0 ${spacing.lg}`,
            background: hasChanges ? colors.gold.primary : colors.background.tertiary,
            border: 'none', borderRadius: borderRadius.md,
            color: hasChanges ? colors.text.inverse : colors.text.tertiary,
            fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
            cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed',
            opacity: hasChanges ? 1 : 0.5,
          }}
        >
          {isSaving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      {/* Basic Settings */}
      <FormSection title="General Settings" description="Configure the year and awards total displayed" divider={false}>
        <FormGrid>
          <FormField label="Champions Year">
            <TextInput
              type="number"
              value={formData.year}
              onChange={(e) => handleFieldChange('year', parseInt(e.target.value) || new Date().getFullYear())}
            />
          </FormField>
          <FormField label="Total Awarded (display text)">
            <TextInput
              value={formData.totalAwarded}
              onChange={(e) => handleFieldChange('totalAwarded', e.target.value)}
              placeholder="e.g., $75K+"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Winners */}
      <FormSection title="Winners" description={`${formData.winners.length} winner${formData.winners.length !== 1 ? 's' : ''} configured`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div ref={searchRef} style={{ position: 'relative' }}>
            {!showUserSearch ? (
              <button
                onClick={() => setShowUserSearch(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: spacing.xs,
                  height: '32px', padding: `0 ${spacing.md}`,
                  background: 'transparent', border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.md, color: colors.text.secondary,
                  fontSize: typography.fontSize.sm, cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Add Winner
              </button>
            ) : (
              <div style={{
                position: 'absolute', right: 0, top: 0, width: '300px',
                background: colors.background.card, borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.primary}`, boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', padding: spacing.sm,
                  borderBottom: `1px solid ${colors.border.primary}`,
                }}>
                  <Search size={14} style={{ color: colors.text.tertiary, marginRight: spacing.sm }} />
                  <input
                    type="text" value={searchQuery} autoFocus
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name..."
                    style={{
                      flex: 1, padding: spacing.xs, background: 'transparent', border: 'none',
                      color: colors.text.primary, fontSize: typography.fontSize.sm, outline: 'none',
                    }}
                  />
                  <button onClick={() => { setShowUserSearch(false); setSearchQuery(''); setSearchResults([]); }}
                    style={{ background: 'transparent', border: 'none', color: colors.text.tertiary, cursor: 'pointer', padding: spacing.xs }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {isSearching ? (
                    <div style={{ padding: spacing.md, textAlign: 'center' }}>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: colors.text.tertiary }} />
                    </div>
                  ) : searchQuery.length < 2 ? (
                    <div style={{ padding: spacing.md, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.xs }}>
                      Type at least 2 characters
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: spacing.md, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.xs }}>
                      No users found
                    </div>
                  ) : searchResults.map((profile) => (
                    <button key={profile.id} onClick={() => handleSelectUser(profile)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: spacing.sm,
                        padding: `${spacing.sm} ${spacing.md}`, background: 'transparent', border: 'none',
                        borderBottom: `1px solid ${colors.border.secondary}`, cursor: 'pointer', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.background.elevated}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: '28px', height: '28px', borderRadius: borderRadius.full,
                        background: colors.background.elevated, border: `1px solid ${colors.border.secondary}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                      }}>
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={14} style={{ color: colors.text.tertiary }} />
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary, margin: 0 }}>
                          {profile.first_name} {profile.last_name}
                        </p>
                        {profile.city && <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, margin: 0 }}>{profile.city}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {formData.winners.length === 0 ? (
          <div style={{
            padding: spacing.xl, textAlign: 'center', background: colors.background.tertiary,
            borderRadius: borderRadius.lg, border: `1px dashed ${colors.border.primary}`,
          }}>
            <User size={24} style={{ color: colors.text.tertiary, marginBottom: spacing.sm }} />
            <p style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm, margin: 0 }}>
              No winners added yet. Click "Add Winner" to search and select users.
            </p>
          </div>
        ) : (
          <DataTable
            columns={winnersColumns}
            data={winnersTableData}
            actions={(row) => (
              <ActionMenu actions={[
                { label: row.featured ? 'Featured' : 'Set Featured', icon: Trophy, onClick: () => handleSetFeatured(row.id), disabled: row.featured },
                { label: 'Move Up', icon: GripVertical, onClick: () => handleMoveWinner(row._index, -1), disabled: row._index === 0 },
                { label: 'Move Down', icon: GripVertical, onClick: () => handleMoveWinner(row._index, 1), disabled: row._index === formData.winners.length - 1 },
                { label: 'Remove', icon: Trash2, variant: 'danger', onClick: () => handleRemoveWinner(row.id) },
              ]} />
            )}
          />
        )}
      </FormSection>

      {/* Competition Pages */}
      <FormSection title="Display On Competition Pages" description="Select competitions to show these winners beneath the 'Who Competes?' section">
        {loadingCompetitions ? (
          <div style={{ padding: spacing.md, textAlign: 'center' }}>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: colors.text.tertiary }} />
          </div>
        ) : competitions.length === 0 ? (
          <p style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>No competitions available</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: spacing.sm }}>
            {competitions.map((comp) => {
              const isSelected = (formData.displayOnCompetitions || []).includes(comp.id);
              return (
                <button
                  key={comp.id}
                  onClick={() => handleToggleCompetition(comp.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: spacing.sm,
                    padding: `${spacing.sm} ${spacing.md}`, textAlign: 'left',
                    background: isSelected ? colors.gold.muted : colors.background.tertiary,
                    border: isSelected ? `2px solid ${colors.gold.primary}` : `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.md, cursor: 'pointer', transition: transitions.colors,
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: borderRadius.sm, flexShrink: 0,
                    background: isSelected ? colors.gold.primary : colors.background.elevated,
                    border: isSelected ? 'none' : `1px solid ${colors.border.secondary}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <Check size={12} style={{ color: '#000' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary, margin: 0 }}>
                      {getCompetitionDisplayName(comp)}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textTransform: 'uppercase', margin: 0 }}>
                      {comp.status}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </FormSection>

      {/* Preview */}
      {formData.winners.length > 0 && (
        <FormSection title="Preview" description="How the Hall of Winners will appear on the site">
          <div style={{
            padding: spacing.lg, background: colors.background.tertiary,
            borderRadius: borderRadius.lg, border: `1px solid ${colors.border.primary}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
              <div>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  {formData.year} Champions
                </p>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary, margin: 0 }}>
                  Hall of Winners
                </h3>
              </div>
              <div>
                <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
                  {formData.totalAwarded}
                </span>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs }}>awarded</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(formData.winners.length, 5)}, 1fr)`, gap: spacing.sm }}>
              {formData.winners.slice(0, 5).map((winner) => (
                <div key={winner.id} style={{
                  display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm,
                  background: colors.background.elevated, borderRadius: borderRadius.md,
                  border: winner.featured ? `1.5px solid ${colors.gold.primary}` : `1px solid ${colors.border.primary}`,
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: borderRadius.sm, flexShrink: 0,
                    background: colors.background.card, border: `1px solid ${colors.border.secondary}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {winner.imageUrl ? (
                      <img src={winner.imageUrl} alt={winner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={14} style={{ color: colors.text.tertiary }} />
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, margin: 0 }}>
                      {winner.name || 'Winner Name'}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, margin: 0 }}>
                      {winner.city || 'City'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FormSection>
      )}
    </div>
  );
}

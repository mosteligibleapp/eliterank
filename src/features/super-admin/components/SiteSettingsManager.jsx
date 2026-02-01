import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy, Plus, Trash2, Loader, User, Save, GripVertical, Search, X, ChevronDown, ChevronRight, MapPin
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useToast } from '../../../contexts/ToastContext';
import useAppSettings from '../../../hooks/useAppSettings';
import { supabase } from '../../../lib/supabase';

export default function SiteSettingsManager() {
  const toast = useToast();

  // Fetch hall of winners settings
  const {
    data: hallOfWinners,
    loading,
    error,
    update: updateHallOfWinners,
  } = useAppSettings('hall_of_winners');

  // Local state for editing
  const [formData, setFormData] = useState({
    year: new Date().getFullYear() - 1,
    totalAwarded: '$75K+',
    winners: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // User search state
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  // Competition Hall of Winners state
  const {
    data: competitionHallOfWinners,
    loading: compHowLoading,
    update: updateCompetitionHallOfWinners,
  } = useAppSettings('competition_hall_of_winners');

  const [competitions, setCompetitions] = useState([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [compWinnersFormData, setCompWinnersFormData] = useState({});
  const [compHasChanges, setCompHasChanges] = useState(false);
  const [isSavingComp, setIsSavingComp] = useState(false);
  const [showCompUserSearch, setShowCompUserSearch] = useState(false);
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const [compSearchResults, setCompSearchResults] = useState([]);
  const [isCompSearching, setIsCompSearching] = useState(false);
  const compSearchRef = useRef(null);
  const [expandedSection, setExpandedSection] = useState('explore'); // 'explore' or 'competition'

  // Sync form data with fetched data
  useEffect(() => {
    if (hallOfWinners) {
      setFormData({
        year: hallOfWinners.year || new Date().getFullYear() - 1,
        totalAwarded: hallOfWinners.totalAwarded || '$75K+',
        winners: hallOfWinners.winners || [],
      });
    }
  }, [hallOfWinners]);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
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

  // Close search dropdown when clicking outside
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

  // Fetch competitions for per-competition Hall of Winners
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoadingCompetitions(true);
        const { data, error } = await supabase
          .from('competitions')
          .select(`
            id,
            slug,
            season,
            status,
            city:cities(id, name, state)
          `)
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
    fetchCompetitions();
  }, []);

  // Sync competition hall of winners data with form state
  useEffect(() => {
    if (competitionHallOfWinners) {
      setCompWinnersFormData(competitionHallOfWinners);
    }
  }, [competitionHallOfWinners]);

  // Search users for competition hall of winners
  useEffect(() => {
    const searchUsers = async () => {
      if (!compSearchQuery || compSearchQuery.length < 2) {
        setCompSearchResults([]);
        return;
      }

      setIsCompSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, city')
          .or(`first_name.ilike.%${compSearchQuery}%,last_name.ilike.%${compSearchQuery}%`)
          .limit(10);

        if (error) throw error;
        setCompSearchResults(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setCompSearchResults([]);
      } finally {
        setIsCompSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [compSearchQuery]);

  // Close competition search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (compSearchRef.current && !compSearchRef.current.contains(e.target)) {
        setShowCompUserSearch(false);
        setCompSearchQuery('');
        setCompSearchResults([]);
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
    setFormData(prev => ({
      ...prev,
      winners: [...prev.winners, newWinner],
    }));
    setHasChanges(true);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveWinner = (id) => {
    setFormData(prev => ({
      ...prev,
      winners: prev.winners.filter(w => w.id !== id),
    }));
    setHasChanges(true);
  };

  const handleSetFeatured = (id) => {
    setFormData(prev => ({
      ...prev,
      winners: prev.winners.map(w => ({
        ...w,
        featured: w.id === id,
      })),
    }));
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

  // Competition Hall of Winners handlers
  const getCompetitionConfig = (competitionId) => {
    return compWinnersFormData[competitionId] || { enabled: false, winners: [] };
  };

  const handleToggleCompetition = (competitionId) => {
    const current = getCompetitionConfig(competitionId);
    setCompWinnersFormData(prev => ({
      ...prev,
      [competitionId]: {
        ...current,
        enabled: !current.enabled,
      },
    }));
    setCompHasChanges(true);
  };

  const handleUpdateWinnersSeason = (competitionId, season) => {
    const current = getCompetitionConfig(competitionId);
    setCompWinnersFormData(prev => ({
      ...prev,
      [competitionId]: {
        ...current,
        winnersSeason: season,
      },
    }));
    setCompHasChanges(true);
  };

  const handleSelectCompetitionUser = (profile) => {
    if (!selectedCompetitionId) return;

    const displayName = `${profile.first_name || ''} ${profile.last_name ? profile.last_name.charAt(0) + '.' : ''}`.trim();
    const current = getCompetitionConfig(selectedCompetitionId);
    const newWinner = {
      id: Date.now(),
      profileId: profile.id,
      name: displayName || 'Unknown',
      city: profile.city || '',
      imageUrl: profile.avatar_url || '',
    };

    setCompWinnersFormData(prev => ({
      ...prev,
      [selectedCompetitionId]: {
        ...current,
        winners: [...(current.winners || []), newWinner],
      },
    }));
    setCompHasChanges(true);
    setShowCompUserSearch(false);
    setCompSearchQuery('');
    setCompSearchResults([]);
  };

  const handleRemoveCompetitionWinner = (competitionId, winnerId) => {
    const current = getCompetitionConfig(competitionId);
    setCompWinnersFormData(prev => ({
      ...prev,
      [competitionId]: {
        ...current,
        winners: (current.winners || []).filter(w => w.id !== winnerId),
      },
    }));
    setCompHasChanges(true);
  };

  const handleSaveCompetitionHallOfWinners = async () => {
    setIsSavingComp(true);
    try {
      const result = await updateCompetitionHallOfWinners(compWinnersFormData);
      if (result.success) {
        toast.success('Competition Hall of Winners updated successfully');
        setCompHasChanges(false);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSavingComp(false);
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

  return (
    <div style={{ padding: spacing.xl, display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      {/* Explore Page Hall of Winners Section */}
      <div style={{
        background: colors.background.card,
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border.primary}`,
        overflow: 'hidden',
      }}>
        {/* Header - Collapsible */}
        <button
          onClick={() => setExpandedSection(expandedSection === 'explore' ? null : 'explore')}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing.lg,
            borderBottom: expandedSection === 'explore' ? `1px solid ${colors.border.primary}` : 'none',
            background: colors.background.elevated,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {expandedSection === 'explore' ? <ChevronDown size={20} style={{ color: colors.text.muted }} /> : <ChevronRight size={20} style={{ color: colors.text.muted }} />}
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.secondary})`,
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Trophy size={20} style={{ color: '#000' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
              }}>
                Explore Page Hall of Winners
              </h2>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                Showcase past champions on the explore page
              </p>
            </div>
          </div>
          {expandedSection === 'explore' && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Save size={16} style={{ marginRight: spacing.xs }} />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </button>

        {/* Settings Form - Collapsible */}
        {expandedSection === 'explore' && (
        <div style={{ padding: spacing.lg }}>
          {/* Year and Total Awarded */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: spacing.lg,
            marginBottom: spacing.xl,
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                Champions Year
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => handleFieldChange('year', parseInt(e.target.value) || new Date().getFullYear())}
                style={{
                  width: '100%',
                  padding: spacing.md,
                  background: colors.background.primary,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.lg,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.md,
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing.xs,
              }}>
                Total Awarded (display text)
              </label>
              <input
                type="text"
                value={formData.totalAwarded}
                onChange={(e) => handleFieldChange('totalAwarded', e.target.value)}
                placeholder="e.g., $75K+"
                style={{
                  width: '100%',
                  padding: spacing.md,
                  background: colors.background.primary,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.lg,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.md,
                }}
              />
            </div>
          </div>

          {/* Winners List */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}>
              <label style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
              }}>
                Winners ({formData.winners.length})
              </label>

              {/* User Search Button/Dropdown */}
              <div ref={searchRef} style={{ position: 'relative' }}>
                {!showUserSearch ? (
                  <Button variant="outline" size="sm" onClick={() => setShowUserSearch(true)}>
                    <Plus size={16} style={{ marginRight: spacing.xs }} />
                    Add Winner
                  </Button>
                ) : (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '320px',
                    background: colors.background.card,
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.primary}`,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    zIndex: 100,
                  }}>
                    {/* Search Input */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: spacing.sm,
                      borderBottom: `1px solid ${colors.border.primary}`,
                    }}>
                      <Search size={18} style={{ color: colors.text.muted, marginRight: spacing.sm }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by name..."
                        autoFocus
                        style={{
                          flex: 1,
                          padding: spacing.sm,
                          background: 'transparent',
                          border: 'none',
                          color: colors.text.primary,
                          fontSize: typography.fontSize.sm,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => {
                          setShowUserSearch(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.text.muted,
                          cursor: 'pointer',
                          padding: spacing.xs,
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Search Results */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {isSearching ? (
                        <div style={{ padding: spacing.lg, textAlign: 'center' }}>
                          <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: colors.text.muted }} />
                        </div>
                      ) : searchQuery.length < 2 ? (
                        <div style={{ padding: spacing.lg, textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                          Type at least 2 characters to search
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div style={{ padding: spacing.lg, textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                          No users found
                        </div>
                      ) : (
                        searchResults.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => handleSelectUser(profile)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: spacing.md,
                              padding: spacing.md,
                              background: 'transparent',
                              border: 'none',
                              borderBottom: `1px solid ${colors.border.primary}`,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = colors.background.elevated}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            {/* Avatar */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: borderRadius.full,
                              background: colors.background.elevated,
                              border: `1px solid ${colors.border.secondary}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}>
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <User size={20} style={{ color: colors.text.muted }} />
                              )}
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{
                                fontSize: typography.fontSize.sm,
                                fontWeight: typography.fontWeight.medium,
                                color: colors.text.primary,
                                marginBottom: '2px',
                              }}>
                                {profile.first_name} {profile.last_name}
                              </p>
                              {profile.city && (
                                <p style={{
                                  fontSize: typography.fontSize.xs,
                                  color: colors.text.secondary,
                                }}>
                                  {profile.city}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {formData.winners.length === 0 ? (
              <div style={{
                padding: spacing.xl,
                textAlign: 'center',
                background: colors.background.primary,
                borderRadius: borderRadius.lg,
                border: `1px dashed ${colors.border.primary}`,
              }}>
                <User size={32} style={{ color: colors.text.muted, marginBottom: spacing.sm }} />
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                  No winners added yet. Click "Add Winner" to search and select users.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {formData.winners.map((winner, index) => (
                  <div
                    key={winner.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      background: colors.background.primary,
                      borderRadius: borderRadius.lg,
                      border: winner.featured
                        ? `2px solid ${colors.gold.primary}`
                        : `1px solid ${colors.border.primary}`,
                    }}
                  >
                    {/* Drag Handle */}
                    <div style={{ color: colors.text.muted, cursor: 'grab' }}>
                      <GripVertical size={18} />
                    </div>

                    {/* Winner Number */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: borderRadius.full,
                      background: winner.featured ? colors.gold.primary : colors.background.elevated,
                      color: winner.featured ? '#000' : colors.text.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: borderRadius.full,
                      background: colors.background.elevated,
                      border: `1px solid ${colors.border.secondary}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {winner.imageUrl ? (
                        <img
                          src={winner.imageUrl}
                          alt={winner.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <User size={20} style={{ color: colors.text.muted }} />
                      )}
                    </div>

                    {/* Name & City */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: typography.fontSize.md,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                        marginBottom: '2px',
                      }}>
                        {winner.name}
                      </p>
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                      }}>
                        {winner.city || 'No city'}
                      </p>
                    </div>

                    {/* Featured Toggle */}
                    <button
                      onClick={() => handleSetFeatured(winner.id)}
                      title={winner.featured ? 'Featured winner' : 'Set as featured'}
                      style={{
                        padding: spacing.sm,
                        background: winner.featured ? colors.gold.muted : 'transparent',
                        border: `1px solid ${winner.featured ? colors.gold.primary : colors.border.secondary}`,
                        borderRadius: borderRadius.md,
                        color: winner.featured ? colors.gold.primary : colors.text.muted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trophy size={16} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleRemoveWinner(winner.id)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid ${colors.border.secondary}`,
                        borderRadius: borderRadius.md,
                        color: colors.status.error,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {formData.winners.length > 0 && (
            <div style={{ marginTop: spacing.xl }}>
              <label style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing.md,
              }}>
                Preview
              </label>
              <div style={{
                padding: spacing.lg,
                background: colors.background.primary,
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.primary}`,
              }}>
                {/* Preview Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: spacing.lg,
                }}>
                  <div>
                    <p style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: spacing.xs,
                    }}>
                      {formData.year} Champions
                    </p>
                    <h3 style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.primary,
                    }}>
                      Hall of Winners
                    </h3>
                  </div>
                  <div>
                    <span style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.gold.primary,
                    }}>
                      {formData.totalAwarded}
                    </span>
                    <span style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginLeft: spacing.xs,
                    }}>
                      awarded
                    </span>
                  </div>
                </div>

                {/* Preview Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(formData.winners.length, 5)}, 1fr)`,
                  gap: spacing.md,
                }}>
                  {formData.winners.slice(0, 5).map((winner) => (
                    <div
                      key={winner.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.md,
                        background: colors.background.elevated,
                        borderRadius: borderRadius.lg,
                        border: winner.featured
                          ? `1.5px solid ${colors.gold.primary}`
                          : `1px solid ${colors.border.primary}`,
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: borderRadius.md,
                        background: colors.background.card,
                        border: `1px solid ${colors.border.secondary}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        {winner.imageUrl ? (
                          <img
                            src={winner.imageUrl}
                            alt={winner.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <User size={20} style={{ color: colors.text.muted }} />
                        )}
                      </div>
                      <div>
                        <p style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.text.primary,
                        }}>
                          {winner.name || 'Winner Name'}
                        </p>
                        <p style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.secondary,
                        }}>
                          {winner.city || 'City'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Competition Page Hall of Winners Section */}
      <div style={{
        background: colors.background.card,
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border.primary}`,
        overflow: 'hidden',
      }}>
        {/* Header - Collapsible */}
        <button
          onClick={() => setExpandedSection(expandedSection === 'competition' ? null : 'competition')}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing.lg,
            borderBottom: expandedSection === 'competition' ? `1px solid ${colors.border.primary}` : 'none',
            background: colors.background.elevated,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {expandedSection === 'competition' ? <ChevronDown size={20} style={{ color: colors.text.muted }} /> : <ChevronRight size={20} style={{ color: colors.text.muted }} />}
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.secondary})`,
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MapPin size={20} style={{ color: '#000' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
              }}>
                Competition Page Hall of Winners
              </h2>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                Showcase previous season winners on current competition pages
              </p>
            </div>
          </div>
          {expandedSection === 'competition' && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSaveCompetitionHallOfWinners(); }}
              disabled={!compHasChanges || isSavingComp}
            >
              {isSavingComp ? (
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Save size={16} style={{ marginRight: spacing.xs }} />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </button>

        {/* Competition Selection */}
        {expandedSection === 'competition' && (
          <div style={{ padding: spacing.lg }}>
            {loadingCompetitions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xl }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: colors.text.muted }} />
              </div>
            ) : competitions.length === 0 ? (
              <div style={{
                padding: spacing.xl,
                textAlign: 'center',
                background: colors.background.primary,
                borderRadius: borderRadius.lg,
                border: `1px dashed ${colors.border.primary}`,
              }}>
                <MapPin size={32} style={{ color: colors.text.muted, marginBottom: spacing.sm }} />
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                  No competitions found. Create a competition first.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {competitions.map((comp) => {
                  const config = getCompetitionConfig(comp.id);
                  const isSelected = selectedCompetitionId === comp.id;

                  return (
                    <div
                      key={comp.id}
                      style={{
                        background: colors.background.primary,
                        borderRadius: borderRadius.lg,
                        border: config.enabled
                          ? `2px solid ${colors.gold.primary}`
                          : `1px solid ${colors.border.primary}`,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Competition Header */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: spacing.md,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedCompetitionId(isSelected ? null : comp.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                          {isSelected ? (
                            <ChevronDown size={18} style={{ color: colors.text.muted }} />
                          ) : (
                            <ChevronRight size={18} style={{ color: colors.text.muted }} />
                          )}
                          <div>
                            <p style={{
                              fontSize: typography.fontSize.md,
                              fontWeight: typography.fontWeight.semibold,
                              color: colors.text.primary,
                            }}>
                              {getCompetitionDisplayName(comp)}
                            </p>
                            <p style={{
                              fontSize: typography.fontSize.xs,
                              color: colors.text.muted,
                              textTransform: 'uppercase',
                            }}>
                              {comp.status} {config.winners?.length > 0 && `• ${config.winners.length} winner${config.winners.length !== 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>

                        {/* Enable Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCompetition(comp.id);
                          }}
                          style={{
                            padding: `${spacing.xs} ${spacing.md}`,
                            background: config.enabled ? colors.gold.muted : 'transparent',
                            border: `1px solid ${config.enabled ? colors.gold.primary : colors.border.secondary}`,
                            borderRadius: borderRadius.md,
                            color: config.enabled ? colors.gold.primary : colors.text.muted,
                            cursor: 'pointer',
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.medium,
                          }}
                        >
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      {/* Expanded Content - Winner Selection */}
                      {isSelected && (
                        <div style={{
                          padding: spacing.md,
                          paddingTop: 0,
                          borderTop: `1px solid ${colors.border.primary}`,
                          marginTop: spacing.xs,
                        }}>
                          {/* Winners Season Year */}
                          <div style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
                            <label style={{
                              display: 'block',
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.medium,
                              color: colors.text.secondary,
                              marginBottom: spacing.xs,
                            }}>
                              Previous Season Year (e.g., 2025 winners shown on 2026 page)
                            </label>
                            <input
                              type="number"
                              value={config.winnersSeason || comp.season - 1}
                              onChange={(e) => handleUpdateWinnersSeason(comp.id, parseInt(e.target.value) || comp.season - 1)}
                              style={{
                                width: '120px',
                                padding: spacing.sm,
                                background: colors.background.elevated,
                                border: `1px solid ${colors.border.primary}`,
                                borderRadius: borderRadius.md,
                                color: colors.text.primary,
                                fontSize: typography.fontSize.sm,
                              }}
                            />
                          </div>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.md,
                          }}>
                            <label style={{
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.medium,
                              color: colors.text.secondary,
                            }}>
                              Previous Season Winners ({config.winners?.length || 0})
                            </label>

                            {/* Add Winner Search */}
                            <div ref={compSearchRef} style={{ position: 'relative' }}>
                              {!showCompUserSearch ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCompUserSearch(true)}
                                >
                                  <Plus size={16} style={{ marginRight: spacing.xs }} />
                                  Add Winner
                                </Button>
                              ) : (
                                <div style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: 0,
                                  width: '320px',
                                  background: colors.background.card,
                                  borderRadius: borderRadius.lg,
                                  border: `1px solid ${colors.border.primary}`,
                                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                                  zIndex: 100,
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: spacing.sm,
                                    borderBottom: `1px solid ${colors.border.primary}`,
                                  }}>
                                    <Search size={18} style={{ color: colors.text.muted, marginRight: spacing.sm }} />
                                    <input
                                      type="text"
                                      value={compSearchQuery}
                                      onChange={(e) => setCompSearchQuery(e.target.value)}
                                      placeholder="Search users by name..."
                                      autoFocus
                                      style={{
                                        flex: 1,
                                        padding: spacing.sm,
                                        background: 'transparent',
                                        border: 'none',
                                        color: colors.text.primary,
                                        fontSize: typography.fontSize.sm,
                                        outline: 'none',
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setShowCompUserSearch(false);
                                        setCompSearchQuery('');
                                        setCompSearchResults([]);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: colors.text.muted,
                                        cursor: 'pointer',
                                        padding: spacing.xs,
                                      }}
                                    >
                                      <X size={18} />
                                    </button>
                                  </div>

                                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                    {isCompSearching ? (
                                      <div style={{ padding: spacing.lg, textAlign: 'center' }}>
                                        <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: colors.text.muted }} />
                                      </div>
                                    ) : compSearchQuery.length < 2 ? (
                                      <div style={{ padding: spacing.lg, textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                                        Type at least 2 characters to search
                                      </div>
                                    ) : compSearchResults.length === 0 ? (
                                      <div style={{ padding: spacing.lg, textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                                        No users found
                                      </div>
                                    ) : (
                                      compSearchResults.map((profile) => (
                                        <button
                                          key={profile.id}
                                          onClick={() => handleSelectCompetitionUser(profile)}
                                          style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: spacing.md,
                                            padding: spacing.md,
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: `1px solid ${colors.border.primary}`,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.background = colors.background.elevated}
                                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                          <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: borderRadius.full,
                                            background: colors.background.elevated,
                                            border: `1px solid ${colors.border.secondary}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                          }}>
                                            {profile.avatar_url ? (
                                              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                              <User size={18} style={{ color: colors.text.muted }} />
                                            )}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                                              {profile.first_name} {profile.last_name}
                                            </p>
                                            {profile.city && (
                                              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                                                {profile.city}
                                              </p>
                                            )}
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Winners List */}
                          {(!config.winners || config.winners.length === 0) ? (
                            <div style={{
                              padding: spacing.lg,
                              textAlign: 'center',
                              background: colors.background.elevated,
                              borderRadius: borderRadius.md,
                              border: `1px dashed ${colors.border.primary}`,
                            }}>
                              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                                No winners added. Click "Add Winner" to select users.
                              </p>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                              {config.winners.map((winner, index) => (
                                <div
                                  key={winner.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: spacing.md,
                                    padding: spacing.sm,
                                    background: colors.background.elevated,
                                    borderRadius: borderRadius.md,
                                    border: `1px solid ${colors.border.primary}`,
                                  }}
                                >
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: borderRadius.full,
                                    background: colors.gold.muted,
                                    color: colors.gold.primary,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: typography.fontSize.xs,
                                    fontWeight: typography.fontWeight.bold,
                                    flexShrink: 0,
                                  }}>
                                    {index + 1}
                                  </div>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: borderRadius.full,
                                    background: colors.background.card,
                                    border: `1px solid ${colors.border.secondary}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                  }}>
                                    {winner.imageUrl ? (
                                      <img src={winner.imageUrl} alt={winner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <User size={16} style={{ color: colors.text.muted }} />
                                    )}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                                      {winner.name}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveCompetitionWinner(comp.id, winner.id)}
                                    style={{
                                      padding: spacing.xs,
                                      background: 'transparent',
                                      border: 'none',
                                      color: colors.status.error,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

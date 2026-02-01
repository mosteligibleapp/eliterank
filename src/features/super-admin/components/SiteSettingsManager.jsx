import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy, Plus, Trash2, Loader, User, Save, GripVertical, Search, X
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
    <div style={{ padding: spacing.xl }}>
      {/* Hall of Winners Section */}
      <div style={{
        background: colors.background.card,
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border.primary}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.lg,
          borderBottom: `1px solid ${colors.border.primary}`,
          background: colors.background.elevated,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
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
            <div>
              <h2 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
              }}>
                Hall of Winners
              </h2>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                Showcase past champions on the explore page
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
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
        </div>

        {/* Settings Form */}
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
                  gridTemplateColumns: `repeat(${Math.min(formData.winners.length, 3)}, 1fr)`,
                  gap: spacing.md,
                }}>
                  {formData.winners.slice(0, 3).map((winner) => (
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
      </div>
    </div>
  );
}

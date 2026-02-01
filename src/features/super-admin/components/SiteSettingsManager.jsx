import React, { useState, useEffect } from 'react';
import {
  Trophy, Plus, Trash2, X, Loader, User, Save, GripVertical
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useToast } from '../../../contexts/ToastContext';
import useAppSettings from '../../../hooks/useAppSettings';

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

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAddWinner = () => {
    const newWinner = {
      id: Date.now(),
      name: '',
      city: '',
      imageUrl: '',
      featured: formData.winners.length === 0, // First winner is featured by default
    };
    setFormData(prev => ({
      ...prev,
      winners: [...prev.winners, newWinner],
    }));
    setHasChanges(true);
  };

  const handleUpdateWinner = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      winners: prev.winners.map(w =>
        w.id === id ? { ...w, [field]: value } : w
      ),
    }));
    setHasChanges(true);
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
              <Button variant="outline" size="sm" onClick={handleAddWinner}>
                <Plus size={16} style={{ marginRight: spacing.xs }} />
                Add Winner
              </Button>
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
                  No winners added yet. Click "Add Winner" to get started.
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
                    {/* Drag Handle (visual only for now) */}
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

                    {/* Name Input */}
                    <input
                      type="text"
                      value={winner.name}
                      onChange={(e) => handleUpdateWinner(winner.id, 'name', e.target.value)}
                      placeholder="Winner name"
                      style={{
                        flex: 1,
                        padding: spacing.sm,
                        background: colors.background.elevated,
                        border: `1px solid ${colors.border.secondary}`,
                        borderRadius: borderRadius.md,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.sm,
                        minWidth: 0,
                      }}
                    />

                    {/* City Input */}
                    <input
                      type="text"
                      value={winner.city}
                      onChange={(e) => handleUpdateWinner(winner.id, 'city', e.target.value)}
                      placeholder="City"
                      style={{
                        width: '120px',
                        padding: spacing.sm,
                        background: colors.background.elevated,
                        border: `1px solid ${colors.border.secondary}`,
                        borderRadius: borderRadius.md,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.sm,
                        flexShrink: 0,
                      }}
                    />

                    {/* Image URL Input */}
                    <input
                      type="text"
                      value={winner.imageUrl || ''}
                      onChange={(e) => handleUpdateWinner(winner.id, 'imageUrl', e.target.value)}
                      placeholder="Image URL (optional)"
                      style={{
                        width: '180px',
                        padding: spacing.sm,
                        background: colors.background.elevated,
                        border: `1px solid ${colors.border.secondary}`,
                        borderRadius: borderRadius.md,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.sm,
                        flexShrink: 0,
                      }}
                    />

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

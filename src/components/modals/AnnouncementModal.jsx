import React, { useState, useEffect } from 'react';
import { Check, Sparkles, FileText, MapPin, Wand2, Loader, ChevronDown, User, X, Plus } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { ANNOUNCEMENT_TYPES } from '../../constants';
import { useModalForm } from '../../hooks';
import { supabase } from '../../lib/supabase';

const INITIAL_STATE = { type: 'announcement', title: '', content: '', pinned: false };

// Topic types for AI-assisted editorial posts
const EDITORIAL_TOPIC_TYPES = [
  { value: 'partnership', label: 'Partnership', description: 'New sponsor or partner announcement' },
  { value: 'feature_launch', label: 'Feature Launch', description: 'New platform feature or update' },
  { value: 'winner_spotlight', label: 'Winner Spotlight', description: 'Celebrate a competition winner' },
  { value: 'company_update', label: 'Company Update', description: 'General company news' },
  { value: 'competition_highlight', label: 'Competition Highlight', description: 'Updates about an ongoing competition' },
];

export default function AnnouncementModal({
  isOpen,
  onClose,
  announcement,
  onSave,
  isSuperAdmin = false,
  contestants = [],
  competitionId,
}) {
  const { form, updateField, getFormData, setForm } = useModalForm(INITIAL_STATE, announcement, isOpen);
  const isEditing = !!announcement;

  // AI Draft state
  const [isAiMode, setIsAiMode] = useState(false);
  const [topicType, setTopicType] = useState('company_update');
  const [bulletPoints, setBulletPoints] = useState(['', '', '']);
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Reset AI state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsAiMode(false);
      setTopicType('company_update');
      setBulletPoints(['', '', '']);
      setSelectedContestant(null);
      setAiError(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    const data = getFormData();
    // Add is_ai_generated flag
    onSave({
      ...data,
      isAiGenerated: isAiMode,
    });
  };

  const handleAddBulletPoint = () => {
    if (bulletPoints.length < 4) {
      setBulletPoints([...bulletPoints, '']);
    }
  };

  const handleRemoveBulletPoint = (index) => {
    if (bulletPoints.length > 2) {
      setBulletPoints(bulletPoints.filter((_, i) => i !== index));
    }
  };

  const handleBulletPointChange = (index, value) => {
    const newBullets = [...bulletPoints];
    newBullets[index] = value;
    setBulletPoints(newBullets);
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setAiError(null);

    try {
      // Filter out empty bullet points
      const validBullets = bulletPoints.filter(bp => bp.trim() !== '');
      if (validBullets.length < 2) {
        throw new Error('Please enter at least 2 bullet points');
      }

      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase not configured');
      }

      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: 'editorial',
          topicType,
          bulletPoints: validBullets,
          contestantId: topicType === 'winner_spotlight' ? selectedContestant?.id : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate draft');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate draft');
      }

      // Populate form with generated content
      setForm({
        ...form,
        title: result.title,
        content: result.content,
      });

    } catch (error) {
      console.error('Error generating AI draft:', error);
      setAiError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const typeConfig = {
    announcement: { icon: Sparkles, color: colors.gold.primary },
    update: { icon: Check, color: colors.status.success },
    news: { icon: FileText, color: colors.status.info },
  };

  const typeButtonStyle = (type, isSelected) => {
    const config = typeConfig[type];
    return {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      border: 'none',
      background: isSelected ? `${config.color}20` : 'rgba(255,255,255,0.05)',
      color: isSelected ? config.color : colors.text.secondary,
      fontWeight: typography.fontWeight.semibold,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      fontSize: typography.fontSize.base,
      transition: 'all 0.2s',
    };
  };

  const toggleStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    background: form.pinned ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    border: form.pinned ? `1px solid rgba(212,175,55,0.2)` : `1px solid ${colors.border.lighter}`,
    cursor: 'pointer',
  };

  const switchStyle = {
    width: '44px',
    height: '24px',
    borderRadius: borderRadius.lg,
    background: form.pinned ? colors.gold.primary : 'rgba(255,255,255,0.1)',
    position: 'relative',
    transition: 'all 0.2s',
  };

  const switchDotStyle = {
    width: '20px',
    height: '20px',
    borderRadius: borderRadius.full,
    background: '#fff',
    position: 'absolute',
    top: '2px',
    left: form.pinned ? '22px' : '2px',
    transition: 'all 0.2s',
  };

  const modeToggleStyle = (active) => ({
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    border: 'none',
    background: active ? 'rgba(139,92,246,0.2)' : 'transparent',
    color: active ? '#a78bfa' : colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    fontSize: typography.fontSize.sm,
    transition: 'all 0.2s',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Announcement' : 'Create Announcement'}
      maxWidth="600px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
            This will be visible on the public Announcements page
          </p>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              icon={Check}
              disabled={!form.title || !form.content}
            >
              {isEditing ? 'Save Changes' : 'Publish'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Mode Toggle - Super Admin Only */}
      {isSuperAdmin && !isEditing && (
        <div style={{ marginBottom: spacing.lg }}>
          <div style={{
            display: 'flex',
            gap: spacing.sm,
            padding: spacing.xs,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: borderRadius.lg,
            border: `1px solid ${colors.border.lighter}`,
          }}>
            <button
              onClick={() => setIsAiMode(false)}
              style={modeToggleStyle(!isAiMode)}
            >
              <FileText size={14} /> Manual
            </button>
            <button
              onClick={() => setIsAiMode(true)}
              style={modeToggleStyle(isAiMode)}
            >
              <Wand2 size={14} /> AI Draft
            </button>
          </div>
        </div>
      )}

      {/* AI Draft Interface */}
      {isAiMode && !isEditing && (
        <div style={{
          marginBottom: spacing.lg,
          padding: spacing.lg,
          background: 'rgba(139,92,246,0.05)',
          borderRadius: borderRadius.lg,
          border: '1px solid rgba(139,92,246,0.2)',
        }}>
          {/* Topic Type Selector */}
          <div style={{ marginBottom: spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: spacing.sm,
            }}>
              Topic Type
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={topicType}
                onChange={(e) => setTopicType(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${spacing.md} ${spacing.lg}`,
                  paddingRight: '40px',
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.lighter}`,
                  borderRadius: borderRadius.md,
                  color: '#fff',
                  fontSize: typography.fontSize.base,
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                {EDITORIAL_TOPIC_TYPES.map(topic => (
                  <option key={topic.value} value={topic.value}>
                    {topic.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: 'absolute',
                  right: spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text.secondary,
                  pointerEvents: 'none',
                }}
              />
            </div>
            <p style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.muted,
              marginTop: spacing.xs,
            }}>
              {EDITORIAL_TOPIC_TYPES.find(t => t.value === topicType)?.description}
            </p>
          </div>

          {/* Contestant Selector - for Winner Spotlight */}
          {topicType === 'winner_spotlight' && contestants.length > 0 && (
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing.sm,
              }}>
                Select Winner
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedContestant?.id || ''}
                  onChange={(e) => {
                    const contestant = contestants.find(c => c.id === e.target.value);
                    setSelectedContestant(contestant || null);
                  }}
                  style={{
                    width: '100%',
                    padding: `${spacing.md} ${spacing.lg}`,
                    paddingRight: '40px',
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.lighter}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.base,
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <option value="">Select a contestant...</option>
                  {contestants.filter(c => c.status === 'winner' || c.status === 'finalist').map(contestant => (
                    <option key={contestant.id} value={contestant.id}>
                      {contestant.name} {contestant.status === 'winner' ? '(Winner)' : '(Finalist)'}
                    </option>
                  ))}
                  {contestants.filter(c => c.status !== 'winner' && c.status !== 'finalist').length > 0 && (
                    <optgroup label="Other Contestants">
                      {contestants.filter(c => c.status !== 'winner' && c.status !== 'finalist').map(contestant => (
                        <option key={contestant.id} value={contestant.id}>
                          {contestant.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    right: spacing.md,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.text.secondary,
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Bullet Points */}
          <div style={{ marginBottom: spacing.lg }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}>
              <label style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}>
                Key Points (2-4)
              </label>
              {bulletPoints.length < 4 && (
                <button
                  onClick={handleAddBulletPoint}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: 'transparent',
                    border: 'none',
                    color: '#a78bfa',
                    fontSize: typography.fontSize.xs,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={12} /> Add Point
                </button>
              )}
            </div>
            {bulletPoints.map((point, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                marginBottom: spacing.sm,
              }}>
                <span style={{
                  color: colors.text.muted,
                  fontSize: typography.fontSize.sm,
                  minWidth: '20px',
                }}>
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={point}
                  onChange={(e) => handleBulletPointChange(index, e.target.value)}
                  placeholder={`Key point ${index + 1}...`}
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.lighter}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.base,
                  }}
                />
                {bulletPoints.length > 2 && (
                  <button
                    onClick={() => handleRemoveBulletPoint(index)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: 'none',
                      color: colors.text.muted,
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateDraft}
            disabled={isGenerating || bulletPoints.filter(bp => bp.trim()).length < 2}
            icon={isGenerating ? Loader : Wand2}
            style={{
              width: '100%',
              background: isGenerating ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.8)',
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Draft'}
          </Button>

          {/* Error Message */}
          {aiError && (
            <p style={{
              marginTop: spacing.md,
              padding: spacing.md,
              background: 'rgba(239,68,68,0.1)',
              borderRadius: borderRadius.md,
              color: '#ef4444',
              fontSize: typography.fontSize.sm,
            }}>
              {aiError}
            </p>
          )}
        </div>
      )}

      {/* Post Type Selector */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{ display: 'block', fontSize: typography.fontSize.base, color: colors.text.secondary, marginBottom: spacing.sm }}>
          Post Type
        </label>
        <div style={{ display: 'flex', gap: spacing.md }}>
          {ANNOUNCEMENT_TYPES.map((type) => {
            const Icon = typeConfig[type.value].icon;
            return (
              <button
                key={type.value}
                onClick={() => updateField('type', type.value)}
                style={typeButtonStyle(type.value, form.type === type.value)}
              >
                <Icon size={14} /> {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label="Title"
        value={form.title}
        onChange={(e) => updateField('title', e.target.value)}
        placeholder="e.g., Exciting News About Round 2!"
      />

      <Textarea
        label="Content"
        value={form.content}
        onChange={(e) => updateField('content', e.target.value)}
        placeholder="Write your announcement here..."
        rows={5}
        maxLength={500}
        showCount
      />

      {/* Pin Option */}
      <div
        style={toggleStyle}
        onClick={() => updateField('pinned', !form.pinned)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <MapPin size={18} style={{ color: form.pinned ? colors.gold.primary : colors.text.secondary }} />
          <div>
            <p style={{ fontWeight: typography.fontWeight.medium, color: form.pinned ? colors.gold.primary : '#fff', fontSize: typography.fontSize.md }}>
              Pin to top
            </p>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Pinned posts appear first in the feed
            </p>
          </div>
        </div>
        <div style={switchStyle}>
          <div style={switchDotStyle} />
        </div>
      </div>
    </Modal>
  );
}

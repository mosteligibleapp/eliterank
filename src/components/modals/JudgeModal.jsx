import React, { useState, useEffect, useCallback } from 'react';
import { Check, Search, X, User } from 'lucide-react';
import { Modal, Button, Input, Textarea, Avatar } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useModalForm } from '../../hooks';
import { supabase } from '../../lib/supabase';

const INITIAL_STATE = { name: '', title: '', bio: '', user_id: null };

export default function JudgeModal({
  isOpen,
  onClose,
  judge,
  onSave,
}) {
  const { form, updateField, updateFields, getFormData } = useModalForm(INITIAL_STATE, judge, isOpen);
  const isEditing = !!judge;

  // Profile search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedProfile(null);
    }
  }, [isOpen]);

  // Search for profiles
  const searchProfiles = useCallback(async (query) => {
    if (!query || query.length < 2 || !supabase) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, bio')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching profiles:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProfiles(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProfiles]);

  const handleSelectProfile = (profile) => {
    setSelectedProfile(profile);
    updateFields({
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      bio: profile.bio || '',
      user_id: profile.id,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedProfile(null);
    updateFields({
      name: '',
      bio: '',
      user_id: null,
    });
  };

  const handleSave = () => {
    const data = getFormData();
    onSave({
      ...data,
      avatar_url: selectedProfile?.avatar_url,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Judge' : 'Add Judge'}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.name || !form.title}
          >
            {isEditing ? 'Save Changes' : 'Add Judge'}
          </Button>
        </>
      }
    >
      {/* Profile Search */}
      {!isEditing && !selectedProfile && (
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}>
            Search for a User (Optional)
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: spacing.md,
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.text.muted,
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: '100%',
                padding: `${spacing.md} ${spacing.md} ${spacing.md} ${spacing.xxl}`,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.lg,
                color: '#fff',
                fontSize: typography.fontSize.md,
              }}
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{
              marginTop: spacing.sm,
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {searchResults.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile)}
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
                >
                  <Avatar
                    name={`${profile.first_name} ${profile.last_name}`}
                    avatarUrl={profile.avatar_url}
                    size={36}
                  />
                  <div>
                    <p style={{ fontWeight: typography.fontWeight.medium, color: '#fff' }}>
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                      {profile.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searching && (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
              Searching...
            </p>
          )}
        </div>
      )}

      {/* Selected Profile Badge */}
      {selectedProfile && !isEditing && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          background: 'rgba(212,175,55,0.1)',
          border: `1px solid rgba(212,175,55,0.3)`,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.lg,
        }}>
          <Avatar
            name={`${selectedProfile.first_name} ${selectedProfile.last_name}`}
            avatarUrl={selectedProfile.avatar_url}
            size={40}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: typography.fontWeight.medium }}>
              {selectedProfile.first_name} {selectedProfile.last_name}
            </p>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
              Linked to profile
            </p>
          </div>
          <button
            onClick={handleClearSelection}
            style={{
              padding: spacing.sm,
              background: 'transparent',
              border: 'none',
              color: colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <Input
        label="Full Name"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., Victoria Blackwell"
      />
      <Input
        label="Title / Role"
        value={form.title}
        onChange={(e) => updateField('title', e.target.value)}
        placeholder="e.g., Fashion Editor, Vogue"
      />
      <Textarea
        label="Bio (Optional)"
        value={form.bio}
        onChange={(e) => updateField('bio', e.target.value)}
        placeholder="Brief description of the judge..."
        rows={3}
      />
    </Modal>
  );
}

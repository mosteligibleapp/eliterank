import React, { useState, useEffect } from 'react';
import { Search, User, Check, X, Loader } from 'lucide-react';
import { Modal, Button, Input, Textarea, Avatar, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

export default function JudgeModal({
  isOpen,
  onClose,
  judge,
  onSave,
}) {
  const isEditing = !!judge;

  // Form state
  const [form, setForm] = useState({ name: '', title: '', bio: '', userId: null, avatarUrl: '' });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showSearch, setShowSearch] = useState(true);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (judge) {
        setForm({
          name: judge.name || '',
          title: judge.title || '',
          bio: judge.bio || '',
          userId: judge.userId || null,
          avatarUrl: judge.avatarUrl || '',
        });
        setShowSearch(false);
        setSelectedProfile(null);
      } else {
        setForm({ name: '', title: '', bio: '', userId: null, avatarUrl: '' });
        setShowSearch(true);
        setSelectedProfile(null);
      }
      setSearchQuery('');
    }
  }, [isOpen, judge]);

  // Fetch profiles on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url, bio')
          .order('first_name')
          .limit(100);

        if (error) throw error;
        setProfiles(data || []);
        setFilteredProfiles(data || []);
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [isOpen]);

  // Filter profiles based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = profiles.filter(p => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const email = (p.email || '').toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
    setFilteredProfiles(filtered);
  }, [searchQuery, profiles]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectProfile = (profile) => {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;
    setSelectedProfile(profile);
    setForm({
      name,
      title: '',
      bio: profile.bio || '',
      userId: profile.id,
      avatarUrl: profile.avatar_url || '',
    });
    setShowSearch(false);
  };

  const handleClearSelection = () => {
    setSelectedProfile(null);
    setForm({ name: '', title: '', bio: '', userId: null, avatarUrl: '' });
    setShowSearch(true);
  };

  const handleSave = () => {
    onSave({
      name: form.name,
      title: form.title,
      bio: form.bio,
      userId: form.userId,
      avatarUrl: form.avatarUrl,
    });
  };

  const getProfileName = (profile) => {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return name || profile.email || 'Unknown';
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
      {/* Selected Profile or Manual Entry Toggle */}
      {selectedProfile && !isEditing && (
        <div style={{
          marginBottom: spacing.lg,
          padding: spacing.lg,
          background: 'rgba(212,175,55,0.1)',
          border: `1px solid ${colors.gold.primary}`,
          borderRadius: borderRadius.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <Avatar name={getProfileName(selectedProfile)} avatarUrl={selectedProfile.avatar_url} size={44} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: typography.fontWeight.medium, color: colors.gold.primary }}>
              {getProfileName(selectedProfile)}
            </p>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              {selectedProfile.email}
            </p>
          </div>
          <button
            onClick={handleClearSelection}
            style={{
              padding: spacing.sm,
              background: 'transparent',
              border: 'none',
              color: colors.text.secondary,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search Section */}
      {showSearch && !isEditing && (
        <>
          <div style={{
            position: 'relative',
            marginBottom: spacing.md,
          }}>
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
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: `${spacing.md} ${spacing.md} ${spacing.md} ${spacing.xxxl}`,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.lg,
                color: '#fff',
                fontSize: typography.fontSize.md,
              }}
            />
          </div>

          {/* Profiles List */}
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing.xl,
                color: colors.text.secondary,
              }}>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite', marginRight: spacing.sm }} />
                Loading...
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: spacing.xl,
                color: colors.text.secondary,
              }}>
                <User size={24} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                <p style={{ fontSize: typography.fontSize.sm }}>No users found</p>
              </div>
            ) : (
              filteredProfiles.slice(0, 10).map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colors.border.lighter}`,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar name={getProfileName(profile)} avatarUrl={profile.avatar_url} size={36} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                      {getProfileName(profile)}
                    </p>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
                      {profile.email}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{
            textAlign: 'center',
            marginBottom: spacing.lg,
            color: colors.text.muted,
            fontSize: typography.fontSize.sm,
          }}>
            — or enter details manually —
          </div>
        </>
      )}

      {/* Form Fields */}
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

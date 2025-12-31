import React, { useState, useEffect } from 'react';
import { Search, User, Check, X, Loader, UserPlus, Crown } from 'lucide-react';
import { Modal, Button, Avatar, Badge, Input, Textarea } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

/**
 * Modal for manually adding nominees or contestants
 * Allows selecting an existing user profile or entering details manually
 */
export default function AddPersonModal({
  isOpen,
  onClose,
  onAdd,
  type = 'nominee', // 'nominee' or 'contestant'
  competitionId,
}) {
  const [mode, setMode] = useState('search'); // 'search' or 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Manual entry form fields
  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    age: '',
    city: '',
    bio: '',
  });

  const isContestant = type === 'contestant';
  const title = isContestant ? 'Add Contestant' : 'Add Nominee';
  const Icon = isContestant ? Crown : UserPlus;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('search');
      setSearchQuery('');
      setSelectedProfile(null);
      setManualForm({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        age: '',
        city: '',
        bio: '',
      });
    }
  }, [isOpen]);

  // Fetch profiles on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url, instagram, city, bio')
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
      const instagram = (p.instagram || '').toLowerCase();
      return fullName.includes(query) || email.includes(query) || instagram.includes(query);
    });
    setFilteredProfiles(filtered);
  }, [searchQuery, profiles]);

  const getProfileName = (profile) => {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return name || profile.email || 'Unknown';
  };

  const handleSubmit = async () => {
    if (!onAdd) return;

    setSubmitting(true);
    try {
      let personData;

      if (mode === 'search' && selectedProfile) {
        // Use selected profile data
        personData = {
          name: getProfileName(selectedProfile),
          email: selectedProfile.email,
          instagram: selectedProfile.instagram,
          city: selectedProfile.city,
          bio: selectedProfile.bio,
          userId: selectedProfile.id,
          avatarUrl: selectedProfile.avatar_url,
        };
      } else if (mode === 'manual') {
        // Use manual form data
        if (!manualForm.name.trim()) {
          alert('Name is required');
          setSubmitting(false);
          return;
        }
        personData = {
          name: manualForm.name.trim(),
          email: manualForm.email.trim() || null,
          phone: manualForm.phone.trim() || null,
          instagram: manualForm.instagram.trim() || null,
          age: manualForm.age ? parseInt(manualForm.age, 10) : null,
          city: manualForm.city.trim() || null,
          bio: manualForm.bio.trim() || null,
          userId: null,
        };
      } else {
        setSubmitting(false);
        return;
      }

      await onAdd(personData);
      onClose();
    } catch (err) {
      console.error(`Error adding ${type}:`, err);
      alert(`Failed to add ${type}: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = mode === 'search' ? !!selectedProfile : !!manualForm.name.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={Icon}
      maxWidth="550px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            icon={submitting ? Loader : Check}
          >
            {submitting ? 'Adding...' : `Add ${isContestant ? 'Contestant' : 'Nominee'}`}
          </Button>
        </>
      }
    >
      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        gap: spacing.sm,
        marginBottom: spacing.xl,
        padding: spacing.xs,
        background: colors.background.secondary,
        borderRadius: borderRadius.lg,
      }}>
        <button
          onClick={() => { setMode('search'); setSelectedProfile(null); }}
          style={{
            flex: 1,
            padding: spacing.md,
            background: mode === 'search' ? 'rgba(212,175,55,0.2)' : 'transparent',
            border: mode === 'search' ? `1px solid ${colors.gold.primary}` : '1px solid transparent',
            borderRadius: borderRadius.md,
            color: mode === 'search' ? colors.gold.primary : colors.text.secondary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          <Search size={16} />
          Select Existing User
        </button>
        <button
          onClick={() => { setMode('manual'); setSelectedProfile(null); }}
          style={{
            flex: 1,
            padding: spacing.md,
            background: mode === 'manual' ? 'rgba(212,175,55,0.2)' : 'transparent',
            border: mode === 'manual' ? `1px solid ${colors.gold.primary}` : '1px solid transparent',
            borderRadius: borderRadius.md,
            color: mode === 'manual' ? colors.gold.primary : colors.text.secondary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          <UserPlus size={16} />
          Enter Manually
        </button>
      </div>

      {mode === 'search' ? (
        <>
          {/* Search Input */}
          <div style={{
            position: 'relative',
            marginBottom: spacing.lg,
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
              placeholder="Search by name, email, or Instagram..."
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
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Profiles List */}
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
                padding: spacing.xxl,
                color: colors.text.secondary,
              }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginRight: spacing.md }} />
                Loading profiles...
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: spacing.xxl,
                color: colors.text.secondary,
              }}>
                <User size={32} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>{searchQuery ? 'No matching profiles found' : 'No profiles available'}</p>
                <p style={{ fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
                  Try a different search or enter details manually
                </p>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const isSelected = selectedProfile?.id === profile.id;
                const name = getProfileName(profile);

                return (
                  <div
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.lg,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(212,175,55,0.1)' : 'transparent',
                      borderBottom: `1px solid ${colors.border.lighter}`,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Avatar name={name} avatarUrl={profile.avatar_url} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium }}>{name}</p>
                      <p style={{
                        color: colors.text.secondary,
                        fontSize: typography.fontSize.sm,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {profile.email}
                        {profile.instagram && ` • @${profile.instagram.replace('@', '')}`}
                      </p>
                    </div>
                    {profile.city && (
                      <Badge variant="secondary" size="sm">{profile.city}</Badge>
                    )}
                    {isSelected && (
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: borderRadius.full,
                        background: colors.gold.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Check size={14} style={{ color: '#0a0a0f' }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Profile Preview */}
          {selectedProfile && (
            <div style={{
              marginTop: spacing.lg,
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
                  Selected: {getProfileName(selectedProfile)}
                </p>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                  {selectedProfile.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
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
        </>
      ) : (
        /* Manual Entry Form */
        <div>
          <Input
            label="Full Name *"
            value={manualForm.name}
            onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter full name"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
            <Input
              label="Email"
              type="email"
              value={manualForm.email}
              onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
            />
            <Input
              label="Phone"
              type="tel"
              value={manualForm.phone}
              onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
            <Input
              label="Instagram"
              value={manualForm.instagram}
              onChange={(e) => setManualForm(prev => ({ ...prev, instagram: e.target.value }))}
              placeholder="@username"
            />
            <Input
              label="Age"
              type="number"
              value={manualForm.age}
              onChange={(e) => setManualForm(prev => ({ ...prev, age: e.target.value }))}
              placeholder="25"
            />
          </div>

          <Input
            label="City"
            value={manualForm.city}
            onChange={(e) => setManualForm(prev => ({ ...prev, city: e.target.value }))}
            placeholder="New York"
          />

          <Textarea
            label="Bio"
            value={manualForm.bio}
            onChange={(e) => setManualForm(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Brief description..."
            rows={3}
            maxLength={500}
            showCount
          />
        </div>
      )}
    </Modal>
  );
}

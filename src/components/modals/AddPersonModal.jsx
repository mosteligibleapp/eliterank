import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Check, Loader } from 'lucide-react';
import { Modal, Button, Avatar, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

/**
 * Modal for adding nominees or contestants by selecting an existing user profile
 * Reuses the same search pattern as WinnersManager
 */
export default function AddPersonModal({
  isOpen,
  onClose,
  onAdd,
  type = 'nominee', // 'nominee' or 'contestant'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isContestant = type === 'contestant';
  const title = isContestant ? 'Add Contestant' : 'Add Nominee';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedProfile(null);
    }
  }, [isOpen]);

  // Debounced search (same pattern as WinnersManager)
  const searchProfiles = useCallback(async (query) => {
    if (!query.trim() || !supabase) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      const searchTerm = query.toLowerCase().trim();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url, instagram, city')
        .limit(100);

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        return;
      }

      // Client-side filtering
      const filtered = (data || []).filter(p => {
        const email = (p.email || '').toLowerCase();
        const firstName = (p.first_name || '').toLowerCase();
        const lastName = (p.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        const instagram = (p.instagram || '').toLowerCase();

        return (
          email.includes(searchTerm) ||
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm) ||
          instagram.includes(searchTerm)
        );
      }).slice(0, 10);

      setSearchResults(filtered);
    } catch (err) {
      console.error('Error searching profiles:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProfiles(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProfiles]);

  const getProfileName = (profile) => {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return name || profile.email || 'Unknown';
  };

  const handleSubmit = async () => {
    if (!selectedProfile || !onAdd) return;

    setSubmitting(true);
    try {
      await onAdd({
        name: getProfileName(selectedProfile),
        email: selectedProfile.email,
        instagram: selectedProfile.instagram,
        city: selectedProfile.city,
        userId: selectedProfile.id,
        avatarUrl: selectedProfile.avatar_url,
      });
      onClose();
    } catch (err) {
      console.error(`Error adding ${type}:`, err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedProfile || submitting}
            icon={submitting ? Loader : Check}
          >
            {submitting ? 'Adding...' : `Add ${isContestant ? 'Contestant' : 'Nominee'}`}
          </Button>
        </>
      }
    >
      {/* Search Input */}
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

        {/* Search Results Dropdown */}
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
            maxHeight: 250,
            overflow: 'auto',
          }}>
            {searchResults.map(profile => (
              <button
                key={profile.id}
                onClick={() => {
                  setSelectedProfile(profile);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
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
                onMouseEnter={(e) => e.currentTarget.style.background = colors.background.secondary}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar name={getProfileName(profile)} size={40} avatarUrl={profile.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                    {getProfileName(profile)}
                  </p>
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    {profile.email}
                    {profile.instagram && ` • @${profile.instagram.replace('@', '')}`}
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

        {/* No Results */}
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

      {/* Selected Profile */}
      {selectedProfile ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
          background: 'rgba(212,175,55,0.1)',
          border: `1px solid ${colors.gold.primary}`,
          borderRadius: borderRadius.lg,
        }}>
          <Avatar name={getProfileName(selectedProfile)} size={48} avatarUrl={selectedProfile.avatar_url} variant="gold" />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: typography.fontWeight.medium, color: colors.gold.primary }}>
              {getProfileName(selectedProfile)}
            </p>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              {selectedProfile.email}
            </p>
          </div>
          <Badge variant="gold" size="sm">Selected</Badge>
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: spacing.xl,
          color: colors.text.secondary,
        }}>
          <User size={48} style={{ marginBottom: spacing.md, opacity: 0.3 }} />
          <p>Search and select a user profile above</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}

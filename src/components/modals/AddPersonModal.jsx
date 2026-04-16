import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Check, Loader, UserPlus } from 'lucide-react';
import { Modal, Button, Avatar, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

/**
 * Modal for adding nominees or contestants.
 *
 * Two modes:
 *  - "search" — pick an existing platform user by searching profiles.
 *  - "manual" — enter a name + email for someone who isn't on the app yet.
 *    Used by hosts who need to nominate known people directly; the invite
 *    email still goes out via the same send-nomination-invite pipeline.
 */
export default function AddPersonModal({
  isOpen,
  onClose,
  onAdd,
  type = 'nominee', // 'nominee' or 'contestant'
}) {
  const [mode, setMode] = useState('search'); // 'search' | 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualInstagram, setManualInstagram] = useState('');
  const [manualError, setManualError] = useState('');

  const isContestant = type === 'contestant';
  const title = isContestant ? 'Add Contestant' : 'Add Nominee';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('search');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedProfile(null);
      setManualName('');
      setManualEmail('');
      setManualInstagram('');
      setManualError('');
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

  // Normalize instagram input to a bare handle (strip @, URL prefix)
  const normalizeInstagram = (raw) => {
    if (!raw) return '';
    return String(raw)
      .trim()
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/+$/, '')
      .split(/[/?#]/)[0];
  };

  // Very loose email shape check — real validation happens on the server.
  const isEmailish = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const manualValid =
    manualName.trim().length > 0 && isEmailish(manualEmail);

  const canSubmit =
    !submitting &&
    ((mode === 'search' && !!selectedProfile) ||
      (mode === 'manual' && manualValid));

  const handleSubmit = async () => {
    if (!onAdd) return;

    if (mode === 'search') {
      if (!selectedProfile) return;
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
      return;
    }

    // Manual mode
    setManualError('');
    if (!manualValid) {
      setManualError('Name and a valid email are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onAdd({
        name: manualName.trim(),
        email: manualEmail.trim(),
        instagram: normalizeInstagram(manualInstagram) || null,
        city: null,
        userId: null,
        avatarUrl: null,
      });
      onClose();
    } catch (err) {
      console.error(`Error adding ${type}:`, err);
      setManualError(err?.message || `Failed to add ${type}.`);
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
            disabled={!canSubmit}
            icon={submitting ? Loader : Check}
          >
            {submitting ? 'Adding...' : `Add ${isContestant ? 'Contestant' : 'Nominee'}`}
          </Button>
        </>
      }
    >
      {/* Mode tabs — switch between searching existing users and entering a
          new person manually. Manual is the escape hatch for hosts who need
          to nominate someone not yet on the platform. */}
      <div style={{
        display: 'flex',
        gap: spacing.xs,
        padding: spacing.xs,
        marginBottom: spacing.lg,
        background: colors.background.secondary,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.lg,
      }}>
        {[
          { id: 'search', label: 'Search existing', icon: Search },
          { id: 'manual', label: 'Enter manually', icon: UserPlus },
        ].map(tab => {
          const TabIcon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                padding: `${spacing.sm} ${spacing.md}`,
                background: active ? colors.background.card : 'transparent',
                border: 'none',
                borderRadius: borderRadius.md,
                color: active ? colors.gold.primary : colors.text.secondary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              <TabIcon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {mode === 'manual' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <ManualField
            label="Full name"
            value={manualName}
            onChange={setManualName}
            placeholder="Jane Doe"
            required
          />
          <ManualField
            label="Email"
            value={manualEmail}
            onChange={setManualEmail}
            placeholder="jane@example.com"
            type="email"
            required
          />
          <ManualField
            label="Instagram (optional)"
            value={manualInstagram}
            onChange={setManualInstagram}
            placeholder="@janedoe"
          />
          {manualError && (
            <p style={{
              color: colors.status.error,
              fontSize: typography.fontSize.sm,
              margin: 0,
            }}>
              {manualError}
            </p>
          )}
          <p style={{
            color: colors.text.muted,
            fontSize: typography.fontSize.xs,
            margin: 0,
          }}>
            An invitation email will be sent automatically so they can claim their spot.
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (<>

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
      </>)}
    </Modal>
  );
}

// Small controlled input used by the "Enter manually" form.
function ManualField({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <span style={{
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.secondary,
      }}>
        {label}{required && <span style={{ color: colors.status.error }}> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: spacing.md,
          background: colors.background.secondary,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.lg,
          color: colors.text.primary,
          fontSize: typography.fontSize.md,
          outline: 'none',
        }}
      />
    </label>
  );
}

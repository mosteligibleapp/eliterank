import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Check, X, Loader } from 'lucide-react';
import { Modal, Button, Avatar, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

export default function HostAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  currentHostId,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Fetch profiles on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, avatar_url, is_host')
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

  const handleAssign = async () => {
    if (!selectedProfile || !onAssign) return;

    setAssigning(true);
    try {
      await onAssign(selectedProfile.id);
      onClose();
    } catch (err) {
      console.error('Error assigning host:', err);
    } finally {
      setAssigning(false);
    }
  };

  const getProfileName = (profile) => {
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return name || profile.email || 'Unknown';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Host"
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProfile || assigning}
            icon={assigning ? Loader : Check}
          >
            {assigning ? 'Assigning...' : 'Assign Host'}
          </Button>
        </>
      }
    >
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
          placeholder="Search by name or email..."
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
        maxHeight: '400px',
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
            <p>No profiles found</p>
          </div>
        ) : (
          filteredProfiles.map((profile) => {
            const isSelected = selectedProfile?.id === profile.id;
            const isCurrentHost = profile.id === currentHostId;
            const name = getProfileName(profile);

            return (
              <div
                key={profile.id}
                onClick={() => !isCurrentHost && setSelectedProfile(profile)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  cursor: isCurrentHost ? 'not-allowed' : 'pointer',
                  background: isSelected ? 'rgba(212,175,55,0.1)' : 'transparent',
                  borderBottom: `1px solid ${colors.border.lighter}`,
                  opacity: isCurrentHost ? 0.5 : 1,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentHost && !isSelected) {
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
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: typography.fontWeight.medium }}>{name}</p>
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    {profile.email}
                  </p>
                </div>
                {isCurrentHost && (
                  <Badge variant="gold" size="sm">Current Host</Badge>
                )}
                {profile.is_host && !isCurrentHost && (
                  <Badge variant="secondary" size="sm">Host</Badge>
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
    </Modal>
  );
}

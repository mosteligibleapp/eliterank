import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Plus, Edit2, Trash2, X, Upload, Loader, ExternalLink,
  Crown, ChevronRight, Image as ImageIcon
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { generateSlug } from '../../../types/competition';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

export default function OrganizationsManager() {
  const toast = useToast();
  const fileInputRef = useRef(null);

  // State
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [expandedOrg, setExpandedOrg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
  });

  // Fetch organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      // Fetch organizations with their competition counts
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          competitions:competitions(count)
        `)
        .order('name');

      if (error) throw error;

      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch competitions for an organization
  const fetchOrgCompetitions = async (orgId) => {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          id,
          season,
          status,
          cities:city_id(name, state)
        `)
        .eq('organization_id', orgId)
        .order('season', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching org competitions:', err);
      return [];
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file) => {
    if (!file || !supabase) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `org-logos/${timestamp}.${ext}`;

      // Try uploading to common bucket names
      const bucketNames = ['public', 'images', 'assets', 'uploads'];
      let uploadSuccess = false;
      let publicUrl = '';

      for (const bucketName of bucketNames) {
        try {
          const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filename, file, { upsert: true });

          if (!error) {
            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filename);
            publicUrl = urlData.publicUrl;
            uploadSuccess = true;
            break;
          }
        } catch (e) {
          // Try next bucket
          continue;
        }
      }

      if (!uploadSuccess) {
        // Storage failed - inform user but don't block
        toast.warning('Logo upload failed. You can create the organization without a logo.');
        return;
      }

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo uploaded successfully');
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.warning('Logo upload failed. You can create the organization without a logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Create organization
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(formData.name);

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: formData.name.trim(),
          slug,
          description: formData.description.trim(),
          logo_url: formData.logo_url,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('An organization with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Organization "${data.name}" created successfully`);
      setShowCreateModal(false);
      resetForm();
      fetchOrganizations();
    } catch (err) {
      console.error('Error creating organization:', err);
      toast.error('Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update organization
  const handleUpdate = async () => {
    if (!selectedOrg || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim(),
          logo_url: formData.logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast.success('Organization updated successfully');
      setShowEditModal(false);
      setSelectedOrg(null);
      resetForm();
      fetchOrganizations();
    } catch (err) {
      console.error('Error updating organization:', err);
      toast.error('Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete organization
  const handleDelete = async () => {
    if (!selectedOrg) return;

    setIsSubmitting(true);
    try {
      // Check if org has competitions
      const { data: competitions } = await supabase
        .from('competitions')
        .select('id')
        .eq('organization_id', selectedOrg.id)
        .limit(1);

      if (competitions && competitions.length > 0) {
        toast.error('Cannot delete organization with existing competitions');
        return;
      }

      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast.success('Organization deleted successfully');
      setShowDeleteModal(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (err) {
      console.error('Error deleting organization:', err);
      toast.error('Failed to delete organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      logo_url: '',
    });
  };

  // Open edit modal
  const openEditModal = (org) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      description: org.description || '',
      logo_url: org.logo_url || '',
    });
    setShowEditModal(true);
  };

  // Toggle expanded org to show competitions
  const toggleExpandOrg = async (orgId) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null);
    } else {
      setExpandedOrg(orgId);
      // Fetch competitions for this org
      const competitions = await fetchOrgCompetitions(orgId);
      setOrganizations(prev =>
        prev.map(org =>
          org.id === orgId ? { ...org, competitionsList: competitions } : org
        )
      );
    }
  };

  // Styles
  const cardStyle = {
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  };

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing.xl,
  };

  const modalStyle = {
    background: colors.background.card,
    borderRadius: borderRadius.xxl,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    border: `1px solid ${colors.border.light}`,
  };

  const inputStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: '#fff',
    fontSize: typography.fontSize.md,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
        <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading organizations...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <div>
          <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Organizations
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            Manage organizations and their competitions
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          New Organization
        </Button>
      </div>

      {/* Organizations List */}
      {organizations.length === 0 ? (
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: spacing.xxxl,
        }}>
          <Building2 size={48} style={{ color: colors.text.muted, marginBottom: spacing.md }} />
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No Organizations Yet</h3>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
            Create your first organization to get started
          </p>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Organization
          </Button>
        </div>
      ) : (
        organizations.map(org => (
          <div key={org.id} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
              {/* Logo */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: borderRadius.lg,
                background: colors.background.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Building2 size={28} style={{ color: colors.text.muted }} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                  {org.name}
                </h3>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
                  {org.description || 'No description'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    /org/{org.slug}
                  </span>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.gold.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                  }}>
                    <Crown size={12} />
                    {org.competitions?.[0]?.count || 0} competitions
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleExpandOrg(org.id)}
                  style={{ padding: spacing.sm }}
                >
                  <ChevronRight
                    size={16}
                    style={{
                      transform: expandedOrg === org.id ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit2}
                  onClick={() => openEditModal(org)}
                  style={{ padding: spacing.sm }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Trash2}
                  onClick={() => {
                    setSelectedOrg(org);
                    setShowDeleteModal(true);
                  }}
                  style={{ padding: spacing.sm }}
                />
              </div>
            </div>

            {/* Expanded Competitions List */}
            {expandedOrg === org.id && (
              <div style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTop: `1px solid ${colors.border.light}`,
              }}>
                <h4 style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md }}>
                  Competitions
                </h4>
                {org.competitionsList?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    {org.competitionsList.map(comp => (
                      <div
                        key={comp.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: spacing.md,
                          background: colors.background.secondary,
                          borderRadius: borderRadius.md,
                        }}
                      >
                        <span>
                          {comp.cities?.name}, {comp.cities?.state} - {comp.season}
                        </span>
                        <span style={{
                          fontSize: typography.fontSize.xs,
                          padding: `${spacing.xs} ${spacing.sm}`,
                          background: 'rgba(212,175,55,0.2)',
                          color: colors.gold.primary,
                          borderRadius: borderRadius.pill,
                        }}>
                          {comp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                    No competitions yet
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Create Organization
              </h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: spacing.xl }}>
              {/* Logo Upload */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Organization Logo</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: borderRadius.xl,
                    border: `2px dashed ${colors.border.light}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: formData.logo_url ? 'transparent' : colors.background.secondary,
                  }}
                >
                  {uploadingLogo ? (
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
                  ) : formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Logo preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      <Upload size={24} style={{ color: colors.text.muted, marginBottom: spacing.xs }} />
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        Upload Logo
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Name */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Organization Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Most Eligible"
                  style={inputStyle}
                />
                {formData.name && (
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                    URL: /org/{generateSlug(formData.name)}
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: spacing.xl }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the organization"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !formData.name.trim()}
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Organization'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOrg && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Edit Organization
              </h3>
              <button
                onClick={() => { setShowEditModal(false); setSelectedOrg(null); resetForm(); }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: spacing.xl }}>
              {/* Logo Upload */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Organization Logo</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: borderRadius.xl,
                    border: `2px dashed ${colors.border.light}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: formData.logo_url ? 'transparent' : colors.background.secondary,
                  }}
                >
                  {uploadingLogo ? (
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
                  ) : formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Logo preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      <Upload size={24} style={{ color: colors.text.muted, marginBottom: spacing.xs }} />
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        Upload Logo
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Name */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Organization Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Most Eligible"
                  style={inputStyle}
                />
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                  URL: /org/{selectedOrg.slug} (cannot be changed)
                </p>
              </div>

              {/* Description */}
              <div style={{ marginBottom: spacing.xl }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the organization"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={() => { setShowEditModal(false); setSelectedOrg(null); resetForm(); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={isSubmitting || !formData.name.trim()}
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOrg && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteModal(false)}>
          <div style={{ ...modalStyle, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: spacing.xl, textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: spacing.lg,
              }}>
                <Trash2 size={28} style={{ color: colors.status.error }} />
              </div>

              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
                Delete Organization?
              </h3>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
                Are you sure you want to delete "{selectedOrg.name}"? This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={() => { setShowDeleteModal(false); setSelectedOrg(null); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    background: colors.status.error,
                  }}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

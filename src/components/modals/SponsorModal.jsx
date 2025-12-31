import React, { useMemo, useState, useRef } from 'react';
import { Check, Upload, X, Loader, Image as ImageIcon } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { SPONSOR_TIERS } from '../../constants';
import { useModalForm } from '../../hooks';

const INITIAL_STATE = { name: '', tier: 'Gold', amount: '', logoUrl: '', website: '' };

export default function SponsorModal({
  isOpen,
  onClose,
  sponsor,
  onSave,
}) {
  // Transform sponsor data for form (amount as string)
  const sponsorData = useMemo(() => {
    if (!sponsor) return null;
    return { ...sponsor, amount: sponsor.amount?.toString() || '' };
  }, [sponsor]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, sponsorData, isOpen);
  const isEditing = !!sponsor;

  // Logo upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 4.5MB for Vercel Blob free tier)
    const maxSize = 4.5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image too large. Please choose an image under 4.5MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `sponsors/${timestamp}.${ext}`;

      const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        body: file,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      updateField('logoUrl', data.url);
    } catch (error) {
      alert(`Upload failed: ${error.message}. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    updateField('logoUrl', '');
  };

  const handleSave = () => {
    const data = getFormData();
    onSave({
      name: data.name,
      tier: data.tier,
      amount: parseInt(data.amount, 10) || 0,
      logoUrl: data.logoUrl,
      websiteUrl: data.website,
    });
  };

  const tierButtonStyle = (tier, isSelected) => ({
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    border: 'none',
    background: isSelected
      ? tier === 'Platinum'
        ? 'rgba(200,200,200,0.3)'
        : tier === 'Gold'
          ? 'rgba(212,175,55,0.3)'
          : 'rgba(139,92,246,0.3)'
      : 'rgba(255,255,255,0.05)',
    color: isSelected
      ? tier === 'Platinum'
        ? colors.tier.platinum
        : tier === 'Gold'
          ? colors.tier.gold
          : colors.tier.silver
      : colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Sponsor' : 'Add Sponsor'}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.name || !form.amount}
          >
            {isEditing ? 'Save Changes' : 'Add Sponsor'}
          </Button>
        </>
      }
    >
      {/* Logo Upload */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{
          display: 'block',
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
          marginBottom: spacing.sm,
        }}>
          Company Logo
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          style={{ display: 'none' }}
        />

        {form.logoUrl ? (
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            border: `1px solid ${colors.border.light}`,
            background: '#fff',
          }}>
            <img
              src={form.logoUrl}
              alt="Logo preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: spacing.sm,
              }}
            />
            <button
              onClick={handleRemoveLogo}
              style={{
                position: 'absolute',
                top: spacing.xs,
                right: spacing.xs,
                width: '24px',
                height: '24px',
                background: 'rgba(0,0,0,0.7)',
                border: 'none',
                borderRadius: borderRadius.full,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '120px',
              height: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              background: 'rgba(255,255,255,0.03)',
              border: `2px dashed ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              cursor: uploading ? 'wait' : 'pointer',
              color: colors.text.secondary,
            }}
          >
            {uploading ? (
              <>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: typography.fontSize.sm }}>Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon size={24} />
                <span style={{ fontSize: typography.fontSize.sm }}>Upload Logo</span>
              </>
            )}
          </button>
        )}

        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          marginTop: spacing.sm,
        }}>
          Recommended: Square image, PNG or JPG, max 4.5MB
        </p>
      </div>

      <Input
        label="Company Name"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., Luxe Hotels"
      />

      <div style={{ marginBottom: spacing.lg }}>
        <label style={{ display: 'block', fontSize: typography.fontSize.base, color: colors.text.secondary, marginBottom: spacing.sm }}>
          Sponsorship Tier
        </label>
        <div style={{ display: 'flex', gap: spacing.md }}>
          {SPONSOR_TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => updateField('tier', tier)}
              style={tierButtonStyle(tier, form.tier === tier)}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Sponsorship Amount ($)"
        type="number"
        value={form.amount}
        onChange={(e) => updateField('amount', e.target.value)}
        placeholder="e.g., 25000"
      />

      <Input
        label="Website URL (Optional)"
        value={form.website || ''}
        onChange={(e) => updateField('website', e.target.value)}
        placeholder="e.g., https://example.com"
      />

      {/* Spin animation for loader */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}

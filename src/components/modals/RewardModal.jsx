import React, { useMemo, useRef, useState } from 'react';
import { Check, Upload, Camera, Loader, X, Trophy, Users, Link2 } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useModalForm } from '../../hooks';

const INITIAL_STATE = {
  name: '',
  brandName: '',
  brandLogoUrl: '',
  description: '',
  imageUrl: '',
  productUrl: '',
  terms: '',
  commissionRate: '',
  cashValue: '',
  requiresPromotion: true,
  claimDeadlineDays: '7',
  status: 'active',
  rewardType: 'all_nominees',
  isAffiliate: false,
};

const REWARD_TYPE_OPTIONS = [
  { value: 'all_nominees', label: 'All Nominees', icon: Users, description: 'Available to all nominees in the competition' },
  { value: 'winners_only', label: 'Winners Only', icon: Trophy, description: 'Exclusive prize for competition winners' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#22c55e' },
  { value: 'paused', label: 'Paused', color: '#eab308' },
  { value: 'archived', label: 'Archived', color: '#6b7280' },
];

export default function RewardModal({
  isOpen,
  onClose,
  reward,
  onSave,
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Transform reward data for form
  const rewardData = useMemo(() => {
    if (!reward) return null;
    return {
      name: reward.name || '',
      brandName: reward.brand_name || '',
      brandLogoUrl: reward.brand_logo_url || '',
      description: reward.description || '',
      imageUrl: reward.image_url || '',
      productUrl: reward.product_url || '',
      terms: reward.terms || '',
      commissionRate: reward.commission_rate?.toString() || '',
      cashValue: reward.cash_value?.toString() || '',
      requiresPromotion: reward.requires_promotion ?? true,
      claimDeadlineDays: reward.claim_deadline_days?.toString() || '7',
      status: reward.status || 'active',
      rewardType: reward.reward_type || 'all_nominees',
      isAffiliate: reward.is_affiliate ?? false,
    };
  }, [reward]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, rewardData, isOpen);
  const isEditing = !!reward;

  // Upload image to Vercel Blob
  const uploadImage = async (file) => {
    if (!file) return null;

    // Validate file size (max 4.5MB for Vercel Blob free tier)
    const maxSize = 4.5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image too large. Please choose an image under 4.5MB.');
      return null;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return null;
    }

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filename = `rewards/${timestamp}.${ext}`;

      const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        body: file,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.url;
    } catch (error) {
      alert(`Upload failed: ${error.message}. Please try again.`);
      return null;
    }
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadImage(file);
    if (url) {
      updateField('imageUrl', url);
    }
    setUploading(false);
  };

  // Clear uploaded image
  const handleClearImage = () => {
    updateField('imageUrl', '');
  };

  const handleSave = () => {
    const data = getFormData();
    onSave({
      ...data,
      commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : null,
      cashValue: data.cashValue ? parseFloat(data.cashValue) : null,
      claimDeadlineDays: parseInt(data.claimDeadlineDays, 10) || 7,
    });
  };

  const inputStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Reward' : 'Create Reward'}
      maxWidth="600px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.name || !form.brandName}
          >
            {isEditing ? 'Save Changes' : 'Create Reward'}
          </Button>
        </>
      }
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Basic Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
          <Input
            label="Reward Name *"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Self-Tanning Kit"
          />
          <Input
            label="Brand Name *"
            value={form.brandName}
            onChange={(e) => updateField('brandName', e.target.value)}
            placeholder="e.g., L.A. TAN"
          />
        </div>

        {/* Reward Type */}
        <div>
          <label style={labelStyle}>Who is this for?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm }}>
            {REWARD_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = form.rewardType === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => updateField('rewardType', option.value)}
                  style={{
                    padding: spacing.md,
                    borderRadius: borderRadius.lg,
                    border: `2px solid ${isActive ? colors.gold.primary : colors.border.light}`,
                    background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}
                >
                  <Icon size={20} style={{ color: isActive ? colors.gold.primary : colors.text.muted, flexShrink: 0 }} />
                  <div>
                    <p style={{
                      fontWeight: typography.fontWeight.medium,
                      fontSize: typography.fontSize.sm,
                      color: isActive ? colors.gold.primary : colors.text.primary,
                    }}>
                      {option.label}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Affiliate Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          background: form.isAffiliate ? 'rgba(212,175,55,0.05)' : 'transparent',
          border: `1px solid ${form.isAffiliate ? 'rgba(212,175,55,0.2)' : colors.border.light}`,
          borderRadius: borderRadius.lg,
        }}>
          <button
            onClick={() => updateField('isAffiliate', !form.isAffiliate)}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: '14px',
              background: form.isAffiliate ? colors.gold.primary : colors.background.secondary,
              border: `1px solid ${form.isAffiliate ? colors.gold.primary : colors.border.light}`,
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: form.isAffiliate ? '23px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
          <div>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
              Affiliate Program
            </p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              Includes commission tracking and promotion requirements
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe the reward and what recipients receive..."
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Product Image Upload */}
        <div>
          <label style={labelStyle}>Product Image</label>
          <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
            {/* Image Preview / Upload Area */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: borderRadius.lg,
                background: form.imageUrl
                  ? `url(${form.imageUrl}) center/cover`
                  : colors.background.secondary,
                border: `2px dashed ${colors.border.light}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {uploading ? (
                <>
                  <Loader size={24} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }}>
                    Uploading...
                  </span>
                </>
              ) : form.imageUrl ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearImage();
                  }}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '24px',
                    height: '24px',
                    background: 'rgba(239, 68, 68, 0.9)',
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
              ) : (
                <>
                  <Camera size={24} style={{ color: colors.text.secondary }} />
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs }}>
                    Upload
                  </span>
                </>
              )}
            </div>

            {/* URL Input as alternative */}
            <div style={{ flex: 1 }}>
              <Input
                label="Or enter image URL"
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                placeholder="https://..."
              />
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Click the box to upload or paste a URL
              </p>
            </div>
          </div>
        </div>

        {/* Cash Value & Product URL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
          <Input
            label="Cash Value ($)"
            type="number"
            value={form.cashValue}
            onChange={(e) => updateField('cashValue', e.target.value)}
            placeholder="e.g., 149"
          />
          <Input
            label="Product Page URL"
            value={form.productUrl}
            onChange={(e) => updateField('productUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <Input
          label="Brand Logo URL"
          value={form.brandLogoUrl}
          onChange={(e) => updateField('brandLogoUrl', e.target.value)}
          placeholder="https://..."
        />

        {/* Days to Claim */}
        <Input
          label="Days to Claim"
          type="number"
          value={form.claimDeadlineDays}
          onChange={(e) => updateField('claimDeadlineDays', e.target.value)}
          placeholder="7"
        />

        {/* Affiliate-specific fields */}
        {form.isAffiliate && (
          <>
            {/* Terms */}
            <div>
              <label style={labelStyle}>Promotion Terms & Requirements</label>
              <textarea
                value={form.terms}
                onChange={(e) => updateField('terms', e.target.value)}
                placeholder="Describe what recipients must do to remain compliant (e.g., post 1 video per week mentioning the product)..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Commission Rate */}
            <Input
              label="Commission Rate (%)"
              type="number"
              value={form.commissionRate}
              onChange={(e) => updateField('commissionRate', e.target.value)}
              placeholder="e.g., 20"
            />

            {/* Requires Promotion Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <button
                onClick={() => updateField('requiresPromotion', !form.requiresPromotion)}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  background: form.requiresPromotion ? colors.gold.primary : colors.background.secondary,
                  border: `1px solid ${form.requiresPromotion ? colors.gold.primary : colors.border.light}`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '3px',
                  left: form.requiresPromotion ? '23px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                Requires social media promotion
              </span>
            </div>
          </>
        )}

        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateField('status', option.value)}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                  border: 'none',
                  background: form.status === option.value
                    ? `${option.color}20`
                    : colors.background.secondary,
                  color: form.status === option.value ? option.color : colors.text.secondary,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}

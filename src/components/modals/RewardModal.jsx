import React, { useMemo } from 'react';
import { Check, Upload } from 'lucide-react';
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
  requiresPromotion: true,
  claimDeadlineDays: '7',
  status: 'active',
};

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
      requiresPromotion: reward.requires_promotion ?? true,
      claimDeadlineDays: reward.claim_deadline_days?.toString() || '7',
      status: reward.status || 'active',
    };
  }, [reward]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, rewardData, isOpen);
  const isEditing = !!reward;

  const handleSave = () => {
    const data = getFormData();
    onSave({
      ...data,
      commissionRate: data.commissionRate ? parseFloat(data.commissionRate) : null,
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

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe the reward and what contestants receive..."
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* URLs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
          <Input
            label="Product Image URL"
            value={form.imageUrl}
            onChange={(e) => updateField('imageUrl', e.target.value)}
            placeholder="https://..."
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

        {/* Terms */}
        <div>
          <label style={labelStyle}>Promotion Terms & Requirements</label>
          <textarea
            value={form.terms}
            onChange={(e) => updateField('terms', e.target.value)}
            placeholder="Describe what contestants must do to remain compliant (e.g., post 1 video per week mentioning the product)..."
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Commission & Deadline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
          <Input
            label="Commission Rate (%)"
            type="number"
            value={form.commissionRate}
            onChange={(e) => updateField('commissionRate', e.target.value)}
            placeholder="e.g., 20"
          />
          <Input
            label="Days to Claim"
            type="number"
            value={form.claimDeadlineDays}
            onChange={(e) => updateField('claimDeadlineDays', e.target.value)}
            placeholder="7"
          />
        </div>

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
    </Modal>
  );
}

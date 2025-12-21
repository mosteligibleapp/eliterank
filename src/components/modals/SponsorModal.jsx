import React, { useState, useEffect } from 'react';
import { Check, Image, Link, Upload } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { SPONSOR_TIERS } from '../../constants';

export default function SponsorModal({
  isOpen,
  onClose,
  sponsor,
  onSave,
}) {
  const [form, setForm] = useState({
    name: '',
    tier: 'Gold',
    amount: '',
    logoUrl: '',
    websiteUrl: '',
  });
  const isEditing = !!sponsor;

  useEffect(() => {
    if (sponsor) {
      setForm({
        name: sponsor.name || '',
        tier: sponsor.tier || 'Gold',
        amount: sponsor.amount?.toString() || '',
        logoUrl: sponsor.logoUrl || '',
        websiteUrl: sponsor.websiteUrl || '',
      });
    } else {
      setForm({ name: '', tier: 'Gold', amount: '', logoUrl: '', websiteUrl: '' });
    }
  }, [sponsor, isOpen]);

  const handleSave = () => {
    onSave({
      ...form,
      amount: parseInt(form.amount, 10) || 0,
    });
    setForm({ name: '', tier: 'Gold', amount: '', logoUrl: '', websiteUrl: '' });
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
      <Input
        label="Company Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              onClick={() => setForm({ ...form, tier })}
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
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        placeholder="e.g., 25000"
      />

      {/* Logo URL Section */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
          marginBottom: spacing.sm
        }}>
          <Image size={14} /> Company Logo URL
        </label>
        <Input
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          placeholder="https://example.com/logo.png"
          style={{ marginBottom: 0 }}
        />
        {form.logoUrl && (
          <div style={{
            marginTop: spacing.md,
            padding: spacing.md,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
          }}>
            <div style={{
              width: '60px',
              height: '40px',
              background: '#fff',
              borderRadius: borderRadius.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={form.logoUrl}
                alt="Logo preview"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Logo Preview
            </span>
          </div>
        )}
      </div>

      {/* Website URL */}
      <div style={{ marginBottom: spacing.lg }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
          marginBottom: spacing.sm
        }}>
          <Link size={14} /> Website URL
        </label>
        <Input
          value={form.websiteUrl}
          onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
          placeholder="https://example.com"
          style={{ marginBottom: 0 }}
        />
        <p style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.muted,
          marginTop: spacing.xs
        }}>
          This link will be displayed on the public site
        </p>
      </div>
    </Modal>
  );
}

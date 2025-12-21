import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { SPONSOR_TIERS } from '../../constants';

export default function SponsorModal({
  isOpen,
  onClose,
  sponsor,
  onSave,
}) {
  const [form, setForm] = useState({ name: '', tier: 'Gold', amount: '' });
  const isEditing = !!sponsor;

  useEffect(() => {
    if (sponsor) {
      setForm({
        name: sponsor.name || '',
        tier: sponsor.tier || 'Gold',
        amount: sponsor.amount?.toString() || '',
      });
    } else {
      setForm({ name: '', tier: 'Gold', amount: '' });
    }
  }, [sponsor, isOpen]);

  const handleSave = () => {
    onSave({
      ...form,
      amount: parseInt(form.amount, 10) || 0,
    });
    setForm({ name: '', tier: 'Gold', amount: '' });
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
      maxWidth="450px"
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
    </Modal>
  );
}

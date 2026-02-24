import React, { useState, useEffect } from 'react';
import { Check, MapPin, FileText, ChevronRight, Loader, AlertTriangle, Package } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

const STEPS = {
  ADDRESS: 'address',
  CONFIRM: 'confirm',
};

export default function ClaimRewardModal({
  isOpen,
  onClose,
  assignment,
  userId,
  onClaimed,
}) {
  const reward = assignment?.reward;
  const isAffiliate = reward?.is_affiliate;

  const [step, setStep] = useState(STEPS.ADDRESS);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [hasExistingAddress, setHasExistingAddress] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Address fields
  const [address, setAddress] = useState({
    street: '',
    apt: '',
    city: '',
    state: '',
    zip: '',
  });

  // Load existing shipping address from profile
  useEffect(() => {
    if (!isOpen || !userId) return;

    setStep(STEPS.ADDRESS);
    setTermsAccepted(false);
    setClaiming(false);

    const loadAddress = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('shipping_address')
          .eq('id', userId)
          .single();

        if (data?.shipping_address) {
          setAddress({
            street: data.shipping_address.street || '',
            apt: data.shipping_address.apt || '',
            city: data.shipping_address.city || '',
            state: data.shipping_address.state || '',
            zip: data.shipping_address.zip || '',
          });
          setHasExistingAddress(true);
        } else {
          setAddress({ street: '', apt: '', city: '', state: '', zip: '' });
          setHasExistingAddress(false);
        }
      } catch (err) {
        console.error('Error loading address:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAddress();
  }, [isOpen, userId]);

  const isAddressComplete = address.street && address.city && address.state && address.zip;

  const handleClaim = async () => {
    if (!supabase || !assignment) return;

    setClaiming(true);
    try {
      // Save shipping address to profile for future use
      await supabase
        .from('profiles')
        .update({ shipping_address: address })
        .eq('id', userId);

      // Update the assignment with claimed status and shipping address
      const { error } = await supabase
        .from('reward_assignments')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          shipping_address: address,
        })
        .eq('id', assignment.id);

      if (error) throw error;
      onClaimed?.();
      onClose();
    } catch (err) {
      console.error('Error claiming reward:', err);
      alert('Failed to claim reward. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!assignment || !reward) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === STEPS.ADDRESS ? 'Shipping Address' : 'Confirm Claim'}
      maxWidth="500px"
      footer={
        step === STEPS.ADDRESS ? (
          <>
            <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
              Cancel
            </Button>
            <Button
              onClick={() => setStep(STEPS.CONFIRM)}
              disabled={!isAddressComplete}
              icon={ChevronRight}
            >
              {hasExistingAddress ? 'Confirm Address' : 'Continue'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep(STEPS.ADDRESS)} style={{ width: 'auto' }}>
              Back
            </Button>
            <Button
              onClick={handleClaim}
              disabled={claiming || (isAffiliate && reward?.terms && !termsAccepted)}
              icon={claiming ? Loader : Check}
              style={{ background: '#22c55e', borderColor: '#22c55e' }}
            >
              {claiming ? 'Claiming...' : 'Claim Reward'}
            </Button>
          </>
        )
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxl }}>
          <Loader size={24} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
        </div>
      ) : step === STEPS.ADDRESS ? (
        <div>
          {/* Reward Summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: borderRadius.md,
              background: reward.image_url
                ? `url(${reward.image_url}) center/cover`
                : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {!reward.image_url && <Package size={20} style={{ color: colors.gold.primary, opacity: 0.5 }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                {reward.name}
              </p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary }}>
                {reward.brand_name}
              </p>
            </div>
          </div>

          {/* Address on file notice */}
          {hasExistingAddress && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: borderRadius.lg,
              marginBottom: spacing.lg,
            }}>
              <MapPin size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <p style={{ fontSize: typography.fontSize.sm, color: '#22c55e' }}>
                We have a shipping address on file. Please confirm or update it below.
              </p>
            </div>
          )}

          {/* Address Form — uses site-wide Input component */}
          <Input
            label="Street Address *"
            value={address.street}
            onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
            placeholder="123 Main St"
          />

          <Input
            label="Apt / Suite / Unit"
            value={address.apt}
            onChange={(e) => setAddress(prev => ({ ...prev, apt: e.target.value }))}
            placeholder="Apt 4B (optional)"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: spacing.md }}>
            <Input
              label="City *"
              value={address.city}
              onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Miami"
            />
            <Input
              label="State *"
              value={address.state}
              onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="FL"
              maxLength={2}
            />
            <Input
              label="ZIP *"
              value={address.zip}
              onChange={(e) => setAddress(prev => ({ ...prev, zip: e.target.value.slice(0, 10) }))}
              placeholder="33101"
            />
          </div>
        </div>
      ) : (
        /* Step 2: Review & Confirm */
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Reward Summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            background: colors.background.secondary,
            borderRadius: borderRadius.lg,
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: borderRadius.md,
              background: reward.image_url
                ? `url(${reward.image_url}) center/cover`
                : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {!reward.image_url && <Package size={20} style={{ color: colors.gold.primary, opacity: 0.5 }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                {reward.name}
              </p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary }}>
                {reward.brand_name}
                {reward.cash_value && <span style={{ color: '#22c55e' }}> — ${reward.cash_value} value</span>}
              </p>
            </div>
          </div>

          {/* Shipping Address Confirmation */}
          <div style={{
            padding: spacing.md,
            background: colors.background.secondary,
            borderRadius: borderRadius.lg,
            border: `1px solid ${colors.border.light}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <MapPin size={16} style={{ color: colors.gold.primary }} />
              <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                Ships to
              </p>
            </div>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6 }}>
              {address.street}{address.apt ? `, ${address.apt}` : ''}<br />
              {address.city}, {address.state} {address.zip}
            </p>
          </div>

          {/* Promotion Terms (affiliate rewards only) */}
          {isAffiliate && reward.terms && (
            <div style={{
              padding: spacing.md,
              background: 'rgba(234,179,8,0.08)',
              borderRadius: borderRadius.lg,
              border: '1px solid rgba(234,179,8,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <FileText size={16} style={{ color: '#eab308' }} />
                <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: '#eab308' }}>
                  Promotion Requirements
                </p>
              </div>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6, marginBottom: spacing.md }}>
                {reward.terms}
              </p>

              {reward.commission_rate && (
                <p style={{ fontSize: typography.fontSize.sm, color: '#a78bfa', marginBottom: spacing.md }}>
                  You'll earn <strong>{reward.commission_rate}%</strong> commission on referral sales.
                </p>
              )}

              {/* Accept Terms Checkbox */}
              <button
                onClick={() => setTermsAccepted(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing.sm,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: borderRadius.sm,
                  border: `2px solid ${termsAccepted ? colors.gold.primary : colors.border.light}`,
                  background: termsAccepted ? colors.gold.primary : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                  transition: 'all 0.2s',
                }}>
                  {termsAccepted && <Check size={14} style={{ color: '#000' }} />}
                </div>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  I understand and agree to the promotion requirements above
                </span>
              </button>
            </div>
          )}

          {/* Non-affiliate: simple confirmation */}
          {!isAffiliate && (
            <div style={{
              padding: spacing.md,
              background: 'rgba(34,197,94,0.08)',
              borderRadius: borderRadius.lg,
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <Check size={16} style={{ color: '#22c55e' }} />
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  This reward will be shipped to your address above. No promotion requirements.
                </p>
              </div>
            </div>
          )}

          {/* Warning */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm }}>
            <AlertTriangle size={14} style={{ color: colors.text.muted, flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 1.5 }}>
              By claiming, you confirm your shipping address is correct and you are ready to receive this reward.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}

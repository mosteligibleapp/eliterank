import React, { useState, useEffect } from 'react';
import { Check, MapPin, FileText, ChevronRight, Loader, Package } from 'lucide-react';
import { Modal } from '../ui';
import { colors, spacing, borderRadius, typography, gradients, shadows } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

const STEPS = {
  ADDRESS: 'address',
  CONFIRM: 'confirm',
};

// Login-style input (compact, matches auth form)
const inputStyle = {
  width: '100%',
  padding: `${spacing.md} ${spacing.lg}`,
  background: colors.background.secondary,
  border: `1px solid ${colors.border.primary}`,
  borderRadius: borderRadius.lg,
  color: colors.text.primary,
  fontSize: typography.fontSize.md,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  color: colors.text.secondary,
  marginBottom: '6px',
};

const fieldStyle = {
  marginBottom: '14px',
};

const primaryBtnStyle = {
  width: '100%',
  padding: spacing.lg,
  background: gradients.gold,
  border: 'none',
  borderRadius: borderRadius.lg,
  color: '#0a0a0f',
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.semibold,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.sm,
  boxShadow: shadows.gold,
  transition: 'all 0.2s ease',
  marginTop: spacing.lg,
  fontFamily: 'inherit',
};

const secondaryBtnStyle = {
  width: '100%',
  padding: spacing.md,
  background: 'transparent',
  border: 'none',
  borderRadius: borderRadius.lg,
  color: colors.text.tertiary,
  fontSize: typography.fontSize.sm,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: spacing.sm,
};

const cardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  padding: spacing.md,
  background: colors.background.secondary,
  borderRadius: borderRadius.lg,
  marginBottom: spacing.lg,
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

  const [address, setAddress] = useState({
    street: '',
    apt: '',
    city: '',
    state: '',
    zip: '',
  });

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
      await supabase
        .from('profiles')
        .update({ shipping_address: address })
        .eq('id', userId);

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

  const rewardThumb = (
    <div style={cardStyle}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: borderRadius.md,
        background: reward.image_url
          ? `url(${reward.image_url}) center/cover`
          : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {!reward.image_url && <Package size={18} style={{ color: colors.gold.primary, opacity: 0.5 }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, margin: 0 }}>
          {reward.name}
        </p>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, margin: '1px 0 0' }}>
          {reward.brand_name}
          {step === STEPS.CONFIRM && reward.cash_value && (
            <span style={{ color: colors.status.success }}> — ${reward.cash_value} value</span>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="400px"
      centered
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxl }}>
          <Loader size={22} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
        </div>
      ) : step === STEPS.ADDRESS ? (
        <div>
          <h2 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            textAlign: 'center',
            margin: `0 0 ${spacing.xs}`,
          }}>Shipping Address</h2>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            textAlign: 'center',
            margin: `0 0 ${spacing.xl}`,
          }}>Where should we send your reward?</p>

          {rewardThumb}

          {hasExistingAddress && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: borderRadius.lg,
              marginBottom: spacing.lg,
            }}>
              <MapPin size={14} style={{ color: colors.status.success, flexShrink: 0 }} />
              <p style={{ fontSize: typography.fontSize.xs, color: colors.status.success, margin: 0 }}>
                Address on file. Confirm or update below.
              </p>
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Street Address *</label>
            <input
              type="text"
              style={inputStyle}
              value={address.street}
              onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
              placeholder="123 Main St"
              autoComplete="street-address"
              onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = colors.border.primary; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Apt / Suite / Unit</label>
            <input
              type="text"
              style={inputStyle}
              value={address.apt}
              onChange={(e) => setAddress(prev => ({ ...prev, apt: e.target.value }))}
              placeholder="Apt 4B (optional)"
              onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = colors.border.primary; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ display: 'flex', gap: spacing.md }}>
            <div style={{ ...fieldStyle, flex: 1 }}>
              <label style={labelStyle}>City *</label>
              <input
                type="text"
                style={inputStyle}
                value={address.city}
                onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Miami"
                autoComplete="address-level2"
                onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border.primary; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div style={{ ...fieldStyle, width: '72px', flexShrink: 0 }}>
              <label style={labelStyle}>State *</label>
              <input
                type="text"
                style={inputStyle}
                value={address.state}
                onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
                placeholder="FL"
                maxLength={2}
                autoComplete="address-level1"
                onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border.primary; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div style={{ ...fieldStyle, width: '90px', flexShrink: 0 }}>
              <label style={labelStyle}>ZIP *</label>
              <input
                type="text"
                style={inputStyle}
                value={address.zip}
                onChange={(e) => setAddress(prev => ({ ...prev, zip: e.target.value.slice(0, 10) }))}
                placeholder="33101"
                autoComplete="postal-code"
                onFocus={(e) => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 2px rgba(212,175,55,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = colors.border.primary; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button
            style={{
              ...primaryBtnStyle,
              opacity: isAddressComplete ? 1 : 0.4,
              cursor: isAddressComplete ? 'pointer' : 'not-allowed',
            }}
            onClick={() => setStep(STEPS.CONFIRM)}
            disabled={!isAddressComplete}
          >
            {hasExistingAddress ? 'Confirm Address' : 'Continue'}
            <ChevronRight size={16} />
          </button>
          <button style={secondaryBtnStyle} onClick={onClose}>
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <h2 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            textAlign: 'center',
            margin: `0 0 ${spacing.xs}`,
          }}>Confirm Claim</h2>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            textAlign: 'center',
            margin: `0 0 ${spacing.xl}`,
          }}>Review your details before claiming</p>

          {rewardThumb}

          {/* Ships to */}
          <div style={{
            padding: spacing.md,
            background: colors.background.secondary,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.md,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: '6px' }}>
              <MapPin size={14} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: colors.text.secondary }}>
                Ships to
              </span>
            </div>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, lineHeight: 1.5, margin: 0 }}>
              {address.street}{address.apt ? `, ${address.apt}` : ''}<br />
              {address.city}, {address.state} {address.zip}
            </p>
          </div>

          {/* Promotion Terms */}
          {isAffiliate && reward.terms && (
            <div style={{
              padding: spacing.md,
              background: 'rgba(234,179,8,0.06)',
              border: '1px solid rgba(234,179,8,0.12)',
              borderRadius: borderRadius.lg,
              marginBottom: spacing.md,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <FileText size={14} style={{ color: '#eab308' }} />
                <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: '#eab308' }}>
                  Promotion Requirements
                </span>
              </div>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.5, margin: `0 0 ${spacing.md}` }}>
                {reward.terms}
              </p>

              {reward.commission_rate && (
                <p style={{ fontSize: typography.fontSize.sm, color: '#a78bfa', margin: `0 0 ${spacing.md}` }}>
                  You'll earn <strong>{reward.commission_rate}%</strong> commission on referral sales.
                </p>
              )}

              <button
                onClick={() => setTermsAccepted(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: `2px solid ${termsAccepted ? colors.gold.primary : colors.border.primary}`,
                  background: termsAccepted ? colors.gold.primary : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  {termsAccepted && <Check size={12} style={{ color: '#000' }} />}
                </div>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                  I agree to the promotion requirements
                </span>
              </button>
            </div>
          )}

          {/* Non-affiliate */}
          {!isAffiliate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              background: 'rgba(34,197,94,0.06)',
              borderRadius: borderRadius.lg,
              marginBottom: spacing.md,
            }}>
              <Check size={14} style={{ color: colors.status.success, flexShrink: 0 }} />
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, margin: 0 }}>
                Ships to your address. No promotion requirements.
              </p>
            </div>
          )}

          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            textAlign: 'center',
            margin: `0 0 ${spacing.md}`,
            lineHeight: 1.5,
          }}>
            By claiming, you confirm your address is correct.
          </p>

          {/* Buttons */}
          <button
            style={{
              ...primaryBtnStyle,
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: shadows.success,
              marginTop: 0,
              opacity: (claiming || (isAffiliate && reward?.terms && !termsAccepted)) ? 0.4 : 1,
              cursor: (claiming || (isAffiliate && reward?.terms && !termsAccepted)) ? 'not-allowed' : 'pointer',
            }}
            onClick={handleClaim}
            disabled={claiming || (isAffiliate && reward?.terms && !termsAccepted)}
          >
            {claiming ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Claiming...
              </>
            ) : (
              <>
                <Check size={16} />
                Claim Reward
              </>
            )}
          </button>
          <button style={secondaryBtnStyle} onClick={() => setStep(STEPS.ADDRESS)}>
            Back
          </button>
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

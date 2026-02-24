import React, { useState, useEffect } from 'react';
import { Check, MapPin, FileText, ChevronRight, Loader, AlertTriangle, Package } from 'lucide-react';
import { Modal, Button } from '../ui';
import { supabase } from '../../lib/supabase';
import '../../features/entry/EntryFlow.css';

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
      title=""
      maxWidth="480px"
    >
      {loading ? (
        <div className="entry-loading" style={{ minHeight: '200px' }}>
          <div className="entry-spinner" />
        </div>
      ) : step === STEPS.ADDRESS ? (
        <div className="entry-step">
          <h2 className="entry-step-title">Shipping Address</h2>
          <p className="entry-step-subtitle">Where should we send your reward?</p>

          {/* Reward Summary */}
          <div className="entry-nominee-photo-row" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: reward.image_url
                ? `url(${reward.image_url}) center/cover`
                : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {!reward.image_url && <Package size={20} style={{ color: '#d4af37', opacity: 0.5 }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                {reward.name}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#d4af37', margin: '2px 0 0' }}>
                {reward.brand_name}
              </p>
            </div>
          </div>

          {/* Address on file notice */}
          {hasExistingAddress && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 16px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <MapPin size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8125rem', color: '#22c55e', margin: 0 }}>
                Address on file. Confirm or update below.
              </p>
            </div>
          )}

          {/* Address Form */}
          <div className="entry-form-field">
            <label className="entry-label">Street Address *</label>
            <input
              type="text"
              className="entry-input"
              value={address.street}
              onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
              placeholder="123 Main St"
              autoComplete="street-address"
            />
          </div>

          <div className="entry-form-field">
            <label className="entry-label">Apt / Suite / Unit</label>
            <input
              type="text"
              className="entry-input"
              value={address.apt}
              onChange={(e) => setAddress(prev => ({ ...prev, apt: e.target.value }))}
              placeholder="Apt 4B (optional)"
            />
          </div>

          <div className="entry-form-row">
            <div className="entry-form-field">
              <label className="entry-label">City *</label>
              <input
                type="text"
                className="entry-input"
                value={address.city}
                onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Miami"
                autoComplete="address-level2"
              />
            </div>
            <div className="entry-form-field" style={{ maxWidth: '80px' }}>
              <label className="entry-label">State *</label>
              <input
                type="text"
                className="entry-input"
                value={address.state}
                onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
                placeholder="FL"
                maxLength={2}
                autoComplete="address-level1"
              />
            </div>
            <div className="entry-form-field" style={{ maxWidth: '100px' }}>
              <label className="entry-label">ZIP *</label>
              <input
                type="text"
                className="entry-input"
                value={address.zip}
                onChange={(e) => setAddress(prev => ({ ...prev, zip: e.target.value.slice(0, 10) }))}
                placeholder="33101"
                autoComplete="postal-code"
              />
            </div>
          </div>

          {/* Buttons */}
          <button
            className="entry-btn-primary"
            onClick={() => setStep(STEPS.CONFIRM)}
            disabled={!isAddressComplete}
          >
            {hasExistingAddress ? 'Confirm Address' : 'Continue'}
            <ChevronRight size={18} />
          </button>
          <button className="entry-btn-done" onClick={onClose}>
            Cancel
          </button>
        </div>
      ) : (
        /* Step 2: Review & Confirm */
        <div className="entry-step">
          <h2 className="entry-step-title">Confirm Claim</h2>
          <p className="entry-step-subtitle">Review your details before claiming</p>

          {/* Reward Summary */}
          <div className="entry-nominee-photo-row" style={{ marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: reward.image_url
                ? `url(${reward.image_url}) center/cover`
                : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {!reward.image_url && <Package size={20} style={{ color: '#d4af37', opacity: 0.5 }} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                {reward.name}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#d4af37', margin: '2px 0 0' }}>
                {reward.brand_name}
                {reward.cash_value && <span style={{ color: '#22c55e' }}> — ${reward.cash_value} value</span>}
              </p>
            </div>
          </div>

          {/* Shipping Address Confirmation */}
          <div style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <MapPin size={16} style={{ color: '#d4af37' }} />
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#a1a1aa', margin: 0 }}>
                Ships to
              </p>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#ffffff', lineHeight: 1.6, margin: 0 }}>
              {address.street}{address.apt ? `, ${address.apt}` : ''}<br />
              {address.city}, {address.state} {address.zip}
            </p>
          </div>

          {/* Promotion Terms (affiliate rewards only) */}
          {isAffiliate && reward.terms && (
            <div style={{
              padding: '16px',
              background: 'rgba(234,179,8,0.06)',
              border: '1px solid rgba(234,179,8,0.15)',
              borderRadius: '14px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <FileText size={16} style={{ color: '#eab308' }} />
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#eab308', margin: 0 }}>
                  Promotion Requirements
                </p>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 12px' }}>
                {reward.terms}
              </p>

              {reward.commission_rate && (
                <p style={{ fontSize: '0.875rem', color: '#a78bfa', margin: '0 0 14px' }}>
                  You'll earn <strong>{reward.commission_rate}%</strong> commission on referral sales.
                </p>
              )}

              {/* Accept Terms Checkbox */}
              <button
                onClick={() => setTermsAccepted(prev => !prev)}
                className={`entry-eligibility-item ${termsAccepted ? 'checked' : ''}`}
                style={{
                  padding: '12px 14px',
                  marginBottom: 0,
                  background: termsAccepted ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${termsAccepted ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: `2px solid ${termsAccepted ? '#d4af37' : 'rgba(255, 255, 255, 0.2)'}`,
                  background: termsAccepted ? '#d4af37' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  {termsAccepted && <Check size={14} style={{ color: '#000' }} />}
                </div>
                <span style={{ fontSize: '0.8125rem', color: termsAccepted ? '#ffffff' : '#a1a1aa' }}>
                  I agree to the promotion requirements
                </span>
              </button>
            </div>
          )}

          {/* Non-affiliate: simple confirmation */}
          {!isAffiliate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 16px',
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.12)',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8125rem', color: '#a1a1aa', margin: 0 }}>
                This reward will be shipped to your address. No promotion requirements.
              </p>
            </div>
          )}

          {/* Warning */}
          <p className="entry-hint" style={{ marginBottom: '20px' }}>
            By claiming, you confirm your address is correct and you are ready to receive this reward.
          </p>

          {/* Buttons */}
          <div className="entry-accept-actions">
            <button
              className="entry-btn-secondary entry-btn-decline"
              onClick={() => setStep(STEPS.ADDRESS)}
            >
              Back
            </button>
            <button
              className="entry-btn-primary entry-btn-accept"
              onClick={handleClaim}
              disabled={claiming || (isAffiliate && reward?.terms && !termsAccepted)}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                marginTop: 0,
              }}
            >
              {claiming ? (
                <>
                  <Loader size={18} style={{ animation: 'entrySpin 0.8s linear infinite' }} />
                  Claiming...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Claim Reward
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

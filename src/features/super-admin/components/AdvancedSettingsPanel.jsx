import React, { useState, useEffect } from 'react';
import { X, Save, Loader, DollarSign, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { PRICE_BUNDLER_TIERS } from '../../../types/competition';

/**
 * AdvancedSettingsPanel - Vote pricing and manual votes settings
 * Timeline/status settings are now in TimelineSettings component
 */
export default function AdvancedSettingsPanel({ competition, onClose, onSave }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPriceBundlerInfo, setShowPriceBundlerInfo] = useState(false);

  // Settings state - only pricing related
  const [settings, setSettings] = useState({
    price_per_vote: 1.00,
    use_price_bundler: false,
    allow_manual_votes: false,
  });

  // Fetch settings on mount
  useEffect(() => {
    if (competition?.id) {
      fetchSettings();
    }
  }, [competition?.id]);

  const fetchSettings = async () => {
    if (!supabase || !competition?.id) return;

    setLoading(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('competition_settings')
        .select('price_per_vote, use_price_bundler, allow_manual_votes')
        .eq('competition_id', competition.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settingsData) {
        setSettings({
          price_per_vote: settingsData.price_per_vote || 1.00,
          use_price_bundler: settingsData.use_price_bundler || false,
          allow_manual_votes: settingsData.allow_manual_votes || false,
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: settingsError } = await supabase
        .from('competition_settings')
        .upsert({
          competition_id: competition.id,
          price_per_vote: settings.price_per_vote,
          use_price_bundler: settings.use_price_bundler,
          allow_manual_votes: settings.allow_manual_votes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'competition_id' });

      if (settingsError) throw settingsError;

      toast.success('Settings saved successfully');
      if (onSave) onSave();
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const sectionStyle = {
    background: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  };

  const inputStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.md,
    color: '#fff',
    fontSize: typography.fontSize.md,
    outline: 'none',
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          background: colors.background.card,
          borderRadius: borderRadius.xxl,
          padding: spacing.xxxl,
          textAlign: 'center',
        }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
          <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: spacing.xl,
    }} onClick={onClose}>
      <div
        style={{
          background: colors.background.card,
          borderRadius: borderRadius.xxl,
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `1px solid ${colors.border.light}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: spacing.xl,
          borderBottom: `1px solid ${colors.border.light}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: colors.background.card,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <Settings size={24} style={{ color: colors.gold.primary }} />
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Vote Pricing Settings
              </h3>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                Configure pricing and manual vote options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: spacing.xl }}>
          {/* Pricing Section */}
          <div style={sectionStyle}>
            <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <DollarSign size={18} />
              Vote Pricing
            </h4>

            {/* Price per vote */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Base Price Per Vote</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ color: colors.text.muted }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.price_per_vote}
                  onChange={(e) => setSettings(prev => ({ ...prev, price_per_vote: parseFloat(e.target.value) || 0 }))}
                  style={{ ...inputStyle, maxWidth: '120px' }}
                />
              </div>
            </div>

            {/* Price bundler toggle */}
            <div style={{ marginBottom: spacing.md }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing.md, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.use_price_bundler}
                  onChange={(e) => setSettings(prev => ({ ...prev, use_price_bundler: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: colors.gold.primary }}
                />
                <span>Enable Price Bundler (volume discounts)</span>
              </label>
            </div>

            {/* Show bundler tiers */}
            {settings.use_price_bundler && (
              <div>
                <button
                  onClick={() => setShowPriceBundlerInfo(!showPriceBundlerInfo)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.gold.primary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  {showPriceBundlerInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  View pricing tiers
                </button>
                {showPriceBundlerInfo && (
                  <div style={{
                    marginTop: spacing.md,
                    background: colors.background.card,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                          <th style={{ padding: spacing.sm, textAlign: 'left', color: colors.text.muted }}>Votes</th>
                          <th style={{ padding: spacing.sm, textAlign: 'center', color: colors.text.muted }}>Discount</th>
                          <th style={{ padding: spacing.sm, textAlign: 'right', color: colors.text.muted }}>Price/Vote</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PRICE_BUNDLER_TIERS.map((tier, i) => (
                          <tr key={i}>
                            <td style={{ padding: spacing.sm }}>
                              {tier.minVotes === tier.maxVotes ? tier.minVotes : `${tier.minVotes}-${tier.maxVotes}`}
                            </td>
                            <td style={{ padding: spacing.sm, textAlign: 'center', color: colors.gold.primary }}>
                              {tier.discount}% off
                            </td>
                            <td style={{ padding: spacing.sm, textAlign: 'right' }}>
                              ${(settings.price_per_vote * tier.pricePerVote).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Votes Section */}
          <div style={sectionStyle}>
            <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md }}>
              Additional Settings
            </h4>

            <label style={{ display: 'flex', alignItems: 'center', gap: spacing.md, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.allow_manual_votes}
                onChange={(e) => setSettings(prev => ({ ...prev, allow_manual_votes: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: colors.gold.primary }}
              />
              <div>
                <span>Allow Manual Votes</span>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                  Host can add manual votes (tracked separately from public votes)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: spacing.xl,
          borderTop: `1px solid ${colors.border.light}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: spacing.md,
          position: 'sticky',
          bottom: 0,
          background: colors.background.card,
        }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={Save}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

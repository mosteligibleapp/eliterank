import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  DollarSign, Lock, ChevronUp, ChevronDown, Upload, Loader, Image as ImageIcon, X,
} from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '@shared/styles/theme';
import { PRICE_BUNDLER_TIERS } from '@shared/types/competition';
import { supabase } from '@shared/lib/supabase';
import { useToast } from '@shared/contexts/ToastContext';
import FormModal from '../../../components/FormModal';
import {
  FormField, TextInput, TextArea, SelectInput, FormGrid, FormSection, ToggleSwitch,
} from '../../../components/FormField';

const RADIUS_OPTIONS = [
  { value: '0', label: 'Must reside in city' },
  { value: '10', label: 'Within 10 miles' },
  { value: '25', label: 'Within 25 miles' },
  { value: '50', label: 'Within 50 miles' },
  { value: '100', label: 'Within 100 miles' },
];

/**
 * Tabbed edit modal for competition settings.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onSave - (formData) => Promise<void>
 * @param {boolean} props.loading
 * @param {Object|null} props.competition - The competition being edited
 * @param {Array} props.organizations
 * @param {Array} props.cities
 * @param {Array} props.categories
 * @param {Array} props.demographics
 * @param {Array} props.hosts
 * @param {Function} props.getHostName
 * @param {Function} props.getCompetitionName
 * @param {string} [props.defaultTab] - 'basic' | 'pricing' | 'settings'
 */
export default function CompetitionEditModal({
  isOpen,
  onClose,
  onSave,
  loading,
  competition,
  organizations,
  cities,
  categories,
  demographics,
  hosts,
  getHostName,
  getCompetitionName,
  defaultTab = 'basic',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPriceBundlerTiers, setShowPriceBundlerTiers] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    season: new Date().getFullYear() + 1,
    number_of_winners: 5,
    minimum_prize: '',
    eligibility_radius: 100,
    min_contestants: 40,
    max_contestants: '',
    host_id: '',
    category_id: '',
    demographic_id: '',
    description: '',
    cover_image: '',
    price_per_vote: 1.00,
    use_price_bundler: false,
    winners_split_by_gender: false,
  });

  // Reset form when competition changes or modal opens
  useEffect(() => {
    if (competition && isOpen) {
      setFormData({
        name: competition.name || '',
        season: competition.season,
        number_of_winners: competition.number_of_winners,
        minimum_prize: competition.prize_pool_minimum != null ? competition.prize_pool_minimum : '',
        eligibility_radius: competition.eligibility_radius_miles ?? 100,
        min_contestants: competition.min_contestants ?? 40,
        max_contestants: competition.max_contestants || '',
        host_id: competition.host_id || '',
        category_id: competition.category_id || '',
        demographic_id: competition.demographic_id || '',
        description: competition.description || '',
        cover_image: competition.cover_image || '',
        price_per_vote: competition.price_per_vote ?? 1.00,
        use_price_bundler: competition.use_price_bundler ?? false,
        winners_split_by_gender: competition.winners_split_by_gender ?? false,
      });
      setActiveTab(defaultTab);
      setShowPriceBundlerTiers(false);
    }
  }, [competition, isOpen, defaultTab]);

  const handleCoverUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Cover image must be less than 5MB');
      return;
    }
    setUploadingCover(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `covers/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('competition-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from('competition-images')
        .getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, cover_image: urlData.publicUrl }));
      toast.success('Cover image uploaded');
    } catch (err) {
      console.error('Cover upload error:', err);
      toast.error(`Cover upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverClear = () => {
    setFormData(prev => ({ ...prev, cover_image: '' }));
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const hostOptions = useMemo(() => [
    { value: '', label: 'No host assigned' },
    ...hosts.map(h => ({ value: h.id, label: getHostName(h) || h.email })),
  ], [hosts, getHostName]);

  const categoryOptions = useMemo(
    () => categories.map(c => ({ value: c.id, label: c.name })),
    [categories]
  );

  const demographicOptions = useMemo(
    () => demographics.map(d => ({ value: d.id, label: d.label })),
    [demographics]
  );

  const handleSubmit = () => {
    onSave(formData);
  };

  if (!competition) return null;

  const editOrg = organizations.find(o => o.id === competition.organization_id);
  const editCity = cities.find(c => c.id === competition.city_id);

  const tabs = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'pricing', label: 'Voting & Pricing' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Competition"
      subtitle={getCompetitionName(competition)}
      onSubmit={handleSubmit}
      submitLabel={loading ? 'Saving...' : 'Save Changes'}
      loading={loading}
      size="lg"
    >
      {/* Tab Bar */}
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              borderBottomColor: activeTab === tab.key ? colors.gold.primary : 'transparent',
              color: activeTab === tab.key ? colors.gold.primary : colors.text.tertiary,
              fontWeight: activeTab === tab.key ? typography.fontWeight.semibold : typography.fontWeight.normal,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Basic Info */}
      {activeTab === 'basic' && (
        <>
          {/* Read-only fields */}
          <FormSection title="Locked Fields" description="These cannot be changed after creation" divider={false}>
            <FormGrid>
              <ReadOnlyField label="Organization" value={editOrg?.name || 'Not set'} />
              <ReadOnlyField label="City" value={editCity?.name || 'Not set'} />
            </FormGrid>
          </FormSection>

          <FormSection title="Editable Fields">
            <FormGrid>
              <FormField label="Category">
                <SelectInput
                  value={formData.category_id}
                  onChange={(e) => updateField('category_id', e.target.value)}
                  options={categoryOptions}
                />
              </FormField>
              <FormField label="Demographic" description="Age / gender bracket for this competition">
                <SelectInput
                  value={formData.demographic_id}
                  onChange={(e) => updateField('demographic_id', e.target.value)}
                  options={demographicOptions}
                />
              </FormField>
            </FormGrid>
            <FormField label="Competition Name" description="Leave blank to auto-generate from organization and city.">
              <TextInput
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Most Eligible Miami"
              />
            </FormField>
            <FormGrid>
              <FormField label="Season">
                <TextInput
                  type="number"
                  value={formData.season}
                  onChange={(e) => updateField('season', parseInt(e.target.value))}
                />
              </FormField>
              <FormField label="Number of Winners">
                <TextInput
                  type="number"
                  min="1"
                  value={formData.number_of_winners}
                  onChange={(e) => updateField('number_of_winners', parseInt(e.target.value) || 1)}
                />
              </FormField>
            </FormGrid>
            <FormField label="Host">
              <SelectInput
                value={formData.host_id}
                onChange={(e) => updateField('host_id', e.target.value)}
                options={hostOptions}
              />
            </FormField>
            <FormField label="Description">
              <TextArea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Competition description..."
                rows={3}
              />
            </FormField>
            <FormField
              label="Cover Image"
              description="Used as the competition card hero and the image shown when this competition is shared (iMessage, Instagram, etc.). Recommended 1200×630."
            >
              <div style={styles.coverRow}>
                <div
                  onClick={() => !uploadingCover && coverInputRef.current?.click()}
                  style={{
                    ...styles.coverZone,
                    backgroundImage: formData.cover_image ? `url(${formData.cover_image})` : 'none',
                    cursor: uploadingCover ? 'wait' : 'pointer',
                  }}
                  role="button"
                  aria-label="Upload cover image"
                >
                  {uploadingCover ? (
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
                  ) : !formData.cover_image && (
                    <>
                      <Upload size={20} style={{ color: colors.text.muted }} />
                      <span style={styles.coverHint}>Click to upload</span>
                    </>
                  )}
                </div>
                {formData.cover_image && !uploadingCover && (
                  <div style={styles.coverActions}>
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      style={styles.coverActionBtn}
                    >
                      <ImageIcon size={14} /> Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleCoverClear}
                      style={{ ...styles.coverActionBtn, color: colors.status.error }}
                    >
                      <X size={14} /> Remove
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </FormField>
          </FormSection>
        </>
      )}

      {/* Tab 2: Voting & Pricing */}
      {activeTab === 'pricing' && (
        <>
          <FormSection title="Vote Pricing" divider={false}>
            <FormField label="Base Price Per Vote">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_vote}
                onChange={(e) => updateField('price_per_vote', parseFloat(e.target.value) || 0)}
                style={{ maxWidth: '160px' }}
              />
            </FormField>

            <div style={styles.toggleRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.toggleLabel}>Enable Price Bundler</p>
                <p style={styles.toggleDescription}>Volume discounts for bulk vote purchases</p>
              </div>
              <ToggleSwitch
                checked={formData.use_price_bundler}
                onChange={(checked) => updateField('use_price_bundler', checked)}
              />
            </div>

            {formData.use_price_bundler && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowPriceBundlerTiers(!showPriceBundlerTiers)}
                  style={styles.tiersToggle}
                >
                  {showPriceBundlerTiers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  View pricing tiers
                </button>
                {showPriceBundlerTiers && PRICE_BUNDLER_TIERS && (
                  <div style={styles.tiersTable}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${colors.border.secondary}` }}>
                          <th style={styles.tierTh}>Votes</th>
                          <th style={{ ...styles.tierTh, textAlign: 'center' }}>Discount</th>
                          <th style={{ ...styles.tierTh, textAlign: 'right' }}>Price/Vote</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PRICE_BUNDLER_TIERS.map((tier, i) => (
                          <tr key={i}>
                            <td style={styles.tierTd}>
                              {tier.minVotes === tier.maxVotes ? tier.minVotes : `${tier.minVotes}-${tier.maxVotes}`}
                            </td>
                            <td style={{ ...styles.tierTd, textAlign: 'center', color: colors.gold.primary }}>
                              {tier.discount}% off
                            </td>
                            <td style={{ ...styles.tierTd, textAlign: 'right' }}>
                              ${(formData.price_per_vote * tier.pricePerVote).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </FormSection>
        </>
      )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <FormSection title="Competition Settings" divider={false}>
          <FormField label="Minimum Prize (optional)" description="Host must fund at least this amount, if set">
            <TextInput
              type="number"
              value={formData.minimum_prize}
              onChange={(e) => updateField('minimum_prize', e.target.value)}
              placeholder="Leave blank for no minimum"
              style={{ maxWidth: '220px' }}
            />
          </FormField>
          <FormField label="Eligibility Radius" description="Contestants must confirm they meet this requirement">
            <SelectInput
              value={String(formData.eligibility_radius)}
              onChange={(e) => updateField('eligibility_radius', parseInt(e.target.value))}
              options={RADIUS_OPTIONS}
            />
          </FormField>
          <FormGrid>
            <FormField label="Minimum Contestants" description="Required to start voting">
              <TextInput
                type="number"
                value={formData.min_contestants}
                onChange={(e) => updateField('min_contestants', parseInt(e.target.value) || 10)}
              />
            </FormField>
            <FormField label="Maximum Contestants" description="Leave blank for no limit">
              <TextInput
                type="number"
                value={formData.max_contestants}
                onChange={(e) => updateField('max_contestants', e.target.value)}
                placeholder="No limit"
              />
            </FormField>
          </FormGrid>

          <div style={styles.toggleRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.toggleLabel}>Split Winners by Gender</p>
              <p style={styles.toggleDescription}>
                Nomination form asks for legally and medically recognized male/female,
                and winners are picked separately per gender (one male + one female when number of winners is 2).
              </p>
            </div>
            <ToggleSwitch
              checked={formData.winners_split_by_gender}
              onChange={(checked) => updateField('winners_split_by_gender', checked)}
            />
          </div>
        </FormSection>
      )}
    </FormModal>
  );
}


/**
 * Small read-only field with lock icon.
 */
function ReadOnlyField({ label, value }) {
  return (
    <div>
      <div style={styles.readOnlyLabel}>
        {label} <Lock size={10} style={{ color: colors.text.tertiary }} />
      </div>
      <div style={styles.readOnlyValue}>{value}</div>
    </div>
  );
}


const styles = {
  tabBar: {
    display: 'flex',
    borderBottom: `1px solid ${colors.border.secondary}`,
    marginBottom: spacing.lg,
    gap: 0,
  },
  tab: {
    padding: `${spacing.sm} ${spacing.md}`,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    transition: transitions.colors,
    whiteSpace: 'nowrap',
  },
  readOnlyLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  readOnlyValue: {
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.background.tertiary,
    border: `1px solid ${colors.border.secondary}`,
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.sm} 0`,
  },
  toggleLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    margin: 0,
  },
  toggleDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    margin: `${spacing[0.5]} 0 0`,
    lineHeight: typography.lineHeight.normal,
  },
  tiersToggle: {
    background: 'none',
    border: 'none',
    color: colors.gold.primary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    padding: 0,
  },
  tiersTable: {
    marginTop: spacing.md,
    background: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  tierTh: {
    padding: spacing.sm,
    textAlign: 'left',
    color: colors.text.tertiary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  tierTd: {
    padding: spacing.sm,
    color: colors.text.primary,
  },
  coverRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  coverZone: {
    width: 240,
    height: 126,
    border: `1px dashed ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    background: colors.background.tertiary,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    flex: '0 0 auto',
    transition: transitions.colors,
  },
  coverHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  coverActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    paddingTop: spacing[1],
  },
  coverActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing.sm}`,
    background: 'none',
    border: `1px solid ${colors.border.secondary}`,
    borderRadius: borderRadius.sm,
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    cursor: 'pointer',
    fontFamily: typography.fontFamily.sans,
    transition: transitions.colors,
  },
};

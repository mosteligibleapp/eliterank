import React, { useState, useMemo } from 'react';
import {
  Building2, ChevronLeft, ChevronDown,
} from 'lucide-react';
import { Button } from '@shared/components/ui';
import { colors, spacing, borderRadius, typography, transitions } from '@shared/styles/theme';
import FormModal from '../../../components/FormModal';
import {
  FormField, TextInput, SelectInput, FormGrid, FormSection,
} from '../../../components/FormField';
import { generateCompetitionSlug, getCompetitionUrl } from '@shared/utils/slugs';
import { US_STATES } from '@shared/types/competition';

const getStateName = (code) => US_STATES.find(s => s.code === code)?.name || code;

const WIZARD_STEPS = [
  { id: 1, name: 'Organization', description: 'Select organization' },
  { id: 2, name: 'Location', description: 'City & season' },
  { id: 3, name: 'Details', description: 'Competition settings' },
  { id: 4, name: 'Review', description: 'Confirm & create' },
];

// Geographic scope of a competition. 'city' and 'state' require a second
// selection (which city / which state); 'national' and 'worldwide' do not.
const SCOPE_OPTIONS = [
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'national', label: 'National (USA)' },
  { value: 'worldwide', label: 'Worldwide' },
];

// Short location name (for auto-generated competition names) by scope.
const fixedScopeName = (scope) => (scope === 'national' ? 'USA' : scope === 'worldwide' ? 'Worldwide' : '');

const RADIUS_OPTIONS = [
  { value: '0', label: 'Must reside in city' },
  { value: '10', label: 'Within 10 miles' },
  { value: '25', label: 'Within 25 miles' },
  { value: '50', label: 'Within 50 miles' },
  { value: '100', label: 'Within 100 miles' },
];

const INITIAL_FORM = {
  organization_id: '',
  geographic_scope: 'city', // 'city' | 'state' | 'national' | 'worldwide'
  city_id: '',
  state_code: '',
  category_id: '',
  demographic_id: '',
  name: '',
  season: new Date().getFullYear() + 1,
  number_of_winners: 5,
  minimum_prize: '',
  eligibility_radius: 100,
  min_contestants: 40,
  max_contestants: '',
  host_id: '',
  description: '',
  price_per_vote: 1.00,
  use_price_bundler: false,
  allow_manual_votes: false,
};

/**
 * Multi-step wizard for creating a new competition.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onCreate - (formData) => Promise<void>
 * @param {boolean} props.loading
 * @param {Array} props.organizations
 * @param {Array} props.cities
 * @param {Array} props.categories
 * @param {Array} props.demographics
 * @param {Array} props.hosts
 * @param {Function} props.getHostName
 */
export default function CompetitionCreateWizard({
  isOpen,
  onClose,
  onCreate,
  loading,
  organizations,
  cities,
  categories,
  demographics,
  hosts,
  getHostName,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showContestantLimits, setShowContestantLimits] = useState(false);

  const resetAndClose = () => {
    setFormData(INITIAL_FORM);
    setCurrentStep(1);
    setShowContestantLimits(false);
    onClose();
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const seasonOptions = useMemo(() => {
    return [...Array(5)].map((_, i) => {
      const year = new Date().getFullYear() + i;
      return { value: String(year), label: String(year) };
    });
  }, []);

  const scopeOptions = useMemo(() => SCOPE_OPTIONS.map(s => ({ value: s.value, label: s.label })), []);

  const cityOptions = useMemo(() =>
    cities.map(c => ({ value: c.id, label: `${c.name}, ${c.state}` })),
    [cities],
  );

  const stateOptions = useMemo(() =>
    US_STATES.map(s => ({ value: s.code, label: s.name })),
    [],
  );

  // Changing scope clears the detail field that no longer applies.
  const handleScopeChange = (scope) => {
    setFormData(prev => ({
      ...prev,
      geographic_scope: scope,
      city_id: scope === 'city' ? prev.city_id : '',
      state_code: scope === 'state' ? prev.state_code : '',
    }));
  };

  const locationSelected =
    (formData.geographic_scope === 'city' && !!formData.city_id) ||
    (formData.geographic_scope === 'state' && !!formData.state_code) ||
    formData.geographic_scope === 'national' ||
    formData.geographic_scope === 'worldwide';

  // Short location name used in the auto-generated competition name.
  const locationName = formData.geographic_scope === 'city'
    ? cities.find(c => c.id === formData.city_id)?.name
    : formData.geographic_scope === 'state'
      ? (formData.state_code ? getStateName(formData.state_code) : '')
      : fixedScopeName(formData.geographic_scope);

  const categoryOptions = useMemo(() =>
    categories.map(c => ({ value: c.id, label: c.name })),
    [categories],
  );

  const demographicOptions = useMemo(() =>
    demographics.map(d => ({ value: d.id, label: d.label })),
    [demographics],
  );

  const hostOptions = useMemo(() => [
    { value: '', label: 'No host assigned' },
    ...hosts.map(h => ({ value: h.id, label: getHostName(h) || h.email })),
  ], [hosts, getHostName]);

  // Auto-generated name preview for step 2
  const autoGeneratedName = useMemo(() => {
    const org = organizations.find(o => o.id === formData.organization_id);
    const demo = demographics.find(d => d.id === formData.demographic_id);
    if (!org || !locationName) return '';
    const isOpen = !demo || demo.slug === 'open';
    return isOpen ? `${org.name} ${locationName}` : `${org.name} ${locationName} - ${demo.label}`;
  }, [formData.organization_id, locationName, formData.demographic_id, organizations, demographics]);

  // Step validation
  const canAdvance = useMemo(() => {
    if (currentStep === 1) return !!formData.organization_id;
    if (currentStep === 2) return !!(locationSelected && formData.category_id && formData.demographic_id);
    return true;
  }, [currentStep, formData.organization_id, locationSelected, formData.category_id, formData.demographic_id]);

  const canCreate = !!(formData.organization_id && locationSelected && formData.category_id && formData.demographic_id);

  const handleSubmit = () => {
    if (currentStep < WIZARD_STEPS.length) {
      if (!canAdvance) return; // guard: don't advance without required fields
      setCurrentStep(prev => prev + 1);
    } else {
      if (!canCreate) return; // guard: don't create without required fields
      onCreate(formData);
    }
  };

  const submitLabel = currentStep < WIZARD_STEPS.length
    ? 'Next'
    : loading ? 'Creating...' : 'Create Competition';

  // Step indicator rendered in modal body
  const stepIndicator = (
    <div style={styles.stepBar}>
      {WIZARD_STEPS.map((step, index) => (
        <div key={step.id} style={styles.stepItem}>
          <div style={{
            ...styles.stepCircle,
            background: currentStep >= step.id ? colors.gold.primary : colors.background.elevated,
            color: currentStep >= step.id ? colors.text.inverse : colors.text.tertiary,
          }}>
            {step.id}
          </div>
          {index < WIZARD_STEPS.length - 1 && (
            <div style={{
              ...styles.stepLine,
              background: currentStep > step.id ? colors.gold.primary : colors.border.secondary,
            }} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <FormModal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Create Competition"
      subtitle={`Step ${currentStep} of ${WIZARD_STEPS.length}: ${WIZARD_STEPS[currentStep - 1].description}`}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      loading={loading}
      size="lg"
    >
      {stepIndicator}

      {/* Step 1: Organization */}
      {currentStep === 1 && (
        <FormSection title="Select Organization" divider={false}>
          {organizations.length === 0 ? (
            <div style={styles.emptyState}>
              <Building2 size={40} style={{ opacity: 0.4, color: colors.text.tertiary }} />
              <p style={{ color: colors.text.tertiary }}>No organizations found. Create one first.</p>
            </div>
          ) : (
            <div style={styles.orgList}>
              {organizations.map(org => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => updateField('organization_id', org.id)}
                  style={{
                    ...styles.orgCard,
                    borderColor: formData.organization_id === org.id ? colors.gold.primary : colors.border.primary,
                    background: formData.organization_id === org.id ? colors.gold.muted : colors.background.tertiary,
                  }}
                >
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt={org.name}
                      style={styles.orgLogo}
                    />
                  ) : (
                    <div style={styles.orgLogoPlaceholder}>
                      <Building2 size={18} style={{ color: colors.text.tertiary }} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}>
                      {org.name}
                    </p>
                    <p style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.tertiary,
                    }}>
                      /org/{org.slug}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </FormSection>
      )}

      {/* Step 2: Location & Season */}
      {currentStep === 2 && (
        <FormSection title="Location & Season" divider={false}>
          <FormGrid>
            <FormField label="Scope" required description="Where this competition runs">
              <SelectInput
                value={formData.geographic_scope}
                onChange={(e) => handleScopeChange(e.target.value)}
                options={scopeOptions}
              />
            </FormField>
            {formData.geographic_scope === 'city' && (
              <FormField label="City" required>
                <SelectInput
                  value={formData.city_id}
                  onChange={(e) => updateField('city_id', e.target.value)}
                  options={cityOptions}
                  placeholder="Select a city..."
                />
              </FormField>
            )}
            {formData.geographic_scope === 'state' && (
              <FormField label="State" required>
                <SelectInput
                  value={formData.state_code}
                  onChange={(e) => updateField('state_code', e.target.value)}
                  options={stateOptions}
                  placeholder="Select a state..."
                />
              </FormField>
            )}
            {(formData.geographic_scope === 'national' || formData.geographic_scope === 'worldwide') && (
              <FormField label="Coverage" description="No further location needed">
                <div style={styles.scopeNote}>
                  {formData.geographic_scope === 'national'
                    ? 'Open to contestants across the USA'
                    : 'Open to contestants worldwide'}
                </div>
              </FormField>
            )}
          </FormGrid>
          <FormGrid>
            <FormField label="Category" required>
              <SelectInput
                value={formData.category_id}
                onChange={(e) => updateField('category_id', e.target.value)}
                options={categoryOptions}
                placeholder="Select a category..."
              />
            </FormField>
            <FormField label="Demographic" required description="Who can enter this competition">
              <SelectInput
                value={formData.demographic_id}
                onChange={(e) => updateField('demographic_id', e.target.value)}
                options={demographicOptions}
                placeholder="Select a demographic..."
              />
            </FormField>
          </FormGrid>
          <FormGrid>
            <FormField label="Season Year" required>
              <SelectInput
                value={String(formData.season)}
                onChange={(e) => updateField('season', parseInt(e.target.value))}
                options={seasonOptions}
              />
            </FormField>
            <div />
          </FormGrid>
          <FormField
            label="Competition Name"
            description={formData.name
              ? 'Using custom name'
              : autoGeneratedName
                ? `Will auto-generate as: "${autoGeneratedName}"`
                : 'Leave blank to auto-generate from organization, city, and demographic.'}
          >
            <TextInput
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={autoGeneratedName || 'e.g., Most Eligible Miami'}
            />
          </FormField>
        </FormSection>
      )}

      {/* Step 3: Details */}
      {currentStep === 3 && (
        <FormSection title="Competition Details" divider={false}>
          <FormGrid>
            <FormField label="Number of Winners">
              <TextInput
                type="number"
                min="1"
                value={formData.number_of_winners}
                onChange={(e) => updateField('number_of_winners', parseInt(e.target.value) || 1)}
              />
            </FormField>
            {formData.geographic_scope === 'city' ? (
              <FormField label="Eligibility Radius" required description="How close contestants must be to the city">
                <SelectInput
                  value={String(formData.eligibility_radius)}
                  onChange={(e) => updateField('eligibility_radius', parseInt(e.target.value))}
                  options={RADIUS_OPTIONS}
                />
              </FormField>
            ) : (
              <FormField label="Eligibility" description="No radius restriction for this scope">
                <div style={styles.scopeNote}>
                  {formData.geographic_scope === 'state'
                    ? `Open to contestants in ${getStateName(formData.state_code) || 'the state'}`
                    : formData.geographic_scope === 'national'
                      ? 'Open to contestants across the USA'
                      : 'Open to contestants worldwide'}
                </div>
              </FormField>
            )}
          </FormGrid>

          <FormField label="Minimum Prize (optional)" description="Host must fund at least this amount, if set">
            <TextInput
              type="number"
              value={formData.minimum_prize}
              onChange={(e) => updateField('minimum_prize', e.target.value)}
              min={0}
              step={100}
              placeholder="Leave blank for no minimum"
              style={{ paddingLeft: '28px' }}
            />
          </FormField>

          {/* Contestant Limits (collapsible) */}
          <div style={styles.collapsibleSection}>
            <button
              type="button"
              onClick={() => setShowContestantLimits(!showContestantLimits)}
              style={styles.collapsibleToggle}
            >
              <span>Contestant Limits (Optional)</span>
              <ChevronDown
                size={14}
                style={{
                  transform: showContestantLimits ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: transitions.transform,
                }}
              />
            </button>
            {showContestantLimits && (
              <div style={styles.collapsibleContent}>
                <FormGrid>
                  <FormField label="Minimum to Launch" description="Required to start voting rounds">
                    <TextInput
                      type="number"
                      value={formData.min_contestants}
                      onChange={(e) => updateField('min_contestants', Math.max(10, parseInt(e.target.value) || 10))}
                      min={10}
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
              </div>
            )}
          </div>

          <FormField label="Assign Host (optional)">
            <SelectInput
              value={formData.host_id}
              onChange={(e) => updateField('host_id', e.target.value)}
              options={hostOptions}
            />
          </FormField>
        </FormSection>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <ReviewStep
          formData={formData}
          organizations={organizations}
          cities={cities}
          categories={categories}
          demographics={demographics}
          hosts={hosts}
          getHostName={getHostName}
        />
      )}

      {/* Back button area - rendered as part of the form body */}
      {currentStep > 1 && (
        <div style={styles.backButtonRow}>
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            type="button"
          >
            Back
          </Button>
        </div>
      )}
    </FormModal>
  );
}


/**
 * Review step: read-only summary of the competition to be created.
 */
function ReviewStep({ formData, organizations, cities, categories, demographics, hosts, getHostName }) {
  const selectedOrg = organizations.find(o => o.id === formData.organization_id);
  const selectedCity = cities.find(c => c.id === formData.city_id);
  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const selectedDemographic = demographics.find(d => d.id === formData.demographic_id);
  const selectedHost = hosts.find(h => h.id === formData.host_id);
  const isOpenDemographic = selectedDemographic?.slug === 'open';

  const scope = formData.geographic_scope || 'city';
  const isScoped = scope !== 'city';
  const stateName = formData.state_code ? getStateName(formData.state_code) : '';
  const locationName = scope === 'city'
    ? selectedCity?.name
    : scope === 'state'
      ? stateName
      : fixedScopeName(scope);
  const locationLabel = scope === 'city'
    ? (selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : 'Not selected')
    : scope === 'state'
      ? (stateName || 'Not selected')
      : scope === 'national' ? 'National (USA)' : 'Worldwide';

  const displayName = formData.name
    ? formData.name
    : selectedOrg && locationName
      ? isOpenDemographic || !selectedDemographic
        ? `${selectedOrg.name} ${locationName}`
        : `${selectedOrg.name} ${locationName} - ${selectedDemographic.label}`
      : 'Auto-generated';

  const rows = [
    { label: 'Organization', value: selectedOrg?.name || 'Not selected' },
    { label: 'Competition Name', value: displayName },
    { label: 'Location', value: locationLabel },
    { label: 'Category', value: selectedCategory?.name || 'Not selected' },
    { label: 'Demographic', value: selectedDemographic?.label || 'Not selected' },
    { label: 'Season', value: formData.season },
    { label: 'Winners', value: formData.number_of_winners },
    { label: 'Minimum Prize', value: `$${formData.minimum_prize.toLocaleString()}` },
    {
      label: 'Eligibility',
      value: scope === 'state'
        ? `Statewide (${stateName || 'state'})`
        : scope === 'national'
          ? 'Nationwide (USA)'
          : scope === 'worldwide'
            ? 'Worldwide'
            : formData.eligibility_radius === 0
              ? `Must reside in ${selectedCity?.name || 'city'}`
              : `Within ${formData.eligibility_radius} miles of ${selectedCity?.name || 'city'}`,
    },
    {
      label: 'Contestants',
      value: formData.max_contestants
        ? `${formData.min_contestants} min, ${formData.max_contestants} max`
        : `${formData.min_contestants} min, no max`,
    },
    { label: 'Host', value: selectedHost ? getHostName(selectedHost) : 'Not assigned' },
  ];

  return (
    <FormSection title="Review & Create" divider={false}>
      <div style={styles.reviewGrid}>
        {rows.map(row => (
          <div key={row.label} style={styles.reviewRow}>
            <span style={styles.reviewLabel}>{row.label}</span>
            <span style={styles.reviewValue}>{row.value}</span>
          </div>
        ))}
      </div>

      {selectedOrg && (selectedCity || isScoped) && (
        <div style={styles.urlPreview}>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>URL Preview:</span>
          <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.sm, margin: `${spacing[1]} 0 0` }}>
            {getCompetitionUrl(
              selectedOrg.slug,
              generateCompetitionSlug({
                name: formData.name || 'competition',
                citySlug: scope === 'city'
                  ? (selectedCity?.slug || 'unknown')
                  : scope === 'state'
                    ? (formData.state_code || 'state').toLowerCase()
                    : scope === 'national' ? 'usa' : 'worldwide',
                season: formData.season,
                demographicSlug: selectedDemographic?.slug,
              })
            )}
          </p>
        </div>
      )}

      <p style={styles.footerNote}>
        Competition will be created as Draft. Configure timeline and pricing in Advanced Settings.
      </p>
    </FormSection>
  );
}


const styles = {
  stepBar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing.xl,
    padding: `${spacing.md} 0`,
    borderBottom: `1px solid ${colors.border.secondary}`,
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: spacing[1],
  },
  stepCircle: {
    width: '24px',
    height: '24px',
    borderRadius: borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    flexShrink: 0,
  },
  stepLine: {
    flex: 1,
    height: '2px',
    borderRadius: '1px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  orgList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  orgCard: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: typography.fontFamily.sans,
    transition: transitions.colors,
  },
  orgLogo: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    objectFit: 'cover',
    flexShrink: 0,
  },
  orgLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    background: colors.background.elevated,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scopeNote: {
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.background.tertiary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  collapsibleSection: {
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  collapsibleToggle: {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.background.tertiary,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.sans,
  },
  collapsibleContent: {
    padding: spacing.md,
  },
  reviewGrid: {
    background: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing[1]} 0`,
    borderBottom: `1px solid ${colors.border.secondary}`,
  },
  reviewLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  },
  reviewValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  urlPreview: {
    padding: spacing.md,
    background: `${colors.gold.primary}10`,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.gold.primary}20`,
  },
  footerNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    margin: 0,
  },
  backButtonRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.border.secondary}`,
  },
};

import React, { useRef, useState } from 'react';
import { Check, Camera, Loader, X, ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { Textarea } from '../ui/Input';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { uploadPhoto } from '../../features/entry/utils/uploadPhoto';

const VISIBILITY_TIERS = [
  { key: 'platinum', label: 'Platinum', cap: 1, color: colors.tier.platinum },
  { key: 'gold', label: 'Gold', cap: 2, color: colors.tier.gold },
  { key: 'silver', label: 'Silver', cap: 3, color: colors.tier.silver },
];

const RECIPIENT_OPTIONS = [
  { key: 'winners', label: 'Winners only', hint: 'Becomes a winner prize package' },
  { key: 'top_x', label: 'Top X contestants', hint: "You'll specify how many" },
  { key: 'all', label: 'All contestants', hint: 'Every participant receives it' },
];

const emptyPrize = () => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  value: '',
  imageUrl: '',
});

const INITIAL_STATE = {
  name: '',
  logoUrl: '',
  websiteUrl: '',
  sponsorshipType: '',
  value: '',
  isPubliclyFeatured: false,
  visibilityTier: '',
  providesContestantRewards: false,
  recipient: '',
  topXCount: '',
  prizes: [],
};

export default function SponsorWizardModal({
  isOpen,
  onClose,
  sponsor,
  tierAvailability = { platinum: 1, gold: 2, silver: 3 },
  onSave,
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(sponsor || INITIAL_STATE);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPrizeId, setUploadingPrizeId] = useState(null);
  const logoInputRef = useRef(null);
  const prizeInputRef = useRef(null);
  const isEditing = !!sponsor;

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updatePrize = (id, key, value) =>
    setForm((f) => ({
      ...f,
      prizes: f.prizes.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    }));

  const addPrize = () => setForm((f) => ({ ...f, prizes: [...f.prizes, emptyPrize()] }));

  const removePrize = (id) =>
    setForm((f) => ({ ...f, prizes: f.prizes.filter((p) => p.id !== id) }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadPhoto(file, 'sponsors');
      if (url) updateField('logoUrl', url);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePrizeImageUpload = async (e, prizeId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPrizeId(prizeId);
    try {
      const url = await uploadPhoto(file, 'prizes');
      if (url) updatePrize(prizeId, 'imageUrl', url);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingPrizeId(null);
    }
  };

  const step1Valid = form.name.trim().length > 0;
  const step2Valid =
    form.sponsorshipType &&
    form.value !== '' &&
    (!form.isPubliclyFeatured || !!form.visibilityTier);
  const step3Valid =
    !form.providesContestantRewards ||
    (form.recipient &&
      (form.recipient !== 'top_x' || parseInt(form.topXCount, 10) > 0) &&
      form.prizes.length > 0 &&
      form.prizes.every((p) => p.title.trim().length > 0));

  const canAdvance = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;

  const handleSave = () => {
    onSave({
      ...form,
      value: parseFloat(form.value) || 0,
      topXCount: form.recipient === 'top_x' ? parseInt(form.topXCount, 10) || 0 : null,
      prizes: form.prizes.map((p) => ({
        ...p,
        value: parseFloat(p.value) || 0,
      })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Sponsor' : 'Add a Sponsor'}
      maxWidth="560px"
      footer={
        <>
          {step > 1 ? (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => s - 1)}
              icon={ArrowLeft}
              style={{ width: 'auto' }}
            >
              Back
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
              Cancel
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              icon={ArrowRight}
              disabled={!canAdvance}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} icon={Check} disabled={!canAdvance}>
              {isEditing ? 'Save Changes' : 'Add Sponsor'}
            </Button>
          )}
        </>
      }
    >
      <StepIndicator step={step} />

      {step === 1 && (
        <Step1Identity
          form={form}
          updateField={updateField}
          uploadingLogo={uploadingLogo}
          logoInputRef={logoInputRef}
          handleLogoUpload={handleLogoUpload}
        />
      )}
      {step === 2 && (
        <Step2Deal
          form={form}
          updateField={updateField}
          tierAvailability={tierAvailability}
        />
      )}
      {step === 3 && (
        <Step3Rewards
          form={form}
          updateField={updateField}
          updatePrize={updatePrize}
          addPrize={addPrize}
          removePrize={removePrize}
          prizeInputRef={prizeInputRef}
          uploadingPrizeId={uploadingPrizeId}
          handlePrizeImageUpload={handlePrizeImageUpload}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Modal>
  );
}

// ---------- Step indicator ----------
function StepIndicator({ step }) {
  const labels = ['Identity', 'Deal', 'Rewards'];
  return (
    <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div
            key={label}
            style={{
              flex: 1,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: borderRadius.md,
              background: active
                ? 'rgba(212,175,55,0.15)'
                : done
                  ? 'rgba(255,255,255,0.04)'
                  : 'transparent',
              border: `1px solid ${active ? colors.gold.primary : colors.border.light}`,
              color: active ? colors.gold.primary : done ? colors.text.primary : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              textAlign: 'center',
            }}
          >
            {n}. {label}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Step 1: Identity ----------
function Step1Identity({ form, updateField, uploadingLogo, logoInputRef, handleLogoUpload }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        style={{ display: 'none' }}
      />
      <div>
        <label style={labelStyle}>Brand Logo</label>
        <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
          <div
            onClick={() => !uploadingLogo && logoInputRef.current?.click()}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: borderRadius.lg,
              background: form.logoUrl
                ? `url(${form.logoUrl}) center/contain no-repeat ${colors.background.secondary}`
                : colors.background.secondary,
              border: `2px dashed ${colors.border.light}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: uploadingLogo ? 'wait' : 'pointer',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {uploadingLogo ? (
              <Loader size={20} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
            ) : form.logoUrl ? (
              <button
                onClick={(e) => { e.stopPropagation(); updateField('logoUrl', ''); }}
                style={clearBtnStyle}
              >
                <X size={14} />
              </button>
            ) : (
              <>
                <Camera size={20} style={{ color: colors.text.secondary }} />
                <span style={{ fontSize: '10px', color: colors.text.secondary, marginTop: spacing.xs }}>
                  Upload
                </span>
              </>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Or paste logo URL"
              value={form.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <Input
        label="Brand / Company Name *"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., Luxe Hotels"
      />
      <Input
        label="Website URL"
        value={form.websiteUrl}
        onChange={(e) => updateField('websiteUrl', e.target.value)}
        placeholder="https://..."
      />
    </div>
  );
}

// ---------- Step 2: Deal ----------
function Step2Deal({ form, updateField, tierAvailability }) {
  const isPaid = form.sponsorshipType === 'paid';
  const isInKind = form.sponsorshipType === 'in_kind';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div>
        <label style={labelStyle}>Sponsorship Type *</label>
        <div style={{ display: 'flex', gap: spacing.md }}>
          <PillButton
            active={isInKind}
            onClick={() => updateField('sponsorshipType', 'in_kind')}
            title="In-kind"
            subtitle="Goods or services"
          />
          <PillButton
            active={isPaid}
            onClick={() => updateField('sponsorshipType', 'paid')}
            title="Paid"
            subtitle="Cash sponsorship"
          />
        </div>
      </div>

      {form.sponsorshipType && (
        <Input
          label={isPaid ? 'Cash amount ($) *' : 'Estimated value ($) *'}
          type="number"
          value={form.value}
          onChange={(e) => updateField('value', e.target.value)}
          placeholder={isPaid ? 'e.g., 25000' : 'e.g., 5000'}
        />
      )}

      {isPaid && (
        <>
          <div>
            <label style={labelStyle}>Featured placement?</label>
            <p style={hintStyle}>
              Featured sponsors appear in a "Sponsored by" strip above the host section on the
              competition page.
            </p>
            <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.sm }}>
              <PillButton
                active={!form.isPubliclyFeatured}
                onClick={() => { updateField('isPubliclyFeatured', false); updateField('visibilityTier', ''); }}
                title="No"
                subtitle="Listed on sponsors section only"
              />
              <PillButton
                active={form.isPubliclyFeatured}
                onClick={() => updateField('isPubliclyFeatured', true)}
                title="Yes"
                subtitle="Always visible on competition page"
              />
            </div>
          </div>

          {form.isPubliclyFeatured && (
            <div>
              <label style={labelStyle}>Visibility tier *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {VISIBILITY_TIERS.map((tier) => {
                  const remaining = tierAvailability[tier.key] ?? 0;
                  const isCurrent = form.visibilityTier === tier.key;
                  const disabled = remaining <= 0 && !isCurrent;
                  return (
                    <button
                      key={tier.key}
                      onClick={() => !disabled && updateField('visibilityTier', tier.key)}
                      disabled={disabled}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        background: isCurrent ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isCurrent ? colors.gold.primary : colors.border.light}`,
                        color: disabled ? colors.text.secondary : colors.text.primary,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ color: tier.color, fontWeight: typography.fontWeight.semibold }}>
                          {tier.label}
                        </div>
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                          Cap: {tier.cap} per competition
                        </div>
                      </div>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {remaining} of {tier.cap} available
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Step 3: Rewards ----------
function Step3Rewards({
  form,
  updateField,
  updatePrize,
  addPrize,
  removePrize,
  prizeInputRef,
  uploadingPrizeId,
  handlePrizeImageUpload,
}) {
  const [activePrizeId, setActivePrizeId] = useState(null);

  const triggerUpload = (prizeId) => {
    setActivePrizeId(prizeId);
    prizeInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <input
        ref={prizeInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handlePrizeImageUpload(e, activePrizeId)}
        style={{ display: 'none' }}
      />

      <div>
        <label style={labelStyle}>Providing anything to contestants?</label>
        <div style={{ display: 'flex', gap: spacing.md }}>
          <PillButton
            active={!form.providesContestantRewards}
            onClick={() => {
              updateField('providesContestantRewards', false);
              updateField('recipient', '');
              updateField('topXCount', '');
              updateField('prizes', []);
            }}
            title="No"
            subtitle="Cash/visibility only"
          />
          <PillButton
            active={form.providesContestantRewards}
            onClick={() => {
              updateField('providesContestantRewards', true);
              if (form.prizes.length === 0) updateField('prizes', [emptyPrize()]);
            }}
            title="Yes"
            subtitle="Adds prizes to competition"
          />
        </div>
      </div>

      {form.providesContestantRewards && (
        <>
          <div>
            <label style={labelStyle}>Who receives? *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {RECIPIENT_OPTIONS.map((opt) => {
                const active = form.recipient === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => updateField('recipient', opt.key)}
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? colors.gold.primary : colors.border.light}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {form.recipient === 'top_x' && (
            <Input
              label="How many contestants? *"
              type="number"
              value={form.topXCount}
              onChange={(e) => updateField('topXCount', e.target.value)}
              placeholder="e.g., 5"
            />
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Prize details *</label>
              <Button size="sm" variant="secondary" icon={Plus} onClick={addPrize} style={{ width: 'auto' }}>
                Add another
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {form.prizes.map((prize, idx) => (
                <PrizeCard
                  key={prize.id}
                  prize={prize}
                  index={idx}
                  canRemove={form.prizes.length > 1}
                  onRemove={() => removePrize(prize.id)}
                  onChange={(key, val) => updatePrize(prize.id, key, val)}
                  onUploadClick={() => triggerUpload(prize.id)}
                  uploading={uploadingPrizeId === prize.id}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PrizeCard({ prize, index, canRemove, onRemove, onChange, onUploadClick, uploading }) {
  return (
    <div
      style={{
        padding: spacing.md,
        background: colors.background.secondary,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
          Prize {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.text.secondary,
              cursor: 'pointer',
              padding: spacing.xs,
            }}
            aria-label="Remove prize"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
        <div
          onClick={() => !uploading && onUploadClick()}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: borderRadius.md,
            background: prize.imageUrl
              ? `url(${prize.imageUrl}) center/cover`
              : 'rgba(255,255,255,0.04)',
            border: `2px dashed ${colors.border.light}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {uploading ? (
            <Loader size={16} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
          ) : prize.imageUrl ? (
            <button
              onClick={(e) => { e.stopPropagation(); onChange('imageUrl', ''); }}
              style={clearBtnStyle}
            >
              <X size={12} />
            </button>
          ) : (
            <Camera size={18} style={{ color: colors.text.secondary }} />
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <Input
            label="What is it? *"
            value={prize.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="e.g., Diamond Necklace"
          />
          <Input
            label="Value ($)"
            type="number"
            value={prize.value}
            onChange={(e) => onChange('value', e.target.value)}
            placeholder="e.g., 500"
          />
        </div>
      </div>
      <Textarea
        label="Description"
        value={prize.description}
        onChange={(e) => onChange('description', e.target.value)}
        placeholder="Optional details about the prize..."
        rows={2}
      />
    </div>
  );
}

// ---------- Reusable bits ----------
function PillButton({ active, onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? colors.gold.primary : colors.border.light}`,
        color: colors.text.primary,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: '2px' }}>
        {title}
      </div>
      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
        {subtitle}
      </div>
    </button>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: typography.fontSize.base,
  color: colors.text.secondary,
  marginBottom: spacing.sm,
};

const hintStyle = {
  fontSize: typography.fontSize.xs,
  color: colors.text.secondary,
  marginBottom: spacing.sm,
};

const clearBtnStyle = {
  position: 'absolute',
  top: '-8px',
  right: '-8px',
  width: '22px',
  height: '22px',
  background: 'rgba(239, 68, 68, 0.9)',
  border: 'none',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#fff',
};

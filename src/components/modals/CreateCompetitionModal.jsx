import React, { useState, useEffect, useCallback } from 'react';
import { Loader, Sparkles, User, Building2, ArrowLeft, ArrowRight, CheckCircle, Info, CalendarClock } from 'lucide-react';
import { Modal, Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';
import { slugify, generateCompetitionSlug } from '../../utils/slugs';
import { COMPETITION_TEMPLATES, CUSTOM_TEMPLATE, findTemplate, US_STATES, LAUNCH_TIMEFRAMES, ENTRY_TYPE_HELP } from '../../lib/competitionTemplates';

const NEW_ORG = '__new__';
// Config pages in order, per the onboarding flow.
const CONFIG_ORDER = ['sponsor', 'template', 'format', 'prizes', 'review'];
const STEP_LABELS = {
  sponsor: 'Organization setup',
  template: 'Category',
  format: 'Format',
  prizes: 'Prizes & extras',
  review: 'Review',
};
/**
 * CreateCompetitionModal — self-serve host create wizard.
 *
 * Flow: Ready? → (Learn more = lead capture) / Set up now → Individual vs
 * Organization → 5-page configure (Category template · Format · Eligibility ·
 * Prizes · Review) → creates a DRAFT (creator = host). Publishing stays
 * admin-approved; the agreement + Stripe are handled in the dashboard.
 */
export default function CreateCompetitionModal({ isOpen, onClose, userId, onCreated, initialStep = 'ready' }) {
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [leadDone, setLeadDone] = useState(false);
  const [lookups, setLookups] = useState({ cities: [], categories: [], demographics: [], orgs: [] });

  const [form, setForm] = useState({
    // sponsor
    hostType: '', soloName: '', organizationId: '', newOrgName: '', orgType: 'company',
    orgLogoUrl: '', orgWebsite: '', orgInstagram: '',
    // template
    templateId: '', customCategory: '',
    // format
    name: '', numberOfWinners: 5, entryType: 'nominations', pricePerVote: 1.0, selectionCriteria: 'votes',
    plannedLaunchTimeframe: '',
    // eligibility
    cityId: '', territoryScope: 'city', territoryState: '', eligibilityRadius: 100, relationshipStatus: '',
    gender: 'all', ageMin: 21, ageMax: '',
    // prizes
    cashPrizeYes: false, cashPrizeAmount: '', sponsoredPrizesYes: false,
    charityYes: false, charityPercentage: 10,
    // misc
    season: new Date().getFullYear(),
  });
  const [lead, setLead] = useState({ leadType: 'info_packet', name: '', email: '', phone: '', message: '' });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setL = (k, v) => setLead((l) => ({ ...l, [k]: v }));

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setUploadingLogo(true); setError(null);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const fileName = `org-logos/${userId || 'anon'}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      set('orgLogoUrl', data.publicUrl);
    } catch (err) {
      setError('Logo upload failed: ' + (err.message || 'try again'));
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (isOpen) { setStep(initialStep); setError(null); setLeadDone(false); }
  }, [isOpen, initialStep]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [cities, categories, demographics, orgs, profile] = await Promise.all([
          supabase.from('cities').select('id, name, state, slug').order('name'),
          supabase.from('categories').select('id, name, slug').eq('active', true).order('name'),
          supabase.from('demographics').select('id, label, slug').eq('active', true).order('id'),
          userId ? supabase.from('organizations').select('id, name, slug, org_type').eq('owner_id', userId).order('name') : Promise.resolve({ data: [] }),
          userId ? supabase.from('profiles').select('first_name, last_name, email').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        if (cancelled) return;
        setLookups({ cities: cities.data || [], categories: categories.data || [], demographics: demographics.data || [], orgs: orgs.data || [] });
        const fullName = `${profile.data?.first_name || ''} ${profile.data?.last_name || ''}`.trim();
        setForm((f) => ({ ...f, soloName: f.soloName || fullName, organizationId: orgs.data?.[0]?.id || NEW_ORG }));
        setLead((l) => ({ ...l, name: l.name || fullName, email: l.email || profile.data?.email || '' }));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load options.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, userId]);

  const template = findTemplate(form.templateId);
  const orgCreatingNew = lookups.orgs.length === 0 || form.organizationId === NEW_ORG;

  // ── Validation per config step ──────────────────────────────────────────────
  const validateStep = (s) => {
    if (s === 'sponsor') {
      if (!form.hostType) return 'Choose individual or organization.';
      if (form.hostType === 'individual' && !form.soloName.trim()) return 'Enter your name — it’s shown as the host.';
      if (form.hostType === 'organization' && orgCreatingNew && !form.newOrgName.trim()) return 'Enter a name for your organization.';
      if (form.hostType === 'organization' && orgCreatingNew && !form.orgWebsite.trim() && !form.orgInstagram.trim()) return 'Add a website or Instagram for your organization.';
    }
    if (s === 'template') {
      if (!form.templateId) return 'Pick a category template.';
      if (form.templateId === CUSTOM_TEMPLATE.id && !form.customCategory.trim()) return 'Type your category.';
    }
    if (s === 'format') {
      if (!form.name.trim()) return 'Enter a competition name.';
      if (!form.plannedLaunchTimeframe) return 'Choose when you plan to launch.';
      if (form.territoryScope === 'city' && !form.cityId) return 'Pick a city.';
      if (form.territoryScope === 'state' && !form.territoryState) return 'Pick a state.';
      if (!form.ageMin || Number(form.ageMin) < 18) return 'Minimum age must be 18 or older — all competitions are 18+.';
      if (form.ageMax && Number(form.ageMax) < Number(form.ageMin)) return 'Max age must be greater than the minimum.';
    }
    return null;
  };

  const goNext = () => {
    const idx = CONFIG_ORDER.indexOf(step);
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(CONFIG_ORDER[idx + 1]);
  };
  const goBack = () => {
    const idx = CONFIG_ORDER.indexOf(step);
    if (idx <= 0) { setStep('ready'); return; }
    setError(null);
    setStep(CONFIG_ORDER[idx - 1]);
  };

  // ── Submit lead ─────────────────────────────────────────────────────────────
  const submitLead = async () => {
    if (!lead.name.trim() || !lead.email.trim()) { setError('Name and email are required.'); return; }
    setBusy(true); setError(null);
    try {
      const { error: e } = await supabase.rpc('submit_host_lead', {
        p_lead_type: lead.leadType, p_name: lead.name, p_email: lead.email, p_phone: lead.phone, p_message: lead.message,
      });
      if (e) throw e;
      setLeadDone(true);
    } catch (err) {
      setError(err.message || 'Could not submit. Please try again.');
    } finally { setBusy(false); }
  };

  // ── Create competition ──────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    setError(null); setBusy(true);
    try {
      const city = lookups.cities.find((c) => c.id === form.cityId);
      // Map flexible gender + age range to a demographic bucket when one matches
      // exactly; otherwise the eligibility_* fields are the source of truth.
      const genderMatch = form.gender === 'all' ? null : form.gender;
      const ageMin = form.ageMin === '' || form.ageMin == null ? null : Number(form.ageMin);
      const ageMax = form.ageMax === '' || form.ageMax == null ? null : Number(form.ageMax);
      const demo = lookups.demographics.find((d) =>
        (d.gender || null) === genderMatch && (d.age_min ?? null) === ageMin && (d.age_max ?? null) === ageMax
      ) || null;
      const genderSlug = { all: 'all-genders', male: 'men', female: 'women', 'LGBTQ+': 'lgbtq-plus' }[form.gender] || 'open';
      const demoSlug = demo?.slug || (ageMin ? `${genderSlug}-${ageMin}-${ageMax || 'plus'}` : 'open');

      // Resolve Sponsor-of-record org.
      let organizationId, orgName;
      if (form.hostType === 'individual') {
        const personal = lookups.orgs.find((o) => o.org_type === 'individual');
        if (personal) { organizationId = personal.id; orgName = personal.name; }
        else {
          const name = form.soloName.trim();
          const { data: org, error: e } = await supabase.rpc('create_host_organization', { p_name: name, p_slug: slugify(name), p_type: 'individual' });
          if (e) throw e; organizationId = org.id; orgName = org.name;
        }
      } else if (orgCreatingNew) {
        const name = form.newOrgName.trim();
        const { data: org, error: e } = await supabase.rpc('create_host_organization', {
          p_name: name, p_slug: slugify(name), p_type: form.orgType,
          p_logo_url: form.orgLogoUrl || null, p_website_url: form.orgWebsite || null, p_instagram: form.orgInstagram || null,
        });
        if (e) throw e; organizationId = org.id; orgName = org.name;
      } else {
        organizationId = form.organizationId; orgName = lookups.orgs.find((o) => o.id === organizationId)?.name;
      }

      // Map template → category lookup when one fits; always store the template label.
      const categoryTemplate = template?.id === CUSTOM_TEMPLATE.id ? form.customCategory.trim() : (template?.label || null);
      const categoryId = template?.categorySlug ? (lookups.categories.find((c) => c.slug === template.categorySlug)?.id || null) : null;

      const name = form.name.trim() || `${orgName || 'Competition'} ${city?.name || ''}`.trim();
      const anchorSlug = form.territoryScope === 'city' ? (city?.slug || 'city')
        : form.territoryScope === 'state' ? (form.territoryState || 'state').toLowerCase()
        : 'usa';
      const slug = generateCompetitionSlug({ name, citySlug: anchorSlug, season: Number(form.season), demographicSlug: demoSlug });

      const { data: comp, error: e2 } = await supabase.rpc('create_host_competition', {
        p_payload: {
          organization_id: organizationId,
          city_id: form.territoryScope === 'city' ? form.cityId : null,
          category_id: categoryId,
          demographic_id: demo?.id || null,
          category_template: categoryTemplate,
          territory_scope: form.territoryScope,
          season: Number(form.season),
          name, slug,
          number_of_winners: Number(form.numberOfWinners) || 5,
          entry_type: form.entryType,
          selection_criteria: form.selectionCriteria,
          eligibility_radius_miles: Number(form.eligibilityRadius) || 100,
        },
      });
      if (e2) throw e2;

      // Persist flexible eligibility + charity % on the new draft (host can
      // update their own competition via RLS). Name/details for charity come
      // later in the dashboard.
      const updates = {
        eligibility_gender: form.gender, eligibility_age_min: ageMin, eligibility_age_max: ageMax,
        territory_state: form.territoryScope === 'state' ? form.territoryState : null,
        planned_launch_timeframe: form.plannedLaunchTimeframe || null,
        cash_prize_amount: form.cashPrizeYes ? (Number(form.cashPrizeAmount) || 0) : null,
        has_sponsored_prizes: !!form.sponsoredPrizesYes,
      };
      if (form.charityYes) updates.charity_percentage = Number(form.charityPercentage) || null;
      await supabase.from('competitions').update(updates).eq('id', comp.id);

      onCreated?.(comp);
    } catch (err) {
      console.error('Failed to create competition:', err);
      setError(err.message || 'Could not create the competition. Please try again.');
    } finally { setBusy(false); }
  }, [form, lookups, template, orgCreatingNew, onCreated]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const labelStyle = { display: 'block', color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs };
  const fieldStyle = { width: '100%', padding: spacing.md, background: colors.background.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: borderRadius.lg, color: '#fff', fontSize: typography.fontSize.md, marginBottom: spacing.lg };
  const cardStyle = (active) => ({ padding: spacing.lg, textAlign: 'center', cursor: 'pointer', background: active ? 'rgba(212,175,55,0.12)' : colors.background.secondary, border: `${active ? '2px' : '1px'} solid ${active ? colors.gold.primary : colors.border.primary}`, borderRadius: borderRadius.lg, color: colors.text.primary });
  const errEl = error ? <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{error}</p> : null;

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footer = (() => {
    if (step === 'ready') return <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>Cancel</Button>;
    if (step === 'learn') return (
      <>
        <Button variant="secondary" onClick={() => { setStep('ready'); setError(null); }} icon={ArrowLeft} disabled={busy} style={{ width: 'auto' }}>Back</Button>
        {!leadDone && <Button onClick={submitLead} disabled={busy} icon={busy ? Loader : CheckCircle}>{busy ? 'Sending…' : 'Send'}</Button>}
      </>
    );
    if (step === 'review') return (
      <>
        <Button variant="secondary" onClick={goBack} icon={ArrowLeft} disabled={busy} style={{ width: 'auto' }}>Back</Button>
        <Button onClick={handleCreate} disabled={busy || loading} icon={busy ? Loader : Sparkles}>{busy ? 'Creating…' : 'Create draft'}</Button>
      </>
    );
    // config steps
    return (
      <>
        <Button variant="secondary" onClick={goBack} icon={ArrowLeft} style={{ width: 'auto' }}>Back</Button>
        <Button onClick={goNext} icon={ArrowRight} disabled={loading}>Next</Button>
      </>
    );
  })();

  const stepNumber = CONFIG_ORDER.indexOf(step);
  const title = step === 'ready' || step === 'learn' ? 'Launch a competition'
    : `Step ${stepNumber + 1} of ${CONFIG_ORDER.length} · ${STEP_LABELS[step]}`;

  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose?.()} title={title} maxWidth="600px" footer={footer}>
      {/* READY */}
      {step === 'ready' && (
        <div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, marginBottom: spacing.xl }}>
            Ready to set up your competition now?
          </p>
          <div style={{ display: 'flex', gap: spacing.lg }}>
            <div style={{ ...cardStyle(false), flex: 1 }} onClick={() => { setError(null); setStep('sponsor'); }}>
              <Sparkles size={26} color={colors.gold.primary} style={{ marginBottom: spacing.sm }} />
              <div style={{ fontWeight: typography.fontWeight.semibold }}>Yes, set it up now</div>
              <div style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>Build your draft in a few steps.</div>
            </div>
            <div style={{ ...cardStyle(false), flex: 1 }} onClick={() => { setError(null); setStep('learn'); }}>
              <Info size={26} color={colors.gold.primary} style={{ marginBottom: spacing.sm }} />
              <div style={{ fontWeight: typography.fontWeight.semibold }}>Learn more first</div>
              <div style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>Get the host info packet or schedule a call.</div>
            </div>
          </div>

          <div style={{ marginTop: spacing.xl, padding: spacing.lg, background: colors.background.secondary, border: `1px solid ${colors.border.primary}`, borderRadius: borderRadius.lg }}>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
              Your competition won’t go live until:
            </p>
            {[
              'You approve the competition',
              'Your Stripe identity verification (KYC) is approved',
              'You’ve signed the Host Agreement',
            ].map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm, color: colors.text.muted, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
                <CheckCircle size={15} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: 2 }} />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEARN — lead capture */}
      {step === 'learn' && (leadDone ? (
        <div style={{ textAlign: 'center', padding: spacing.xl }}>
          <CheckCircle size={40} color={colors.status.success} style={{ marginBottom: spacing.md }} />
          <h3 style={{ marginBottom: spacing.sm }}>Thanks — we’ll be in touch.</h3>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
            You can come back and set up your competition any time.
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
            <div style={{ ...cardStyle(lead.leadType === 'info_packet'), flex: 1 }} onClick={() => setL('leadType', 'info_packet')}>
              <Info size={20} color={colors.gold.primary} /><div style={{ marginTop: spacing.xs, fontSize: typography.fontSize.sm }}>Host info packet</div>
            </div>
            <div style={{ ...cardStyle(lead.leadType === 'schedule_call'), flex: 1 }} onClick={() => setL('leadType', 'schedule_call')}>
              <CalendarClock size={20} color={colors.gold.primary} /><div style={{ marginTop: spacing.xs, fontSize: typography.fontSize.sm }}>Schedule a call</div>
            </div>
          </div>
          <label style={labelStyle}>Name</label>
          <input style={fieldStyle} value={lead.name} onChange={(e) => setL('name', e.target.value)} />
          <label style={labelStyle}>Email</label>
          <input style={fieldStyle} value={lead.email} onChange={(e) => setL('email', e.target.value)} />
          <label style={labelStyle}>Phone (optional)</label>
          <input style={fieldStyle} value={lead.phone} onChange={(e) => setL('phone', e.target.value)} />
          <label style={labelStyle}>Anything you’d like us to know? (optional)</label>
          <textarea style={{ ...fieldStyle, minHeight: 80 }} value={lead.message} onChange={(e) => setL('message', e.target.value)} />
          {errEl}
        </div>
      ))}

      {/* loading guard for config steps */}
      {CONFIG_ORDER.includes(step) && loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxl, color: colors.text.secondary }}>
          <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* SPONSOR */}
      {step === 'sponsor' && !loading && (
        <div>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>Are you hosting as an individual or an organization?</p>
          <div style={{ display: 'flex', gap: spacing.lg, marginBottom: spacing.xl }}>
            <div style={{ ...cardStyle(form.hostType === 'individual'), flex: 1 }} onClick={() => set('hostType', 'individual')}>
              <User size={24} color={colors.gold.primary} /><div style={{ fontWeight: typography.fontWeight.semibold, marginTop: spacing.xs }}>Individual</div>
              <div style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>You’re the host & Sponsor of record.</div>
            </div>
            <div style={{ ...cardStyle(form.hostType === 'organization'), flex: 1 }} onClick={() => set('hostType', 'organization')}>
              <Building2 size={24} color={colors.gold.primary} /><div style={{ fontWeight: typography.fontWeight.semibold, marginTop: spacing.xs }}>Organization</div>
              <div style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>A company, non-profit or agency.</div>
            </div>
          </div>

          {form.hostType === 'individual' && (
            <>
              <label style={labelStyle}>Your name (shown as the host / Sponsor of record)</label>
              <input style={fieldStyle} value={form.soloName} onChange={(e) => set('soloName', e.target.value)} placeholder="Your full name" />
            </>
          )}
          {form.hostType === 'organization' && (
            <>
              {lookups.orgs.length > 0 && (
                <>
                  <label style={labelStyle}>Organization</label>
                  <select style={fieldStyle} value={form.organizationId} onChange={(e) => set('organizationId', e.target.value)}>
                    {lookups.orgs.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
                    <option value={NEW_ORG}>+ Create a new organization</option>
                  </select>
                </>
              )}
              {orgCreatingNew && (
                <>
                  <label style={labelStyle}>Organization name</label>
                  <input style={fieldStyle} value={form.newOrgName} onChange={(e) => set('newOrgName', e.target.value)} placeholder="e.g. Your Brand LLC" />
                  <label style={labelStyle}>Entity type</label>
                  <select style={fieldStyle} value={form.orgType} onChange={(e) => set('orgType', e.target.value)}>
                    <option value="company">Company</option>
                    <option value="non_profit">Non-profit</option>
                  </select>

                  <label style={labelStyle}>Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                    {form.orgLogoUrl
                      ? <img src={form.orgLogoUrl} alt="Logo" style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover', border: `1px solid ${colors.border.primary}` }} />
                      : <div style={{ width: 48, height: 48, borderRadius: borderRadius.md, background: colors.background.secondary, border: `1px dashed ${colors.border.primary}` }} />}
                    <label style={{ cursor: 'pointer', color: colors.gold.primary, fontSize: typography.fontSize.sm }}>
                      {uploadingLogo ? 'Uploading…' : (form.orgLogoUrl ? 'Replace logo' : 'Upload logo')}
                      <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingLogo}
                        onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
                    </label>
                  </div>

                  <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginBottom: spacing.sm }}>
                    Add at least one — a website or Instagram.
                  </p>
                  <label style={labelStyle}>Website</label>
                  <input style={fieldStyle} value={form.orgWebsite} onChange={(e) => set('orgWebsite', e.target.value)} placeholder="https://…" />
                  <label style={labelStyle}>Instagram</label>
                  <input style={fieldStyle} value={form.orgInstagram} onChange={(e) => set('orgInstagram', e.target.value)} placeholder="@yourbrand" />
                </>
              )}
            </>
          )}
          {errEl}
        </div>
      )}

      {/* TEMPLATE */}
      {step === 'template' && !loading && (
        <div>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>Pick a category template — it pre-fills sensible defaults you can tweak.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: spacing.md }}>
            {[...COMPETITION_TEMPLATES, CUSTOM_TEMPLATE].map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.id} style={cardStyle(form.templateId === t.id)} onClick={() => set('templateId', t.id)}>
                  <Icon size={22} color={colors.gold.primary} />
                  <div style={{ marginTop: spacing.xs, fontSize: typography.fontSize.sm }}>{t.label}</div>
                </div>
              );
            })}
          </div>
          {form.templateId === CUSTOM_TEMPLATE.id && (
            <div style={{ marginTop: spacing.lg }}>
              <label style={labelStyle}>Your category</label>
              <input style={fieldStyle} value={form.customCategory} onChange={(e) => set('customCategory', e.target.value)} placeholder="e.g. Chefs, Realtors…" />
            </div>
          )}
          {errEl}
        </div>
      )}

      {/* FORMAT */}
      {step === 'format' && !loading && (
        <div>
          <label style={labelStyle}>Competition name</label>
          <input style={fieldStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Most Eligible Austin" />
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: -spacing.md, marginBottom: spacing.lg }}>
            This becomes the title winners earn — make it a social accolade they’ll be excited to promote (e.g. “Realtor of the Year”).
          </p>

          <label style={labelStyle}>When do you plan to launch?</label>
          <select style={fieldStyle} value={form.plannedLaunchTimeframe} onChange={(e) => set('plannedLaunchTimeframe', e.target.value)}>
            <option value="">Select a timeframe…</option>
            {LAUNCH_TIMEFRAMES.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
          </select>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: -spacing.md, marginBottom: spacing.lg }}>
            We don’t recommend launching in less than 4 weeks — you’ll need time for KYC, the agreement, and building entries. You’ll set exact dates before publishing.
          </p>

          <div style={{ display: 'flex', gap: spacing.md }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Number of winners</label>
              <input style={fieldStyle} type="number" min="1" value={form.numberOfWinners} onChange={(e) => set('numberOfWinners', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Entry type</label>
              <select style={fieldStyle} value={form.entryType} onChange={(e) => set('entryType', e.target.value)}>
                <option value="nominations">Nomination</option>
                <option value="applications">Application</option>
              </select>
            </div>
          </div>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: -spacing.sm, marginBottom: spacing.lg }}>
            {ENTRY_TYPE_HELP[form.entryType]}
          </p>
          <label style={labelStyle}>How they win</label>
          <select style={fieldStyle} value={form.selectionCriteria} onChange={(e) => set('selectionCriteria', e.target.value)}>
            <option value="votes">Public votes</option>
            <option value="hybrid">Votes + judges (hybrid)</option>
            <option value="judges">Judges only</option>
          </select>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginBottom: spacing.lg }}>
            Entering is free for contestants; the competition is funded by paid voting (pricing is set by EliteRank).
          </p>

          {/* Eligibility (folded into Format) */}
          <label style={labelStyle}>Territory</label>
          <select style={fieldStyle} value={form.territoryScope} onChange={(e) => set('territoryScope', e.target.value)}>
            <option value="city">City-wide</option>
            <option value="state">State-wide</option>
            <option value="us">US-wide</option>
          </select>

          {form.territoryScope === 'city' && (
            <div style={{ display: 'flex', gap: spacing.md }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>City</label>
                <select style={fieldStyle} value={form.cityId} onChange={(e) => set('cityId', e.target.value)}>
                  <option value="">Select a city…</option>
                  {lookups.cities.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Radius (miles)</label>
                <input style={fieldStyle} type="number" min="1" value={form.eligibilityRadius} onChange={(e) => set('eligibilityRadius', e.target.value)} />
              </div>
            </div>
          )}
          {form.territoryScope === 'state' && (
            <>
              <label style={labelStyle}>State</label>
              <select style={fieldStyle} value={form.territoryState} onChange={(e) => set('territoryState', e.target.value)}>
                <option value="">Select a state…</option>
                {US_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </>
          )}
          {form.territoryScope === 'us' && (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
              Open across the US.
            </p>
          )}

          <label style={labelStyle}>Who can enter</label>
          <div style={{ display: 'flex', gap: spacing.md }}>
            <div style={{ flex: 1.2 }}>
              <select style={fieldStyle} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="all">All genders</option>
                <option value="female">Women</option>
                <option value="male">Men</option>
                <option value="LGBTQ+">LGBTQ+</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input style={fieldStyle} type="number" min="18" placeholder="Min age" value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <input style={fieldStyle} type="number" min="18" placeholder="Max (blank = none)" value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} />
            </div>
          </div>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginBottom: spacing.lg }}>All competitions are 18+.</p>
          {template?.relationshipRelevant && (
            <>
              <label style={labelStyle}>Relationship status</label>
              <select style={fieldStyle} value={form.relationshipStatus} onChange={(e) => set('relationshipStatus', e.target.value)}>
                <option value="">Any</option>
                <option value="single">Single</option>
                <option value="engaged">Engaged</option>
                <option value="married">Married</option>
              </select>
            </>
          )}
          {errEl}
        </div>
      )}

      {/* PRIZES */}
      {step === 'prizes' && !loading && (
        <div>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
            You’ll add the specific prizes, sponsors and IRL events in your dashboard after creating — just the basics here.
          </p>

          <label style={labelStyle}>Is there a cash prize?</label>
          <div style={{ display: 'flex', gap: spacing.md, marginBottom: form.cashPrizeYes ? spacing.md : spacing.lg }}>
            <div style={{ ...cardStyle(form.cashPrizeYes), flex: 1 }} onClick={() => set('cashPrizeYes', true)}>Yes</div>
            <div style={{ ...cardStyle(!form.cashPrizeYes), flex: 1 }} onClick={() => { set('cashPrizeYes', false); set('cashPrizeAmount', ''); }}>No</div>
          </div>
          {form.cashPrizeYes && (
            <>
              <label style={labelStyle}>Total cash prize (USD)</label>
              <input style={fieldStyle} type="number" min="0" value={form.cashPrizeAmount} onChange={(e) => set('cashPrizeAmount', e.target.value)} placeholder="e.g. 1000" />
              {Number(form.cashPrizeAmount) > 1999 && (
                <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.xs, marginTop: -spacing.md, marginBottom: spacing.lg }}>
                  Cash prizes over $1,999 require a quick review call with EliteRank before approval — we’ll reach out to schedule it.
                </p>
              )}
            </>
          )}

          <label style={labelStyle}>Are there sponsored prizes (goods or services)?</label>
          <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
            <div style={{ ...cardStyle(form.sponsoredPrizesYes), flex: 1 }} onClick={() => set('sponsoredPrizesYes', true)}>Yes</div>
            <div style={{ ...cardStyle(!form.sponsoredPrizesYes), flex: 1 }} onClick={() => set('sponsoredPrizesYes', false)}>No</div>
          </div>

          <label style={labelStyle}>Are you donating a portion of proceeds to charity?</label>
          <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
            <div style={{ ...cardStyle(form.charityYes), flex: 1 }} onClick={() => set('charityYes', true)}>Yes</div>
            <div style={{ ...cardStyle(!form.charityYes), flex: 1 }} onClick={() => set('charityYes', false)}>No</div>
          </div>
          {form.charityYes && (
            <>
              <label style={labelStyle}>Percentage to charity (%)</label>
              <input style={fieldStyle} type="number" min="1" max="100" value={form.charityPercentage} onChange={(e) => set('charityPercentage', e.target.value)} />
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>You’ll pick the specific charity later in your dashboard.</p>
            </>
          )}
          {errEl}
        </div>
      )}

      {/* REVIEW */}
      {step === 'review' && !loading && (
        <div>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>Does this look right? You can edit everything in your dashboard before publishing.</p>
          {[
            ['Host', form.hostType === 'individual' ? `${form.soloName} (individual)` : (orgCreatingNew ? `${form.newOrgName} (${form.orgType})` : lookups.orgs.find((o) => o.id === form.organizationId)?.name)],
            ['Template', template?.id === CUSTOM_TEMPLATE.id ? form.customCategory : template?.label],
            ['Winners', form.numberOfWinners],
            ['Entry', form.entryType === 'nominations' ? 'Nomination' : 'Application'],
            ['How they win', form.selectionCriteria === 'votes' ? 'Public votes' : form.selectionCriteria === 'judges' ? 'Judges only' : 'Votes + judges'],
            ['Territory', form.territoryScope === 'us'
              ? 'US-wide'
              : form.territoryScope === 'state'
              ? `State-wide · ${form.territoryState || '—'}`
              : `City-wide · ${lookups.cities.find((c) => c.id === form.cityId)?.name || '—'} (${form.eligibilityRadius} mi)`],
            ['Who can enter', `${({ all: 'All genders', female: 'Women', male: 'Men', 'LGBTQ+': 'LGBTQ+' }[form.gender] || '')}${form.ageMin ? `, ${form.ageMin}–${form.ageMax || '+'}` : ''}`],
            ['Cash prize', form.cashPrizeYes ? `$${Number(form.cashPrizeAmount) || 0}` : 'No'],
            ['Sponsored prizes', form.sponsoredPrizesYes ? 'Yes' : 'No'],
            ['Charity', form.charityYes ? `${form.charityPercentage}% of proceeds` : 'No'],
            ['Planned launch', LAUNCH_TIMEFRAMES.find((t) => t.id === form.plannedLaunchTimeframe)?.label || '—'],
            ['Season', form.season],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing.sm} 0`, borderBottom: `1px solid ${colors.border.secondary}`, fontSize: typography.fontSize.sm }}>
              <span style={{ color: colors.text.muted }}>{k}</span>
              <span style={{ color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>{v || '—'}</span>
            </div>
          ))}
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.lg }}>
            Next: accept the Host Agreement and connect Stripe in your dashboard. Publishing is approved by EliteRank.
          </p>
          {errEl}
        </div>
      )}
    </Modal>
  );
}

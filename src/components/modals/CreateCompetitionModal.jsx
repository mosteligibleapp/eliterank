import React, { useState, useEffect, useCallback } from 'react';
import { Loader, Sparkles, User, Building2, ArrowLeft } from 'lucide-react';
import { Modal, Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';
import { slugify, generateCompetitionSlug } from '../../utils/slugs';

const NEW_ORG = '__new__';

/**
 * CreateCompetitionModal — self-serve host competition creation.
 *
 * Starts with the Sponsor-of-record choice (Individual vs Organization), per the
 * onboarding flow, then collects the competition basics. The creator becomes the
 * host (no assignment step). Creates a DRAFT via the locked create_host_*
 * RPCs; publishing stays admin-approved.
 *
 * Props: isOpen, onClose, userId, onCreated(competition)
 */
export default function CreateCompetitionModal({ isOpen, onClose, userId, onCreated }) {
  const [hostType, setHostType] = useState(null); // 'individual' | 'organization'
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [lookups, setLookups] = useState({ cities: [], categories: [], demographics: [], orgs: [] });
  const [form, setForm] = useState({
    soloName: '',
    organizationId: '',
    newOrgName: '',
    orgType: 'company',
    name: '',
    cityId: '',
    categoryId: '',
    demographicId: '',
    season: new Date().getFullYear(),
    numberOfWinners: 5,
    pricePerVote: 1.0,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Reset to the choice screen each time the modal opens.
  useEffect(() => {
    if (isOpen) { setHostType(null); setError(null); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cities, categories, demographics, orgs, profile] = await Promise.all([
          supabase.from('cities').select('id, name, state, slug').order('name'),
          supabase.from('categories').select('id, name, slug').eq('active', true).order('name'),
          supabase.from('demographics').select('id, label, slug').eq('active', true).order('id'),
          userId
            ? supabase.from('organizations').select('id, name, slug, org_type').eq('owner_id', userId).order('name')
            : Promise.resolve({ data: [] }),
          userId
            ? supabase.from('profiles').select('first_name, last_name').eq('id', userId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (cancelled) return;
        setLookups({
          cities: cities.data || [],
          categories: categories.data || [],
          demographics: demographics.data || [],
          orgs: orgs.data || [],
        });
        const fullName = `${profile.data?.first_name || ''} ${profile.data?.last_name || ''}`.trim();
        setForm((f) => ({
          ...f,
          soloName: f.soloName || fullName,
          organizationId: orgs.data?.[0]?.id || NEW_ORG,
        }));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load options.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, userId]);

  const handleCreate = useCallback(async () => {
    setError(null);
    const city = lookups.cities.find((c) => c.id === form.cityId);
    const demo = lookups.demographics.find((d) => d.id === form.demographicId);

    if (!form.cityId || !form.categoryId || !form.demographicId) {
      setError('Pick a city, category and demographic.');
      return;
    }
    if (hostType === 'individual' && !form.soloName.trim()) {
      setError('Enter your name — it’s shown as the host.');
      return;
    }
    const orgCreatingNew = lookups.orgs.length === 0 || form.organizationId === NEW_ORG;
    if (hostType === 'organization' && orgCreatingNew && !form.newOrgName.trim()) {
      setError('Enter a name for your organization.');
      return;
    }

    setCreating(true);
    try {
      // Resolve the Sponsor-of-record org.
      let organizationId;
      let orgName;
      if (hostType === 'individual') {
        // Solo host: reuse their personal (individual) org if one exists, else create it.
        const personal = lookups.orgs.find((o) => o.org_type === 'individual');
        if (personal) {
          organizationId = personal.id;
          orgName = personal.name;
        } else {
          const name = form.soloName.trim();
          const { data: org, error: orgErr } = await supabase.rpc('create_host_organization', {
            p_name: name, p_slug: slugify(name), p_type: 'individual',
          });
          if (orgErr) throw orgErr;
          organizationId = org.id;
          orgName = org.name;
        }
      } else if (orgCreatingNew) {
        const name = form.newOrgName.trim();
        const { data: org, error: orgErr } = await supabase.rpc('create_host_organization', {
          p_name: name, p_slug: slugify(name), p_type: form.orgType,
        });
        if (orgErr) throw orgErr;
        organizationId = org.id;
        orgName = org.name;
      } else {
        organizationId = form.organizationId;
        orgName = lookups.orgs.find((o) => o.id === organizationId)?.name;
      }

      const name = form.name.trim() || `${orgName || 'Competition'} ${city?.name || ''}`.trim();
      const slug = generateCompetitionSlug({
        name, citySlug: city?.slug, season: Number(form.season), demographicSlug: demo?.slug,
      });

      const { data: comp, error: compErr } = await supabase.rpc('create_host_competition', {
        p_payload: {
          organization_id: organizationId,
          city_id: form.cityId,
          category_id: form.categoryId,
          demographic_id: form.demographicId,
          season: Number(form.season),
          name,
          slug,
          number_of_winners: Number(form.numberOfWinners) || 5,
          price_per_vote: Number(form.pricePerVote) || 1.0,
        },
      });
      if (compErr) throw compErr;
      onCreated?.(comp);
    } catch (err) {
      console.error('Failed to create competition:', err);
      setError(err.message || 'Could not create the competition. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [form, lookups, hostType, onCreated]);

  const labelStyle = {
    display: 'block', color: colors.text.secondary, fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs,
  };
  const fieldStyle = {
    width: '100%', padding: spacing.md, background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`, borderRadius: borderRadius.lg,
    color: '#fff', fontSize: typography.fontSize.md, marginBottom: spacing.lg,
  };
  const choiceCardStyle = (active) => ({
    flex: 1, padding: spacing.xl, textAlign: 'center', cursor: 'pointer',
    background: active ? 'rgba(212,175,55,0.1)' : colors.background.secondary,
    border: `1px solid ${active ? colors.gold.primary : colors.border.light}`,
    borderRadius: borderRadius.lg, color: colors.text.primary,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !creating && onClose?.()}
      title="Create a competition"
      maxWidth="560px"
      footer={
        hostType ? (
          <>
            <Button variant="secondary" onClick={() => setHostType(null)} disabled={creating} icon={ArrowLeft} style={{ width: 'auto' }}>
              Back
            </Button>
            <Button onClick={handleCreate} disabled={creating || loading} icon={creating ? Loader : Sparkles}>
              {creating ? 'Creating…' : 'Create draft'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>Cancel</Button>
        )
      }
    >
      {/* Step 1 — Sponsor of record */}
      {!hostType && (
        <div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, marginBottom: spacing.xl }}>
            Are you hosting as an individual or an organization?
          </p>
          <div style={{ display: 'flex', gap: spacing.lg }}>
            <div style={choiceCardStyle(false)} onClick={() => setHostType('individual')}>
              <User size={28} color={colors.gold.primary} style={{ marginBottom: spacing.md }} />
              <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>Individual</div>
              <div style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                You're the host and the Sponsor of record.
              </div>
            </div>
            <div style={choiceCardStyle(false)} onClick={() => setHostType('organization')}>
              <Building2 size={28} color={colors.gold.primary} style={{ marginBottom: spacing.md }} />
              <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>Organization</div>
              <div style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                A company, non-profit or agency is the Sponsor of record.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — details */}
      {hostType && (loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxl, color: colors.text.secondary }}>
          <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div>
          {hostType === 'individual' ? (
            <>
              <label style={labelStyle}>Your name (shown as the host / Sponsor of record)</label>
              <input style={fieldStyle} value={form.soloName} onChange={(e) => set('soloName', e.target.value)} placeholder="Your full name" />
            </>
          ) : (
            <>
              {/* "Select" only shows if you already belong to organizations. */}
              {lookups.orgs.length > 0 && (
                <>
                  <label style={labelStyle}>Organization</label>
                  <select style={fieldStyle} value={form.organizationId} onChange={(e) => set('organizationId', e.target.value)}>
                    {lookups.orgs.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
                    <option value={NEW_ORG}>+ Create a new organization</option>
                  </select>
                </>
              )}
              {(lookups.orgs.length === 0 || form.organizationId === NEW_ORG) && (
                <>
                  <label style={labelStyle}>Organization name</label>
                  <input style={fieldStyle} value={form.newOrgName} onChange={(e) => set('newOrgName', e.target.value)} placeholder="e.g. Your Brand LLC" />
                  <label style={labelStyle}>Entity type</label>
                  <select style={fieldStyle} value={form.orgType} onChange={(e) => set('orgType', e.target.value)}>
                    <option value="company">Company</option>
                    <option value="non_profit">Non-profit</option>
                    <option value="agency">Agency</option>
                  </select>
                </>
              )}
            </>
          )}

          <label style={labelStyle}>City</label>
          <select style={fieldStyle} value={form.cityId} onChange={(e) => set('cityId', e.target.value)}>
            <option value="">Select a city…</option>
            {lookups.cities.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>))}
          </select>

          <label style={labelStyle}>Category</label>
          <select style={fieldStyle} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Select a category…</option>
            {lookups.categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>

          <label style={labelStyle}>Demographic</label>
          <select style={fieldStyle} value={form.demographicId} onChange={(e) => set('demographicId', e.target.value)}>
            <option value="">Select a demographic…</option>
            {lookups.demographics.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
          </select>

          <label style={labelStyle}>Competition name (optional)</label>
          <input style={fieldStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Auto-generated if left blank" />

          <div style={{ display: 'flex', gap: spacing.md }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Season</label>
              <input style={fieldStyle} type="number" value={form.season} onChange={(e) => set('season', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Winners</label>
              <input style={fieldStyle} type="number" min="1" value={form.numberOfWinners} onChange={(e) => set('numberOfWinners', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Price / vote ($)</label>
              <input style={fieldStyle} type="number" min="0.25" step="0.25" value={form.pricePerVote} onChange={(e) => set('pricePerVote', e.target.value)} />
            </div>
          </div>

          {error && (
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>{error}</p>
          )}
        </div>
      ))}
    </Modal>
  );
}

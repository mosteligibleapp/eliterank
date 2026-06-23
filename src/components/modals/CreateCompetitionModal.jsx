import React, { useState, useEffect, useCallback } from 'react';
import { Loader, Sparkles } from 'lucide-react';
import { Modal, Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';
import { slugify, generateCompetitionSlug } from '../../utils/slugs';

const NEW_ORG = '__new__';

/**
 * CreateCompetitionModal — self-serve host competition creation.
 *
 * The creator becomes the host (no assignment step). Creates a DRAFT via the
 * locked `create_host_competition` RPC (status forced to draft; publishing stays
 * admin-approved). The host can build out the rest in the dashboard afterward.
 *
 * Props:
 *   - isOpen, onClose
 *   - userId: the current user's id (used to load orgs they own)
 *   - onCreated: (competition) => void
 */
export default function CreateCompetitionModal({ isOpen, onClose, userId, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [lookups, setLookups] = useState({ cities: [], categories: [], demographics: [], orgs: [] });
  const [form, setForm] = useState({
    organizationId: '',
    newOrgName: '',
    name: '',
    cityId: '',
    categoryId: '',
    demographicId: '',
    season: new Date().getFullYear(),
    numberOfWinners: 5,
    pricePerVote: 1.0,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cities, categories, demographics, orgs] = await Promise.all([
          supabase.from('cities').select('id, name, state, slug').order('name'),
          supabase.from('categories').select('id, name, slug').eq('active', true).order('name'),
          supabase.from('demographics').select('id, label, slug').eq('active', true).order('id'),
          userId
            ? supabase.from('organizations').select('id, name, slug').eq('owner_id', userId).order('name')
            : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        setLookups({
          cities: cities.data || [],
          categories: categories.data || [],
          demographics: demographics.data || [],
          orgs: orgs.data || [],
        });
        // Default org selection: their first owned org, else "create new".
        setForm((f) => ({
          ...f,
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
    const usingNewOrg = form.organizationId === NEW_ORG;
    if (usingNewOrg && !form.newOrgName.trim()) {
      setError('Enter a name for your organization.');
      return;
    }

    setCreating(true);
    try {
      // Create the org first if the host is starting a new one.
      let organizationId = form.organizationId;
      let orgName = lookups.orgs.find((o) => o.id === organizationId)?.name;
      if (usingNewOrg) {
        const name = form.newOrgName.trim();
        const { data: org, error: orgErr } = await supabase.rpc('create_host_organization', {
          p_name: name,
          p_slug: slugify(name),
        });
        if (orgErr) throw orgErr;
        organizationId = org.id;
        orgName = org.name;
      }

      const name = form.name.trim() || `${orgName || 'Competition'} ${city?.name || ''}`.trim();
      const slug = generateCompetitionSlug({
        name,
        citySlug: city?.slug,
        season: Number(form.season),
        demographicSlug: demo?.slug,
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
  }, [form, lookups, onCreated]);

  const labelStyle = {
    display: 'block',
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  };
  const fieldStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: '#fff',
    fontSize: typography.fontSize.md,
    marginBottom: spacing.lg,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !creating && onClose?.()}
      title="Create a competition"
      maxWidth="560px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={creating} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || loading} icon={creating ? Loader : Sparkles}>
            {creating ? 'Creating…' : 'Create draft'}
          </Button>
        </>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxl, color: colors.text.secondary }}>
          <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
            This creates a draft you'll configure in the dashboard. You'll accept the Host Agreement and connect Stripe
            before it can be published.
          </p>

          <label style={labelStyle}>Organization</label>
          <select style={fieldStyle} value={form.organizationId} onChange={(e) => set('organizationId', e.target.value)}>
            {lookups.orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
            <option value={NEW_ORG}>+ Create a new organization</option>
          </select>

          {form.organizationId === NEW_ORG && (
            <>
              <label style={labelStyle}>New organization name</label>
              <input
                style={fieldStyle}
                value={form.newOrgName}
                onChange={(e) => set('newOrgName', e.target.value)}
                placeholder="e.g. Your Brand LLC"
              />
            </>
          )}

          <label style={labelStyle}>City</label>
          <select style={fieldStyle} value={form.cityId} onChange={(e) => set('cityId', e.target.value)}>
            <option value="">Select a city…</option>
            {lookups.cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
            ))}
          </select>

          <label style={labelStyle}>Category</label>
          <select style={fieldStyle} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">Select a category…</option>
            {lookups.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label style={labelStyle}>Demographic</label>
          <select style={fieldStyle} value={form.demographicId} onChange={(e) => set('demographicId', e.target.value)}>
            <option value="">Select a demographic…</option>
            {lookups.demographics.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>

          <label style={labelStyle}>Competition name (optional)</label>
          <input
            style={fieldStyle}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Auto-generated if left blank"
          />

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
            <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

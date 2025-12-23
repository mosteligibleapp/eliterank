import React, { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Check, X, Globe } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

const MOCK_CITIES = [
  { id: '1', name: 'New York', state: 'NY', country: 'USA', timezone: 'America/New_York', isActive: true, competitions: 2 },
  { id: '2', name: 'Chicago', state: 'IL', country: 'USA', timezone: 'America/Chicago', isActive: true, competitions: 1 },
  { id: '3', name: 'Miami', state: 'FL', country: 'USA', timezone: 'America/New_York', isActive: true, competitions: 1 },
  { id: '4', name: 'Los Angeles', state: 'CA', country: 'USA', timezone: 'America/Los_Angeles', isActive: true, competitions: 0 },
  { id: '5', name: 'Dallas', state: 'TX', country: 'USA', timezone: 'America/Chicago', isActive: true, competitions: 0 },
  { id: '6', name: 'Atlanta', state: 'GA', country: 'USA', timezone: 'America/New_York', isActive: true, competitions: 0 },
  { id: '7', name: 'Boston', state: 'MA', country: 'USA', timezone: 'America/New_York', isActive: true, competitions: 0 },
  { id: '8', name: 'San Francisco', state: 'CA', country: 'USA', timezone: 'America/Los_Angeles', isActive: true, competitions: 0 },
  { id: '9', name: 'Seattle', state: 'WA', country: 'USA', timezone: 'America/Los_Angeles', isActive: false, competitions: 0 },
  { id: '10', name: 'Denver', state: 'CO', country: 'USA', timezone: 'America/Denver', isActive: false, competitions: 0 },
];

export default function CitiesManager() {
  const [cities, setCities] = useState(MOCK_CITIES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCity, setNewCity] = useState({ name: '', state: '', country: 'USA', timezone: 'America/New_York' });

  const handleToggleActive = (cityId) => {
    setCities(cities.map(c =>
      c.id === cityId ? { ...c, isActive: !c.isActive } : c
    ));
  };

  const handleAddCity = () => {
    if (!newCity.name || !newCity.state) return;

    setCities([...cities, {
      id: `c${Date.now()}`,
      ...newCity,
      isActive: true,
      competitions: 0,
    }]);
    setShowAddModal(false);
    setNewCity({ name: '', state: '', country: 'USA', timezone: 'America/New_York' });
  };

  const handleDeleteCity = (cityId) => {
    setCities(cities.filter(c => c.id !== cityId));
  };

  const activeCities = cities.filter(c => c.isActive);
  const inactiveCities = cities.filter(c => !c.isActive);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Available Cities
          </h1>
          <p style={{ color: colors.text.secondary }}>
            Manage cities where Elite Rank competitions can be hosted
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowAddModal(true)}>
          Add City
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg, marginBottom: spacing.xxl }}>
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <MapPin size={20} style={{ color: '#8b5cf6' }} />
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Total Cities</span>
          </div>
          <p style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
            {cities.length}
          </p>
        </div>
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Check size={20} style={{ color: '#22c55e' }} />
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Active</span>
          </div>
          <p style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#22c55e' }}>
            {activeCities.length}
          </p>
        </div>
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.xl,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Globe size={20} style={{ color: colors.gold.primary }} />
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>With Competitions</span>
          </div>
          <p style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
            {cities.filter(c => c.competitions > 0).length}
          </p>
        </div>
      </div>

      {/* Active Cities */}
      <div style={{ marginBottom: spacing.xxl }}>
        <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Check size={20} style={{ color: '#22c55e' }} />
          Active Cities
        </h2>
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                <th style={{ padding: spacing.lg, textAlign: 'left', color: colors.text.muted, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>City</th>
                <th style={{ padding: spacing.lg, textAlign: 'left', color: colors.text.muted, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>State</th>
                <th style={{ padding: spacing.lg, textAlign: 'left', color: colors.text.muted, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>Timezone</th>
                <th style={{ padding: spacing.lg, textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>Competitions</th>
                <th style={{ padding: spacing.lg, textAlign: 'right', color: colors.text.muted, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeCities.map((city) => (
                <tr key={city.id} style={{ borderBottom: `1px solid ${colors.border.lighter}` }}>
                  <td style={{ padding: spacing.lg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                      <MapPin size={16} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontWeight: typography.fontWeight.medium }}>{city.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: spacing.lg, color: colors.text.secondary }}>{city.state}</td>
                  <td style={{ padding: spacing.lg, color: colors.text.muted, fontSize: typography.fontSize.sm }}>{city.timezone}</td>
                  <td style={{ padding: spacing.lg, textAlign: 'center' }}>
                    {city.competitions > 0 ? (
                      <Badge variant="success" size="sm">{city.competitions}</Badge>
                    ) : (
                      <span style={{ color: colors.text.muted }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: spacing.lg }}>
                    <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleToggleActive(city.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'rgba(239,68,68,0.1)',
                          border: 'none',
                          borderRadius: borderRadius.md,
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                        title="Deactivate"
                      >
                        <X size={16} />
                      </button>
                      {city.competitions === 0 && (
                        <button
                          onClick={() => handleDeleteCity(city.id)}
                          style={{
                            padding: spacing.sm,
                            background: colors.background.secondary,
                            border: 'none',
                            borderRadius: borderRadius.md,
                            color: colors.text.muted,
                            cursor: 'pointer',
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive Cities */}
      {inactiveCities.length > 0 && (
        <div>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg, display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary }}>
            <X size={20} />
            Inactive Cities
          </h2>
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            overflow: 'hidden',
            opacity: 0.7,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {inactiveCities.map((city) => (
                  <tr key={city.id} style={{ borderBottom: `1px solid ${colors.border.lighter}` }}>
                    <td style={{ padding: spacing.lg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <MapPin size={16} style={{ color: colors.text.muted }} />
                        <span style={{ fontWeight: typography.fontWeight.medium, color: colors.text.secondary }}>{city.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: spacing.lg, color: colors.text.muted }}>{city.state}</td>
                    <td style={{ padding: spacing.lg, color: colors.text.muted, fontSize: typography.fontSize.sm }}>{city.timezone}</td>
                    <td style={{ padding: spacing.lg }}>
                      <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleToggleActive(city.id)}
                          style={{
                            padding: spacing.sm,
                            background: 'rgba(34,197,94,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.md,
                            color: '#22c55e',
                            cursor: 'pointer',
                          }}
                          title="Activate"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCity(city.id)}
                          style={{
                            padding: spacing.sm,
                            background: colors.background.secondary,
                            border: 'none',
                            borderRadius: borderRadius.md,
                            color: colors.text.muted,
                            cursor: 'pointer',
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add City Modal */}
      {showAddModal && (
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
            padding: spacing.xxl,
            width: '100%',
            maxWidth: '450px',
            border: `1px solid ${colors.border.light}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
              <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                Add New City
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  City Name *
                </label>
                <input
                  type="text"
                  value={newCity.name}
                  onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                  placeholder="e.g., Phoenix"
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  State *
                </label>
                <input
                  type="text"
                  value={newCity.state}
                  onChange={(e) => setNewCity({ ...newCity, state: e.target.value })}
                  placeholder="e.g., AZ"
                  maxLength={2}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Timezone
                </label>
                <select
                  value={newCity.timezone}
                  onChange={(e) => setNewCity({ ...newCity, timezone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                  }}
                >
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
                <Button variant="secondary" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCity}
                  disabled={!newCity.name || !newCity.state}
                  style={{ flex: 1 }}
                >
                  Add City
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

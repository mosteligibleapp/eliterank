import React, { useState } from 'react';
import { Crown, Plus, MapPin, Calendar, Users, Edit2, Trash2, UserPlus, ChevronDown, Check, X, Eye } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

// Mock data for competition templates
const MOCK_TEMPLATES = [
  {
    id: '1',
    name: 'Most Eligible New York',
    city: 'New York',
    season: 2026,
    status: 'active',
    assignedHost: { id: 'h1', name: 'James Davidson', email: 'host@eliterank.com' },
    votePrice: 1.00,
    hostPayoutPercentage: 20,
    maxContestants: 30,
    nominationStart: '2026-01-15',
    nominationEnd: '2026-02-15',
    votingStart: '2026-02-20',
    votingEnd: '2026-04-15',
    finalsDate: '2026-04-20',
  },
  {
    id: '2',
    name: 'Most Eligible Chicago',
    city: 'Chicago',
    season: 2026,
    status: 'assigned',
    assignedHost: { id: 'h2', name: 'Sarah Miller', email: 'sarah@example.com' },
    votePrice: 1.00,
    hostPayoutPercentage: 20,
    maxContestants: 25,
    nominationStart: '2026-03-01',
    nominationEnd: '2026-04-01',
    votingStart: '2026-04-15',
    votingEnd: '2026-06-15',
    finalsDate: '2026-06-20',
  },
  {
    id: '3',
    name: 'Most Eligible Miami',
    city: 'Miami',
    season: 2026,
    status: 'draft',
    assignedHost: null,
    votePrice: 1.00,
    hostPayoutPercentage: 20,
    maxContestants: 25,
    nominationStart: null,
    nominationEnd: null,
    votingStart: null,
    votingEnd: null,
    finalsDate: null,
  },
];

const AVAILABLE_CITIES = [
  { name: 'New York', state: 'NY' },
  { name: 'Chicago', state: 'IL' },
  { name: 'Miami', state: 'FL' },
  { name: 'Los Angeles', state: 'CA' },
  { name: 'Dallas', state: 'TX' },
  { name: 'Atlanta', state: 'GA' },
  { name: 'Boston', state: 'MA' },
  { name: 'San Francisco', state: 'CA' },
  { name: 'Seattle', state: 'WA' },
  { name: 'Denver', state: 'CO' },
];

const AVAILABLE_HOSTS = [
  { id: 'h1', name: 'James Davidson', email: 'host@eliterank.com', city: 'New York' },
  { id: 'h2', name: 'Sarah Miller', email: 'sarah@example.com', city: 'Chicago' },
  { id: 'h3', name: 'Michael Chen', email: 'michael@example.com', city: null },
  { id: 'h4', name: 'Emily Rodriguez', email: 'emily@example.com', city: null },
];

const statusStyles = {
  draft: { bg: 'rgba(100,100,100,0.2)', color: colors.text.secondary, label: 'Draft' },
  assigned: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: 'Host Assigned' },
  active: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', label: 'Active' },
  completed: { bg: 'rgba(139,92,246,0.2)', color: '#8b5cf6', label: 'Completed' },
};

export default function CompetitionsManager() {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    city: '',
    season: new Date().getFullYear() + 1,
    votePrice: 1.00,
    hostPayoutPercentage: 20,
    maxContestants: 30,
  });

  const handleCreateTemplate = () => {
    const template = {
      id: `t${Date.now()}`,
      name: `Most Eligible ${newTemplate.city}`,
      ...newTemplate,
      status: 'draft',
      assignedHost: null,
      nominationStart: null,
      nominationEnd: null,
      votingStart: null,
      votingEnd: null,
      finalsDate: null,
    };
    setTemplates([...templates, template]);
    setShowCreateModal(false);
    setNewTemplate({
      city: '',
      season: new Date().getFullYear() + 1,
      votePrice: 1.00,
      hostPayoutPercentage: 20,
      maxContestants: 30,
    });
  };

  const handleAssignHost = (templateId, host) => {
    setTemplates(templates.map(t =>
      t.id === templateId
        ? { ...t, assignedHost: host, status: 'assigned' }
        : t
    ));
    setShowAssignModal(false);
    setSelectedTemplate(null);
  };

  const handleActivate = (templateId) => {
    setTemplates(templates.map(t =>
      t.id === templateId ? { ...t, status: 'active' } : t
    ));
  };

  const handleDelete = (templateId) => {
    setTemplates(templates.filter(t => t.id !== templateId));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Competition Templates
          </h1>
          <p style={{ color: colors.text.secondary }}>
            Create and manage competition templates for each city
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          New Competition
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.lg, marginBottom: spacing.xxl }}>
        {[
          { label: 'Total Templates', value: templates.length, icon: Crown },
          { label: 'Active', value: templates.filter(t => t.status === 'active').length, icon: Check },
          { label: 'Awaiting Host', value: templates.filter(t => !t.assignedHost).length, icon: UserPlus },
          { label: 'Cities', value: [...new Set(templates.map(t => t.city))].length, icon: MapPin },
        ].map((stat, i) => (
          <div key={i} style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <stat.icon size={20} style={{ color: '#8b5cf6' }} />
              <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{stat.label}</span>
            </div>
            <p style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: spacing.xl }}>
        {templates.map((template) => {
          const status = statusStyles[template.status];
          return (
            <div
              key={template.id}
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
              }}
            >
              {/* Card Header */}
              <div style={{
                padding: spacing.lg,
                background: template.status === 'active'
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.1), transparent)'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.1), transparent)',
                borderBottom: `1px solid ${colors.border.light}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                      <MapPin size={14} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontSize: typography.fontSize.xs, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {template.city}
                      </span>
                    </div>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                      {template.name}
                    </h3>
                  </div>
                  <span style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: status.bg,
                    color: status.color,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: spacing.lg }}>
                {/* Season & Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.lg }}>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Season</p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>{template.season}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Vote Price</p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>${template.votePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Host Payout</p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>{template.hostPayoutPercentage}%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Max Contestants</p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>{template.maxContestants}</p>
                  </div>
                </div>

                {/* Assigned Host */}
                <div style={{
                  padding: spacing.md,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.lg,
                }}>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>Assigned Host</p>
                  {template.assignedHost ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        borderRadius: borderRadius.full,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.bold,
                        color: '#fff',
                      }}>
                        {template.assignedHost.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{template.assignedHost.name}</p>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{template.assignedHost.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.muted }}>
                      <UserPlus size={16} />
                      <span style={{ fontSize: typography.fontSize.sm }}>No host assigned</span>
                    </div>
                  )}
                </div>

                {/* Dates */}
                {template.nominationStart && (
                  <div style={{ marginBottom: spacing.lg }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>Schedule</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontSize: typography.fontSize.sm }}>
                        <Calendar size={14} style={{ color: colors.text.muted }} />
                        <span style={{ color: colors.text.secondary }}>Nominations:</span>
                        <span>{template.nominationStart} - {template.nominationEnd}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontSize: typography.fontSize.sm }}>
                        <Calendar size={14} style={{ color: colors.text.muted }} />
                        <span style={{ color: colors.text.secondary }}>Voting:</span>
                        <span>{template.votingStart} - {template.votingEnd}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  {!template.assignedHost && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={UserPlus}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowAssignModal(true);
                      }}
                      style={{ flex: 1 }}
                    >
                      Assign Host
                    </Button>
                  )}
                  {template.assignedHost && template.status === 'assigned' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Check}
                      onClick={() => handleActivate(template.id)}
                      style={{ flex: 1 }}
                    >
                      Activate
                    </Button>
                  )}
                  {template.status === 'active' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Eye}
                      style={{ flex: 1 }}
                    >
                      View Dashboard
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit2}
                    style={{ width: '40px', padding: spacing.sm }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(template.id)}
                    style={{ width: '40px', padding: spacing.sm }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
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
            maxWidth: '500px',
            border: `1px solid ${colors.border.light}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
              <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                Create Competition
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              {/* City Select */}
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  City *
                </label>
                <select
                  value={newTemplate.city}
                  onChange={(e) => setNewTemplate({ ...newTemplate, city: e.target.value })}
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
                  <option value="">Select a city</option>
                  {AVAILABLE_CITIES.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name}, {city.state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Season */}
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Season (Year)
                </label>
                <input
                  type="number"
                  value={newTemplate.season}
                  onChange={(e) => setNewTemplate({ ...newTemplate, season: parseInt(e.target.value) })}
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

              {/* Vote Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <div>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Vote Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={newTemplate.votePrice}
                    onChange={(e) => setNewTemplate({ ...newTemplate, votePrice: parseFloat(e.target.value) })}
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
                    Host Payout (%)
                  </label>
                  <input
                    type="number"
                    value={newTemplate.hostPayoutPercentage}
                    onChange={(e) => setNewTemplate({ ...newTemplate, hostPayoutPercentage: parseInt(e.target.value) })}
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
              </div>

              {/* Max Contestants */}
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Max Contestants
                </label>
                <input
                  type="number"
                  value={newTemplate.maxContestants}
                  onChange={(e) => setNewTemplate({ ...newTemplate, maxContestants: parseInt(e.target.value) })}
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

              {/* Actions */}
              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
                <Button variant="secondary" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.city}
                  style={{ flex: 1 }}
                >
                  Create Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Host Modal */}
      {showAssignModal && selectedTemplate && (
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
            maxWidth: '500px',
            border: `1px solid ${colors.border.light}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
              <div>
                <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                  Assign Host
                </h2>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                  {selectedTemplate.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTemplate(null);
                }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {AVAILABLE_HOSTS.map((host) => (
                <div
                  key={host.id}
                  onClick={() => handleAssignHost(selectedTemplate.id, host)}
                  style={{
                    padding: spacing.lg,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.lg,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                      borderRadius: borderRadius.full,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      color: '#fff',
                    }}>
                      {host.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>{host.name}</p>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>{host.email}</p>
                    </div>
                    {host.city && (
                      <Badge variant="secondary" size="sm">
                        <MapPin size={12} /> {host.city}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: spacing.xl }}>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Crown, MapPin, Users, Plus, Settings, FileText, UserCheck, Building2, Calendar } from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import CompetitionsManager from './components/CompetitionsManager';
import HostsManager from './components/HostsManager';
import CitiesManager from './components/CitiesManager';

const TABS = [
  { id: 'competitions', label: 'Competitions', icon: Crown },
  { id: 'hosts', label: 'Hosts', icon: Users },
  { id: 'cities', label: 'Cities', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function SuperAdminPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('competitions');

  const renderContent = () => {
    switch (activeTab) {
      case 'competitions':
        return <CompetitionsManager />;
      case 'hosts':
        return <HostsManager />;
      case 'cities':
        return <CitiesManager />;
      case 'settings':
        return (
          <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
            <Settings size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <h2 style={{ fontSize: typography.fontSize.xl, color: colors.text.secondary }}>
              Settings coming soon
            </h2>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.background.primary }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(212,175,55,0.1))',
        borderBottom: `1px solid ${colors.border.light}`,
        padding: `${spacing.lg} ${spacing.xxl}`,
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Crown size={26} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <h1 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                  Elite Rank
                </h1>
                <Badge variant="warning" size="sm">SUPER ADMIN</Badge>
              </div>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                Manage competitions, hosts, and cities
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        background: colors.background.secondary,
        borderBottom: `1px solid ${colors.border.light}`,
        padding: `0 ${spacing.xxl}`,
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '0' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: `${spacing.lg} ${spacing.xl}`,
                  color: isActive ? '#8b5cf6' : colors.text.secondary,
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                  borderBottom: `2px solid ${isActive ? '#8b5cf6' : 'transparent'}`,
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: spacing.xxl }}>
        {renderContent()}
      </main>
    </div>
  );
}

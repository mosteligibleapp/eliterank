import React from 'react';
import Header from './Header';
import Navigation from './Navigation';
import { gradients, spacing, typography } from '../../styles/theme';

export default function MainLayout({
  children,
  activeTab,
  onTabChange,
  hostProfile,
  onLogout,
}) {
  const containerStyle = {
    minHeight: '100vh',
    background: gradients.background,
    fontFamily: typography.fontFamily,
    color: '#e8e6e3',
  };

  const mainStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `${spacing.xxxl} ${spacing.xxl}`,
  };

  return (
    <div style={containerStyle}>
      <Header hostProfile={hostProfile} onLogout={onLogout} />
      <Navigation activeTab={activeTab} onTabChange={onTabChange} />
      <main style={mainStyle}>{children}</main>
    </div>
  );
}

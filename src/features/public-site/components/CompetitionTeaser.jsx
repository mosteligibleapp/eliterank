import React, { useState } from 'react';
import {
  Crown, MapPin, Calendar, Clock, Users, Briefcase, X, ChevronRight,
  Sparkles, Star, Trophy, Mail, Phone, Building2, Globe, MessageSquare,
  Award, UserPlus
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { formatTimelineDate } from '../../../utils/competitionPhase';
import { supabase } from '../../../lib/supabase';
import { INTEREST_TYPE } from '../../../types/competition';

export default function CompetitionTeaser({
  competition,
  onClose,
  isAuthenticated = false,
  onLogin,
  user,
}) {
  const [activeForm, setActiveForm] = useState(null); // 'host', 'sponsor', 'compete', or 'judge'
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const hasHost = !!competition?.host;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitHostApplication = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!supabase) throw new Error('Database not configured');

      // Build a detailed message combining all host application fields
      const messageParts = [];
      if (formData.socialFollowing) {
        messageParts.push(`Social Media Following: ${formData.socialFollowing}`);
      }
      if (formData.hostExperience) {
        messageParts.push(`Experience: ${formData.hostExperience}`);
      }
      if (formData.whyHost) {
        messageParts.push(`Why I want to host: ${formData.whyHost}`);
      }

      const { error } = await supabase
        .from('interest_submissions')
        .insert({
          competition_id: competition.id,
          interest_type: INTEREST_TYPE.HOSTING,
          name: formData.hostName,
          email: formData.hostEmail,
          phone: formData.hostPhone || null,
          message: messageParts.length > 0 ? messageParts.join('\n\n') : null,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitSuccess('host');
      setFormData({});
    } catch (err) {
      console.error('Error submitting host application:', err);
      setSubmitError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSponsorRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!supabase) throw new Error('Database not configured');

      // Build a detailed message combining all sponsor request fields
      const messageParts = [];
      if (formData.companyName) {
        messageParts.push(`Company: ${formData.companyName}`);
      }
      if (formData.website) {
        messageParts.push(`Website: ${formData.website}`);
      }
      if (formData.sponsorshipTier) {
        const tierLabels = {
          platinum: 'Platinum (Title Sponsor)',
          gold: 'Gold',
          silver: 'Silver',
          bronze: 'Bronze',
          custom: 'Custom / Other',
        };
        messageParts.push(`Sponsorship Interest: ${tierLabels[formData.sponsorshipTier] || formData.sponsorshipTier}`);
      }
      if (formData.sponsorMessage) {
        messageParts.push(`Message: ${formData.sponsorMessage}`);
      }

      const { error } = await supabase
        .from('interest_submissions')
        .insert({
          competition_id: competition.id,
          interest_type: INTEREST_TYPE.SPONSORING,
          name: formData.contactName,
          email: formData.sponsorEmail,
          phone: formData.sponsorPhone || null,
          message: messageParts.length > 0 ? messageParts.join('\n\n') : null,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitSuccess('sponsor');
      setFormData({});
    } catch (err) {
      console.error('Error submitting sponsor request:', err);
      setSubmitError(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCompeteInterest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!supabase) throw new Error('Database not configured');

      const { error } = await supabase
        .from('interest_submissions')
        .insert({
          competition_id: competition.id,
          interest_type: INTEREST_TYPE.COMPETING,
          name: formData.competeName,
          email: formData.competeEmail,
          phone: formData.competePhone || null,
          message: formData.competeMessage || null,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitSuccess('compete');
      setFormData({});
    } catch (err) {
      console.error('Error submitting compete interest:', err);
      setSubmitError(err.message || 'Failed to submit interest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitJudgeInterest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!supabase) throw new Error('Database not configured');

      const { error } = await supabase
        .from('interest_submissions')
        .insert({
          competition_id: competition.id,
          interest_type: INTEREST_TYPE.JUDGING,
          name: formData.judgeName,
          email: formData.judgeEmail,
          phone: formData.judgePhone || null,
          message: formData.judgeMessage || null,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitSuccess('judge');
      setFormData({});
    } catch (err) {
      console.error('Error submitting judge interest:', err);
      setSubmitError(err.message || 'Failed to submit interest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  };

  // Success message after form submission
  if (submitSuccess) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}>
        <header style={{
          background: 'rgba(20,20,30,0.95)',
          borderBottom: `1px solid ${colors.border.light}`,
          padding: `${spacing.lg} ${spacing.xxl}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <Crown size={28} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                Most Eligible <span style={{ color: colors.gold.primary }}>{competition?.city}</span>
              </span>
            </div>
            <Button variant="secondary" onClick={onClose} icon={X}>
              Close
            </Button>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: spacing.xxxl, textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(74,222,128,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing.xl,
          }}>
            <Sparkles size={40} style={{ color: colors.status.success }} />
          </div>

          <h1 style={{
            fontSize: typography.fontSize.xxl,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.md,
          }}>
            {submitSuccess === 'host' ? 'Application Submitted!' : 'Interest Submitted!'}
          </h1>

          <p style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            marginBottom: spacing.xxl,
            lineHeight: 1.6,
          }}>
            {submitSuccess === 'host' && 'Thank you for your interest in hosting! Our team will review your application and get back to you within 48 hours.'}
            {submitSuccess === 'sponsor' && 'Thank you for your interest in sponsoring! Our team will reach out to discuss partnership opportunities.'}
            {submitSuccess === 'compete' && 'Thank you for your interest in competing! We\'ll notify you when nominations open and share details on how to participate.'}
            {submitSuccess === 'judge' && 'Thank you for your interest in judging! Our team will review your application and reach out with more information.'}
          </p>

          <Button onClick={onClose}>
            Back to Competitions
          </Button>
        </main>
      </div>
    );
  }

  // Apply to Host Form
  if (activeForm === 'host') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}>
        <header style={{
          background: 'rgba(20,20,30,0.95)',
          borderBottom: `1px solid ${colors.border.light}`,
          padding: `${spacing.lg} ${spacing.xxl}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <Crown size={28} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                Apply to Host
              </span>
            </div>
            <Button variant="secondary" onClick={() => setActiveForm(null)} icon={X}>
              Back
            </Button>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: spacing.xxxl }}>
          <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
            <h1 style={{
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.md,
            }}>
              Host Most Eligible {competition?.city}
            </h1>
            <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>
              Become the face of your city's most exciting social competition. Hosts lead events, engage with contestants, and build an amazing community.
            </p>
          </div>

          <form onSubmit={handleSubmitHostApplication}>
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
            }}>
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.hostName || ''}
                  onChange={(e) => handleInputChange('hostName', e.target.value)}
                  placeholder="Your full name"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.hostEmail || user?.email || ''}
                  onChange={(e) => handleInputChange('hostEmail', e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  value={formData.hostPhone || ''}
                  onChange={(e) => handleInputChange('hostPhone', e.target.value)}
                  placeholder="(555) 555-5555"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Social Media Following</label>
                <input
                  type="text"
                  value={formData.socialFollowing || ''}
                  onChange={(e) => handleInputChange('socialFollowing', e.target.value)}
                  placeholder="e.g., 10k Instagram, 5k TikTok"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Relevant Experience</label>
                <textarea
                  value={formData.hostExperience || ''}
                  onChange={(e) => handleInputChange('hostExperience', e.target.value)}
                  placeholder="Describe your experience hosting events, building communities, etc."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: spacing.xl }}>
                <label style={labelStyle}>Why do you want to host? *</label>
                <textarea
                  required
                  value={formData.whyHost || ''}
                  onChange={(e) => handleInputChange('whyHost', e.target.value)}
                  placeholder="Tell us why you'd be a great host for this competition"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {submitError && (
                <div style={{
                  padding: spacing.md,
                  background: 'rgba(239,68,68,0.1)',
                  border: `1px solid ${colors.status.error}`,
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.lg,
                }}>
                  <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{submitError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // Request to Sponsor Form
  if (activeForm === 'sponsor') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}>
        <header style={{
          background: 'rgba(20,20,30,0.95)',
          borderBottom: `1px solid ${colors.border.light}`,
          padding: `${spacing.lg} ${spacing.xxl}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <Crown size={28} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                Become a Sponsor
              </span>
            </div>
            <Button variant="secondary" onClick={() => setActiveForm(null)} icon={X}>
              Back
            </Button>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: spacing.xxxl }}>
          <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
            <h1 style={{
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.md,
            }}>
              Sponsor Most Eligible {competition?.city}
            </h1>
            <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>
              Partner with us to reach an engaged audience of ambitious professionals. Sponsors receive prominent branding, event presence, and exclusive networking opportunities.
            </p>
          </div>

          <form onSubmit={handleSubmitSponsorRequest}>
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
            }}>
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName || ''}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Your company name"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName || ''}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="Your full name"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.sponsorEmail || ''}
                  onChange={(e) => handleInputChange('sponsorEmail', e.target.value)}
                  placeholder="contact@company.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  value={formData.sponsorPhone || ''}
                  onChange={(e) => handleInputChange('sponsorPhone', e.target.value)}
                  placeholder="(555) 555-5555"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Website</label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourcompany.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Sponsorship Interest</label>
                <select
                  value={formData.sponsorshipTier || ''}
                  onChange={(e) => handleInputChange('sponsorshipTier', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select a tier...</option>
                  <option value="platinum">Platinum (Title Sponsor)</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="bronze">Bronze</option>
                  <option value="custom">Custom / Other</option>
                </select>
              </div>

              <div style={{ marginBottom: spacing.xl }}>
                <label style={labelStyle}>Message</label>
                <textarea
                  value={formData.sponsorMessage || ''}
                  onChange={(e) => handleInputChange('sponsorMessage', e.target.value)}
                  placeholder="Tell us about your sponsorship goals and any specific interests"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {submitError && (
                <div style={{
                  padding: spacing.md,
                  background: 'rgba(239,68,68,0.1)',
                  border: `1px solid ${colors.status.error}`,
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.lg,
                }}>
                  <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{submitError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // Compete Interest Form
  if (activeForm === 'compete') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}>
        <header style={{
          background: 'rgba(20,20,30,0.95)',
          borderBottom: `1px solid ${colors.border.light}`,
          padding: `${spacing.lg} ${spacing.xxl}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <Crown size={28} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                Compete Interest
              </span>
            </div>
            <Button variant="secondary" onClick={() => setActiveForm(null)} icon={X}>
              Back
            </Button>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: spacing.xxxl }}>
          <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
            <h1 style={{
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.md,
            }}>
              Compete in Most Eligible {competition?.city}
            </h1>
            <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>
              Be notified when nominations open and get first access to compete in the most exciting social competition in your city.
            </p>
          </div>

          <form onSubmit={handleSubmitCompeteInterest}>
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
            }}>
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.competeName || ''}
                  onChange={(e) => handleInputChange('competeName', e.target.value)}
                  placeholder="Your full name"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.competeEmail || user?.email || ''}
                  onChange={(e) => handleInputChange('competeEmail', e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.competePhone || ''}
                  onChange={(e) => handleInputChange('competePhone', e.target.value)}
                  placeholder="(555) 555-5555"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.xl }}>
                <label style={labelStyle}>Tell us about yourself (optional)</label>
                <textarea
                  value={formData.competeMessage || ''}
                  onChange={(e) => handleInputChange('competeMessage', e.target.value)}
                  placeholder="Share a bit about yourself, your interests, and why you'd like to compete"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {submitError && (
                <div style={{
                  padding: spacing.md,
                  background: 'rgba(239,68,68,0.1)',
                  border: `1px solid ${colors.status.error}`,
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.lg,
                }}>
                  <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{submitError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Submitting...' : 'Register Interest'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // Judge Interest Form
  if (activeForm === 'judge') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        zIndex: 100,
        overflow: 'auto',
      }}>
        <header style={{
          background: 'rgba(20,20,30,0.95)',
          borderBottom: `1px solid ${colors.border.light}`,
          padding: `${spacing.lg} ${spacing.xxl}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <Crown size={28} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                Judge Application
              </span>
            </div>
            <Button variant="secondary" onClick={() => setActiveForm(null)} icon={X}>
              Back
            </Button>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: spacing.xxxl }}>
          <div style={{ textAlign: 'center', marginBottom: spacing.xxl }}>
            <h1 style={{
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: '#fff',
              marginBottom: spacing.md,
            }}>
              Judge Most Eligible {competition?.city}
            </h1>
            <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>
              Join our panel of judges and help evaluate the most eligible contestants in {competition?.city}. We're looking for individuals with diverse backgrounds and expertise.
            </p>
          </div>

          <form onSubmit={handleSubmitJudgeInterest}>
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
            }}>
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.judgeName || ''}
                  onChange={(e) => handleInputChange('judgeName', e.target.value)}
                  placeholder="Your full name"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.judgeEmail || user?.email || ''}
                  onChange={(e) => handleInputChange('judgeEmail', e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.judgePhone || ''}
                  onChange={(e) => handleInputChange('judgePhone', e.target.value)}
                  placeholder="(555) 555-5555"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: spacing.xl }}>
                <label style={labelStyle}>Your Background & Experience *</label>
                <textarea
                  required
                  value={formData.judgeMessage || ''}
                  onChange={(e) => handleInputChange('judgeMessage', e.target.value)}
                  placeholder="Tell us about your professional background, expertise, and why you'd be a great judge for this competition"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {submitError && (
                <div style={{
                  padding: spacing.md,
                  background: 'rgba(239,68,68,0.1)',
                  border: `1px solid ${colors.status.error}`,
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.lg,
                }}>
                  <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{submitError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // Main Teaser Page
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0f',
      zIndex: 100,
      overflow: 'auto',
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.1), transparent)',
        borderBottom: `1px solid rgba(212,175,55,0.2)`,
        padding: `${spacing.lg} ${spacing.xxl}`,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                borderRadius: borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Crown size={22} style={{ color: '#0a0a0f' }} />
              </div>
              <div>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Most Eligible
                </p>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                  {competition?.city}
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <Badge variant="warning" size="md" pill>
              <Clock size={12} /> COMING SOON
            </Badge>
            <Button variant="secondary" onClick={onClose} icon={X} style={{ width: 'auto', padding: `${spacing.sm} ${spacing.lg}` }}>
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: `${spacing.xxxl} ${spacing.xl}`,
        background: 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, transparent 100%)',
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: typography.fontWeight.bold,
          color: '#fff',
          marginBottom: spacing.lg,
          lineHeight: 1.1,
        }}>
          Most Eligible
          <span style={{ display: 'block', color: colors.gold.primary }}>{competition?.city}</span>
        </h1>

        <p style={{
          fontSize: typography.fontSize.xl,
          color: colors.text.secondary,
          maxWidth: '600px',
          margin: '0 auto',
          marginBottom: spacing.xxl,
          lineHeight: 1.6,
        }}>
          Season {competition?.season || new Date().getFullYear()} is coming! Be part of the most exciting social competition in {competition?.city}.
        </p>

        {/* Timeline Info */}
        {competition?.nomination_start && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: `${spacing.md} ${spacing.xl}`,
            background: 'rgba(212,175,55,0.1)',
            border: `1px solid ${colors.border.gold}`,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.xxl,
          }}>
            <Calendar size={18} style={{ color: colors.gold.primary }} />
            <span style={{ color: colors.text.primary }}>
              Nominations open {formatTimelineDate(competition.nomination_start, { weekday: undefined })}
            </span>
          </div>
        )}
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: `0 ${spacing.xxl} ${spacing.xxxl}` }}>
        {/* CTA Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: spacing.xl,
          marginBottom: spacing.xxxl,
        }}>
          {/* Apply to Host Card */}
          {!hasHost && (
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.xxl,
              padding: spacing.xxl,
              textAlign: 'center',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'rgba(212,175,55,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: spacing.lg,
              }}>
                <Users size={28} style={{ color: colors.gold.primary }} />
              </div>

              <h3 style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: '#fff',
                marginBottom: spacing.sm,
              }}>
                Apply to Host
              </h3>

              <p style={{
                fontSize: typography.fontSize.md,
                color: colors.text.secondary,
                marginBottom: spacing.xl,
                lineHeight: 1.6,
              }}>
                Become the face of Most Eligible {competition?.city}. Lead events, engage with contestants, and build an amazing community.
              </p>

              <Button onClick={() => setActiveForm('host')} style={{ width: '100%' }}>
                Apply Now <ChevronRight size={18} />
              </Button>
            </div>
          )}

          {/* Request to Sponsor Card */}
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xxl,
            padding: spacing.xxl,
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(212,175,55,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.lg,
            }}>
              <Briefcase size={28} style={{ color: colors.gold.primary }} />
            </div>

            <h3 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: '#fff',
              marginBottom: spacing.sm,
            }}>
              Become a Sponsor
            </h3>

            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
              marginBottom: spacing.xl,
              lineHeight: 1.6,
            }}>
              Partner with us to reach an engaged audience of ambitious professionals in {competition?.city}.
            </p>

            <Button variant="secondary" onClick={() => setActiveForm('sponsor')} style={{ width: '100%' }}>
              Request Info <ChevronRight size={18} />
            </Button>
          </div>

          {/* Compete Card */}
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xxl,
            padding: spacing.xxl,
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(245,158,11,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.lg,
            }}>
              <Trophy size={28} style={{ color: '#f59e0b' }} />
            </div>

            <h3 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: '#fff',
              marginBottom: spacing.sm,
            }}>
              Compete
            </h3>

            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
              marginBottom: spacing.xl,
              lineHeight: 1.6,
            }}>
              Be notified when nominations open and get first access to compete in this competition.
            </p>

            <Button variant="secondary" onClick={() => setActiveForm('compete')} style={{ width: '100%' }}>
              Register Interest <ChevronRight size={18} />
            </Button>
          </div>

          {/* Judge Card */}
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xxl,
            padding: spacing.xxl,
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(59,130,246,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.lg,
            }}>
              <Award size={28} style={{ color: '#3b82f6' }} />
            </div>

            <h3 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: '#fff',
              marginBottom: spacing.sm,
            }}>
              Judge
            </h3>

            <p style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
              marginBottom: spacing.xl,
              lineHeight: 1.6,
            }}>
              Join our panel of judges and help evaluate contestants based on your expertise.
            </p>

            <Button variant="secondary" onClick={() => setActiveForm('judge')} style={{ width: '100%' }}>
              Apply to Judge <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Host Info (if assigned) */}
        {hasHost && (
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.gold}`,
            borderRadius: borderRadius.xxl,
            padding: spacing.xxl,
            marginBottom: spacing.xxxl,
            textAlign: 'center',
          }}>
            <Badge variant="gold" size="sm" style={{ marginBottom: spacing.lg }}>HOST ANNOUNCED</Badge>
            <h3 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: '#fff',
              marginBottom: spacing.sm,
            }}>
              Your Host Has Been Selected
            </h3>
            <p style={{ color: colors.text.secondary }}>
              Stay tuned for more details about your competition host!
            </p>
          </div>
        )}

        {/* What to Expect */}
        <div style={{ marginBottom: spacing.xxxl }}>
          <h2 style={{
            fontSize: typography.fontSize.xxl,
            fontWeight: typography.fontWeight.semibold,
            color: '#fff',
            textAlign: 'center',
            marginBottom: spacing.xl,
          }}>
            What to Expect
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: spacing.xl,
          }}>
            {[
              { icon: UserPlus, title: 'Nominations', desc: 'Nominate yourself or someone you know to compete' },
              { icon: Star, title: 'Voting', desc: 'The public votes for their favorites throughout the season' },
              { icon: Trophy, title: 'Finals', desc: 'Winners crowned at an exclusive finale event' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'rgba(212,175,55,0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: spacing.md,
                }}>
                  <item.icon size={24} style={{ color: colors.gold.primary }} />
                </div>
                <h4 style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: '#fff',
                  marginBottom: spacing.xs,
                }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        {(competition?.nomination_start || competition?.voting_start || competition?.finals_date) && (
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xxl,
            padding: spacing.xxl,
          }}>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: '#fff',
              marginBottom: spacing.xl,
              textAlign: 'center',
            }}>
              Competition Timeline
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              {[
                { label: 'Nominations Open', date: competition?.nomination_start },
                { label: 'Nominations Close', date: competition?.nomination_end },
                { label: 'Voting Begins', date: competition?.voting_start },
                { label: 'Voting Ends', date: competition?.voting_end },
                { label: 'Finals Gala', date: competition?.finals_date },
              ].filter(item => item.date).map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.md,
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: colors.gold.primary,
                  }} />
                  <span style={{ flex: 1, color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                    {item.label}
                  </span>
                  <span style={{ color: colors.text.secondary }}>
                    {formatTimelineDate(item.date, { weekday: undefined })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

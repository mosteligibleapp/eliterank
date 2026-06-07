import React, { useState } from 'react';
import {
  Building2, DollarSign, Trophy, Award, Send, Check, Loader,
  User, Mail, Phone, MessageSquare
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { INTEREST_TYPE, INTEREST_TYPE_CONFIG } from '../../../types/competition';

const INTEREST_OPTIONS = [
  {
    type: INTEREST_TYPE.HOSTING,
    icon: Building2,
    color: '#8b5cf6',
    title: 'Host',
    description: 'Organize and run the competition in your city',
  },
  {
    type: INTEREST_TYPE.SPONSORING,
    icon: DollarSign,
    color: 'var(--color-success)',
    title: 'Sponsor',
    description: 'Support the competition and get brand visibility',
  },
  {
    type: INTEREST_TYPE.COMPETING,
    icon: Trophy,
    color: '#f59e0b',
    title: 'Compete',
    description: 'Participate as a contestant in the competition',
  },
  {
    type: INTEREST_TYPE.JUDGING,
    icon: Award,
    color: '#3b82f6',
    title: 'Judge',
    description: 'Help evaluate and score contestants',
  },
];

export default function InterestForm({ competition, onSuccess }) {
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType) {
      setError('Please select how you would like to participate');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('interest_submissions')
        .insert({
          competition_id: competition.id,
          interest_type: selectedType,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          message: formData.message.trim() || null,
          status: 'pending',
        });

      if (submitError) throw submitError;

      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error submitting interest form:', err);
      setError('Failed to submit. Please try again.');
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
    color: '#fff',
    fontSize: typography.fontSize.md,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  };

  // Success state
  if (isSubmitted) {
    return (
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        padding: spacing.xxl,
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(var(--color-success-rgb),0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: spacing.lg,
        }}>
          <Check size={32} style={{ color: 'var(--color-success)' }} />
        </div>
        <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
          Thank You!
        </h3>
        <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
          Your interest has been submitted. We'll be in touch soon with more details about the competition.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setIsSubmitted(false);
            setSelectedType(null);
            setFormData({ name: '', email: '', phone: '', message: '' });
          }}
        >
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <div style={{
      background: colors.background.card,
      border: `1px solid ${colors.border.light}`,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: spacing.xl,
        borderBottom: `1px solid ${colors.border.light}`,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.1), transparent)',
      }}>
        <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
          Express Your Interest
        </h3>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
          This competition is coming soon. Let us know how you'd like to participate!
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: spacing.xl }}>
        {/* Interest Type Selection */}
        <div style={{ marginBottom: spacing.xl }}>
          <label style={labelStyle}>I'm interested in...</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
            {INTEREST_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = selectedType === option.type;

              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setSelectedType(option.type)}
                  style={{
                    padding: spacing.md,
                    background: isSelected ? `${option.color}20` : colors.background.secondary,
                    border: `2px solid ${isSelected ? option.color : colors.border.light}`,
                    borderRadius: borderRadius.lg,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                    <Icon size={20} style={{ color: option.color }} />
                    <span style={{
                      fontWeight: typography.fontWeight.medium,
                      color: isSelected ? option.color : '#fff',
                    }}>
                      {option.title}
                    </span>
                  </div>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Information */}
        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>
            <User size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Your full name"
            style={inputStyle}
            required
          />
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>
            <Mail size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            style={inputStyle}
            required
          />
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={labelStyle}>
            <Phone size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
            Phone Number (optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="(555) 123-4567"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: spacing.xl }}>
          <label style={labelStyle}>
            <MessageSquare size={14} style={{ display: 'inline', marginRight: spacing.xs, verticalAlign: 'middle' }} />
            Additional Message (optional)
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Tell us more about yourself or any questions you have..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: spacing.md,
            background: 'rgba(var(--color-error-rgb),0.1)',
            border: '1px solid rgba(var(--color-error-rgb),0.3)',
            borderRadius: borderRadius.md,
            color: 'var(--color-error)',
            fontSize: typography.fontSize.sm,
            marginBottom: spacing.lg,
          }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%' }}
          icon={isSubmitting ? Loader : Send}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Interest'}
        </Button>

        <p style={{
          marginTop: spacing.md,
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          textAlign: 'center',
        }}>
          By submitting, you agree to be contacted about this competition.
        </p>
      </form>
    </div>
  );
}

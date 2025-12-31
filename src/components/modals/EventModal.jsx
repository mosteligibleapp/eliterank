import React, { useState, useEffect, useMemo } from 'react';
import { Check, Calendar } from 'lucide-react';
import { Modal, Button, Input, Badge, FormGrid } from '../ui';
import { useModalForm } from '../../hooks';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { parseTypedDate, formatDateForDisplay, computeEventStatus } from '../../utils/dateUtils';

const INITIAL_STATE = { name: '', date: '', endDate: '', location: '' };

export default function EventModal({
  isOpen,
  onClose,
  event,
  onSave,
}) {
  // Transform event data for form (format dates for display)
  const eventData = useMemo(() => {
    if (!event) return null;
    return {
      ...event,
      date: event.date || '',
      endDate: event.endDate || event.end_date || '',
    };
  }, [event]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, eventData, isOpen);
  const isEditing = !!event?.id;

  // Display values (what user sees/types)
  const [displayValues, setDisplayValues] = useState({
    date: '',
    endDate: '',
  });

  // Parse error indicators
  const [parseErrors, setParseErrors] = useState({});

  // Initialize display values when modal opens or event changes
  useEffect(() => {
    if (isOpen) {
      setDisplayValues({
        date: formatDateForDisplay(eventData?.date),
        endDate: formatDateForDisplay(eventData?.endDate || eventData?.end_date),
      });
      setParseErrors({});
    }
  }, [isOpen, eventData]);

  // Compute status based on dates
  const computedStatus = useMemo(() => {
    return computeEventStatus(form.date, form.endDate);
  }, [form.date, form.endDate]);

  // Handle date input blur - parse and validate
  const handleDateBlur = (field, displayValue) => {
    if (!displayValue.trim()) {
      updateField(field, '');
      setParseErrors(prev => ({ ...prev, [field]: false }));
      return;
    }

    const parsed = parseTypedDate(displayValue);
    if (parsed) {
      updateField(field, parsed);
      setDisplayValues(prev => ({ ...prev, [field]: formatDateForDisplay(parsed) }));
      setParseErrors(prev => ({ ...prev, [field]: false }));
    } else {
      setParseErrors(prev => ({ ...prev, [field]: true }));
    }
  };

  const handleSave = () => {
    const data = getFormData();
    onSave({
      name: data.name,
      date: data.date || null,
      endDate: data.endDate || null,
      end_date: data.endDate || null, // For DB compatibility
      location: data.location,
      status: computedStatus, // Auto-computed status
    });
  };

  const hasParseErrors = Object.values(parseErrors).some(Boolean);

  // Status badge config
  const statusConfig = {
    upcoming: { label: 'Upcoming', variant: 'info' },
    active: { label: 'Active', variant: 'success' },
    completed: { label: 'Completed', variant: 'default' },
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Add Event'}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button onClick={handleSave} icon={Check} disabled={!form.name || hasParseErrors}>
            {isEditing ? 'Save Changes' : 'Add Event'}
          </Button>
        </>
      }
    >
      <Input
        label="Event Name"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., Voting Round 1"
      />

      {/* Date inputs with text-based entry */}
      <div style={{ marginBottom: spacing.lg }}>
        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          marginBottom: spacing.sm,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
        }}>
          <Calendar size={12} />
          Enter dates like: Jan 15, 2025 6:00 PM or 1/15/2025 6pm
        </p>
        <FormGrid>
          <div>
            <label style={{
              display: 'block',
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              marginBottom: spacing.sm,
            }}>
              Start Date & Time
            </label>
            <input
              type="text"
              placeholder="Jan 15, 2025 6:00 PM"
              value={displayValues.date}
              onChange={(e) => setDisplayValues(prev => ({ ...prev, date: e.target.value }))}
              onBlur={(e) => handleDateBlur('date', e.target.value)}
              style={{
                ...inputStyle,
                borderColor: parseErrors.date ? '#ef4444' : colors.border.light,
              }}
            />
            {parseErrors.date && (
              <p style={{ fontSize: typography.fontSize.xs, color: '#ef4444', marginTop: spacing.xs }}>
                Invalid date format
              </p>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              marginBottom: spacing.sm,
            }}>
              End Date & Time
            </label>
            <input
              type="text"
              placeholder="Jan 20, 2025 11:59 PM"
              value={displayValues.endDate}
              onChange={(e) => setDisplayValues(prev => ({ ...prev, endDate: e.target.value }))}
              onBlur={(e) => handleDateBlur('endDate', e.target.value)}
              style={{
                ...inputStyle,
                borderColor: parseErrors.endDate ? '#ef4444' : colors.border.light,
              }}
            />
            {parseErrors.endDate && (
              <p style={{ fontSize: typography.fontSize.xs, color: '#ef4444', marginTop: spacing.xs }}>
                Invalid date format
              </p>
            )}
          </div>
        </FormGrid>
      </div>

      {/* Auto-computed status indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        background: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
      }}>
        <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
          Status:
        </span>
        <Badge variant={statusConfig[computedStatus].variant}>
          {statusConfig[computedStatus].label}
        </Badge>
        <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginLeft: 'auto' }}>
          Auto-computed from dates
        </span>
      </div>

      <Input
        label="Location (Optional)"
        value={form.location}
        onChange={(e) => updateField('location', e.target.value)}
        placeholder="e.g., The Plaza Hotel"
      />
    </Modal>
  );
}

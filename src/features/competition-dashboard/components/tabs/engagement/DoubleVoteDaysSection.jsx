import React, { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Button, Badge, Panel } from '../../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../../styles/theme';

// Today's calendar date in the given IANA timezone, as 'YYYY-MM-DD'.
// Matches the server-side today_for_competition() function so the
// "Active today" badge reflects the same day the trigger does.
function todayInTimezone(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

const parseDateLocal = (dateStr) => {
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  return new Date(dateStr);
};

/**
 * DoubleVoteDaysSection — Engagement tab. Pick calendar dates (in the
 * competition's timezone) when every vote counts twice.
 */
export default function DoubleVoteDaysSection({
  doubleDays = [],
  isMobile,
  focusId,
  focusNonce,
  style,
  competitionTimezone,
  timezoneGroups,
  onAddDoubleDay,
  onDeleteDoubleDay,
  onUpdateTimezone,
}) {
  const [newDoubleDayDate, setNewDoubleDayDate] = useState('');
  const [doubleDayError, setDoubleDayError] = useState('');
  const [doubleDaySaving, setDoubleDaySaving] = useState(false);
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [timezoneError, setTimezoneError] = useState('');

  const handleAddDoubleDay = async () => {
    setDoubleDayError('');
    if (!newDoubleDayDate) {
      setDoubleDayError('Pick a date first.');
      return;
    }
    if (!onAddDoubleDay) return;
    setDoubleDaySaving(true);
    const result = await onAddDoubleDay(newDoubleDayDate);
    setDoubleDaySaving(false);
    if (result?.success) {
      setNewDoubleDayDate('');
    } else {
      setDoubleDayError(result?.error || 'Could not add date.');
    }
  };

  const handleTimezoneChange = async (e) => {
    const next = e.target.value;
    if (!next || next === competitionTimezone || !onUpdateTimezone) return;
    setTimezoneError('');
    setTimezoneSaving(true);
    const result = await onUpdateTimezone(next);
    setTimezoneSaving(false);
    if (!result?.success) {
      setTimezoneError(result?.error || 'Could not update timezone.');
    }
  };

  return (
    <Panel
      key={`section-doubleVoteDays-${focusId === 'doubleVoteDays' ? focusNonce : 'x'}`}
      id="setup-section-doubleVoteDays"
      title={`Double Vote Days (${doubleDays.length})`}
      icon={Zap}
      collapsible
      defaultCollapsed={focusId !== 'doubleVoteDays'}
      style={style}
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
          Pick calendar dates when every vote (free and paid) counts twice for this competition.
        </p>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.primary,
            marginBottom: spacing.xs,
          }}>
            Timezone
          </label>
          <select
            value={competitionTimezone}
            onChange={handleTimezoneChange}
            disabled={timezoneSaving || !onUpdateTimezone}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.md,
              color: colors.text.primary,
              fontSize: typography.fontSize.base,
            }}
          >
            {timezoneGroups.map(([groupName, zones]) => (
              <optgroup key={groupName} label={groupName}>
                {zones.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.secondary,
            marginTop: spacing.xs,
          }}>
            Dates below are interpreted in this timezone.
          </p>
          {timezoneError && (
            <p style={{
              color: colors.status.error,
              fontSize: typography.fontSize.sm,
              marginTop: spacing.xs,
            }}>
              {timezoneError}
            </p>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: spacing.sm,
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: spacing.lg,
        }}>
          <input
            type="date"
            value={newDoubleDayDate}
            onChange={(e) => {
              setNewDoubleDayDate(e.target.value);
              if (doubleDayError) setDoubleDayError('');
            }}
            min={todayInTimezone(competitionTimezone)}
            style={{
              flex: 1,
              padding: `${spacing.sm} ${spacing.md}`,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.md,
              color: colors.text.primary,
              fontSize: typography.fontSize.base,
              colorScheme: 'dark',
            }}
          />
          <Button
            size="sm"
            icon={Plus}
            onClick={handleAddDoubleDay}
            disabled={doubleDaySaving || !newDoubleDayDate}
          >
            {doubleDaySaving ? 'Adding…' : 'Add Date'}
          </Button>
        </div>

        {doubleDayError && (
          <p style={{
            color: colors.status.error,
            fontSize: typography.fontSize.sm,
            marginBottom: spacing.md,
          }}>
            {doubleDayError}
          </p>
        )}

        {doubleDays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            <Zap size={48} style={{ marginBottom: spacing.md, opacity: 0.5, color: colors.gold.primary }} />
            <p>No double vote days scheduled</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: spacing.sm }}>
            {doubleDays.map((day) => {
              const dateObj = parseDateLocal(day.date);
              // Compare against today in the competition's timezone, matching
              // the server-side today_for_competition() function.
              const todayStr = todayInTimezone(competitionTimezone);
              const isToday = day.date === todayStr;
              const isPast = day.date < todayStr;
              return (
                <div key={day.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  border: isToday ? `1px solid ${colors.gold.primary}` : `1px solid ${colors.border.lighter}`,
                  opacity: isPast ? 0.55 : 1,
                }}>
                  <Zap size={18} style={{ color: colors.gold.primary, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {isToday && <Badge variant="gold" size="sm">Active today</Badge>}
                  {isPast && !isToday && <Badge variant="secondary" size="sm">Past</Badge>}
                  <button
                    onClick={() => onDeleteDoubleDay(day.id)}
                    style={{
                      padding: spacing.sm,
                      background: 'transparent',
                      border: `1px solid rgba(239,68,68,0.3)`,
                      borderRadius: borderRadius.md,
                      color: '#ef4444',
                      cursor: 'pointer',
                      minWidth: '36px',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}

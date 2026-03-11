import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions, shadows, zIndex } from '@shared/styles/theme';
import { useResponsive } from '@shared/hooks/useResponsive';

/**
 * Compact filter/search bar that sits above data tables.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, options: Array<{value: string, label: string}>, value: string}>} props.filters
 * @param {Function} props.onFilterChange - (key, value) => void
 * @param {string} [props.searchValue]
 * @param {Function} [props.onSearchChange] - (value) => void
 * @param {string} [props.searchPlaceholder]
 * @param {React.ReactNode} [props.actions] - Right-aligned buttons
 */
export default function FilterBar({
  filters = [],
  onFilterChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions,
}) {
  const { isMobile } = useResponsive();
  const [searchFocused, setSearchFocused] = useState(false);

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      padding: `${spacing.sm} ${spacing.md}`,
      background: colors.background.card,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: borderRadius.lg,
      minHeight: '44px',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
    },
    searchWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      flex: isMobile ? '1 1 100%' : '0 1 240px',
      minWidth: '0',
    },
    searchIcon: {
      position: 'absolute',
      left: spacing.sm,
      color: searchFocused ? colors.gold.primary : colors.text.tertiary,
      transition: transitions.colors,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
    },
    searchInput: {
      width: '100%',
      height: '32px',
      paddingLeft: spacing.xxl,
      paddingRight: spacing.sm,
      background: colors.background.tertiary,
      border: `1px solid ${searchFocused ? colors.border.focus : colors.border.secondary}`,
      borderRadius: borderRadius.sm,
      color: colors.text.primary,
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.sans,
      outline: 'none',
      transition: transitions.colors,
      boxShadow: searchFocused ? shadows.focus : 'none',
    },
    filtersGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      flex: isMobile ? '1 1 100%' : '0 0 auto',
      flexWrap: 'wrap',
    },
    actionsGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      marginLeft: isMobile ? '0' : 'auto',
      flex: isMobile ? '1 1 100%' : '0 0 auto',
      justifyContent: isMobile ? 'flex-end' : 'flex-end',
    },
  };

  return (
    <div style={styles.container}>
      {onSearchChange && (
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={styles.searchInput}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      )}

      {filters.length > 0 && (
        <div style={styles.filtersGroup}>
          {filters.map((filter) => (
            <FilterDropdown
              key={filter.key}
              label={filter.label}
              options={filter.options}
              value={filter.value}
              onChange={(value) => onFilterChange(filter.key, value)}
            />
          ))}
        </div>
      )}

      {actions && (
        <div style={styles.actionsGroup}>
          {actions}
        </div>
      )}
    </div>
  );
}


/**
 * Inline dropdown filter used within FilterBar.
 */
function FilterDropdown({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption && selectedOption.value !== '' ? selectedOption.label : label;
  const hasValue = value != null && value !== '';

  const styles = {
    wrapper: {
      position: 'relative',
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[1],
      height: '32px',
      padding: `0 ${spacing.md}`,
      background: hasValue ? colors.gold.muted : colors.background.tertiary,
      border: `1px solid ${hasValue ? colors.gold.dark : colors.border.secondary}`,
      borderRadius: borderRadius.sm,
      color: hasValue ? colors.gold.primary : colors.text.secondary,
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.sans,
      fontWeight: typography.fontWeight.medium,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: transitions.colors,
      outline: 'none',
    },
    dropdown: {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      minWidth: '160px',
      background: colors.background.elevated,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: borderRadius.md,
      boxShadow: shadows.lg,
      zIndex: zIndex.dropdown,
      padding: `${spacing[1]} 0`,
      animation: 'fadeIn 150ms ease',
      overflow: 'hidden',
    },
    option: {
      display: 'block',
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      background: 'none',
      border: 'none',
      color: colors.text.primary,
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.sans,
      textAlign: 'left',
      cursor: 'pointer',
      transition: transitions.colors,
      whiteSpace: 'nowrap',
    },
    optionHover: {
      background: colors.interactive.hover,
    },
    optionActive: {
      color: colors.gold.primary,
      fontWeight: typography.fontWeight.medium,
    },
  };

  return (
    <div ref={ref} style={styles.wrapper}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <button
        style={styles.button}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {displayLabel}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: transitions.transform }} />
      </button>

      {open && (
        <div style={styles.dropdown} role="listbox">
          <button
            style={{
              ...styles.option,
              ...(hovered === '__all' ? styles.optionHover : {}),
              ...(!hasValue ? styles.optionActive : {}),
              color: !hasValue ? colors.gold.primary : colors.text.tertiary,
              fontStyle: 'italic',
            }}
            onClick={() => { onChange(''); setOpen(false); }}
            onMouseEnter={() => setHovered('__all')}
            onMouseLeave={() => setHovered(null)}
            role="option"
            aria-selected={!hasValue}
          >
            All
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              style={{
                ...styles.option,
                ...(hovered === opt.value ? styles.optionHover : {}),
                ...(value === opt.value ? styles.optionActive : {}),
              }}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onMouseEnter={() => setHovered(opt.value)}
              onMouseLeave={() => setHovered(null)}
              role="option"
              aria-selected={value === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

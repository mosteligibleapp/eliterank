import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions, shadows, gradients } from '@shared/styles/theme';
import { useResponsive } from '@shared/hooks/useResponsive';

const SKELETON_ROWS = 8;
const ROW_HEIGHT = '40px';

/**
 * Compact, sortable data table for admin data display.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, width?: string, render?: Function, sortable?: boolean}>} props.columns
 * @param {Array<Object>} props.data
 * @param {Function} [props.onRowClick] - (row) => void
 * @param {string} [props.emptyMessage] - Shown when no data
 * @param {boolean} [props.loading]
 * @param {Function} [props.actions] - (row) => ReactNode
 * @param {boolean} [props.expandable]
 * @param {Function} [props.renderExpanded] - (row) => ReactNode
 */
export default function DataTable({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found',
  loading = false,
  actions,
  expandable = false,
  renderExpanded,
}) {
  const { isMobile } = useResponsive();
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [hoveredRow, setHoveredRow] = useState(null);
  const styleRef = useRef(null);

  const handleSort = useCallback((key) => {
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  }, [sortKey]);

  const toggleExpand = useCallback((rowIndex) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortKey || !data) return data || [];
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortDir === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  const allColumns = useMemo(() => {
    const cols = [...columns];
    if (actions) {
      cols.push({ key: '__actions', label: '', width: '48px', sortable: false });
    }
    return cols;
  }, [columns, actions]);

  const styles = {
    wrapper: {
      borderRadius: borderRadius.lg,
      border: `1px solid ${colors.border.primary}`,
      overflow: 'hidden',
      background: colors.background.card,
    },
    scrollContainer: {
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: isMobile ? '600px' : undefined,
    },
    thead: {
      position: 'sticky',
      top: 0,
      zIndex: 2,
    },
    th: {
      height: ROW_HEIGHT,
      padding: `0 ${spacing.md}`,
      textAlign: 'left',
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing.wider,
      background: colors.background.tertiary,
      borderBottom: `1px solid ${colors.border.primary}`,
      whiteSpace: 'nowrap',
      userSelect: 'none',
    },
    thSortable: {
      cursor: 'pointer',
      transition: transitions.colors,
    },
    thSortableHover: {
      color: colors.text.secondary,
    },
    sortIcon: {
      display: 'inline-flex',
      verticalAlign: 'middle',
      marginLeft: spacing[1],
      opacity: 0.5,
    },
    sortIconActive: {
      opacity: 1,
      color: colors.gold.primary,
    },
    td: {
      height: ROW_HEIGHT,
      padding: `0 ${spacing.md}`,
      fontSize: typography.fontSize.sm,
      color: colors.text.primary,
      borderBottom: `1px solid ${colors.border.secondary}`,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '300px',
    },
    row: {
      transition: transitions.colors,
      cursor: onRowClick ? 'pointer' : 'default',
    },
    rowHover: {
      background: colors.interactive.hover,
    },
    rowEven: {
      background: 'rgba(255, 255, 255, 0.015)',
    },
    expandToggle: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      marginRight: spacing[1],
      cursor: 'pointer',
      color: colors.text.tertiary,
      transition: transitions.transform,
      background: 'none',
      border: 'none',
      padding: 0,
      borderRadius: borderRadius.xs,
    },
    expandedContent: {
      padding: spacing.lg,
      background: colors.background.tertiary,
      borderBottom: `1px solid ${colors.border.secondary}`,
    },
    empty: {
      textAlign: 'center',
      padding: spacing.xxl,
      color: colors.text.tertiary,
      fontSize: typography.fontSize.sm,
    },
    skeletonCell: {
      height: '12px',
      borderRadius: borderRadius.xs,
      background: colors.background.elevated,
      backgroundImage: gradients.skeleton,
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    },
  };

  // Inject shimmer keyframes once
  if (!styleRef.current) {
    styleRef.current = true;
  }

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
        <div style={styles.scrollContainer}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                {allColumns.map((col) => (
                  <th key={col.key} style={{ ...styles.th, width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
                <tr key={rowIdx} style={rowIdx % 2 === 1 ? styles.rowEven : undefined}>
                  {allColumns.map((col) => (
                    <td key={col.key} style={styles.td}>
                      <div style={{
                        ...styles.skeletonCell,
                        width: col.key === '__actions' ? '24px' : `${60 + Math.random() * 40}%`,
                      }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!sortedData || sortedData.length === 0) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.scrollContainer}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                {allColumns.map((col) => (
                  <th key={col.key} style={{ ...styles.th, width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div style={styles.empty}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.scrollContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              {expandable && (
                <th style={{ ...styles.th, width: '32px', padding: `0 ${spacing.sm}` }} />
              )}
              {allColumns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{
                      ...styles.th,
                      width: col.width,
                      ...(col.sortable ? styles.thSortable : {}),
                    }}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[1] }}>
                      {col.label}
                      {col.sortable && (
                        <span style={isSorted ? { ...styles.sortIcon, ...styles.sortIconActive } : styles.sortIcon}>
                          {isSorted && sortDir === 'desc' ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronUp size={12} />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIdx) => {
              const isExpanded = expandedRows.has(rowIdx);
              const isHovered = hoveredRow === rowIdx;
              const isEven = rowIdx % 2 === 1;

              return (
                <React.Fragment key={row.id ?? rowIdx}>
                  <tr
                    style={{
                      ...styles.row,
                      ...(isEven ? styles.rowEven : {}),
                      ...(isHovered ? styles.rowHover : {}),
                    }}
                    onMouseEnter={() => setHoveredRow(rowIdx)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => {
                      if (onRowClick) onRowClick(row);
                    }}
                  >
                    {expandable && (
                      <td style={{ ...styles.td, width: '32px', padding: `0 ${spacing.sm}` }}>
                        <button
                          style={{
                            ...styles.expandToggle,
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(rowIdx);
                          }}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    )}
                    {allColumns.map((col) => {
                      if (col.key === '__actions') {
                        return (
                          <td
                            key={col.key}
                            style={{ ...styles.td, width: col.width, overflow: 'visible' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {actions(row)}
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} style={{ ...styles.td, width: col.width }}>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                  {expandable && isExpanded && renderExpanded && (
                    <tr>
                      <td
                        colSpan={allColumns.length + 1}
                        style={{ padding: 0, border: 'none' }}
                      >
                        <div style={styles.expandedContent}>
                          {renderExpanded(row)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

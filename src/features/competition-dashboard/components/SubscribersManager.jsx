import React, { useState } from 'react';
import { Bell, XCircle } from 'lucide-react';
import { Panel, Avatar } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

/**
 * SubscribersManager — people who opted in to "Notify me when nominations
 * open" from the coming-soon page. An audience roster, shown on the People tab.
 */
export default function SubscribersManager({ subscribers = [], onRemoveSubscriber }) {
  const [removingIds, setRemovingIds] = useState(new Set());

  const handleRemoveSubscriber = async (sub) => {
    if (!onRemoveSubscriber) return;
    if (!confirm(`Remove ${sub.name} from this competition's subscriber list? They won't be notified when nominations open.`)) return;
    setRemovingIds((prev) => new Set(prev).add(sub.id));
    try {
      const result = await onRemoveSubscriber(sub.id);
      if (!result?.success) {
        alert(`Failed to remove subscriber: ${result?.error || 'Unknown error'}`);
      }
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }
  };

  return (
    <Panel
      title={`Subscribers (${subscribers.length})`}
      icon={Bell}
      collapsible
      defaultOpen={subscribers.length > 0}
    >
      <div style={{ padding: spacing.lg }}>
        {subscribers.length === 0 ? (
          <p style={{ color: colors.text.secondary, textAlign: 'center', padding: spacing.lg }}>
            No one has subscribed yet. They'll appear here when visitors opt in from the coming-soon page.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  background: colors.background.tertiary,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.md,
                }}
              >
                <Avatar name={sub.name} src={sub.avatar} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                    {sub.name}
                  </p>
                  <p
                    style={{
                      color: colors.text.secondary,
                      fontSize: typography.fontSize.sm,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {sub.email}
                  </p>
                </div>
                {sub.subscribedAt && (
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
                    {new Date(sub.subscribedAt).toLocaleDateString()}
                  </p>
                )}
                {onRemoveSubscriber && (
                  <button
                    onClick={() => handleRemoveSubscriber(sub)}
                    disabled={removingIds.has(sub.id)}
                    title="Remove from subscriber list"
                    style={{
                      padding: spacing.xs,
                      background: colors.border.error,
                      border: 'none',
                      borderRadius: borderRadius.sm,
                      cursor: removingIds.has(sub.id) ? 'not-allowed' : 'pointer',
                      color: colors.status.error,
                      minWidth: '32px',
                      minHeight: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

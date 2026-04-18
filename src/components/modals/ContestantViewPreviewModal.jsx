import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { Modal } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import BonusVotesChecklist from '../BonusVotesChecklist';
import SubmitProofModal from './SubmitProofModal';
import SubmitVideoProofModal from './SubmitVideoProofModal';
import { useToast } from '../../contexts/ToastContext';
import { BONUS_TASK_KEYS, DEPRECATED_TASK_KEYS } from '../../lib/bonusVotes';

/**
 * ContestantViewPreviewModal — lets hosts preview and interact with the
 * contestant bonus votes checklist without affecting real data.
 *
 * Proof uploads run for real (so image upload can be verified), but no
 * submission is persisted to the database.
 */
export default function ContestantViewPreviewModal({
  isOpen,
  onClose,
  tasks = [],
}) {
  const toast = useToast();
  const [localCompletions, setLocalCompletions] = useState({});
  const [proofTask, setProofTask] = useState(null);
  const [videoTask, setVideoTask] = useState(null);

  // Reset local preview state whenever the modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalCompletions({});
      setProofTask(null);
      setVideoTask(null);
    }
  }, [isOpen]);

  const previewTasks = useMemo(() => {
    return tasks
      .filter(t => t.enabled && !DEPRECATED_TASK_KEYS.has(t.task_key))
      .map(t => ({
        ...t,
        completed: !!localCompletions[t.id],
        submission_status: localCompletions[t.id] === 'pending' ? 'pending' : null,
      }))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [tasks, localCompletions]);

  const completedCount = previewTasks.filter(t => t.completed).length;
  const totalCount = previewTasks.length;
  const totalBonusVotesEarned = previewTasks
    .filter(t => t.completed)
    .reduce((s, t) => s + t.votes_awarded, 0);
  const totalBonusVotesAvailable = previewTasks.reduce((s, t) => s + t.votes_awarded, 0);
  const progress = totalCount ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const handleTaskAction = (taskKey, task) => {
    if (task.host_managed) return;

    if (task.task_key === BONUS_TASK_KEYS.INTRO_VIDEO) {
      setVideoTask(task);
      return;
    }

    if (task.requires_approval) {
      setProofTask(task);
      return;
    }

    // Preview non-approval tasks: mark complete locally
    setLocalCompletions(prev => ({ ...prev, [task.id]: true }));
    toast?.info?.(`Preview: "${task.label}" marked complete`);
  };

  // Preview proof submit — actually upload the image to verify the flow,
  // but don't persist a submission to the database.
  const handleSubmitProof = async (taskId /*, proofUrl */) => {
    setLocalCompletions(prev => ({ ...prev, [taskId]: 'pending' }));
    toast?.success?.('Preview: screenshot uploaded — real submission would be sent to host for review');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Contestant View Preview"
        maxWidth="560px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.sm,
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: borderRadius.md,
          }}>
            <Eye size={14} style={{ color: colors.gold.primary, flexShrink: 0 }} />
            <p style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.secondary,
              lineHeight: 1.5,
            }}>
              This is what contestants see. Clicks won&rsquo;t affect real data — screenshot uploads will run so you can verify the flow, but no submission will be saved.
            </p>
          </div>

          <BonusVotesChecklist
            tasks={previewTasks}
            loading={false}
            completedCount={completedCount}
            totalCount={totalCount}
            totalBonusVotesEarned={totalBonusVotesEarned}
            totalBonusVotesAvailable={totalBonusVotesAvailable}
            progress={progress}
            allCompleted={allCompleted}
            onTaskAction={handleTaskAction}
          />
        </div>
      </Modal>

      <SubmitProofModal
        isOpen={!!proofTask}
        onClose={() => setProofTask(null)}
        task={proofTask}
        onSubmit={handleSubmitProof}
      />
      <SubmitVideoProofModal
        isOpen={!!videoTask}
        onClose={() => setVideoTask(null)}
        task={videoTask}
        onSubmit={handleSubmitProof}
      />
    </>
  );
}

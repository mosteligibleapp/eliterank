import React from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { useModalForm } from '../../hooks';

const INITIAL_STATE = { sectionTitle: '', sectionContent: '' };

export default function RuleModal({
  isOpen,
  onClose,
  rule,
  onSave,
}) {
  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, rule, isOpen);
  const isEditing = !!rule?.id;

  const handleSave = () => {
    onSave(getFormData());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Rule' : 'Add Rule'}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button onClick={handleSave} icon={Check} disabled={!form.sectionTitle}>
            {isEditing ? 'Save Changes' : 'Add Rule'}
          </Button>
        </>
      }
    >
      <Input
        label="Section Title"
        value={form.sectionTitle}
        onChange={(e) => updateField('sectionTitle', e.target.value)}
        placeholder="e.g., Eligibility Requirements"
      />
      <Textarea
        label="Section Content"
        value={form.sectionContent}
        onChange={(e) => updateField('sectionContent', e.target.value)}
        placeholder="Enter the rule details..."
        rows={6}
      />
    </Modal>
  );
}

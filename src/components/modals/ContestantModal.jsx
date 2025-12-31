import React from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input, Textarea, FormGrid } from '../ui';
import { useModalForm } from '../../hooks';

const INITIAL_STATE = { name: '', age: '', occupation: '', bio: '', instagram: '' };

export default function ContestantModal({
  isOpen,
  onClose,
  contestant,
  onSave,
}) {
  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, contestant, isOpen);
  const isEditing = !!contestant;

  const handleSave = () => {
    onSave(getFormData());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Contestant' : 'Add Contestant'}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.name}
          >
            {isEditing ? 'Save Changes' : 'Add Contestant'}
          </Button>
        </>
      }
    >
      <Input
        label="Full Name"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder="e.g., Sarah Mitchell"
      />
      <FormGrid>
        <Input
          label="Age"
          type="number"
          value={form.age}
          onChange={(e) => updateField('age', e.target.value)}
          placeholder="e.g., 28"
        />
        <Input
          label="Instagram Handle"
          value={form.instagram}
          onChange={(e) => updateField('instagram', e.target.value)}
          placeholder="e.g., @sarahmitchell"
        />
      </FormGrid>
      <Input
        label="Occupation"
        value={form.occupation}
        onChange={(e) => updateField('occupation', e.target.value)}
        placeholder="e.g., Marketing Executive"
      />
      <Textarea
        label="Bio (Optional)"
        value={form.bio}
        onChange={(e) => updateField('bio', e.target.value)}
        placeholder="Brief description..."
        rows={3}
      />
    </Modal>
  );
}

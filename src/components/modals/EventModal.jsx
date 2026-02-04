import React from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input, FormGrid } from '../ui';
import { useModalForm } from '../../hooks';

const INITIAL_STATE = { name: '', date: '', endDate: '', time: '', location: '' };

export default function EventModal({
  isOpen,
  onClose,
  event,
  onSave,
}) {
  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, event, isOpen);
  const isEditing = !!event?.id;

  const handleSave = () => {
    // Status is auto-calculated based on date, not stored
    onSave(getFormData());
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
          <Button onClick={handleSave} icon={Check} disabled={!form.name || !form.date}>
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
      <FormGrid>
        <Input
          label="Start Date"
          type="date"
          value={form.date}
          onChange={(e) => updateField('date', e.target.value)}
        />
        <Input
          label="End Date (Optional)"
          type="date"
          value={form.endDate}
          onChange={(e) => updateField('endDate', e.target.value)}
        />
      </FormGrid>
      <FormGrid>
        <Input
          label="Time (Optional)"
          type="time"
          value={form.time}
          onChange={(e) => updateField('time', e.target.value)}
        />
        <Input
          label="Location (Optional)"
          value={form.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="e.g., The Plaza Hotel"
        />
      </FormGrid>
    </Modal>
  );
}

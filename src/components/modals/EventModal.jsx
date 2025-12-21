import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input, Select, FormGrid } from '../ui';

export default function EventModal({
  isOpen,
  onClose,
  event,
  onSave,
}) {
  const [form, setForm] = useState({ name: '', date: '', endDate: '', time: '', status: 'upcoming', location: '' });

  useEffect(() => {
    if (event) {
      setForm({
        name: event.name || '',
        date: event.date || '',
        endDate: event.endDate || '',
        time: event.time || '',
        status: event.status || 'upcoming',
        location: event.location || '',
      });
    } else {
      setForm({ name: '', date: '', endDate: '', time: '', status: 'upcoming', location: '' });
    }
  }, [event, isOpen]);

  const handleSave = () => {
    onSave(form);
  };

  const statusOptions = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'active', label: 'Active / Live' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Event"
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button onClick={handleSave} icon={Check}>
            Save Changes
          </Button>
        </>
      }
    >
      <Input
        label="Event Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="e.g., Voting Round 1"
      />
      <FormGrid>
        <Input
          label="Start Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Input
          label="End Date (Optional)"
          type="date"
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
        />
      </FormGrid>
      <FormGrid>
        <Input
          label="Time (Optional)"
          type="time"
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          options={statusOptions}
        />
      </FormGrid>
      <Input
        label="Location (Optional)"
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        placeholder="e.g., The Plaza Hotel"
      />
    </Modal>
  );
}

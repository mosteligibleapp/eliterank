import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';

export default function JudgeModal({
  isOpen,
  onClose,
  judge,
  onSave,
}) {
  const [form, setForm] = useState({ name: '', title: '', bio: '' });
  const isEditing = !!judge;

  useEffect(() => {
    if (judge) {
      setForm({
        name: judge.name || '',
        title: judge.title || '',
        bio: judge.bio || '',
      });
    } else {
      setForm({ name: '', title: '', bio: '' });
    }
  }, [judge, isOpen]);

  const handleSave = () => {
    onSave(form);
    setForm({ name: '', title: '', bio: '' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Judge' : 'Add Judge'}
      maxWidth="450px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.name || !form.title}
          >
            {isEditing ? 'Save Changes' : 'Add Judge'}
          </Button>
        </>
      }
    >
      <Input
        label="Full Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="e.g., Victoria Blackwell"
      />
      <Input
        label="Title / Role"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="e.g., Fashion Editor, Vogue"
      />
      <Textarea
        label="Bio (Optional)"
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        placeholder="Brief description of the judge..."
        rows={3}
      />
    </Modal>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, Edit2, Trash2, Copy, Loader, AlertCircle, Check, Clock, Send,
  ChevronDown, ChevronRight, FileText
} from 'lucide-react';
import { Button, Badge, Modal } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';

const CATEGORY_COLORS = {
  general: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: 'General' },
  nomination: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Nomination' },
  voting: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Voting' },
  results: { bg: 'rgba(212,175,55,0.15)', color: '#d4af37', label: 'Results' },
  reminder: { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: 'Reminder' },
};

const CATEGORIES = ['general', 'nomination', 'voting', 'results', 'reminder'];

export default function EmailTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');

  // Modal states
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: '',
    description: '',
    category: 'general',
  });

  const fetchTemplates = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    }
  }, []);

  const fetchEmailLog = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('email_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setEmailLog(data || []);
    } catch (err) {
      console.error('Error fetching email log:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchEmailLog()]);
      setLoading(false);
    };
    load();
  }, [fetchTemplates, fetchEmailLog]);

  const handleOpenEditor = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        description: template.description || '',
        category: template.category,
      });
    } else {
      setEditingTemplate(null);
      setForm({ name: '', subject: '', body: '', description: '', category: 'general' });
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!supabase || !form.name || !form.subject || !form.body) return;
    setSaving(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert(form);
        if (error) throw error;
      }
      setShowEditor(false);
      await fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!supabase || !confirm('Delete this template?')) return;
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err.message);
    }
  };

  const handleDuplicate = async (template) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          body: template.body,
          description: template.description,
          category: template.category,
        });
      if (error) throw error;
      await fetchTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxxl }}>
        <Loader size={32} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const tabs = [
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'log', label: 'Send History', icon: Clock },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{
        display: 'flex',
        gap: spacing.sm,
        marginBottom: spacing.xl,
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                background: isActive ? 'rgba(212,175,55,0.15)' : 'transparent',
                border: `1px solid ${isActive ? colors.gold.primary : colors.border.light}`,
                borderRadius: borderRadius.lg,
                color: isActive ? colors.gold.primary : colors.text.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{
          padding: spacing.lg,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: borderRadius.lg,
          color: '#ef4444',
          marginBottom: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {activeTab === 'templates' && (
        <>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xl,
          }}>
            <div>
              <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold }}>
                Email Templates
              </h2>
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginTop: spacing.xs }}>
                Create and manage email templates. Use placeholders: {'{{name}}'}, {'{{competition_name}}'}, {'{{city}}'}, {'{{season}}'}, {'{{claim_link}}'}
              </p>
            </div>
            <Button icon={Plus} onClick={() => handleOpenEditor()}>
              New Template
            </Button>
          </div>

          {/* Templates list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {templates.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: spacing.xxxl,
                color: colors.text.secondary,
                background: colors.background.card,
                borderRadius: borderRadius.xl,
                border: `1px solid ${colors.border.light}`,
              }}>
                <Mail size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No templates yet. Create your first email template.</p>
              </div>
            ) : (
              templates.map((template) => {
                const cat = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general;
                return (
                  <div
                    key={template.id}
                    style={{
                      background: colors.background.card,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.xl,
                      padding: spacing.xl,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                          <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                            {template.name}
                          </h3>
                          <span style={{
                            padding: `2px ${spacing.sm}`,
                            borderRadius: borderRadius.sm,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.medium,
                            background: cat.bg,
                            color: cat.color,
                          }}>
                            {cat.label}
                          </span>
                        </div>
                        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.sm }}>
                          Subject: {template.subject}
                        </p>
                        {template.description && (
                          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                            {template.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: spacing.xs, flexShrink: 0 }}>
                        <button
                          onClick={() => handleDuplicate(template)}
                          title="Duplicate"
                          style={{
                            padding: spacing.sm,
                            background: 'rgba(59,130,246,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: 'pointer',
                            color: '#3b82f6',
                          }}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditor(template)}
                          title="Edit"
                          style={{
                            padding: spacing.sm,
                            background: 'rgba(212,175,55,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: 'pointer',
                            color: colors.gold.primary,
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          title="Delete"
                          style={{
                            padding: spacing.sm,
                            background: 'rgba(239,68,68,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: 'pointer',
                            color: '#ef4444',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'log' && (
        <>
          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.xl,
          }}>
            Send History
          </h2>
          {emailLog.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: spacing.xxxl,
              color: colors.text.secondary,
              background: colors.background.card,
              borderRadius: borderRadius.xl,
              border: `1px solid ${colors.border.light}`,
            }}>
              <Send size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No emails sent yet.</p>
            </div>
          ) : (
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                    {['Recipient', 'Subject', 'Type', 'Status', 'Sent'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: spacing.md,
                          textAlign: 'left',
                          color: colors.text.secondary,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {emailLog.map((log) => (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${colors.border.lighter}` }}>
                      <td style={{ padding: spacing.md }}>
                        <div>
                          <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                            {log.recipient_name || 'Unknown'}
                          </p>
                          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                            {log.recipient_email}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: spacing.md, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                        {log.subject}
                      </td>
                      <td style={{ padding: spacing.md }}>
                        <span style={{
                          padding: `2px ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                          fontSize: typography.fontSize.xs,
                          background: 'rgba(139,92,246,0.15)',
                          color: '#a78bfa',
                        }}>
                          {log.recipient_type}
                        </span>
                      </td>
                      <td style={{ padding: spacing.md }}>
                        <span style={{
                          padding: `2px ${spacing.sm}`,
                          borderRadius: borderRadius.sm,
                          fontSize: typography.fontSize.xs,
                          background: log.status === 'sent' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: log.status === 'sent' ? '#22c55e' : '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          {log.status === 'sent' ? <Check size={12} /> : <AlertCircle size={12} />}
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: spacing.md, color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                        {new Date(log.sent_at).toLocaleDateString()}{' '}
                        {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Template Editor Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        title={editingTemplate ? 'Edit Template' : 'New Email Template'}
        maxWidth="700px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.subject || !form.body}
            >
              {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <div>
            <label style={{ display: 'block', marginBottom: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Template Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Voting Reminder"
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: '#fff',
                fontSize: typography.fontSize.base,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: '#fff',
                fontSize: typography.fontSize.base,
                outline: 'none',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_COLORS[c].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Subject Line *
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g., Voting is now open for {{competition_name}}!"
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: '#fff',
                fontSize: typography.fontSize.base,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Email Body *
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Hi {{name}},&#10;&#10;Your email content here..."
              rows={10}
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: '#fff',
                fontSize: typography.fontSize.base,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: spacing.xs }}>
              Available placeholders: {'{{name}}'}, {'{{email}}'}, {'{{competition_name}}'}, {'{{city}}'}, {'{{season}}'}, {'{{claim_link}}'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Description (internal note)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Sent to contestants when voting opens"
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: '#fff',
                fontSize: typography.fontSize.base,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

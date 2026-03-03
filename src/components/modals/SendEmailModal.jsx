import React, { useState, useEffect } from 'react';
import { Mail, Send, Loader, AlertCircle, Check, Users, Crown, User } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

const RECIPIENT_GROUPS = [
  { id: 'all_contestants', label: 'All Contestants', icon: Crown, color: '#22c55e' },
  { id: 'all_nominees', label: 'All Nominees', icon: Users, color: '#3b82f6' },
  { id: 'all', label: 'Everyone (Nominees + Contestants)', icon: Mail, color: colors.gold.primary },
  { id: 'select', label: 'Select Individually', icon: User, color: '#a78bfa' },
];

export default function SendEmailModal({
  isOpen,
  onClose,
  competitionId,
  nominees = [],
  contestants = [],
}) {
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [recipientGroup, setRecipientGroup] = useState('all_contestants');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch templates
  useEffect(() => {
    if (!isOpen || !supabase) return;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .order('category')
        .order('name');
      setTemplates(data || []);
      setLoadingTemplates(false);
    };
    fetchTemplates();
  }, [isOpen]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null);
      setRecipientGroup('all_contestants');
      setSelectedRecipients([]);
      setCustomSubject('');
      setCustomBody('');
      setUseCustom(false);
      setSending(false);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  // Build recipient list from selection
  const getRecipients = () => {
    const recipientList = [];

    const addNominees = () => {
      nominees.forEach((n) => {
        if (n.email) {
          recipientList.push({
            id: n.id,
            email: n.email,
            name: n.name,
            type: 'nominee',
            invite_token: n.inviteToken,
          });
        }
      });
    };

    const addContestants = () => {
      contestants.forEach((c) => {
        if (c.email) {
          recipientList.push({
            id: c.id,
            email: c.email,
            name: c.name,
            type: 'contestant',
          });
        }
      });
    };

    switch (recipientGroup) {
      case 'all_contestants':
        addContestants();
        break;
      case 'all_nominees':
        addNominees();
        break;
      case 'all':
        addContestants();
        addNominees();
        break;
      case 'select':
        selectedRecipients.forEach((id) => {
          const contestant = contestants.find((c) => c.id === id);
          if (contestant?.email) {
            recipientList.push({ id: contestant.id, email: contestant.email, name: contestant.name, type: 'contestant' });
            return;
          }
          const nominee = nominees.find((n) => n.id === id);
          if (nominee?.email) {
            recipientList.push({ id: nominee.id, email: nominee.email, name: nominee.name, type: 'nominee', invite_token: nominee.inviteToken });
          }
        });
        break;
    }

    // Deduplicate by email
    const seen = new Set();
    return recipientList.filter((r) => {
      if (seen.has(r.email)) return false;
      seen.add(r.email);
      return true;
    });
  };

  const recipientCount = getRecipients().length;

  const handleSend = async () => {
    if (!supabase) return;
    const recipients = getRecipients();

    if (recipients.length === 0) {
      setError('No recipients with email addresses found.');
      return;
    }

    if (!useCustom && !selectedTemplate) {
      setError('Please select a template or write a custom email.');
      return;
    }

    if (useCustom && (!customSubject || !customBody)) {
      setError('Please fill in both subject and body for custom email.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload = {
        recipients,
        competition_id: competitionId,
        ...(useCustom
          ? { custom_subject: customSubject, custom_body: customBody }
          : { template_id: selectedTemplate }),
      };

      const { data, error: fnError } = await supabase.functions.invoke('send-template-email', {
        body: payload,
      });

      if (fnError) throw fnError;

      setResult(data);
    } catch (err) {
      console.error('Error sending emails:', err);
      setError(err.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (id) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // All selectable people for individual selection
  const allPeople = [
    ...contestants.filter((c) => c.email).map((c) => ({ ...c, _type: 'contestant' })),
    ...nominees.filter((n) => n.email).map((n) => ({ ...n, _type: 'nominee' })),
  ];

  // Success result view
  if (result) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Emails Sent" maxWidth="500px">
        <div style={{ textAlign: 'center', padding: spacing.xl }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing.lg,
          }}>
            <Check size={32} style={{ color: '#22c55e' }} />
          </div>
          <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
            {result.sent} of {result.total} emails sent
          </h3>
          {result.failed > 0 && (
            <p style={{ color: '#ef4444', fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
              {result.failed} failed to send
            </p>
          )}
          {result.warning && (
            <div style={{
              padding: spacing.md,
              background: 'rgba(234,179,8,0.1)',
              border: '1px solid rgba(234,179,8,0.3)',
              borderRadius: borderRadius.md,
              color: '#eab308',
              fontSize: typography.fontSize.sm,
              marginBottom: spacing.md,
              textAlign: 'left',
            }}>
              <AlertCircle size={14} style={{ marginRight: spacing.xs, verticalAlign: 'middle' }} />
              {result.warning}
            </div>
          )}
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Email"
      maxWidth="650px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || recipientCount === 0}
          >
            {sending ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite', marginRight: spacing.xs }} />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} style={{ marginRight: spacing.xs }} />
                Send to {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}
              </>
            )}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
        {error && (
          <div style={{
            padding: spacing.md,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: borderRadius.md,
            color: '#ef4444',
            fontSize: typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Recipient Selection */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: spacing.sm,
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
          }}>
            Recipients
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm }}>
            {RECIPIENT_GROUPS.map((group) => {
              const Icon = group.icon;
              const isActive = recipientGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setRecipientGroup(group.id)}
                  style={{
                    padding: spacing.md,
                    background: isActive ? `${group.color}15` : colors.background.secondary,
                    border: `1px solid ${isActive ? group.color : colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: isActive ? group.color : colors.text.secondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  <Icon size={16} /> {group.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Individual selection */}
        {recipientGroup === 'select' && (
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.md,
            padding: spacing.sm,
          }}>
            {allPeople.length === 0 ? (
              <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, textAlign: 'center', padding: spacing.md }}>
                No people with email addresses
              </p>
            ) : (
              allPeople.map((person) => (
                <label
                  key={person.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.sm,
                    cursor: 'pointer',
                    borderRadius: borderRadius.sm,
                    background: selectedRecipients.includes(person.id) ? 'rgba(212,175,55,0.1)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(person.id)}
                    onChange={() => toggleRecipient(person.id)}
                    style={{ accentColor: colors.gold.primary }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                      {person.name}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                      {person.email}
                    </p>
                  </div>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    padding: `1px ${spacing.xs}`,
                    borderRadius: borderRadius.sm,
                    background: person._type === 'contestant' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                    color: person._type === 'contestant' ? '#22c55e' : '#3b82f6',
                  }}>
                    {person._type}
                  </span>
                </label>
              ))
            )}
          </div>
        )}

        {/* Template vs Custom toggle */}
        <div>
          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
            <button
              onClick={() => setUseCustom(false)}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                background: !useCustom ? 'rgba(212,175,55,0.15)' : 'transparent',
                border: `1px solid ${!useCustom ? colors.gold.primary : colors.border.light}`,
                borderRadius: borderRadius.md,
                color: !useCustom ? colors.gold.primary : colors.text.secondary,
                cursor: 'pointer',
                fontSize: typography.fontSize.sm,
              }}
            >
              Use Template
            </button>
            <button
              onClick={() => setUseCustom(true)}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                background: useCustom ? 'rgba(212,175,55,0.15)' : 'transparent',
                border: `1px solid ${useCustom ? colors.gold.primary : colors.border.light}`,
                borderRadius: borderRadius.md,
                color: useCustom ? colors.gold.primary : colors.text.secondary,
                cursor: 'pointer',
                fontSize: typography.fontSize.sm,
              }}
            >
              Write Custom
            </button>
          </div>

          {!useCustom ? (
            // Template selector
            <div>
              {loadingTemplates ? (
                <div style={{ textAlign: 'center', padding: spacing.lg }}>
                  <Loader size={20} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
                </div>
              ) : templates.length === 0 ? (
                <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                  No templates yet. Create one in the Email Templates tab, or write a custom email.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      style={{
                        padding: spacing.md,
                        background: selectedTemplate === tmpl.id
                          ? 'rgba(212,175,55,0.1)'
                          : colors.background.secondary,
                        border: `1px solid ${
                          selectedTemplate === tmpl.id ? colors.gold.primary : colors.border.light
                        }`,
                        borderRadius: borderRadius.md,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                          {tmpl.name}
                        </p>
                        <span style={{
                          fontSize: typography.fontSize.xs,
                          padding: `1px ${spacing.xs}`,
                          borderRadius: borderRadius.sm,
                          background: 'rgba(139,92,246,0.15)',
                          color: '#a78bfa',
                        }}>
                          {tmpl.category}
                        </span>
                      </div>
                      <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, marginTop: '2px' }}>
                        Subject: {tmpl.subject}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Custom email form
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Email subject line..."
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
                  Body *
                </label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Hi {{name}},&#10;&#10;Your message here..."
                  rows={8}
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
                  Placeholders: {'{{name}}'}, {'{{competition_name}}'}, {'{{city}}'}, {'{{season}}'}, {'{{claim_link}}'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}

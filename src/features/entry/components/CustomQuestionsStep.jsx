import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

/**
 * Custom questions step
 * Renders host-defined questions from competition.nomination_form_config.
 * Only mounted when at least one custom question exists.
 */
export default function CustomQuestionsStep({
  questions,
  answers,
  onChange,
  onSubmit,
  isSubmitting,
  error,
}) {
  const isAnswered = (q) => {
    const v = answers[q.id];
    if (q.type === 'checkbox') return v === true;
    if (q.type === 'yes_no') return v === true || v === false;
    if (typeof v === 'string') return v.trim().length > 0;
    return v !== undefined && v !== null;
  };

  const requiredOk = questions
    .filter((q) => q.required)
    .every((q) => isAnswered(q));

  return (
    <div className="entry-step">
      <h2 className="entry-step-title">A few more questions</h2>
      <p className="entry-step-subtitle">
        The host added these for this competition.
      </p>

      <div style={{ marginTop: 20 }}>
        {questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => onChange(q.id, val)}
          />
        ))}
      </div>

      {error && <p className="entry-error">{error}</p>}

      <button
        className="entry-btn-primary"
        onClick={onSubmit}
        disabled={isSubmitting || !requiredOk}
      >
        {isSubmitting ? 'Saving...' : 'Continue'}
      </button>
    </div>
  );
}

function QuestionField({ question, value, onChange }) {
  const label = `${question.label}${question.required ? ' *' : ''}`;
  const helpText = question.help_text ? (
    <div className="entry-question-help">{question.help_text}</div>
  ) : null;

  if (question.type === 'yes_no') {
    return (
      <div className="entry-form-field entry-question-yesno">
        <label className="entry-label">{label}</label>
        <div className="entry-yesno-row">
          <button
            type="button"
            className={`entry-yesno-btn ${value === true ? 'active' : ''}`}
            onClick={() => onChange(true)}
          >
            <CheckCircle size={18} />
            Yes
          </button>
          <button
            type="button"
            className={`entry-yesno-btn ${value === false ? 'active' : ''}`}
            onClick={() => onChange(false)}
          >
            <Circle size={18} />
            No
          </button>
        </div>
        {helpText}
      </div>
    );
  }

  if (question.type === 'long_text') {
    return (
      <div className="entry-form-field">
        <label className="entry-label">{label}</label>
        <textarea
          className="entry-textarea"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={1000}
        />
        {helpText}
      </div>
    );
  }

  if (question.type === 'select') {
    const opts = question.options || [];
    return (
      <div className="entry-form-field">
        <label className="entry-label">{label}</label>
        <select
          className="entry-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Select —</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {helpText}
      </div>
    );
  }

  if (question.type === 'checkbox') {
    return (
      <div className="entry-form-field entry-question-checkbox">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#d4af37' }}
          />
          <span className="entry-label" style={{ margin: 0 }}>{label}</span>
        </label>
        {helpText}
      </div>
    );
  }

  // short_text default
  return (
    <div className="entry-form-field">
      <label className="entry-label">{label}</label>
      <input
        type="text"
        className="entry-input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
      />
      {helpText}
    </div>
  );
}

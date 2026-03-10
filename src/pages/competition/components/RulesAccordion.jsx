import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { generateStandardRules } from '../../../utils/generateStandardRules';

/**
 * Rules accordion — generates rules dynamically from competition configuration.
 * Falls back to sensible defaults when no competition data is provided.
 *
 * When `collapsible` is true, the entire rules section is wrapped in a
 * collapsible container (collapsed by default).
 */
export function RulesAccordion({ competition, votingRounds = [], about, events = [], collapsible = false }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const rules = generateStandardRules({ competition, votingRounds, about, events }).map(rule => ({
    id: rule.id,
    title: rule.section_title,
    content: rule.section_content
      .split('\n')
      .map(line => line.replace(/^•\s*/, '').trim())
      .filter(Boolean),
  }));

  const toggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const rulesContent = (
    <>
      <p className="rules-subtitle"><em>Subject to Change</em></p>
      <p className="rules-subtitle"><em>Terms and Conditions Apply</em></p>

      <div className="rules-list">
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            className={`rule-item ${expandedIndex === index ? 'expanded' : ''}`}
          >
            <button
              className="rule-header"
              onClick={() => toggle(index)}
            >
              <span className="rule-title">{rule.title}</span>
              {expandedIndex === index ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {expandedIndex === index && (
              <div className="rule-content">
                <ul className="rule-bullet-list">
                  {rule.content.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  if (collapsible) {
    return (
      <div className="rules-accordion">
        <button
          className="rules-collapse-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h4 className="section-label" style={{ margin: 0 }}>RULES</h4>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {isOpen && rulesContent}
      </div>
    );
  }

  return (
    <div className="rules-accordion">
      <h4 className="section-label">RULES</h4>
      {rulesContent}
    </div>
  );
}

export default RulesAccordion;

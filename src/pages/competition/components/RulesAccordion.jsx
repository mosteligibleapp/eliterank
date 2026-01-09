import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Rules accordion - expandable sections
 */
export function RulesAccordion() {
  const { rules } = usePublicCompetition();
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (!rules?.length) {
    return (
      <div className="rules-accordion">
        <h4 className="section-label">Rules</h4>
        <div className="rules-empty">
          <p>Rules coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rules-accordion">
      <h4 className="section-label">Rules</h4>
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
              <span className="rule-title">{rule.section_title}</span>
              {expandedIndex === index ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {expandedIndex === index && (
              <div className="rule-content">
                {rule.section_content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RulesAccordion;

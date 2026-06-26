import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { buildAutoRules } from '../../../lib/competitionRules';

/**
 * Rules accordion — generates rules dynamically from competition configuration.
 * Uses the shared buildAutoRules generator so the public page and the host
 * dashboard's Site-tab preview always state the rules identically.
 */
export function RulesAccordion({ competition, votingRounds = [], about, events = [], rulesPath = null }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Merge the loaded rounds in so the hybrid judging-round detail can render.
  const source = competition
    ? { ...competition, voting_rounds: (votingRounds && votingRounds.length) ? votingRounds : competition.voting_rounds }
    : null;
  const rules = buildAutoRules(source).map((rule, i) => ({
    id: rule.title,
    title: rule.title,
    content: rule.content,
  }));

  const toggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="rules-accordion">
      <h4 className="section-label">RULES</h4>
      <p className="rules-subtitle">
        <em>
          <Link to="/contest-terms" className="rules-terms-link">
            Terms and Conditions Apply
          </Link>
        </em>
      </p>

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
                <p className="rule-paragraph">{rule.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {rulesPath && (
        <Link to={rulesPath} className="rules-full-link">
          Read the full Official Rules →
        </Link>
      )}
    </div>
  );
}

export default RulesAccordion;

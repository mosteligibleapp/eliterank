import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

/**
 * Rules accordion - expandable sections
 */
export function RulesAccordion() {
  const { rules, phase } = usePublicCompetition();
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Get elimination percentage based on phase
  const getEliminationInfo = () => {
    if (phase?.phase === 'round1') {
      return { percentage: '20%', show: true };
    }
    if (phase?.phase === 'round2') {
      return { percentage: '25%', show: true };
    }
    return { percentage: null, show: false };
  };

  const eliminationInfo = getEliminationInfo();

  if (!rules?.length && !eliminationInfo.show) {
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

      {/* Elimination Warning */}
      {eliminationInfo.show && (
        <div className="rules-elimination-warning">
          <AlertTriangle size={16} />
          <span>Bottom {eliminationInfo.percentage} eliminated when round ends</span>
        </div>
      )}

      {rules?.length > 0 && (
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
      )}
    </div>
  );
}

export default RulesAccordion;

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Rules accordion with static rules content
 */
export function RulesAccordion() {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const rules = [
    {
      id: 'voting',
      title: 'Voting',
      content: [
        'One free vote per person, per day',
        'Free votes reset at midnight (local time)',
        'Additional votes can be purchased',
        'Paid votes are applied immediately to selected contestants',
        'Vote counts reset to zero at the start of each new round',
        'You can vote for any contestant - vote for your favorites!',
      ],
    },
    {
      id: 'rounds',
      title: 'Competition Rounds',
      content: [
        'This competition has 3 voting rounds',
        'Round 1: Top 50 advance',
        'Round 2: Top 25 advance',
        'Round 3: Top 10 advance',
        'Contestants in the bottom percentage each round are eliminated',
        'Judges (not votes) determine the Rank of the 5 winners (1-5)',
      ],
    },
    {
      id: 'prizes',
      title: 'Rewards & Prizes',
      content: [
        'Approved nominees (host selected to compete) have the opportunity to claim various rewards available in their profile and enter affiliate programs to earn commission',
        'Cash Prize pool grows with every paid vote purchased',
        '5 winners earn cash prizes',
        'Cash prize pool value is determined at the end of the last voting round',
        'Each of the 5 winners receive equal in-kind prize packages provided by the competition sponsors and Most Eligible',
      ],
    },
  ];

  const toggle = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="rules-accordion">
      <h4 className="section-label">RULES</h4>
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
    </div>
  );
}

export default RulesAccordion;

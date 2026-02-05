import { DollarSign, Crown, Gift } from 'lucide-react';

/**
 * Rewards display component
 * Shows the three reward categories: Cash, Title, Sponsored Prizes
 */
export function Rewards() {
  const rewards = [
    {
      icon: DollarSign,
      title: 'Cash',
      description: 'Every paid vote grows the pot and split among the winners.',
    },
    {
      icon: Crown,
      title: 'Title',
      description: 'Winners hold the title for one year, with media features and exposure opportunities.',
    },
    {
      icon: Gift,
      title: 'Sponsored Prizes',
      description: 'Diamond necklaces, beauty products, and more — courtesy of our sponsors.',
    },
  ];

  return (
    <div className="rewards-section">
      <div className="rewards-header">
        <h3 className="rewards-title">Rewards</h3>
      </div>
      <div className="rewards-grid">
        {rewards.map((reward) => (
          <div key={reward.title} className="reward-card">
            <div className="reward-icon">
              <reward.icon size={24} />
            </div>
            <h4 className="reward-name">{reward.title}</h4>
            <p className="reward-description">{reward.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rewards;

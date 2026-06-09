/**
 * Sample performance data — preview-only.
 *
 * Rendered on the Performance page for super admins when they have no real
 * contestant entries, so the populated layout can be reviewed without writing
 * fake rows into the database (which would otherwise leak onto public
 * leaderboards). Never persisted; shape mirrors usePerformanceDashboard's
 * output.
 */

const competitor = (id, name, city, status, votes) => ({
  id,
  name,
  avatarUrl: null,
  city,
  status,
  votes,
});

// Build the ordered, named round list a competition would expose.
const rounds = (...labels) =>
  labels.map((label, i) => ({ order: i + 1, label }));

export const SAMPLE_PERFORMANCE = [
  {
    competitionId: 'sample-la-2026',
    competitionName: 'Most Eligible Los Angeles',
    citySeason: 'Los Angeles · 2026',
    orgName: 'Most Eligible',
    orgLogo: null,
    orgSlug: null,
    competitionSlug: null,
    competitionStatus: 'voting',
    myContestantId: 'sample-me-la',
    myStatus: 'active',
    placement: 2,
    fieldSize: 9,
    roundsReached: 2,
    totalRounds: 4,
    rounds: rounds('Entry Round', 'Top 50', 'Top 15', 'Finale'),
    totalVotes: 4820,
    freeVotes: 1240,
    paidVotes: 3100,
    bonusVotes: 480,
    competitors: [
      competitor('s-la-1', 'Sophia Bennett', 'Santa Monica', 'active', 5210),
      competitor('s-la-2', 'Marcus Vaughn', 'Hollywood', 'active', 4100),
      competitor('s-la-3', 'Priya Anand', 'Beverly Hills', 'active', 3320),
      competitor('s-la-4', 'Diego Romero', 'Downtown LA', 'active', 2750),
      competitor('s-la-5', 'Chloe Tanaka', 'West Hollywood', 'eliminated', 1580),
      competitor('s-la-6', 'Andre Wallace', 'Pasadena', 'eliminated', 980),
    ],
  },
  {
    competitionId: 'sample-mia-2025',
    competitionName: 'Most Eligible Miami',
    citySeason: 'Miami · 2025',
    orgName: 'Most Eligible',
    orgLogo: null,
    orgSlug: null,
    competitionSlug: null,
    // Competition is over but they weren't eliminated — i.e. a finalist.
    competitionStatus: 'completed',
    myContestantId: 'sample-me-mia',
    myStatus: 'active',
    placement: 3,
    fieldSize: 8,
    roundsReached: 4,
    totalRounds: 4,
    rounds: rounds('Entry Round', 'Top 40', 'Top 10', 'Finale'),
    totalVotes: 6210,
    freeVotes: 1680,
    paidVotes: 4100,
    bonusVotes: 430,
    competitors: [
      competitor('s-mia-1', 'Camila Soto', 'Brickell', 'winner', 8120),
      competitor('s-mia-2', 'Andre Costa', 'Wynwood', 'active', 7050),
      competitor('s-mia-3', 'Nadia Khan', 'Coral Gables', 'eliminated', 3990),
      competitor('s-mia-4', 'Leo Martins', 'South Beach', 'eliminated', 2240),
    ],
  },
  {
    competitionId: 'sample-nyc-2025',
    competitionName: 'Most Eligible Bachelor NYC',
    citySeason: 'New York · 2025',
    orgName: 'Most Eligible',
    orgLogo: null,
    orgSlug: null,
    competitionSlug: null,
    competitionStatus: 'completed',
    myContestantId: 'sample-me-nyc',
    myStatus: 'winner',
    placement: 1,
    fieldSize: 7,
    roundsReached: 4,
    totalRounds: 4,
    rounds: rounds('Entry Round', 'Top 25', 'Top 10', 'Finale'),
    totalVotes: 9340,
    freeVotes: 2100,
    paidVotes: 6800,
    bonusVotes: 440,
    competitors: [
      competitor('s-ny-1', 'Julian Park', 'Manhattan', 'active', 7980),
      competitor('s-ny-2', 'Tasha Greene', 'Brooklyn', 'eliminated', 5440),
      competitor('s-ny-3', 'Vikram Shah', 'Queens', 'eliminated', 4210),
      competitor('s-ny-4', 'Bianca Russo', 'The Bronx', 'eliminated', 2890),
      competitor('s-ny-5', 'Damon Lee', 'Staten Island', 'eliminated', 1620),
    ],
  },
];

export default SAMPLE_PERFORMANCE;

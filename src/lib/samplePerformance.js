/**
 * Sample performance data — preview-only.
 *
 * Rendered on the Performance page for super admins when they have no real
 * contestant entries, so the populated layout can be reviewed without writing
 * fake rows into the database (which would otherwise leak onto public
 * leaderboards). Never persisted; shape mirrors usePerformanceDashboard's
 * output, plus a `myFansList` array per competition that feeds the preview
 * fan modal for the contestant's own fans.
 */

// [first, last, city] → profile-like object the fan modal renders.
const fans = (...rows) =>
  rows.map(([first_name, last_name, city]) => ({
    first_name,
    last_name,
    city,
    avatar_url: null,
  }));

const competitor = (id, name, city, status, votes) => ({
  id,
  name,
  avatarUrl: null,
  city,
  status,
  votes,
});

const LA_FANS = fans(
  ['Ava', 'Reyes', 'Pasadena'],
  ['Liam', 'Carter', 'Venice'],
  ['Noah', 'Kim', 'Culver City'],
  ['Mia', 'Flores', 'Burbank'],
  ['Ethan', 'Brooks', 'Glendale'],
  ['Isabella', 'Nguyen', 'Long Beach'],
  ['Lucas', 'Hayes', 'Inglewood'],
  ['Harper', 'Lee', 'Malibu'],
  ['Daniel', 'Stone', 'Encino'],
);

const NYC_FANS = fans(
  ['Emma', 'Cohen', 'Tribeca'],
  ['Aiden', 'Walsh', 'SoHo'],
  ['Sofia', 'Russo', 'Chelsea'],
  ['Caleb', 'Burns', 'West Village'],
  ['Lily', 'Ortiz', 'Harlem'],
  ['Ryan', 'Fox', 'Upper East Side'],
  ['Maya', 'Bauer', 'Williamsburg'],
  ['Ruby', 'Lane', 'Astoria'],
);

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
    totalVotes: 4820,
    freeVotes: 1240,
    paidVotes: 3100,
    bonusVotes: 480,
    myFans: LA_FANS.length,
    myFansList: LA_FANS,
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
    totalVotes: 9340,
    freeVotes: 2100,
    paidVotes: 6800,
    bonusVotes: 440,
    myFans: NYC_FANS.length,
    myFansList: NYC_FANS,
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

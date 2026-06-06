/**
 * Sample performance data — preview-only.
 *
 * Rendered on the Performance page for super admins when they have no real
 * contestant entries, so the populated layout can be reviewed without writing
 * fake rows into the database (which would otherwise leak onto public
 * leaderboards). Never persisted; shape mirrors usePerformanceDashboard's
 * output, plus a `fans` array per competitor that feeds the preview fan modal.
 */

// [first, last, city] → profile-like object the fan modal renders.
const fans = (...rows) =>
  rows.map(([first_name, last_name, city]) => ({
    first_name,
    last_name,
    city,
    avatar_url: null,
  }));

// fanCount is derived from the supplied list so the pill count and the modal
// list always agree in preview.
const competitor = (id, name, city, status, votes, fanList) => ({
  id,
  name,
  avatarUrl: null,
  city,
  status,
  votes,
  fanCount: fanList.length,
  fans: fanList,
});

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
    myFans: 64,
    competitors: [
      competitor('s-la-1', 'Sophia Bennett', 'Santa Monica', 'active', 5210, fans(
        ['Ava', 'Reyes', 'Pasadena'],
        ['Liam', 'Carter', 'Venice'],
        ['Noah', 'Kim', 'Culver City'],
        ['Mia', 'Flores', 'Burbank'],
        ['Ethan', 'Brooks', 'Glendale'],
        ['Isabella', 'Nguyen', 'Long Beach'],
        ['Lucas', 'Hayes', 'Inglewood'],
      )),
      competitor('s-la-2', 'Marcus Vaughn', 'Hollywood', 'active', 4100, fans(
        ['Olivia', 'Park', 'Echo Park'],
        ['Mason', 'Diaz', 'Silver Lake'],
        ['Amelia', 'Cole', 'Los Feliz'],
        ['Henry', 'Ward', 'Westwood'],
      )),
      competitor('s-la-3', 'Priya Anand', 'Beverly Hills', 'active', 3320, fans(
        ['Charlotte', 'Reed', 'Brentwood'],
        ['Jack', 'Morgan', 'Bel Air'],
        ['Harper', 'Lee', 'Malibu'],
        ['Daniel', 'Stone', 'Encino'],
        ['Ella', 'Price', 'Sherman Oaks'],
      )),
      competitor('s-la-4', 'Diego Romero', 'Downtown LA', 'active', 2750, fans(
        ['Grace', 'Bell', 'Arts District'],
        ['Owen', 'Foster', 'Highland Park'],
        ['Layla', 'Ross', 'Eagle Rock'],
      )),
      competitor('s-la-5', 'Chloe Tanaka', 'West Hollywood', 'eliminated', 1580, fans(
        ['Leo', 'Sims', 'Mid-City'],
        ['Zoe', 'Hart', 'Koreatown'],
      )),
      competitor('s-la-6', 'Andre Wallace', 'Pasadena', 'eliminated', 980, fans(
        ['Nora', 'Day', 'Altadena'],
      )),
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
    myFans: 152,
    competitors: [
      competitor('s-ny-1', 'Julian Park', 'Manhattan', 'active', 7980, fans(
        ['Emma', 'Cohen', 'Tribeca'],
        ['Aiden', 'Walsh', 'SoHo'],
        ['Sofia', 'Russo', 'Chelsea'],
        ['Caleb', 'Burns', 'West Village'],
        ['Lily', 'Ortiz', 'Harlem'],
        ['Ryan', 'Fox', 'Upper East Side'],
      )),
      competitor('s-ny-2', 'Tasha Greene', 'Brooklyn', 'eliminated', 5440, fans(
        ['Maya', 'Bauer', 'Williamsburg'],
        ['Eli', 'Pratt', 'Park Slope'],
        ['Hannah', 'Cruz', 'Dumbo'],
        ['Cole', 'Reid', 'Bushwick'],
      )),
      competitor('s-ny-3', 'Vikram Shah', 'Queens', 'eliminated', 4210, fans(
        ['Ruby', 'Lane', 'Astoria'],
        ['Miles', 'Dunn', 'Long Island City'],
        ['Aria', 'Webb', 'Flushing'],
      )),
      competitor('s-ny-4', 'Bianca Russo', 'The Bronx', 'eliminated', 2890, fans(
        ['Theo', 'Marsh', 'Riverdale'],
        ['Iris', 'Quinn', 'Fordham'],
      )),
      competitor('s-ny-5', 'Damon Lee', 'Staten Island', 'eliminated', 1620, fans(
        ['Jonah', 'Pope', 'St. George'],
      )),
    ],
  },
];

export default SAMPLE_PERFORMANCE;

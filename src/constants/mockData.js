// Initial data - empty for production
// Data will come from Supabase

export const DEFAULT_HOST_PROFILE = {
  firstName: '',
  lastName: '',
  bio: '',
  city: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  tiktok: '',
  hobbies: [],
};

// Empty initial states - data comes from Supabase
export const INITIAL_COMPETITIONS = [];
export const INITIAL_NOMINEES = [];
export const INITIAL_CONTESTANTS = [];
export const INITIAL_JUDGES = [];
export const INITIAL_SPONSORS = [];
export const INITIAL_EVENTS = [];
export const INITIAL_ANNOUNCEMENTS = [];
export const COMPETITION_RANKINGS = [];

export const COMPETITION_STAGES = [
  {
    id: 'nomination',
    name: 'Nomination Period',
    status: 'upcoming',
  },
  {
    id: 'round1',
    name: 'Voting Round 1',
    status: 'upcoming',
  },
  {
    id: 'round2',
    name: 'Voting Round 2',
    status: 'upcoming',
  },
  {
    id: 'finals',
    name: 'Finals Voting',
    status: 'upcoming',
  },
  {
    id: 'gala',
    name: 'Finals Gala',
    status: 'upcoming',
  },
];

// Placeholder images for contestants without avatars
export const CONTESTANT_IMAGES = [];

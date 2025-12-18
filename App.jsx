import React, { useState } from 'react';
import { 
  Trophy, Users, Calendar, DollarSign, Star, Crown, 
  ChevronRight, Plus, Eye, Check, X, TrendingUp, Award, 
  Sparkles, MapPin, Building, UserPlus, Settings, BarChart3, 
  Edit, Trash2, Camera, User, FileText, Globe, Heart, Save, Clock
} from 'lucide-react';

export default function EliteRankDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false); // Keep for settings modal later
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPublicSite, setShowPublicSite] = useState(false);
  const [publicSiteTab, setPublicSiteTab] = useState('contestants');
  
  const [hostProfile, setHostProfile] = useState({
    firstName: 'James',
    lastName: 'Davidson',
    bio: 'Award-winning event host with 10+ years of experience in luxury lifestyle events.',
    city: 'New York',
    instagram: '@jamesdavidson',
    twitter: '@jdavidson',
    linkedin: 'jamesdavidson',
    tiktok: '@jamesdavidsonhost',
    hobbies: ['Travel', 'Fine Dining', 'Golf', 'Art Collecting'],
  });
  
  const allHobbies = ['Travel', 'Fine Dining', 'Golf', 'Tennis', 'Sailing', 'Art Collecting',
    'Wine Tasting', 'Photography', 'Fitness', 'Fashion', 'Music', 'Reading',
    'Cooking', 'Yoga', 'Hiking', 'Skiing', 'Surfing', 'Dancing'];

  const competitions = [
    { id: 1, city: 'New York', status: 'active', phase: 'voting', contestants: 24, votes: 15420, revenue: 48500 },
    { id: 2, city: 'Los Angeles', status: 'nomination', phase: 'nomination', contestants: 0, votes: 0, revenue: 12000 },
    { id: 3, city: 'Miami', status: 'upcoming', phase: 'setup', contestants: 0, votes: 0, revenue: 0 },
  ];

  const [nominees, setNominees] = useState([
    { id: 1, name: 'Alexandra Chen', age: 28, occupation: 'Creative Director', nominatedBy: 'Self', status: 'pending', city: 'New York', bio: 'Award-winning creative director with a passion for sustainable fashion.', instagram: '@alexchen', interests: ['Art', 'Travel', 'Sustainability'], email: 'alex.chen@email.com', profileComplete: true },
    { id: 2, name: 'Marcus Williams', age: 31, occupation: 'Tech Entrepreneur', nominatedBy: 'Third Party', nominatorName: 'Jessica Adams', nominatorEmail: 'jessica@email.com', status: 'pending-approval', city: 'New York', bio: '', instagram: '', interests: [], email: 'marcus.w@email.com', profileComplete: false },
    { id: 3, name: 'Sofia Rodriguez', age: 26, occupation: 'Physician', nominatedBy: 'Self', status: 'approved', city: 'New York', bio: 'Emergency medicine resident. Passionate about healthcare access.', instagram: '@drsofia', interests: ['Medicine', 'Yoga', 'Reading'], email: 'sofia.r@email.com', profileComplete: true, votes: 2340 },
    { id: 4, name: 'Tyler Bennett', age: 29, occupation: 'Investment Banker', nominatedBy: 'Third Party', nominatorName: 'Rachel Kim', nominatorEmail: 'rachel.k@email.com', status: 'awaiting-profile', city: 'New York', bio: '', instagram: '', interests: [], email: 'tyler.b@email.com', profileComplete: false },
    { id: 5, name: 'Jasmine Okafor', age: 27, occupation: 'Attorney', nominatedBy: 'Third Party', nominatorName: 'David Park', nominatorEmail: 'david.p@email.com', status: 'profile-complete', city: 'New York', bio: 'Corporate lawyer by day, salsa dancer by night. Passionate about justice and good food.', instagram: '@jasmineokafor', interests: ['Law', 'Dancing', 'Cooking', 'Travel'], email: 'jasmine.o@email.com', profileComplete: true },
  ]);

  const contestants = [
    { id: 1, name: 'Sofia Rodriguez', votes: 2340, rank: 1, trend: 'up', age: 26, occupation: 'Physician', bio: 'Emergency medicine resident. Passionate about healthcare access.', instagram: '@drsofia' },
    { id: 2, name: 'David Kim', votes: 2180, rank: 2, trend: 'up', age: 29, occupation: 'Architect', bio: 'Award-winning architect designing sustainable urban spaces.', instagram: '@davidkim' },
    { id: 3, name: 'Emma Thompson', votes: 1950, rank: 3, trend: 'down', age: 27, occupation: 'Marketing Director', bio: 'Leading brand strategies for Fortune 500 companies.', instagram: '@emmathompson' },
    { id: 4, name: 'Michael Santos', votes: 1820, rank: 4, trend: 'up', age: 31, occupation: 'Tech Founder', bio: 'Building the future of AI-powered healthcare.', instagram: '@msantos' },
    { id: 5, name: 'Isabella Martinez', votes: 1680, rank: 5, trend: 'same', age: 25, occupation: 'Fashion Designer', bio: 'Sustainable fashion advocate and creative director.', instagram: '@isabellamartinez' },
    { id: 6, name: 'James Wilson', votes: 1520, rank: 6, trend: 'up', age: 30, occupation: 'Investment Banker', bio: 'Finance professional with a passion for philanthropy.', instagram: '@jameswilson' },
    { id: 7, name: 'Olivia Chen', votes: 1410, rank: 7, trend: 'down', age: 28, occupation: 'Art Curator', bio: 'Curating contemporary art exhibitions worldwide.', instagram: '@oliviachen' },
    { id: 8, name: 'Alexander Brooks', votes: 1280, rank: 8, trend: 'up', age: 32, occupation: 'Attorney', bio: 'Civil rights lawyer fighting for justice.', instagram: '@alexbrooks' },
  ];

  const [selectedContestant, setSelectedContestant] = useState(null);
  const [voteCount, setVoteCount] = useState(1);
  const [nomineeToConvert, setNomineeToConvert] = useState(null);
  const [nomineeToApprove, setNomineeToApprove] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Judges state
  const [judges, setJudges] = useState([
    { id: 1, name: 'Victoria Blackwell', title: 'Fashion Editor, Vogue', bio: 'With over 15 years in fashion journalism, Victoria brings her keen eye for style and elegance to the panel.' },
    { id: 2, name: 'Christopher Hayes', title: 'Lifestyle Influencer', bio: '5M+ followers trust Christopher\'s insights on modern dating, relationships, and personal branding.' },
    { id: 3, name: 'Diana Chen', title: 'Founder, Elite Events', bio: 'Diana has connected thousands of eligible singles through her exclusive matchmaking events across the globe.' },
  ]);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [editingJudge, setEditingJudge] = useState(null);
  const [judgeForm, setJudgeForm] = useState({ name: '', title: '', bio: '' });

  // Sponsors state
  const [sponsors, setSponsors] = useState([
    { id: 1, name: 'Luxe Hotels', tier: 'Platinum', amount: 25000 },
    { id: 2, name: 'Veuve Clicquot', tier: 'Gold', amount: 15000 },
    { id: 3, name: 'Mercedes-Benz', tier: 'Gold', amount: 15000 },
    { id: 4, name: 'Tiffany & Co.', tier: 'Silver', amount: 8000 },
  ]);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [sponsorForm, setSponsorForm] = useState({ name: '', tier: 'Gold', amount: '' });

  // Events state
  const [events, setEvents] = useState([
    { id: 1, name: 'Nomination Period', date: '2025-01-15', endDate: '2025-02-01', status: 'completed', publicVisible: true },
    { id: 2, name: 'Contestants Announced', date: '2025-02-03', status: 'completed', publicVisible: true },
    { id: 3, name: 'Voting Round 1', date: '2025-02-05', endDate: '2025-02-12', status: 'active', publicVisible: true },
    { id: 4, name: 'Double Vote Day', date: '2025-02-10', status: 'upcoming', publicVisible: false, isDoubleVoteDay: true },
    { id: 5, name: 'Voting Round 2', date: '2025-02-13', endDate: '2025-02-18', status: 'upcoming', publicVisible: true },
    { id: 6, name: 'Finals Gala', date: '2025-02-20', time: '19:00', location: 'The Plaza Hotel', status: 'upcoming', publicVisible: true },
  ]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ name: '', date: '', endDate: '', time: '', location: '', status: 'upcoming', publicVisible: true });

  // Check if today is a double vote day
  const isDoubleVoteDay = () => {
    const today = new Date().toISOString().split('T')[0];
    return events.some(e => e.isDoubleVoteDay && e.date === today);
  };
  
  // For demo purposes, we'll simulate double vote day being active
  const [forceDoubleVoteDay, setForceDoubleVoteDay] = useState(true); // Set to true to demo
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  
  // Announcements state
  const [announcements, setAnnouncements] = useState([
    { id: 1, type: 'announcement', title: '🎉 Double Vote Day Coming!', content: 'Mark your calendars! This Saturday all votes count double. Share with friends and help your favorite contestant win!', date: '2025-02-08T10:00:00', pinned: true },
    { id: 2, title: 'Voting Round 1 Now Open!', content: 'The wait is over! Voting for Round 1 is officially open. Cast your votes now to help your favorites advance to the next round.', date: '2025-02-05T09:00:00', type: 'update' },
    { id: 3, title: 'Meet Our 24 Contestants', content: 'We\'re thrilled to announce our official contestant lineup! Head to the Contestants page to meet all 24 amazing individuals competing for the title.', date: '2025-02-03T12:00:00', type: 'announcement' },
    { id: 4, title: 'Judges Panel Revealed', content: 'Excited to announce our distinguished panel of judges who will help select our winner. Check out the About page to learn more about each judge.', date: '2025-01-28T14:00:00', type: 'news' },
  ]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', type: 'announcement', pinned: false });
  
  // Revenue data
  const revenueData = {
    total: 125500,
    sponsorships: sponsors.reduce((sum, s) => sum + s.amount, 0),
    paidVotes: 42500,
    eventTickets: 20000
  };
  
  // Host payout (20%)
  const hostPayout = revenueData.total * 0.20;
  
  // Competition rankings (for Most Eligible USA hosting rights)
  const competitionRankings = [
    { city: 'Los Angeles', revenue: 142000, rank: 1 },
    { city: 'New York', revenue: 125500, rank: 2 },
    { city: 'Miami', revenue: 98000, rank: 3 },
    { city: 'Chicago', revenue: 87500, rank: 4 },
    { city: 'Houston', revenue: 72000, rank: 5 },
  ];

  // Judge functions
  const openAddJudge = () => {
    setEditingJudge(null);
    setJudgeForm({ name: '', title: '', bio: '' });
    setShowJudgeModal(true);
  };
  const openEditJudge = (judge) => {
    setEditingJudge(judge);
    setJudgeForm({ name: judge.name, title: judge.title, bio: judge.bio || '' });
    setShowJudgeModal(true);
  };
  const saveJudge = () => {
    if (editingJudge) {
      setJudges(judges.map(j => j.id === editingJudge.id ? { ...j, ...judgeForm } : j));
    } else {
      setJudges([...judges, { id: Date.now(), ...judgeForm }]);
    }
    setShowJudgeModal(false);
  };
  const deleteJudge = (id) => {
    setJudges(judges.filter(j => j.id !== id));
  };

  // Sponsor functions
  const openAddSponsor = () => {
    setEditingSponsor(null);
    setSponsorForm({ name: '', tier: 'Gold', amount: '' });
    setShowSponsorModal(true);
  };
  const openEditSponsor = (sponsor) => {
    setEditingSponsor(sponsor);
    setSponsorForm({ name: sponsor.name, tier: sponsor.tier, amount: sponsor.amount.toString() });
    setShowSponsorModal(true);
  };
  const saveSponsor = () => {
    if (editingSponsor) {
      setSponsors(sponsors.map(s => s.id === editingSponsor.id ? { ...s, ...sponsorForm, amount: parseInt(sponsorForm.amount) } : s));
    } else {
      setSponsors([...sponsors, { id: Date.now(), ...sponsorForm, amount: parseInt(sponsorForm.amount) }]);
    }
    setShowSponsorModal(false);
  };
  const deleteSponsor = (id) => {
    setSponsors(sponsors.filter(s => s.id !== id));
  };

  // Event functions
  const openEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({ 
      name: event.name, 
      date: event.date, 
      endDate: event.endDate || '', 
      time: event.time || '', 
      location: event.location || '',
      status: event.status 
    });
    setShowEventModal(true);
  };
  const saveEvent = () => {
    setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...eventForm } : e));
    setShowEventModal(false);
  };

  // Competition stages with end dates
  const competitionStages = [
    { id: 'nomination', name: 'Nomination Period', endDate: new Date('2025-02-01T23:59:59'), status: 'completed' },
    { id: 'round1', name: 'Voting Round 1', endDate: new Date('2025-02-12T23:59:59'), status: 'active' },
    { id: 'doubleVote', name: 'Double Vote Day', endDate: new Date('2025-02-10T23:59:59'), status: 'upcoming' },
    { id: 'round2', name: 'Voting Round 2', endDate: new Date('2025-02-18T23:59:59'), status: 'upcoming' },
    { id: 'finals', name: 'Finals Voting', endDate: new Date('2025-02-19T23:59:59'), status: 'upcoming' },
    { id: 'gala', name: 'Finals Gala', endDate: new Date('2025-02-20T19:00:00'), status: 'upcoming' },
  ];

  const getCurrentStage = () => competitionStages.find(s => s.status === 'active') || competitionStages[1];

  // Countdown timer effect
  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const currentStage = getCurrentStage();
      const difference = currentStage.endDate - new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleHobby = (hobby) => {
    setHostProfile(prev => ({
      ...prev,
      hobbies: prev.hobbies.includes(hobby)
        ? prev.hobbies.filter(h => h !== hobby)
        : prev.hobbies.length < 8 ? [...prev.hobbies, hobby] : prev.hobbies
    }));
  };

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f14 0%, #1a1a24 50%, #0f0f14 100%)', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e8e6e3' },
    header: { background: 'rgba(20,20,30,0.95)', borderBottom: '1px solid rgba(212,175,55,0.15)', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(20px)' },
    headerContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoIcon: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0f', boxShadow: '0 4px 15px rgba(212,175,55,0.3)' },
    logoText: { fontSize: '20px', fontWeight: '600', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    badge: { padding: '4px 10px', background: 'rgba(212,175,55,0.15)', color: '#d4af37', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
    nav: { background: 'rgba(20,20,30,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 24px' },
    navContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0', overflowX: 'auto' },
    navItem: (active) => ({ padding: '14px 20px', color: active ? '#d4af37' : '#888', fontSize: '14px', fontWeight: '500', cursor: 'pointer', borderBottom: `2px solid ${active ? '#d4af37' : 'transparent'}`, background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }),
    main: { maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' },
    pageTitle: { fontSize: '28px', fontWeight: '600', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' },
    gold: { color: '#d4af37' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' },
    statCard: (gradient) => ({ padding: '20px', borderRadius: '16px', border: '1px solid', borderColor: gradient ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.1)', background: gradient ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(30,30,40,0.6))' : 'rgba(30,30,40,0.6)', transition: 'all 0.3s' }),
    statLabel: { color: '#888', fontSize: '13px', marginBottom: '6px' },
    statValue: { fontSize: '28px', fontWeight: '600', color: '#fff' },
    statIcon: (color) => ({ width: '52px', height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color === 'gold' ? 'rgba(212,175,55,0.15)' : color === 'blue' ? 'rgba(59,130,246,0.15)' : color === 'purple' ? 'rgba(139,92,246,0.15)' : 'rgba(34,197,94,0.15)', color: color === 'gold' ? '#d4af37' : color === 'blue' ? '#60a5fa' : color === 'purple' ? '#a78bfa' : '#4ade80' }),
    trend: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: '#4ade80' },
    panel: { background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden', marginBottom: '24px' },
    panelHeader: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: '600' },
    btnPrimary: { background: 'linear-gradient(135deg, #d4af37, #c9a227)', color: '#0a0a0f', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(212,175,55,0.2)' },
    compGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', padding: '20px' },
    compCard: { background: 'rgba(20,20,28,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' },
    compHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    compCity: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
    statusBadge: (status) => ({ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: status === 'active' || status === 'approved' ? 'rgba(34,197,94,0.15)' : status === 'nomination' || status === 'profile-complete' ? 'rgba(59,130,246,0.15)' : status === 'pending' || status === 'pending-approval' ? 'rgba(251,191,36,0.15)' : status === 'awaiting-profile' ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.15)', color: status === 'active' || status === 'approved' ? '#4ade80' : status === 'nomination' || status === 'profile-complete' ? '#60a5fa' : status === 'pending' || status === 'pending-approval' ? '#fbbf24' : status === 'awaiting-profile' ? '#a78bfa' : '#a78bfa' }),
    compStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px', textAlign: 'center' },
    compStatValue: { fontSize: '20px', fontWeight: '600', color: '#fff' },
    compStatLabel: { fontSize: '11px', color: '#888' },
    compPhase: { background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
    btnSecondary: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e6e3', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    leaderboard: { padding: '8px 20px 20px' },
    leaderItem: (top) => ({ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', borderRadius: '12px', background: top ? 'rgba(212,175,55,0.05)' : 'transparent', marginBottom: '4px' }),
    rank: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: '#888' },
    avatar: (size) => ({ width: size || '44px', height: size || '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: '#d4af37', fontSize: size === '80px' ? '24px' : '14px' }),
    contestantInfo: { flex: 1 },
    contestantName: { fontWeight: '500', color: '#fff', display: 'block' },
    contestantVotes: { fontSize: '13px', color: '#888' },
    trendIndicator: (trend) => ({ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', background: trend === 'up' ? 'rgba(34,197,94,0.15)' : trend === 'down' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', color: trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#888' }),
    nomineeCard: { background: 'rgba(20,20,28,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '16px' },
    nomineeMain: { display: 'flex', gap: '20px' },
    nomineeDetails: { flex: 1 },
    nomineeHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
    nomineeName: { fontSize: '18px', fontWeight: '600' },
    nomineeMeta: { display: 'flex', gap: '16px', color: '#888', fontSize: '13px', marginBottom: '10px', flexWrap: 'wrap' },
    nomineeBio: { color: '#b0b0b0', fontSize: '14px', marginBottom: '10px' },
    interestTags: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' },
    interestTag: { padding: '5px 12px', background: 'rgba(212,175,55,0.1)', color: '#d4af37', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
    sourceBadge: (self) => ({ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', background: self ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)', color: self ? '#a78bfa' : '#60a5fa' }),
    nomineeActions: { display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' },
    btnApprove: { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    btnReject: { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    profileCover: { height: '180px', background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(139,92,246,0.2), rgba(212,175,55,0.2))', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    coverPlaceholder: { textAlign: 'center' },
    coverIcon: { width: '60px', height: '60px', margin: '0 auto 12px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    coverBtn: { position: 'absolute', bottom: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '13px', color: '#fff', cursor: 'pointer' },
    profileInfo: { padding: '0 24px 24px', marginTop: '-48px' },
    profileHeader: { display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' },
    profileAvatar: { width: '120px', height: '120px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', border: '4px solid #1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '600', color: '#d4af37', position: 'relative' },
    avatarEditBtn: { position: 'absolute', bottom: '-8px', right: '-8px', width: '36px', height: '36px', background: '#d4af37', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0f', cursor: 'pointer', border: 'none' },
    profileName: { fontSize: '24px', fontWeight: '600', marginBottom: '4px' },
    profileLocation: { color: '#888', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' },
    profileBadges: { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' },
    formSection: { background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', marginBottom: '20px' },
    formTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
    formGroup: { marginBottom: '16px' },
    formLabel: { display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' },
    formInput: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e6e3', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    formTextarea: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e6e3', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '100px', boxSizing: 'border-box' },
    hobbyGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    hobbyTag: (selected) => ({ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: selected ? '#d4af37' : 'rgba(255,255,255,0.05)', color: selected ? '#0a0a0f' : '#888' }),
    saveBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #d4af37, #c9a227)', color: '#0a0a0f', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' },
    modal: { background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden' },
    modalHeader: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: '20px', fontWeight: '600' },
    modalClose: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '8px' },
    modalBody: { padding: '20px', maxHeight: '60vh', overflowY: 'auto' },
    modalFooter: { padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  };

  const renderOverview = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {/* Total Revenue Card - Expandable */}
        <div 
          onClick={() => setShowRevenueBreakdown(!showRevenueBreakdown)}
          style={{ 
            ...styles.statCard(true), 
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={styles.statLabel}>Total Revenue</p>
              <p style={styles.statValue}>${revenueData.total.toLocaleString()}</p>
            </div>
            <div style={styles.statIcon('gold')}><DollarSign size={26} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <div style={styles.trend}><TrendingUp size={14} /> +23% from last month</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888', fontSize: '12px' }}>
              <span>View breakdown</span>
              <ChevronRight size={14} style={{ transform: showRevenueBreakdown ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>
          </div>
          
          {/* Revenue Breakdown - Expandable */}
          {showRevenueBreakdown && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={16} style={{ color: '#60a5fa' }} />
                  </div>
                  <span style={{ color: '#b0b0b0', fontSize: '14px' }}>Sponsorships</span>
                </div>
                <span style={{ color: '#fff', fontWeight: '600' }}>${revenueData.sponsorships.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={16} style={{ color: '#a78bfa' }} />
                  </div>
                  <span style={{ color: '#b0b0b0', fontSize: '14px' }}>Paid Votes</span>
                </div>
                <span style={{ color: '#fff', fontWeight: '600' }}>${revenueData.paidVotes.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={16} style={{ color: '#4ade80' }} />
                  </div>
                  <span style={{ color: '#b0b0b0', fontSize: '14px' }}>Event Tickets</span>
                </div>
                <span style={{ color: '#fff', fontWeight: '600' }}>${revenueData.eventTickets.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Host Payout Card */}
        <div style={styles.statCard(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={styles.statLabel}>Estimated Host Payout</p>
              <p style={{ ...styles.statValue, color: '#4ade80' }}>${hostPayout.toLocaleString()}</p>
            </div>
            <div style={styles.statIcon('green')}><DollarSign size={26} /></div>
          </div>
          <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888', fontSize: '13px' }}>Your share</span>
              <span style={{ color: '#4ade80', fontWeight: '600', fontSize: '14px' }}>20% of revenue</span>
            </div>
          </div>
          <p style={{ color: '#666', fontSize: '11px', marginTop: '10px' }}>Paid out after competition ends</p>
        </div>

        {/* Competition Rank Card */}
        <div style={{ 
          ...styles.statCard(false), 
          background: competitionRankings.find(c => c.city === 'New York')?.rank === 1 
            ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))' 
            : 'rgba(30,30,40,0.6)',
          border: competitionRankings.find(c => c.city === 'New York')?.rank === 1 
            ? '1px solid rgba(212,175,55,0.3)' 
            : '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={styles.statLabel}>National Ranking</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <p style={{ ...styles.statValue, color: competitionRankings.find(c => c.city === 'New York')?.rank === 1 ? '#d4af37' : '#fff' }}>
                  #{competitionRankings.find(c => c.city === 'New York')?.rank}
                </p>
                <span style={{ color: '#888', fontSize: '14px' }}>of 5</span>
              </div>
            </div>
            <div style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '12px', 
              background: competitionRankings.find(c => c.city === 'New York')?.rank === 1 
                ? 'linear-gradient(135deg, #d4af37, #f4d03f)' 
                : 'rgba(139,92,246,0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Trophy size={26} style={{ color: competitionRankings.find(c => c.city === 'New York')?.rank === 1 ? '#0a0a0f' : '#a78bfa' }} />
            </div>
          </div>
          
          {/* Mini leaderboard */}
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Revenue Leaderboard</p>
            {competitionRankings.slice(0, 3).map((comp, i) => (
              <div key={comp.city} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '8px 10px', 
                background: comp.city === 'New York' ? 'rgba(212,175,55,0.1)' : 'transparent',
                borderRadius: '8px',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '6px', 
                    background: i === 0 ? 'linear-gradient(135deg, #d4af37, #f4d03f)' : i === 1 ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8)' : 'linear-gradient(135deg, #cd7f32, #daa06d)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#0a0a0f'
                  }}>{comp.rank}</span>
                  <span style={{ fontSize: '13px', color: comp.city === 'New York' ? '#d4af37' : '#b0b0b0', fontWeight: comp.city === 'New York' ? '600' : '400' }}>
                    {comp.city} {comp.city === 'New York' && '(You)'}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#888' }}>${(comp.revenue / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
          
          {/* USA Hosting Info */}
          <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(212,175,55,0.1)', borderRadius: '10px', border: '1px solid rgba(212,175,55,0.2)' }}>
            <p style={{ color: '#d4af37', fontSize: '11px', fontWeight: '600' }}>
              <Crown size={12} style={{ display: 'inline', marginRight: '4px' }} />
              #1 hosts Most Eligible USA
            </p>
            <p style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>
              ${(competitionRankings[0].revenue - revenueData.total).toLocaleString()} behind LA
            </p>
          </div>
        </div>
      </div>

      {/* Second Row - 3 Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {/* Current Phase Card */}
        <div style={{ 
          ...styles.statCard(false), 
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
          border: '1px solid rgba(212,175,55,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={styles.statLabel}>Current Phase</p>
              <p style={{ ...styles.statValue, fontSize: '24px', color: '#d4af37' }}>
                {events.find(e => e.status === 'active')?.name || 'No Active Phase'}
              </p>
            </div>
            <div style={{ 
              padding: '6px 12px', 
              background: 'rgba(34,197,94,0.15)', 
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: '600' }}>LIVE</span>
            </div>
          </div>
          
          {/* Phase Progress */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Competition Progress</span>
              <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: '600' }}>
                {events.filter(e => e.status === 'completed').length}/{events.length} phases
              </span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${(events.filter(e => e.status === 'completed').length / events.length) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #d4af37, #f4d03f)',
                borderRadius: '4px'
              }} />
            </div>
          </div>

          {/* Phase Details */}
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Started</span>
              <span style={{ color: '#fff', fontSize: '12px' }}>
                {events.find(e => e.status === 'active')?.date ? new Date(events.find(e => e.status === 'active').date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: '12px' }}>Ends</span>
              <span style={{ color: '#d4af37', fontSize: '12px', fontWeight: '600' }}>
                {events.find(e => e.status === 'active')?.endDate ? new Date(events.find(e => e.status === 'active').endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Site Traffic Card */}
        <div style={styles.statCard(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={styles.statLabel}>Public Site Traffic</p>
              <p style={styles.statValue}>48,392</p>
            </div>
            <div style={styles.statIcon('blue')}><Eye size={26} /></div>
          </div>
          <div style={styles.trend}><TrendingUp size={14} /> +12% this week</div>
          
          {/* Traffic Breakdown */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#888', fontSize: '13px' }}>Unique Visitors</span>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>32,150</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#888', fontSize: '13px' }}>Page Views</span>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>156,420</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: '#888', fontSize: '13px' }}>Avg. Time on Site</span>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>4m 32s</span>
            </div>
          </div>
          
          <p style={{ color: '#666', fontSize: '11px', marginTop: '12px' }}>Since nominations opened (Jan 15)</p>
        </div>

        {/* Up Next Card */}
        <div style={styles.statCard(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={styles.statLabel}>Coming Up Next</p>
              <p style={{ ...styles.statValue, fontSize: '22px' }}>
                {events.find(e => e.status === 'upcoming')?.name || 'No Upcoming Events'}
              </p>
            </div>
            <div style={styles.statIcon('purple')}><Calendar size={26} /></div>
          </div>
          
          {/* Countdown to next event */}
          {(() => {
            const nextEvent = events.find(e => e.status === 'upcoming');
            if (!nextEvent) return null;
            const eventDate = new Date(nextEvent.date);
            const now = new Date();
            const diffTime = eventDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return (
              <div style={{ marginTop: '16px' }}>
                <div style={{ 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', 
                  borderRadius: '12px',
                  border: '1px solid rgba(139,92,246,0.2)',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#a78bfa', fontSize: '32px', fontWeight: '700' }}>
                    {diffDays > 0 ? diffDays : 0}
                  </p>
                  <p style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {diffDays === 1 ? 'Day Away' : 'Days Away'}
                  </p>
                </div>
                
                <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ color: '#888' }} />
                    <span style={{ color: '#888', fontSize: '12px' }}>
                      {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {nextEvent.time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <Clock size={14} style={{ color: '#888' }} />
                      <span style={{ color: '#888', fontSize: '12px' }}>{nextEvent.time}</span>
                    </div>
                  )}
                  {nextEvent.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <MapPin size={14} style={{ color: '#888' }} />
                      <span style={{ color: '#888', fontSize: '12px' }}>{nextEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Competition Overview Card */}
      <div style={{ ...styles.panel, border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 4px 20px rgba(212,175,55,0.1)' }}>
        <div style={{ padding: '20px' }}>
          {[competitions[0]].map(comp => (
            <div key={comp.id} style={{ ...styles.compCard, maxWidth: '100%', background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.3)' }}>
              <div style={styles.compHeader}>
                <div style={styles.compCity}><Crown size={18} style={styles.gold} /> New York Most Eligible</div>
                <span style={styles.statusBadge(comp.status)}>{comp.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ ...styles.compStatValue, fontSize: '28px' }}>{comp.contestants}</div>
                  <div style={styles.compStatLabel}>Contestants</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ ...styles.compStatValue, fontSize: '28px' }}>{comp.votes.toLocaleString()}</div>
                  <div style={styles.compStatLabel}>Total Votes</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ ...styles.compStatValue, fontSize: '28px' }}>156</div>
                  <div style={styles.compStatLabel}>Nominations</div>
                </div>
              </div>
              <button onClick={() => setShowPublicSite(true)} style={{ ...styles.btnPrimary, width: '100%', justifyContent: 'center' }}><Eye size={16} /> View Public Site</button>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelTitle}><Crown style={styles.gold} size={22} /> New York Top Contestants</div>
        </div>
        <div style={styles.leaderboard}>
          {contestants.map((c, i) => (
            <div key={c.id} style={styles.leaderItem(i < 3)}>
              <div style={styles.rank}>{i === 0 ? <Crown size={20} style={styles.gold} /> : i + 1}</div>
              <div style={styles.avatar()}>{c.name.split(' ').map(n => n[0]).join('')}</div>
              <div style={styles.contestantInfo}>
                <span style={styles.contestantName}>{c.name}</span>
                <span style={styles.contestantVotes}>{c.votes.toLocaleString()} votes</span>
              </div>
              <div style={styles.trendIndicator(c.trend)}>{c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNominations = () => {
    const getStatusLabel = (status) => {
      switch(status) {
        case 'pending': return 'Pending Review';
        case 'pending-approval': return 'Needs Approval';
        case 'awaiting-profile': return 'Awaiting Profile';
        case 'profile-complete': return 'Ready to Convert';
        case 'approved': return 'Contestant';
        default: return status;
      }
    };

    // Filter nominees into categories
    const activeContestants = nominees.filter(n => n.status === 'approved');
    const pendingContestants = nominees.filter(n => n.status === 'pending' || n.status === 'profile-complete');
    const pendingNominees = nominees.filter(n => n.status === 'pending-approval' || n.status === 'awaiting-profile');

    const NomineeCard = ({ nom, compact = false }) => (
      <div style={{ 
        background: 'rgba(20,20,28,0.8)', 
        border: '1px solid rgba(255,255,255,0.06)', 
        borderRadius: '16px', 
        padding: compact ? '16px' : '20px',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={styles.avatar(compact ? '48px' : '56px')}>{nom.name.split(' ').map(n => n[0]).join('')}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontWeight: '600', fontSize: compact ? '14px' : '16px' }}>{nom.name}</span>
              {nom.nominatedBy === 'Third Party' && (
                <span style={{ padding: '2px 8px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>3RD PARTY</span>
              )}
            </div>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '6px' }}>{nom.age} • {nom.occupation}</p>
            
            {nom.profileComplete && nom.bio && (
              <p style={{ color: '#999', fontSize: '12px', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{nom.bio}</p>
            )}
            
            {nom.interests && nom.interests.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {nom.interests.slice(0, 3).map((int, i) => (
                  <span key={i} style={{ padding: '3px 8px', background: 'rgba(212,175,55,0.1)', color: '#d4af37', borderRadius: '10px', fontSize: '10px', fontWeight: '500' }}>{int}</span>
                ))}
                {nom.interests.length > 3 && (
                  <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '10px', fontSize: '10px' }}>+{nom.interests.length - 3}</span>
                )}
              </div>
            )}

            {nom.nominatedBy === 'Third Party' && nom.nominatorName && (
              <p style={{ color: '#666', fontSize: '11px' }}>Nominated by {nom.nominatorName}</p>
            )}
          </div>
        </div>

        {/* Actions based on status */}
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Self-nominated pending - can convert directly */}
          {nom.status === 'pending' && nom.nominatedBy === 'Self' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setNomineeToConvert(nom)} style={{ ...styles.btnApprove, flex: 1, justifyContent: 'center', padding: '10px', fontSize: '12px' }}><Check size={14} /> Convert</button>
              <button onClick={() => setNominees(nominees.filter(n => n.id !== nom.id))} style={{ ...styles.btnReject, padding: '10px', fontSize: '12px' }}><X size={14} /></button>
            </div>
          )}
          
          {/* Third party nomination pending approval */}
          {nom.status === 'pending-approval' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setNomineeToApprove(nom)} style={{ ...styles.btnApprove, flex: 1, justifyContent: 'center', padding: '10px', fontSize: '12px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.3)' }}>
                <Check size={14} /> Approve & Send
              </button>
              <button onClick={() => setNominees(nominees.filter(n => n.id !== nom.id))} style={{ ...styles.btnReject, padding: '10px', fontSize: '12px' }}><X size={14} /></button>
            </div>
          )}
          
          {/* Awaiting profile completion */}
          {nom.status === 'awaiting-profile' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '12px', marginBottom: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa' }} />
                Waiting for profile
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setNominees(nominees.map(n => n.id === nom.id ? { 
                    ...n, 
                    status: 'profile-complete', 
                    profileComplete: true,
                    bio: 'Profile completed by nominee.',
                    interests: ['Fitness', 'Travel', 'Music']
                  } : n))} 
                  style={{ ...styles.btnSecondary, flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <Check size={12} /> Simulate Complete
                </button>
                <button style={{ ...styles.btnSecondary, flex: 1, padding: '8px', fontSize: '12px' }}>
                  Resend
                </button>
              </div>
            </div>
          )}
          
          {/* Profile complete - ready to convert */}
          {(nom.status === 'profile-complete' || (nom.status === 'pending' && nom.nominatedBy === 'Third Party' && nom.profileComplete)) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setNomineeToConvert(nom)} style={{ ...styles.btnApprove, flex: 1, justifyContent: 'center', padding: '10px', fontSize: '12px' }}><Check size={14} /> Convert</button>
              <button onClick={() => setNominees(nominees.filter(n => n.id !== nom.id))} style={{ ...styles.btnReject, padding: '10px', fontSize: '12px' }}><X size={14} /></button>
            </div>
          )}
          
          {/* Already approved - show votes */}
          {nom.status === 'approved' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '13px' }}>
                <Check size={14} /> Active
              </div>
              <div style={{ color: '#d4af37', fontWeight: '600', fontSize: '14px' }}>
                {nom.votes?.toLocaleString() || 0} votes
              </div>
            </div>
          )}
        </div>
      </div>
    );

    return (
    <div>
      {/* Three Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* Column 1: Active Contestants */}
        <div>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))', 
            border: '1px solid rgba(34,197,94,0.2)', 
            borderRadius: '16px', 
            padding: '16px 20px', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={18} style={{ color: '#4ade80' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#4ade80' }}>Contestants</h3>
                <p style={{ fontSize: '12px', color: '#888' }}>Active & voting enabled</p>
              </div>
            </div>
            <div style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.2)', borderRadius: '20px', fontSize: '14px', fontWeight: '700', color: '#4ade80' }}>
              {activeContestants.length}
            </div>
          </div>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
            {activeContestants.length > 0 ? (
              activeContestants.map(nom => <NomineeCard key={nom.id} nom={nom} compact />)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                <Trophy size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>No active contestants yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Pending Contestants (Profile Complete) */}
        <div>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))', 
            border: '1px solid rgba(212,175,55,0.2)', 
            borderRadius: '16px', 
            padding: '16px 20px', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={18} style={{ color: '#d4af37' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#d4af37' }}>Pending Contestants</h3>
                <p style={{ fontSize: '12px', color: '#888' }}>Profile complete, ready to convert</p>
              </div>
            </div>
            <div style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.2)', borderRadius: '20px', fontSize: '14px', fontWeight: '700', color: '#d4af37' }}>
              {pendingContestants.length}
            </div>
          </div>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
            {pendingContestants.length > 0 ? (
              pendingContestants.map(nom => <NomineeCard key={nom.id} nom={nom} compact />)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                <UserPlus size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>No pending contestants</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Pending Nominees (Need Profile) */}
        <div>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', 
            border: '1px solid rgba(139,92,246,0.2)', 
            borderRadius: '16px', 
            padding: '16px 20px', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#a78bfa' }}>Pending Nominees</h3>
                <p style={{ fontSize: '12px', color: '#888' }}>Need to complete profile</p>
              </div>
            </div>
            <div style={{ padding: '6px 12px', background: 'rgba(139,92,246,0.2)', borderRadius: '20px', fontSize: '14px', fontWeight: '700', color: '#a78bfa' }}>
              {pendingNominees.length}
            </div>
          </div>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
            {pendingNominees.length > 0 ? (
              pendingNominees.map(nom => <NomineeCard key={nom.id} nom={nom} compact />)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                <Users size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>No pending nominees</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
  };

  const renderProfile = () => (
    <div>
      {!isEditingProfile ? (
        /* PUBLIC-FACING VIEW */
        <div>
          {/* Hero Section */}
          <div style={styles.panel}>
            <div style={{ height: '200px', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(139,92,246,0.2), rgba(212,175,55,0.2))', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                <button onClick={() => setIsEditingProfile(true)} style={{ ...styles.btnPrimary, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Edit size={16} /> Edit Profile
                </button>
              </div>
            </div>
            <div style={{ padding: '0 32px 32px', marginTop: '-60px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ width: '140px', height: '140px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))', border: '4px solid #1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', fontWeight: '600', color: '#d4af37' }}>
                  {hostProfile.firstName[0]}{hostProfile.lastName[0]}
                </div>
                <div style={{ flex: 1, paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>{hostProfile.firstName} {hostProfile.lastName}</h1>
                    <span style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(212,175,55,0.5)', color: '#d4af37', borderRadius: '8px', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}><Star size={16} /> Verified Host</span>
                  </div>
                  <p style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '15px' }}>
                    <MapPin size={18} /> {hostProfile.city}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Left Column */}
            <div>
              {/* Bio Section */}
              <div style={styles.panel}>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} style={styles.gold} /> About
                  </h3>
                  <p style={{ color: '#b0b0b0', fontSize: '15px', lineHeight: '1.7' }}>{hostProfile.bio}</p>
                </div>
              </div>

              {/* Hobbies Section */}
              <div style={{ ...styles.panel, marginTop: '20px' }}>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Heart size={20} style={styles.gold} /> Interests
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {hostProfile.hobbies.map(hobby => (
                      <span key={hobby} style={{ padding: '10px 20px', background: 'rgba(212,175,55,0.1)', color: '#d4af37', borderRadius: '25px', fontSize: '14px', fontWeight: '500' }}>
                        {hobby}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo Gallery */}
              <div style={{ ...styles.panel, marginTop: '20px' }}>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Camera size={20} style={styles.gold} /> Gallery
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} style={{ aspectRatio: '1', background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(139,92,246,0.1))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Social Links */}
              <div style={styles.panel}>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Globe size={20} style={styles.gold} /> Connect
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {hostProfile.instagram && (
                      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textDecoration: 'none', color: '#e8e6e3', transition: 'all 0.2s' }}>
                        <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '18px' }}>📷</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: '500', fontSize: '14px' }}>Instagram</p>
                          <p style={{ color: '#888', fontSize: '13px' }}>{hostProfile.instagram}</p>
                        </div>
                      </a>
                    )}
                    {hostProfile.twitter && (
                      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textDecoration: 'none', color: '#e8e6e3' }}>
                        <div style={{ width: '40px', height: '40px', background: '#000', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '18px', fontWeight: '700' }}>𝕏</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: '500', fontSize: '14px' }}>Twitter / X</p>
                          <p style={{ color: '#888', fontSize: '13px' }}>{hostProfile.twitter}</p>
                        </div>
                      </a>
                    )}
                    {hostProfile.linkedin && (
                      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textDecoration: 'none', color: '#e8e6e3' }}>
                        <div style={{ width: '40px', height: '40px', background: '#0A66C2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>in</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: '500', fontSize: '14px' }}>LinkedIn</p>
                          <p style={{ color: '#888', fontSize: '13px' }}>{hostProfile.linkedin}</p>
                        </div>
                      </a>
                    )}
                    {hostProfile.tiktok && (
                      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textDecoration: 'none', color: '#e8e6e3' }}>
                        <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #00f2ea, #ff0050)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '16px', fontWeight: '700' }}>♪</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: '500', fontSize: '14px' }}>TikTok</p>
                          <p style={{ color: '#888', fontSize: '13px' }}>{hostProfile.tiktok}</p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Competition */}
              <div style={{ ...styles.panel, marginTop: '20px' }}>
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Trophy size={20} style={styles.gold} /> Currently Hosting
                  </h3>
                  <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <MapPin size={16} style={styles.gold} />
                      <span style={{ fontWeight: '600' }}>New York Most Eligible</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>Season 2025 • Voting Phase</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>● ACTIVE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE */
        <div>
          {/* Edit Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '20px', background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Edit size={24} style={styles.gold} />
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Edit Profile</h2>
                <p style={{ fontSize: '13px', color: '#888' }}>Update your public host profile</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsEditingProfile(false)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={() => setIsEditingProfile(false)} style={styles.btnPrimary}><Save size={16} /> Save Changes</button>
            </div>
          </div>

          {/* Cover & Avatar */}
          <div style={styles.panel}>
            <div style={styles.profileCover}>
              <div style={styles.coverPlaceholder}>
                <div style={styles.coverIcon}><Camera size={24} style={{ color: '#888' }} /></div>
                <p style={{ color: '#888', fontSize: '14px' }}>Upload Cover Image</p>
                <p style={{ color: '#666', fontSize: '12px' }}>Recommended: 1500 x 400px</p>
              </div>
              <button style={styles.coverBtn}><Camera size={16} /> Change Cover</button>
            </div>
            <div style={styles.profileInfo}>
              <div style={styles.profileHeader}>
                <div style={styles.profileAvatar}>
                  {hostProfile.firstName[0]}{hostProfile.lastName[0]}
                  <button style={styles.avatarEditBtn}><Camera size={16} /></button>
                </div>
                <div style={{ paddingBottom: '8px' }}>
                  <h2 style={styles.profileName}>{hostProfile.firstName} {hostProfile.lastName}</h2>
                  <p style={styles.profileLocation}><MapPin size={16} /> {hostProfile.city}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Info Form */}
          <div style={styles.formSection}>
            <h3 style={styles.formTitle}><User size={20} style={styles.gold} /> Personal Information</h3>
            <div style={styles.formGrid}>
              <div>
                <label style={styles.formLabel}>First Name</label>
                <input type="text" value={hostProfile.firstName} onChange={(e) => setHostProfile({...hostProfile, firstName: e.target.value})} style={styles.formInput} />
              </div>
              <div>
                <label style={styles.formLabel}>Last Name</label>
                <input type="text" value={hostProfile.lastName} onChange={(e) => setHostProfile({...hostProfile, lastName: e.target.value})} style={styles.formInput} />
              </div>
              <div>
                <label style={styles.formLabel}>City</label>
                <input type="text" value={hostProfile.city} onChange={(e) => setHostProfile({...hostProfile, city: e.target.value})} style={styles.formInput} />
              </div>
            </div>
          </div>

          {/* Bio Form */}
          <div style={styles.formSection}>
            <h3 style={styles.formTitle}><FileText size={20} style={styles.gold} /> Bio</h3>
            <textarea value={hostProfile.bio} onChange={(e) => setHostProfile({...hostProfile, bio: e.target.value})} style={styles.formTextarea} maxLength={500} />
            <p style={{ textAlign: 'right', fontSize: '12px', color: '#888', marginTop: '8px' }}>{hostProfile.bio.length}/500</p>
          </div>

          {/* Social Media Form */}
          <div style={styles.formSection}>
            <h3 style={styles.formTitle}><Globe size={20} style={styles.gold} /> Social Media</h3>
            <div style={styles.formGrid}>
              <div>
                <label style={styles.formLabel}>Instagram</label>
                <input type="text" value={hostProfile.instagram} onChange={(e) => setHostProfile({...hostProfile, instagram: e.target.value})} style={styles.formInput} placeholder="@username" />
              </div>
              <div>
                <label style={styles.formLabel}>Twitter / X</label>
                <input type="text" value={hostProfile.twitter} onChange={(e) => setHostProfile({...hostProfile, twitter: e.target.value})} style={styles.formInput} placeholder="@username" />
              </div>
              <div>
                <label style={styles.formLabel}>LinkedIn</label>
                <input type="text" value={hostProfile.linkedin} onChange={(e) => setHostProfile({...hostProfile, linkedin: e.target.value})} style={styles.formInput} placeholder="username" />
              </div>
              <div>
                <label style={styles.formLabel}>TikTok</label>
                <input type="text" value={hostProfile.tiktok} onChange={(e) => setHostProfile({...hostProfile, tiktok: e.target.value})} style={styles.formInput} placeholder="@username" />
              </div>
            </div>
          </div>

          {/* Hobbies Selection */}
          <div style={styles.formSection}>
            <h3 style={styles.formTitle}><Heart size={20} style={styles.gold} /> Hobbies & Interests</h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>Select up to 8 hobbies ({hostProfile.hobbies.length}/8)</p>
            <div style={styles.hobbyGrid}>
              {allHobbies.map(hobby => (
                <button key={hobby} onClick={() => toggleHobby(hobby)} style={styles.hobbyTag(hostProfile.hobbies.includes(hobby))}>
                  {hobby}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Gallery Upload */}
          <div style={styles.formSection}>
            <h3 style={styles.formTitle}><Camera size={20} style={styles.gold} /> Photo Gallery</h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>Upload up to 6 photos to showcase your hosting experience</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Plus size={24} style={{ color: '#888', marginBottom: '4px' }} />
                  <span style={{ fontSize: '12px', color: '#888' }}>Add Photo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Save Button */}
          <button onClick={() => setIsEditingProfile(false)} style={styles.saveBtn}><Save size={20} /> Save Profile</button>
        </div>
      )}
    </div>
  );

  // Announcement functions
  const openAddAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', content: '', type: 'announcement', pinned: false });
    setShowAnnouncementModal(true);
  };
  const openEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({ 
      title: announcement.title, 
      content: announcement.content, 
      type: announcement.type || 'announcement',
      pinned: announcement.pinned || false
    });
    setShowAnnouncementModal(true);
  };
  const saveAnnouncement = () => {
    if (editingAnnouncement) {
      setAnnouncements(announcements.map(a => a.id === editingAnnouncement.id ? { ...a, ...announcementForm } : a));
    } else {
      setAnnouncements([{ id: Date.now(), ...announcementForm, date: new Date().toISOString() }, ...announcements]);
    }
    setShowAnnouncementModal(false);
  };
  const deleteAnnouncement = (id) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
  };
  const togglePin = (id) => {
    setAnnouncements(announcements.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  };

  const renderCommunity = () => {
    const getTypeIcon = (type) => {
      switch(type) {
        case 'announcement': return <Sparkles size={16} style={{ color: '#d4af37' }} />;
        case 'update': return <Check size={16} style={{ color: '#4ade80' }} />;
        case 'news': return <FileText size={16} style={{ color: '#60a5fa' }} />;
        default: return <FileText size={16} style={{ color: '#888' }} />;
      }
    };
    
    const getTypeColor = (type) => {
      switch(type) {
        case 'announcement': return { bg: 'rgba(212,175,55,0.15)', color: '#d4af37' };
        case 'update': return { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' };
        case 'news': return { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' };
        default: return { bg: 'rgba(255,255,255,0.1)', color: '#888' };
      }
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Sort announcements: pinned first, then by date
    const sortedAnnouncements = [...announcements].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });

    return (
      <div>
        {/* Create Post Section */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}><Plus style={styles.gold} size={22} /> Create Announcement</div>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              padding: '20px', 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '16px',
              border: '1px dashed rgba(212,175,55,0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }} onClick={openAddAnnouncement}>
              <div style={styles.avatar()}>{hostProfile.firstName[0]}{hostProfile.lastName[0]}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: '15px' }}>Share an update with your audience...</p>
              </div>
              <button style={styles.btnPrimary}><Plus size={16} /> New Post</button>
            </div>
          </div>
        </div>

        {/* Announcements Feed */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}><FileText style={styles.gold} size={22} /> Announcements Feed</div>
            <span style={{ color: '#888', fontSize: '14px' }}>{announcements.length} posts</span>
          </div>
          <div style={{ padding: '20px' }}>
            {sortedAnnouncements.length > 0 ? (
              sortedAnnouncements.map((post) => (
                <div key={post.id} style={{ 
                  background: post.pinned ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)', 
                  border: post.pinned ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '16px', 
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  {/* Post Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                    <div style={styles.avatar()}>{hostProfile.firstName[0]}{hostProfile.lastName[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '600', fontSize: '15px' }}>{hostProfile.firstName} {hostProfile.lastName}</span>
                        <span style={{ padding: '2px 8px', background: 'rgba(212,175,55,0.15)', color: '#d4af37', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>HOST</span>
                        {post.pinned && (
                          <span style={{ padding: '2px 8px', background: 'rgba(212,175,55,0.15)', color: '#d4af37', borderRadius: '10px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={10} /> PINNED
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ color: '#888', fontSize: '13px' }}>{formatDate(post.date)}</span>
                        <span style={{ 
                          padding: '2px 8px', 
                          background: getTypeColor(post.type).bg, 
                          color: getTypeColor(post.type).color, 
                          borderRadius: '10px', 
                          fontSize: '10px', 
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {getTypeIcon(post.type)} {post.type}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => togglePin(post.id)} style={{ ...styles.btnSecondary, padding: '8px', width: 'auto', background: post.pinned ? 'rgba(212,175,55,0.15)' : 'transparent' }} title={post.pinned ? 'Unpin' : 'Pin'}>
                        <MapPin size={14} style={{ color: post.pinned ? '#d4af37' : '#888' }} />
                      </button>
                      <button onClick={() => openEditAnnouncement(post)} style={{ ...styles.btnSecondary, padding: '8px', width: 'auto' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => deleteAnnouncement(post.id)} style={{ ...styles.btnReject, padding: '8px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Post Content */}
                  <div style={{ marginLeft: '58px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#fff' }}>{post.title}</h3>
                    <p style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.6' }}>{post.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No announcements yet</p>
                <p style={{ fontSize: '14px', color: '#888' }}>Create your first post to engage with your audience</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div>
      {/* Judges Section */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelTitle}><Award style={styles.gold} size={22} /> Judges</div>
          <button onClick={openAddJudge} style={styles.btnPrimary}><Plus size={18} /> Add Judge</button>
        </div>
        <div style={{ padding: '20px' }}>
          {judges.map((judge) => (
            <div key={judge.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '8px' }}>
              <div style={styles.avatar()}>{judge.name.split(' ').slice(0,2).map(n => n[0]).join('')}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '500' }}>{judge.name}</p>
                <p style={{ fontSize: '13px', color: '#888' }}>{judge.title}</p>
              </div>
              <button onClick={() => openEditJudge(judge)} style={{ ...styles.btnSecondary, width: 'auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit size={14} /> Edit</button>
              <button onClick={() => deleteJudge(judge.id)} style={{ ...styles.btnReject, padding: '8px 12px' }}><Trash2 size={14} /></button>
            </div>
          ))}
          {judges.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <Award size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>No judges added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Sponsors Section */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelTitle}><Building style={styles.gold} size={22} /> Sponsors</div>
          <button onClick={openAddSponsor} style={styles.btnPrimary}><Plus size={18} /> Add Sponsor</button>
        </div>
        <div style={{ padding: '20px' }}>
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '8px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: sponsor.tier === 'Platinum' ? 'rgba(200,200,200,0.1)' : sponsor.tier === 'Gold' ? 'rgba(212,175,55,0.1)' : 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building size={20} style={{ color: sponsor.tier === 'Platinum' ? '#e0e0e0' : sponsor.tier === 'Gold' ? '#d4af37' : '#a78bfa' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '500' }}>{sponsor.name}</p>
                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: sponsor.tier === 'Platinum' ? 'rgba(200,200,200,0.2)' : sponsor.tier === 'Gold' ? 'rgba(212,175,55,0.15)' : 'rgba(139,92,246,0.15)', color: sponsor.tier === 'Platinum' ? '#e0e0e0' : sponsor.tier === 'Gold' ? '#d4af37' : '#a78bfa' }}>{sponsor.tier}</span>
              </div>
              <span style={{ color: '#4ade80', fontWeight: '600', fontSize: '16px' }}>${sponsor.amount.toLocaleString()}</span>
              <button onClick={() => openEditSponsor(sponsor)} style={{ ...styles.btnSecondary, width: 'auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit size={14} /> Edit</button>
              <button onClick={() => deleteSponsor(sponsor.id)} style={{ ...styles.btnReject, padding: '8px 12px' }}><Trash2 size={14} /></button>
            </div>
          ))}
          {sponsors.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <Building size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>No sponsors added yet</p>
            </div>
          )}
          {sponsors.length > 0 && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(34,197,94,0.1)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#888' }}>Total Sponsorship Revenue</span>
              <span style={{ color: '#4ade80', fontWeight: '700', fontSize: '20px' }}>${sponsors.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Event Timeline Section */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelTitle}><Calendar style={styles.gold} size={22} /> Event Timeline</div>
        </div>
        <div style={{ padding: '20px' }}>
          {events.map((event, i) => (
            <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: event.status === 'active' ? 'rgba(212,175,55,0.05)' : 'transparent', borderRadius: '12px', borderBottom: i < events.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: event.status === 'completed' ? 'rgba(34,197,94,0.2)' : event.status === 'active' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)', 
                border: `2px solid ${event.status === 'completed' ? '#4ade80' : event.status === 'active' ? '#d4af37' : 'rgba(255,255,255,0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {event.status === 'completed' && <Check size={14} style={{ color: '#4ade80' }} />}
                {event.status === 'active' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d4af37' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '500', color: event.status === 'active' ? '#d4af37' : '#fff' }}>{event.name}</p>
                <p style={{ fontSize: '13px', color: '#888' }}>
                  {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  {event.time && ` at ${event.time}`}
                  {event.location && ` • ${event.location}`}
                </p>
              </div>
              <span style={{ 
                padding: '4px 12px', 
                borderRadius: '12px', 
                fontSize: '11px', 
                fontWeight: '600',
                background: event.status === 'completed' ? 'rgba(34,197,94,0.15)' : event.status === 'active' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                color: event.status === 'completed' ? '#4ade80' : event.status === 'active' ? '#d4af37' : '#888'
              }}>
                {event.status === 'completed' ? 'Completed' : event.status === 'active' ? 'Live Now' : 'Upcoming'}
              </span>
              <button onClick={() => openEditEvent(event)} style={{ ...styles.btnSecondary, width: 'auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit size={14} /> Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}><Crown size={22} /></div>
            <span style={styles.logoText}>EliteRank</span>
            <span style={styles.badge}>HOST ADMIN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ ...styles.badge, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(212,175,55,0.3)' }}><Star size={14} /> Verified Host</div>
            <div style={styles.avatar()}>{hostProfile.firstName[0]}{hostProfile.lastName[0]}</div>
          </div>
        </div>
      </header>

      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <button style={styles.navItem(activeTab === 'overview')} onClick={() => setActiveTab('overview')}><BarChart3 size={18} /> Overview</button>
          <button style={styles.navItem(activeTab === 'nominations')} onClick={() => setActiveTab('nominations')}><UserPlus size={18} /> Nominations</button>
          <button style={styles.navItem(activeTab === 'community')} onClick={() => setActiveTab('community')}><FileText size={18} /> Community</button>
          <button style={styles.navItem(activeTab === 'settings')} onClick={() => setActiveTab('settings')}><Settings size={18} /> Settings</button>
          <button style={styles.navItem(activeTab === 'profile')} onClick={() => setActiveTab('profile')}><User size={18} /> Profile</button>
        </div>
      </nav>

      <main style={styles.main}>
        {activeTab === 'overview' && (
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '14px', color: '#d4af37', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} /> Your Competition
            </p>
          </div>
        )}
        <h1 style={styles.pageTitle}>
          {activeTab === 'overview' && <><Crown style={styles.gold} /> New York Most Eligible</>}
          {activeTab === 'nominations' && <><UserPlus style={styles.gold} /> Nominations</>}
          {activeTab === 'community' && <><FileText style={styles.gold} /> Community</>}
          {activeTab === 'settings' && <><Settings style={styles.gold} /> Settings</>}
          {activeTab === 'profile' && <><User style={styles.gold} /> Host Profile</>}
        </h1>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'nominations' && renderNominations()}
        {activeTab === 'community' && renderCommunity()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'profile' && renderProfile()}
      </main>

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Competition Settings</h2>
              <button style={styles.modalClose} onClick={() => setShowCreateModal(false)}><X size={24} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ width: '64px', height: '64px', background: 'rgba(212,175,55,0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <MapPin size={32} style={styles.gold} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>New York Most Eligible</h3>
                <p style={{ color: '#888', fontSize: '14px' }}>Season 2025 • Jan 15 - Feb 20</p>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Competition Phase</label>
                <select style={styles.formInput}>
                  <option>Voting Round 1</option>
                  <option>Voting Round 2</option>
                  <option>Finals</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Double Vote Day</label>
                  <input type="date" style={styles.formInput} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Finals Event Date</label>
                  <input type="date" style={styles.formInput} />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button style={styles.btnPrimary}><Save size={16} /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Nominee Modal */}
      {nomineeToConvert && (
        <div style={styles.modalOverlay} onClick={() => setNomineeToConvert(null)}>
          <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Convert to Contestant</h2>
              <button style={styles.modalClose} onClick={() => setNomineeToConvert(null)}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Nominee Preview */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '600', color: '#d4af37', margin: '0 auto 16px', border: '3px solid rgba(212,175,55,0.3)' }}>
                  {nomineeToConvert.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{nomineeToConvert.name}</h3>
                <p style={{ color: '#888', fontSize: '14px' }}>{nomineeToConvert.age} • {nomineeToConvert.occupation}</p>
                <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>{nomineeToConvert.city}</p>
              </div>

              {/* Profile Preview */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', color: '#d4af37', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Profile Preview</h4>
                <p style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>{nomineeToConvert.bio}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {nomineeToConvert.interests.map((interest, i) => (
                    <span key={i} style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.1)', color: '#d4af37', borderRadius: '16px', fontSize: '12px', fontWeight: '500' }}>{interest}</span>
                  ))}
                </div>
              </div>

              {/* What Happens Next */}
              <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px', padding: '20px' }}>
                <p style={{ color: '#4ade80', fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> Accepting this nominee will:
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={14} style={{ color: '#4ade80' }} />
                    </div>
                    <span style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.5' }}>
                      <strong style={{ color: '#fff' }}>Send notification</strong> via email that they have been accepted to compete in New York Most Eligible 2025
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={14} style={{ color: '#4ade80' }} />
                    </div>
                    <span style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.5' }}>
                      <strong style={{ color: '#fff' }}>Create public profile</strong> automatically visible on the Contestants page
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={14} style={{ color: '#4ade80' }} />
                    </div>
                    <span style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.5' }}>
                      <strong style={{ color: '#fff' }}>Enable voting</strong> so fans can immediately start casting votes
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={14} style={{ color: '#4ade80' }} />
                    </div>
                    <span style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.5' }}>
                      <strong style={{ color: '#fff' }}>Add to leaderboard</strong> and begin tracking their vote rankings
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setNomineeToConvert(null)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={() => { 
                setNominees(nominees.map(n => n.id === nomineeToConvert.id ? { ...n, status: 'approved', votes: 0 } : n));
                setNomineeToConvert(null); 
              }} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}>
                <Check size={18} /> Accept & Notify Contestant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Third Party Nomination Modal */}
      {nomineeToApprove && (
        <div style={styles.modalOverlay} onClick={() => setNomineeToApprove(null)}>
          <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.modalHeader, background: 'linear-gradient(90deg, rgba(139,92,246,0.1), transparent)' }}>
              <h2 style={styles.modalTitle}>Approve Third Party Nomination</h2>
              <button style={styles.modalClose} onClick={() => setNomineeToApprove(null)}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Nomination Info */}
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <UserPlus size={18} style={{ color: '#a78bfa' }} />
                  <span style={{ color: '#a78bfa', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Third Party Nomination</span>
                </div>
                <p style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.6' }}>
                  <strong style={{ color: '#fff' }}>{nomineeToApprove.nominatorName}</strong> has nominated <strong style={{ color: '#fff' }}>{nomineeToApprove.name}</strong> to compete in New York Most Eligible 2025.
                </p>
              </div>

              {/* Nominee Preview */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '600', color: '#a78bfa', margin: '0 auto 16px', border: '3px solid rgba(139,92,246,0.3)' }}>
                  {nomineeToApprove.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{nomineeToApprove.name}</h3>
                <p style={{ color: '#888', fontSize: '14px' }}>{nomineeToApprove.age} • {nomineeToApprove.occupation}</p>
                <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>{nomineeToApprove.city}</p>
                {nomineeToApprove.email && (
                  <p style={{ color: '#a78bfa', fontSize: '13px', marginTop: '8px' }}>{nomineeToApprove.email}</p>
                )}
              </div>

              {/* What Happens Next */}
              <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', padding: '20px' }}>
                <p style={{ color: '#a78bfa', fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> Approving this nomination will:
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '700' }}>1</span>
                    </div>
                    <span style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.5' }}>
                      <strong style={{ color: '#fff' }}>Send email invitation</strong> to {nomineeToApprove.name} asking them to accept or decline the nomination
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '700' }}>2</span>
                    </div>
                    <span style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.5' }}>
                      If accepted, they will be prompted to <strong style={{ color: '#fff' }}>complete their profile</strong> (bio, photos, interests, social links)
                    </span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: '700' }}>3</span>
                    </div>
                    <span style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.5' }}>
                      Once profile is complete, you can <strong style={{ color: '#fff' }}>convert them to a contestant</strong> and enable voting
                    </span>
                  </li>
                </ul>
              </div>

              {/* Note */}
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: '#888', fontSize: '13px' }}>
                  <strong style={{ color: '#fff' }}>Note:</strong> The nominee must accept and complete their profile before they can become an active contestant.
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setNomineeToApprove(null)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={() => { 
                setNominees(nominees.map(n => n.id === nomineeToApprove.id ? { ...n, status: 'awaiting-profile' } : n));
                setNomineeToApprove(null); 
              }} style={{ ...styles.btnPrimary, background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}>
                <Check size={18} /> Approve & Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Judge Modal */}
      {showJudgeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowJudgeModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingJudge ? 'Edit Judge' : 'Add Judge'}</h2>
              <button style={styles.modalClose} onClick={() => setShowJudgeModal(false)}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Full Name</label>
                <input 
                  type="text" 
                  value={judgeForm.name} 
                  onChange={(e) => setJudgeForm({...judgeForm, name: e.target.value})} 
                  style={styles.formInput} 
                  placeholder="e.g., Victoria Blackwell"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Title / Role</label>
                <input 
                  type="text" 
                  value={judgeForm.title} 
                  onChange={(e) => setJudgeForm({...judgeForm, title: e.target.value})} 
                  style={styles.formInput} 
                  placeholder="e.g., Fashion Editor, Vogue"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Bio (Optional)</label>
                <textarea 
                  value={judgeForm.bio} 
                  onChange={(e) => setJudgeForm({...judgeForm, bio: e.target.value})} 
                  style={{ ...styles.formTextarea, minHeight: '80px' }} 
                  placeholder="Brief description of the judge..."
                />
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowJudgeModal(false)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={saveJudge} style={styles.btnPrimary} disabled={!judgeForm.name || !judgeForm.title}>
                <Check size={18} /> {editingJudge ? 'Save Changes' : 'Add Judge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sponsor Modal */}
      {showSponsorModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSponsorModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingSponsor ? 'Edit Sponsor' : 'Add Sponsor'}</h2>
              <button style={styles.modalClose} onClick={() => setShowSponsorModal(false)}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Company Name</label>
                <input 
                  type="text" 
                  value={sponsorForm.name} 
                  onChange={(e) => setSponsorForm({...sponsorForm, name: e.target.value})} 
                  style={styles.formInput} 
                  placeholder="e.g., Luxe Hotels"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Sponsorship Tier</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Platinum', 'Gold', 'Silver'].map(tier => (
                    <button 
                      key={tier}
                      onClick={() => setSponsorForm({...sponsorForm, tier})}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: '10px', 
                        border: 'none',
                        background: sponsorForm.tier === tier 
                          ? tier === 'Platinum' ? 'rgba(200,200,200,0.3)' : tier === 'Gold' ? 'rgba(212,175,55,0.3)' : 'rgba(139,92,246,0.3)'
                          : 'rgba(255,255,255,0.05)',
                        color: sponsorForm.tier === tier 
                          ? tier === 'Platinum' ? '#e0e0e0' : tier === 'Gold' ? '#d4af37' : '#a78bfa'
                          : '#888',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Sponsorship Amount ($)</label>
                <input 
                  type="number" 
                  value={sponsorForm.amount} 
                  onChange={(e) => setSponsorForm({...sponsorForm, amount: e.target.value})} 
                  style={styles.formInput} 
                  placeholder="e.g., 25000"
                />
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowSponsorModal(false)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={saveSponsor} style={styles.btnPrimary} disabled={!sponsorForm.name || !sponsorForm.amount}>
                <Check size={18} /> {editingSponsor ? 'Save Changes' : 'Add Sponsor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && editingEvent && (
        <div style={styles.modalOverlay} onClick={() => setShowEventModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Event</h2>
              <button style={styles.modalClose} onClick={() => setShowEventModal(false)}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Event Name</label>
                <input 
                  type="text" 
                  value={eventForm.name} 
                  onChange={(e) => setEventForm({...eventForm, name: e.target.value})} 
                  style={styles.formInput} 
                  placeholder="e.g., Voting Round 1"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Start Date</label>
                  <input 
                    type="date" 
                    value={eventForm.date} 
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})} 
                    style={styles.formInput} 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>End Date (Optional)</label>
                  <input 
                    type="date" 
                    value={eventForm.endDate} 
                    onChange={(e) => setEventForm({...eventForm, endDate: e.target.value})} 
                    style={styles.formInput} 
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Time (Optional)</label>
                  <input 
                    type="time" 
                    value={eventForm.time} 
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})} 
                    style={styles.formInput} 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Status</label>
                  <select 
                    value={eventForm.status} 
                    onChange={(e) => setEventForm({...eventForm, status: e.target.value})} 
                    style={styles.formInput}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active / Live</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Location (Optional)</label>
                <input 
                  type="text" 
                  value={eventForm.location} 
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})} 
                  style={styles.formInput} 
                  placeholder="e.g., The Plaza Hotel"
                />
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowEventModal(false)} style={styles.btnSecondary}>Cancel</button>
              <button onClick={saveEvent} style={styles.btnPrimary}>
                <Check size={18} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAnnouncementModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</h2>
              <button style={styles.modalClose} onClick={() => setShowAnnouncementModal(false)}><X size={24} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Post Type Selector */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Post Type</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { value: 'announcement', label: 'Announcement', icon: <Sparkles size={14} />, color: '#d4af37' },
                    { value: 'update', label: 'Update', icon: <Check size={14} />, color: '#4ade80' },
                    { value: 'news', label: 'News', icon: <FileText size={14} />, color: '#60a5fa' }
                  ].map(type => (
                    <button 
                      key={type.value}
                      onClick={() => setAnnouncementForm({...announcementForm, type: type.value})}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        borderRadius: '10px', 
                        border: 'none',
                        background: announcementForm.type === type.value ? `${type.color}20` : 'rgba(255,255,255,0.05)',
                        color: announcementForm.type === type.value ? type.color : '#888',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {type.icon} {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Title</label>
                <input 
                  type="text" 
                  value={announcementForm.title} 
                  onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})} 
                  style={styles.formInput} 
                  placeholder="e.g., Exciting News About Round 2!"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Content</label>
                <textarea 
                  value={announcementForm.content} 
                  onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})} 
                  style={{ ...styles.formTextarea, minHeight: '120px' }} 
                  placeholder="Write your announcement here..."
                />
                <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>{announcementForm.content.length}/500 characters</p>
              </div>

              {/* Pin Option */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '16px',
                background: announcementForm.pinned ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: announcementForm.pinned ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer'
              }} onClick={() => setAnnouncementForm({...announcementForm, pinned: !announcementForm.pinned})}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MapPin size={18} style={{ color: announcementForm.pinned ? '#d4af37' : '#888' }} />
                  <div>
                    <p style={{ fontWeight: '500', color: announcementForm.pinned ? '#d4af37' : '#fff', fontSize: '14px' }}>Pin to top</p>
                    <p style={{ color: '#888', fontSize: '12px' }}>Pinned posts appear first in the feed</p>
                  </div>
                </div>
                <div style={{ 
                  width: '44px', 
                  height: '24px', 
                  borderRadius: '12px', 
                  background: announcementForm.pinned ? '#d4af37' : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    background: '#fff',
                    position: 'absolute',
                    top: '2px',
                    left: announcementForm.pinned ? '22px' : '2px',
                    transition: 'all 0.2s'
                  }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: '#888', fontSize: '13px' }}>This will be visible on the public Announcements page</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowAnnouncementModal(false)} style={styles.btnSecondary}>Cancel</button>
                <button onClick={saveAnnouncement} style={styles.btnPrimary} disabled={!announcementForm.title || !announcementForm.content}>
                  <Check size={18} /> {editingAnnouncement ? 'Save Changes' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Public Site View */}
      {showPublicSite && (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 100, overflow: 'auto' }}>
          {/* Public Site Header */}
          <header style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1), transparent)', borderBottom: '1px solid rgba(212,175,55,0.2)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown size={22} style={{ color: '#0a0a0f' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#d4af37', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Most Eligible</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>New York</p>
                  </div>
                </div>
                {/* Presenting Sponsor */}
                {sponsors.find(s => s.tier === 'Platinum') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presented by</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0' }}>{sponsors.find(s => s.tier === 'Platinum').name}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>● LIVE</span>
                <button onClick={() => setShowPublicSite(false)} style={{ ...styles.btnSecondary, padding: '8px 16px' }}>
                  <X size={16} /> Exit Preview
                </button>
              </div>
            </div>
          </header>

          {/* Public Site Navigation */}
          <nav style={{ background: 'rgba(20,20,30,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 24px', position: 'sticky', top: '73px', zIndex: 9 }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0' }}>
              <button onClick={() => setPublicSiteTab('contestants')} style={styles.navItem(publicSiteTab === 'contestants')}><Users size={18} /> Contestants</button>
              <button onClick={() => setPublicSiteTab('events')} style={styles.navItem(publicSiteTab === 'events')}><Calendar size={18} /> Events</button>
              <button onClick={() => setPublicSiteTab('announcements')} style={styles.navItem(publicSiteTab === 'announcements')}><Sparkles size={18} /> Announcements</button>
              <button onClick={() => setPublicSiteTab('about')} style={styles.navItem(publicSiteTab === 'about')}><Award size={18} /> About</button>
            </div>
          </nav>

          {/* Public Site Content */}
          <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
            {/* Contestants Tab */}
            {publicSiteTab === 'contestants' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>Meet the Contestants</h1>
                  <p style={{ color: '#888', fontSize: '16px', marginBottom: '32px' }}>Vote for your favorite to help them win New York Most Eligible 2025</p>
                  
                  {/* Double Vote Day Alert */}
                  {forceDoubleVoteDay && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(251,191,36,0.1))', 
                      border: '2px solid rgba(212,175,55,0.4)', 
                      borderRadius: '16px', 
                      padding: '16px 24px', 
                      marginBottom: '32px',
                      maxWidth: '500px',
                      margin: '0 auto 32px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <Sparkles size={24} style={{ color: '#d4af37' }} />
                        <div>
                          <p style={{ color: '#d4af37', fontWeight: '700', fontSize: '18px' }}>🎉 DOUBLE VOTE DAY!</p>
                          <p style={{ color: '#b0b0b0', fontSize: '14px' }}>Every vote counts twice today • $1 = 2 votes</p>
                        </div>
                        <Sparkles size={24} style={{ color: '#d4af37' }} />
                      </div>
                    </div>
                  )}
                  
                  {/* Countdown Timer */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))', 
                    border: '1px solid rgba(212,175,55,0.3)', 
                    borderRadius: '20px', 
                    padding: '24px 32px',
                    maxWidth: '700px',
                    margin: '0 auto'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite', boxShadow: '0 0 10px rgba(74,222,128,0.5)' }} />
                      <span style={{ color: '#d4af37', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        {getCurrentStage().name} Ends In
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                      {[
                        { value: timeLeft.days, label: 'Days' },
                        { value: timeLeft.hours, label: 'Hours' },
                        { value: timeLeft.minutes, label: 'Minutes' },
                        { value: timeLeft.seconds, label: 'Seconds' }
                      ].map((unit, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            background: 'rgba(0,0,0,0.3)', 
                            borderRadius: '16px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '1px solid rgba(212,175,55,0.2)',
                            marginBottom: '8px'
                          }}>
                            <span style={{ 
                              fontSize: '36px', 
                              fontWeight: '700', 
                              color: '#d4af37',
                              fontFamily: 'monospace'
                            }}>
                              {String(unit.value).padStart(2, '0')}
                            </span>
                          </div>
                          <span style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{unit.label}</span>
                        </div>
                      ))}
                    </div>

                    <p style={{ color: '#888', fontSize: '13px', marginTop: '16px' }}>
                      Vote now to help your favorite advance to the next round!
                    </p>
                    
                    {/* Presenting Sponsor Badge */}
                    {sponsors.find(s => s.tier === 'Platinum') && (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(212,175,55,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presented by</span>
                          <span style={{ fontSize: '16px', fontWeight: '600', color: '#e0e0e0' }}>{sponsors.find(s => s.tier === 'Platinum').name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contestant Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {contestants.map((contestant, index) => (
                    <div key={contestant.id} onClick={() => setSelectedContestant(contestant)} style={{ 
                      background: 'rgba(30,30,40,0.6)', 
                      border: index < 3 ? '2px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)', 
                      borderRadius: '20px', 
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      position: 'relative'
                    }}>
                      {/* Rank Badge */}
                      <div style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        left: '12px', 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '10px', 
                        background: index === 0 ? 'linear-gradient(135deg, #d4af37, #f4d03f)' : index === 1 ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8)' : index === 2 ? 'linear-gradient(135deg, #cd7f32, #daa06d)' : 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: index < 3 ? '#0a0a0f' : '#fff',
                        zIndex: 2
                      }}>
                        {index + 1}
                      </div>

                      {/* Trend Badge */}
                      <div style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        right: '12px', 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '8px', 
                        background: contestant.trend === 'up' ? 'rgba(34,197,94,0.9)' : contestant.trend === 'down' ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#fff',
                        zIndex: 2
                      }}>
                        {contestant.trend === 'up' ? '↑' : contestant.trend === 'down' ? '↓' : '—'}
                      </div>

                      {/* Profile Image Area */}
                      <div style={{ 
                        width: '100%', 
                        aspectRatio: '4/5', 
                        background: '#1a1a24',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Stock Photo using UI Faces */}
                        <img 
                          src={[
                            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
                            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop',
                            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop',
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop',
                            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop',
                            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop',
                            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop'
                          ][index]}
                          alt={contestant.name}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback Avatar */}
                        <div style={{ 
                          display: 'none',
                          width: '100%', 
                          height: '100%', 
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(139,92,246,0.2))',
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '48px', 
                          fontWeight: '600', 
                          color: '#d4af37'
                        }}>
                          {contestant.name.split(' ').map(n => n[0]).join('')}
                        </div>

                        {/* Bottom Gradient Info */}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          padding: '40px 16px 14px',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.95))'
                        }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px', color: '#fff' }}>{contestant.name}</h3>
                          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{contestant.age} • {contestant.occupation}</p>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(20,20,28,0.8)' }}>
                        <div>
                          <p style={{ fontSize: '18px', fontWeight: '700', color: index < 3 ? '#d4af37' : '#fff' }}>{contestant.votes.toLocaleString()}</p>
                          <p style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Votes</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedContestant(contestant); }} style={{ ...styles.btnPrimary, padding: '10px 18px', fontSize: '13px' }}>
                          Vote
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events Tab */}
            {publicSiteTab === 'events' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>Events</h1>
                  <p style={{ color: '#888', fontSize: '16px' }}>Don't miss our exclusive Most Eligible events</p>
                </div>

                <div style={{ display: 'grid', gap: '24px' }}>
                  {/* Featured Event */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(139,92,246,0.1))', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '24px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
                    <span style={{ position: 'absolute', top: '20px', right: '20px', padding: '6px 14px', background: '#d4af37', color: '#0a0a0f', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>FEATURED</span>
                    <p style={{ color: '#d4af37', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>FEB 20, 2025 • 7:00 PM</p>
                    <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '12px' }}>New York Most Eligible Finals Gala</h2>
                    <p style={{ color: '#b0b0b0', fontSize: '15px', marginBottom: '20px', maxWidth: '600px' }}>Join us for an unforgettable evening as we crown New York's Most Eligible. Red carpet, live entertainment, and the final reveal.</p>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '14px' }}><MapPin size={16} /> The Plaza Hotel, NYC</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontSize: '14px' }}><Users size={16} /> 500 Guests</span>
                    </div>
                    <button style={{ ...styles.btnPrimary, padding: '14px 32px' }}>Get Tickets - $150</button>
                  </div>

                  {/* Other Events */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <div style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
                      <p style={{ color: '#d4af37', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>FEB 10, 2025 • 6:00 PM</p>
                      <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Double Vote Day Mixer</h3>
                      <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>Meet the contestants in person during our special double vote day event.</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '13px', marginBottom: '16px' }}>
                        <MapPin size={14} /> Soho House NYC
                      </div>
                      <button style={{ ...styles.btnSecondary, width: '100%' }}>RSVP Free</button>
                    </div>
                    <div style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
                      <p style={{ color: '#d4af37', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>FEB 15, 2025 • 8:00 PM</p>
                      <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Semi-Finals Watch Party</h3>
                      <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>Watch the semi-finals announcement live with fellow fans and supporters.</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '13px', marginBottom: '16px' }}>
                        <MapPin size={14} /> 1 Oak NYC
                      </div>
                      <button style={{ ...styles.btnSecondary, width: '100%' }}>RSVP Free</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Announcements Tab */}
            {publicSiteTab === 'announcements' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>Announcements</h1>
                  <p style={{ color: '#888', fontSize: '16px' }}>Stay updated with the latest news from Most Eligible NYC</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[...announcements].sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return new Date(b.date) - new Date(a.date);
                  }).map((post, i) => {
                    const getTypeStyle = (type) => {
                      switch(type) {
                        case 'announcement': return { icon: <Sparkles size={20} style={{ color: '#d4af37' }} />, bg: 'rgba(212,175,55,0.2)', iconColor: '#d4af37' };
                        case 'update': return { icon: <Check size={20} style={{ color: '#4ade80' }} />, bg: 'rgba(34,197,94,0.15)', iconColor: '#4ade80' };
                        case 'news': return { icon: <FileText size={20} style={{ color: '#60a5fa' }} />, bg: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa' };
                        default: return { icon: <FileText size={20} style={{ color: '#888' }} />, bg: 'rgba(255,255,255,0.1)', iconColor: '#888' };
                      }
                    };
                    const typeStyle = getTypeStyle(post.type);
                    const postDate = new Date(post.date);
                    const now = new Date();
                    const diffHours = Math.floor((now - postDate) / (1000 * 60 * 60));
                    const isNew = diffHours < 24;
                    
                    return (
                      <div key={post.id} style={{ 
                        background: post.pinned || i === 0 ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(30,30,40,0.6))' : 'rgba(30,30,40,0.6)', 
                        border: post.pinned || i === 0 ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)', 
                        borderRadius: '20px', 
                        padding: '24px' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ width: '40px', height: '40px', background: typeStyle.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {typeStyle.icon}
                          </div>
                          <div>
                            <p style={{ fontWeight: '600' }}>{post.title}</p>
                            <p style={{ fontSize: '12px', color: '#888' }}>
                              {diffHours < 1 ? 'Just now' : 
                               diffHours < 24 ? `${diffHours} hour${diffHours > 1 ? 's' : ''} ago` : 
                               postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          {post.pinned && (
                            <span style={{ marginLeft: 'auto', padding: '4px 12px', background: 'rgba(212,175,55,0.15)', color: '#d4af37', borderRadius: '12px', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={10} /> PINNED
                            </span>
                          )}
                          {isNew && !post.pinned && (
                            <span style={{ marginLeft: 'auto', padding: '4px 12px', background: 'rgba(212,175,55,0.15)', color: '#d4af37', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>NEW</span>
                          )}
                        </div>
                        <p style={{ color: '#b0b0b0', fontSize: '14px', lineHeight: '1.6' }}>{post.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* About Tab */}
            {publicSiteTab === 'about' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                  <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>About Most Eligible NYC</h1>
                  <p style={{ color: '#888', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>The premier competition celebrating New York's most outstanding singles</p>
                </div>

                {/* Judges Section */}
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(212,175,55,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={24} style={{ color: '#d4af37' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Meet the Judges</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    {[
                      { name: 'Victoria Blackwell', title: 'Fashion Editor, Vogue', bio: 'With over 15 years in fashion journalism, Victoria brings her keen eye for style and elegance to the panel.' },
                      { name: 'Christopher Hayes', title: 'Lifestyle Influencer', bio: '5M+ followers trust Christopher\'s insights on modern dating, relationships, and personal branding.' },
                      { name: 'Diana Chen', title: 'Founder, Elite Events', bio: 'Diana has connected thousands of eligible singles through her exclusive matchmaking events across the globe.' }
                    ].map((judge, i) => (
                      <div key={i} style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px', fontWeight: '600', color: '#d4af37' }}>
                          {judge.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{judge.name}</h3>
                        <p style={{ color: '#d4af37', fontSize: '13px', marginBottom: '12px' }}>{judge.title}</p>
                        <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.5' }}>{judge.bio}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline Section */}
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(59,130,246,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={24} style={{ color: '#60a5fa' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Competition Timeline</h2>
                  </div>
                  <div style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px' }}>
                    {events.filter(e => e.publicVisible !== false).map((event, i, arr) => {
                      const formatEventDate = (event) => {
                        const startDate = new Date(event.date);
                        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        if (event.endDate) {
                          const endDate = new Date(event.endDate);
                          const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          return `${startStr} - ${endStr}`;
                        }
                        return startStr;
                      };
                      
                      return (
                        <div key={event.id} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: i < arr.length - 1 ? '32px' : '0' }}>
                          {i < arr.length - 1 && <div style={{ position: 'absolute', left: '19px', top: '40px', width: '2px', height: 'calc(100% - 20px)', background: event.status === 'completed' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)' }} />}
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: event.status === 'completed' ? 'rgba(34,197,94,0.2)' : event.status === 'active' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `2px solid ${event.status === 'completed' ? '#4ade80' : event.status === 'active' ? '#d4af37' : 'rgba(255,255,255,0.2)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: event.status === 'active' ? '0 0 20px rgba(212,175,55,0.3)' : 'none'
                          }}>
                            {event.status === 'completed' ? <Check size={18} style={{ color: '#4ade80' }} /> : 
                             event.status === 'active' ? <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#d4af37' }} /> :
                             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: event.status === 'active' ? '#d4af37' : '#888', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                              {formatEventDate(event)}
                              {event.time && ` at ${event.time}`}
                            </p>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{event.name}</h4>
                            {event.location && <p style={{ color: '#888', fontSize: '14px' }}>{event.location}</p>}
                          </div>
                          <span style={{ 
                            padding: '4px 12px', 
                            borderRadius: '12px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            height: 'fit-content',
                            background: event.status === 'completed' ? 'rgba(34,197,94,0.15)' : event.status === 'active' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                            color: event.status === 'completed' ? '#4ade80' : event.status === 'active' ? '#d4af37' : '#888'
                          }}>
                            {event.status === 'completed' ? 'COMPLETED' : event.status === 'active' ? 'LIVE NOW' : 'UPCOMING'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rules Section */}
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(139,92,246,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={24} style={{ color: '#a78bfa' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Competition Rules</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    <div style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#d4af37' }}>Eligibility Requirements</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {['Must be 21 years or older', 'Must be single (not married or engaged)', 'Must reside in New York City area', 'Must be available for Finals Gala', 'Must agree to background check'].map((rule, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none', color: '#b0b0b0', fontSize: '14px' }}>
                            <Check size={16} style={{ color: '#4ade80' }} /> {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#d4af37' }}>Voting Rules</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {['One free vote per person per day', 'Paid votes: $1 per vote (unlimited)', 'Double Vote Days: all votes count 2x', 'Votes are final and non-refundable', 'Winner determined by 70% votes, 30% judges'].map((rule, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none', color: '#b0b0b0', fontSize: '14px' }}>
                            <Check size={16} style={{ color: '#4ade80' }} /> {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Prizes Section */}
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(212,175,55,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={24} style={{ color: '#d4af37' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Prizes</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    {/* 1st Place */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', border: '2px solid rgba(212,175,55,0.4)', borderRadius: '24px', padding: '32px', textAlign: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '6px 20px', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', borderRadius: '20px', color: '#0a0a0f', fontSize: '12px', fontWeight: '700' }}>1ST PLACE</div>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto 20px' }}>
                        <Crown size={36} style={{ color: '#0a0a0f' }} />
                      </div>
                      <h3 style={{ fontSize: '32px', fontWeight: '700', color: '#d4af37', marginBottom: '16px' }}>$10,000</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                        {['Cash prize', 'Feature in NYC Magazine', 'VIP membership to Soho House', 'Professional photoshoot', 'Luxury spa weekend'].map((prize, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', color: '#b0b0b0', fontSize: '14px' }}>
                            <Star size={14} style={{ color: '#d4af37' }} /> {prize}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 2nd Place */}
                    <div style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(192,192,192,0.3)', borderRadius: '24px', padding: '32px', textAlign: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '6px 20px', background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)', borderRadius: '20px', color: '#0a0a0f', fontSize: '12px', fontWeight: '700' }}>2ND PLACE</div>
                      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto 20px' }}>
                        <Crown size={30} style={{ color: '#0a0a0f' }} />
                      </div>
                      <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#c0c0c0', marginBottom: '16px' }}>$5,000</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                        {['Cash prize', 'Feature in NYC Magazine', 'Professional photoshoot', 'Luxury dinner for two'].map((prize, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', color: '#888', fontSize: '14px' }}>
                            <Star size={14} style={{ color: '#c0c0c0' }} /> {prize}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 3rd Place */}
                    <div style={{ background: 'rgba(30,30,40,0.6)', border: '1px solid rgba(205,127,50,0.3)', borderRadius: '24px', padding: '32px', textAlign: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '6px 20px', background: 'linear-gradient(135deg, #cd7f32, #daa06d)', borderRadius: '20px', color: '#0a0a0f', fontSize: '12px', fontWeight: '700' }}>3RD PLACE</div>
                      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #cd7f32, #daa06d)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto 20px' }}>
                        <Crown size={30} style={{ color: '#0a0a0f' }} />
                      </div>
                      <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#cd7f32', marginBottom: '16px' }}>$2,500</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                        {['Cash prize', 'Professional photoshoot', 'Luxury dinner for two'].map((prize, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', color: '#888', fontSize: '14px' }}>
                            <Star size={14} style={{ color: '#cd7f32' }} /> {prize}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Sponsors Section */}
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(200,200,200,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building size={24} style={{ color: '#e0e0e0' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Our Sponsors</h2>
                  </div>
                  
                  {/* Presenting Sponsor */}
                  {sponsors.find(s => s.tier === 'Platinum') && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(200,200,200,0.1), rgba(200,200,200,0.02))', border: '1px solid rgba(200,200,200,0.2)', borderRadius: '20px', padding: '32px', marginBottom: '20px', textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Presenting Sponsor</p>
                      <h3 style={{ fontSize: '32px', fontWeight: '700', color: '#e0e0e0', marginBottom: '8px' }}>{sponsors.find(s => s.tier === 'Platinum').name}</h3>
                      <div style={{ width: '60px', height: '3px', background: 'linear-gradient(90deg, transparent, #e0e0e0, transparent)', margin: '0 auto' }} />
                    </div>
                  )}
                  
                  {/* Other Sponsors */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {sponsors.filter(s => s.tier !== 'Platinum').map(sponsor => (
                      <div key={sponsor.id} style={{ 
                        background: 'rgba(30,30,40,0.6)', 
                        border: `1px solid ${sponsor.tier === 'Gold' ? 'rgba(212,175,55,0.2)' : 'rgba(139,92,246,0.2)'}`, 
                        borderRadius: '16px', 
                        padding: '24px', 
                        textAlign: 'center' 
                      }}>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '600', 
                          textTransform: 'uppercase', 
                          letterSpacing: '1px',
                          color: sponsor.tier === 'Gold' ? '#d4af37' : '#a78bfa'
                        }}>{sponsor.tier} Sponsor</span>
                        <h4 style={{ fontSize: '18px', fontWeight: '600', marginTop: '8px', color: '#fff' }}>{sponsor.name}</h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advance to USA Section */}
                <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(139,92,246,0.1), rgba(212,175,55,0.1))', border: '2px solid rgba(212,175,55,0.3)', borderRadius: '24px', padding: '48px', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #d4af37, #f4d03f)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(212,175,55,0.3)' }}>
                    <Trophy size={40} style={{ color: '#0a0a0f' }} />
                  </div>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '12px' }}>Advance to Most Eligible USA</h2>
                  <p style={{ color: '#b0b0b0', fontSize: '16px', maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                    The <span style={{ color: '#d4af37', fontWeight: '600' }}>Top 5 finalists</span> from New York Most Eligible will automatically qualify to compete in the national <span style={{ color: '#d4af37', fontWeight: '600' }}>Most Eligible USA</span> competition, where they'll face top contestants from cities across the country for a chance to win the ultimate title and <span style={{ color: '#d4af37', fontWeight: '600' }}>$100,000 grand prize</span>.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {['New York', 'Los Angeles', 'Miami', 'Chicago', 'Houston'].map((city, i) => (
                      <span key={i} style={{ padding: '10px 20px', background: i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '25px', fontSize: '14px', color: i === 0 ? '#d4af37' : '#888' }}>
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Vote Modal */}
          {selectedContestant && (
            <div style={styles.modalOverlay} onClick={() => setSelectedContestant(null)}>
              <div style={{ ...styles.modal, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h2 style={styles.modalTitle}>Cast Your Vote</h2>
                  <button style={styles.modalClose} onClick={() => setSelectedContestant(null)}><X size={24} /></button>
                </div>
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  {/* Double Vote Day Banner */}
                  {forceDoubleVoteDay && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(251,191,36,0.1))', 
                      border: '2px solid rgba(212,175,55,0.4)', 
                      borderRadius: '12px', 
                      padding: '12px 16px', 
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}>
                      <Sparkles size={20} style={{ color: '#d4af37' }} />
                      <div>
                        <p style={{ color: '#d4af37', fontWeight: '700', fontSize: '14px' }}>🎉 DOUBLE VOTE DAY!</p>
                        <p style={{ color: '#b0b0b0', fontSize: '12px' }}>All votes count 2x today</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Contestant Preview */}
                  <div style={{ width: '100px', height: '100px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '600', color: '#d4af37', margin: '0 auto 16px' }}>
                    {selectedContestant.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>{selectedContestant.name}</h3>
                  <p style={{ color: '#888', marginBottom: '24px' }}>{selectedContestant.occupation}</p>

                  {/* Vote Count Selector */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                    <p style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>Select vote amount</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {[1, 10, 25, 50, 100].map(num => (
                        <button key={num} onClick={() => setVoteCount(num)} style={{
                          padding: '10px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          background: voteCount === num ? '#d4af37' : 'rgba(255,255,255,0.05)',
                          color: voteCount === num ? '#0a0a0f' : '#888',
                          fontWeight: '600',
                          fontSize: '15px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}>
                          {num}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom Amount Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                      <span style={{ color: '#666', fontSize: '12px' }}>or enter custom amount</span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                      <div style={{ position: 'relative', width: '140px' }}>
                        <input 
                          type="number" 
                          min="1"
                          value={voteCount}
                          onChange={(e) => setVoteCount(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            paddingLeft: '36px',
                            borderRadius: '10px',
                            border: '2px solid rgba(212,175,55,0.3)',
                            background: 'rgba(212,175,55,0.1)',
                            color: '#d4af37',
                            fontSize: '18px',
                            fontWeight: '700',
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#d4af37', fontSize: '16px', fontWeight: '600' }}>#</span>
                      </div>
                      <span style={{ color: '#888', fontSize: '14px' }}>votes</span>
                    </div>
                    
                    {/* Total Display */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '14px 18px', 
                      background: forceDoubleVoteDay ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(34,197,94,0.1))' : 'rgba(212,175,55,0.15)', 
                      borderRadius: '12px', 
                      marginTop: '16px', 
                      border: `1px solid ${forceDoubleVoteDay ? 'rgba(34,197,94,0.3)' : 'rgba(212,175,55,0.2)'}` 
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ color: '#b0b0b0', fontSize: '14px' }}>Total</span>
                        {forceDoubleVoteDay && (
                          <p style={{ color: '#4ade80', fontSize: '11px', fontWeight: '600' }}>2x BONUS ACTIVE</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: '#d4af37' }}>${voteCount.toLocaleString()}.00</span>
                        {forceDoubleVoteDay && (
                          <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>= {(voteCount * 2).toLocaleString()} votes</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Free Vote Option */}
                  <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>
                    Or use your <span style={{ color: '#4ade80' }}>1 free daily vote</span>
                    {forceDoubleVoteDay && <span style={{ color: '#4ade80' }}> (counts as 2!)</span>}
                  </p>

                  {/* Vote Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button style={{ ...styles.btnPrimary, width: '100%', justifyContent: 'center', padding: '16px' }}>
                      <DollarSign size={18} /> Purchase {forceDoubleVoteDay ? (voteCount * 2).toLocaleString() : voteCount.toLocaleString()} Vote{(forceDoubleVoteDay ? voteCount * 2 : voteCount) !== 1 ? 's' : ''} - ${voteCount.toLocaleString()}
                    </button>
                    <button style={{ ...styles.btnSecondary, width: '100%', justifyContent: 'center', padding: '16px', background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>
                      Use Free Daily Vote
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

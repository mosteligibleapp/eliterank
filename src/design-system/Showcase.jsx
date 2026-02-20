import React, { useState } from 'react';

// Components
import Button, { ButtonGroup, IconButton, PrimaryButton, SecondaryButton, GhostButton, DangerButton } from './components/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter, CardImage } from './components/Card';
import Badge, { BadgeGroup, StatusDot } from './components/Badge';
import Avatar, { AvatarGroup, AvatarWithName } from './components/Avatar';
import Input, { SearchInput, NumberInput, Textarea, Select } from './components/Input';
import Modal, { ModalBody, ModalFooter, ConfirmModal, AlertModal } from './components/Modal';
import { VoteCount, RankDisplay, ProgressBar, StatCard, StatsGrid, TrendIndicator, CountdownTimer } from './components/Stats';

// Patterns
import ContestantCard, { ContestantGrid } from './patterns/ContestantCard';
import LeaderboardRow, { Leaderboard, TopThreeDisplay } from './patterns/LeaderboardRow';
import VoteButton, { VoteButtonGroup, FloatingVoteButton } from './patterns/VoteButton';
import EventCard, { EventGrid } from './patterns/EventCard';

// Design tokens
import { tokens } from './tokens';

/**
 * Showcase - Design System Demo Page
 * 
 * A Storybook-like page displaying all design system components
 */

const Showcase = () => {
  // State for interactive demos
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [votesRemaining, setVotesRemaining] = useState(5);
  const [inputValue, setInputValue] = useState('');
  const [numberValue, setNumberValue] = useState(5);
  const [selectValue, setSelectValue] = useState('');
  
  // Sample data
  const sampleUsers = [
    { id: '1', name: 'Alex Johnson', image: 'https://i.pravatar.cc/150?u=alex', status: 'online' },
    { id: '2', name: 'Sam Wilson', image: 'https://i.pravatar.cc/150?u=sam' },
    { id: '3', name: 'Jordan Lee', image: 'https://i.pravatar.cc/150?u=jordan' },
    { id: '4', name: 'Taylor Swift', image: 'https://i.pravatar.cc/150?u=taylor' },
    { id: '5', name: 'Chris Brown', image: 'https://i.pravatar.cc/150?u=chris' },
  ];
  
  const sampleContestants = [
    { id: '1', name: 'Alex Johnson', image: 'https://i.pravatar.cc/150?u=alex', coverImage: 'https://picsum.photos/400/300?random=1', votes: 12453, rank: 1, trend: 5.2, tags: ['House', 'Techno'], bio: 'NYC-based DJ with 10 years of experience in the underground scene.' },
    { id: '2', name: 'Sam Wilson', image: 'https://i.pravatar.cc/150?u=sam', coverImage: 'https://picsum.photos/400/300?random=2', votes: 10234, rank: 2, trend: -2.1, tags: ['Hip Hop', 'R&B'], bio: 'Producer and DJ bringing the best beats to the East Coast.' },
    { id: '3', name: 'Jordan Lee', image: 'https://i.pravatar.cc/150?u=jordan', coverImage: 'https://picsum.photos/400/300?random=3', votes: 8921, rank: 3, trend: 1.8, tags: ['EDM'], bio: 'Festival DJ known for high-energy performances.' },
  ];
  
  const sampleLeaderboard = sampleContestants.map((c, i) => ({
    id: c.id,
    user: { name: c.name, image: c.image },
    votes: c.votes,
    rank: i + 1,
    trend: c.trend,
  }));
  
  const sampleEvent = {
    id: '1',
    title: "NYC's Hottest DJ Battle",
    subtitle: "The Ultimate Showdown",
    image: 'https://picsum.photos/800/600?random=10',
    date: '2024-12-15',
    time: '9:00 PM',
    venue: 'Brooklyn Steel',
    status: 'live',
    participants: sampleUsers.slice(0, 3),
    totalVotes: 31608,
    totalEntries: 24,
    prize: '$5,000',
    tags: ['Music', 'Competition', 'NYC'],
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };
  
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-sticky bg-bg-primary/80 backdrop-blur-lg border-b border-border">
        <div className="container-page py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gradient-gold">EliteRank Design System</h1>
            <Badge variant="gold">v1.0</Badge>
          </div>
        </div>
      </header>
      
      <main className="container-page py-8 space-y-16">
        {/* Color Palette */}
        <Section title="Color Palette" description="Core colors used throughout the design system">
          <div className="space-y-6">
            {/* Gold */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">Brand Gold</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(tokens.colors.gold).filter(([k]) => !isNaN(k)).map(([shade, color]) => (
                  <div key={shade} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-lg shadow-sm" style={{ backgroundColor: color }} />
                    <span className="text-xs text-text-muted mt-1">{shade}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Backgrounds */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">Backgrounds</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(tokens.colors.bg).map(([name, color]) => (
                  <div key={name} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-lg border border-border" style={{ backgroundColor: color }} />
                    <span className="text-xs text-text-muted mt-1">{name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Status */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">Status Colors</h4>
              <div className="flex gap-4">
                {['success', 'warning', 'error', 'info'].map((status) => (
                  <div key={status} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: tokens.colors[status].DEFAULT }} />
                    <span className="text-xs text-text-muted">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
        
        {/* Typography */}
        <Section title="Typography" description="Font sizes and weights">
          <div className="space-y-4">
            {['6xl', '5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'base', 'sm', 'xs'].map((size) => (
              <div key={size} className="flex items-baseline gap-4">
                <span className="w-16 text-text-muted text-sm">{size}</span>
                <span className={`text-${size} font-semibold`}>The quick brown fox</span>
              </div>
            ))}
          </div>
        </Section>
        
        {/* Buttons */}
        <Section title="Buttons" description="Primary, secondary, ghost, and danger variants">
          <div className="space-y-6">
            {/* Variants */}
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            
            {/* Sizes */}
            <div className="flex flex-wrap gap-4 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
            
            {/* States */}
            <div className="flex flex-wrap gap-4 items-center">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button icon={<HeartIcon />}>With Icon</Button>
              <IconButton icon={<HeartIcon />} label="Like" />
            </div>
            
            {/* Button Group */}
            <ButtonGroup>
              <Button variant="secondary">Left</Button>
              <Button variant="secondary">Center</Button>
              <Button variant="secondary">Right</Button>
            </ButtonGroup>
          </div>
        </Section>
        
        {/* Cards */}
        <Section title="Cards" description="Container components for content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Standard content card</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-text-secondary">Card content goes here.</p>
              </CardBody>
            </Card>
            
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>Raised with shadow</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-text-secondary">More prominent card.</p>
              </CardBody>
            </Card>
            
            <Card variant="featured">
              <CardHeader>
                <CardTitle>Featured Card</CardTitle>
                <CardDescription>Gold glow for winners</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-text-secondary">Use for top contestants.</p>
              </CardBody>
            </Card>
            
            <Card variant="interactive" onClick={() => alert('Clicked!')}>
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
                <CardDescription>Click me!</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-text-secondary">Has hover states.</p>
              </CardBody>
            </Card>
            
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Glass Card</CardTitle>
                <CardDescription>Glassmorphism effect</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-text-secondary">Frosted glass look.</p>
              </CardBody>
            </Card>
          </div>
        </Section>
        
        {/* Badges */}
        <Section title="Badges" description="Status indicators and labels">
          <div className="space-y-6">
            {/* Status badges */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="live">LIVE</Badge>
              <Badge variant="voting">VOTING</Badge>
              <Badge variant="completed">COMPLETED</Badge>
              <Badge variant="gold">PREMIUM</Badge>
            </div>
            
            {/* Rank badges */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="rank" rank={1}>#1</Badge>
              <Badge variant="rank" rank={2}>#2</Badge>
              <Badge variant="rank" rank={3}>#3</Badge>
              <Badge variant="rank" rank={4}>#4</Badge>
            </div>
            
            {/* Other variants */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="count">1,234 votes</Badge>
              <Badge variant="tag">Category</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
            
            {/* Status dots */}
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2"><StatusDot status="online" pulse /> Online</span>
              <span className="flex items-center gap-2"><StatusDot status="away" /> Away</span>
              <span className="flex items-center gap-2"><StatusDot status="busy" /> Busy</span>
              <span className="flex items-center gap-2"><StatusDot status="offline" /> Offline</span>
            </div>
          </div>
        </Section>
        
        {/* Avatars */}
        <Section title="Avatars" description="User profile images">
          <div className="space-y-6">
            {/* Sizes */}
            <div className="flex items-end gap-4">
              <Avatar src="https://i.pravatar.cc/150?u=demo" size="xs" />
              <Avatar src="https://i.pravatar.cc/150?u=demo" size="sm" />
              <Avatar src="https://i.pravatar.cc/150?u=demo" size="md" />
              <Avatar src="https://i.pravatar.cc/150?u=demo" size="lg" />
              <Avatar src="https://i.pravatar.cc/150?u=demo" size="xl" />
              <Avatar src="https://i.pravatar.cc/150?u=demo" size="2xl" />
            </div>
            
            {/* With status */}
            <div className="flex items-center gap-4">
              <Avatar src="https://i.pravatar.cc/150?u=1" size="lg" status="online" />
              <Avatar src="https://i.pravatar.cc/150?u=2" size="lg" status="away" />
              <Avatar src="https://i.pravatar.cc/150?u=3" size="lg" status="busy" />
              <Avatar src="https://i.pravatar.cc/150?u=4" size="lg" status="offline" />
            </div>
            
            {/* With rank */}
            <div className="flex items-center gap-4">
              <Avatar src="https://i.pravatar.cc/150?u=gold" size="lg" rank={1} />
              <Avatar src="https://i.pravatar.cc/150?u=silver" size="lg" rank={2} />
              <Avatar src="https://i.pravatar.cc/150?u=bronze" size="lg" rank={3} />
            </div>
            
            {/* Avatar group */}
            <AvatarGroup users={sampleUsers} max={4} size="md" />
            
            {/* Avatar with name */}
            <AvatarWithName user={sampleUsers[0]} subtitle="@alexjohnson" />
          </div>
        </Section>
        
        {/* Inputs */}
        <Section title="Inputs" description="Form input components">
          <div className="max-w-md space-y-6">
            <Input 
              label="Text Input" 
              placeholder="Enter text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            
            <SearchInput 
              placeholder="Search contestants..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onClear={() => setInputValue('')}
            />
            
            <NumberInput
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
              min={1}
              max={10}
            />
            
            <Select
              label="Select Option"
              placeholder="Choose one..."
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: 'house', label: 'House Music' },
                { value: 'techno', label: 'Techno' },
                { value: 'hiphop', label: 'Hip Hop' },
              ]}
            />
            
            <Textarea
              label="Bio"
              placeholder="Tell us about yourself..."
              rows={3}
            />
            
            <Input
              label="With Error"
              error="This field is required"
              placeholder="Invalid input"
            />
          </div>
        </Section>
        
        {/* Stats */}
        <Section title="Stats" description="Data display components">
          <div className="space-y-8">
            {/* Vote counts */}
            <div className="flex flex-wrap gap-8">
              <VoteCount count={12345} trend={5.2} size="sm" />
              <VoteCount count={12345} trend={-2.1} size="md" />
              <VoteCount count={12345} trend={0} size="lg" />
            </div>
            
            {/* Rank displays */}
            <div className="flex gap-6">
              <RankDisplay rank={1} size="lg" showLabel />
              <RankDisplay rank={2} size="lg" showLabel />
              <RankDisplay rank={3} size="lg" showLabel />
              <RankDisplay rank={42} size="lg" />
            </div>
            
            {/* Progress bars */}
            <div className="max-w-md space-y-4">
              <ProgressBar value={75} max={100} label="Progress" showValue />
              <ProgressBar value={45} max={100} variant="success" />
              <ProgressBar value={85} max={100} variant="warning" />
              <ProgressBar value={25} max={100} variant="gradient" size="lg" />
            </div>
            
            {/* Stat cards */}
            <StatsGrid columns={3} className="max-w-2xl">
              <StatCard label="Total Votes" value={31608} change={12.5} />
              <StatCard label="Contestants" value={24} change={-3.2} />
              <StatCard label="Prize Pool" value="$5,000" />
            </StatsGrid>
            
            {/* Countdown */}
            <div>
              <h4 className="text-sm text-text-muted mb-2">Countdown Timer</h4>
              <CountdownTimer 
                endTime={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()}
                size="md"
              />
            </div>
          </div>
        </Section>
        
        {/* Modals */}
        <Section title="Modals" description="Dialog and overlay components">
          <div className="flex flex-wrap gap-4">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
            <Button variant="secondary" onClick={() => setConfirmModalOpen(true)}>
              Confirm Modal
            </Button>
            <Button variant="secondary" onClick={() => setAlertModalOpen(true)}>
              Alert Modal
            </Button>
          </div>
          
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example Modal"
            description="This is a demo modal dialog"
          >
            <ModalBody>
              <p className="text-text-secondary">
                Modal content goes here. You can put any components inside.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
            </ModalFooter>
          </Modal>
          
          <ConfirmModal
            open={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            onConfirm={() => {
              alert('Confirmed!');
              setConfirmModalOpen(false);
            }}
            title="Confirm Action"
            message="Are you sure you want to proceed with this action?"
          />
          
          <AlertModal
            open={alertModalOpen}
            onClose={() => setAlertModalOpen(false)}
            title="Success!"
            message="Your vote has been submitted successfully."
            type="success"
          />
        </Section>
        
        {/* Patterns - Vote Button */}
        <Section title="Vote Button" description="Specialized voting CTA">
          <div className="flex flex-wrap items-start gap-8">
            <VoteButton
              votesRemaining={votesRemaining}
              maxVotes={10}
              onClick={() => setVotesRemaining(v => Math.max(0, v - 1))}
            />
            
            <VoteButton variant="compact" votesRemaining={5} onClick={() => {}} />
            
            <VoteButton variant="icon" votesRemaining={3} onClick={() => {}} />
            
            <VoteButtonGroup
              amounts={[1, 5, 10]}
              votesRemaining={votesRemaining}
              onVote={(amount) => setVotesRemaining(v => Math.max(0, v - amount))}
            />
          </div>
        </Section>
        
        {/* Patterns - Leaderboard */}
        <Section title="Leaderboard" description="Rankings display">
          <div className="space-y-8">
            {/* Top 3 podium */}
            <TopThreeDisplay entries={sampleContestants} />
            
            {/* Leaderboard rows */}
            <div className="max-w-2xl">
              <Leaderboard
                entries={sampleLeaderboard}
                showTrend
                onRowClick={(entry) => alert(`Clicked ${entry.user.name}`)}
              />
            </div>
          </div>
        </Section>
        
        {/* Patterns - Contestant Cards */}
        <Section title="Contestant Cards" description="Contestant display patterns">
          <div className="space-y-8">
            {/* Grid of cards */}
            <ContestantGrid
              contestants={sampleContestants}
              onVote={(c) => alert(`Voted for ${c.name}`)}
              onView={(c) => alert(`Viewing ${c.name}`)}
            />
            
            {/* Compact list */}
            <div className="max-w-2xl">
              <h4 className="text-sm text-text-muted mb-4">Compact Variant</h4>
              <ContestantGrid
                contestants={sampleContestants}
                variant="compact"
                onVote={(c) => alert(`Voted for ${c.name}`)}
              />
            </div>
          </div>
        </Section>
        
        {/* Patterns - Event Cards */}
        <Section title="Event Cards" description="Competition/event display">
          <div className="space-y-8">
            {/* Featured event */}
            <EventCard
              event={sampleEvent}
              variant="featured"
              onView={() => alert('View event')}
              onEnter={() => alert('Enter event')}
              className="max-w-xl"
            />
            
            {/* Event grid */}
            <EventGrid
              events={[
                sampleEvent,
                { ...sampleEvent, id: '2', title: 'LA Dance Battle', status: 'upcoming', image: 'https://picsum.photos/800/600?random=11' },
                { ...sampleEvent, id: '3', title: 'Miami House Music Showdown', status: 'completed', image: 'https://picsum.photos/800/600?random=12' },
              ]}
              onView={(e) => alert(`Viewing ${e.title}`)}
              onEnter={(e) => alert(`Entering ${e.title}`)}
            />
          </div>
        </Section>
        
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container-page text-center text-text-muted">
          <p>EliteRank Design System v1.0</p>
          <p className="text-sm mt-2">
            Inspired by Kalshi, Posh, and Sweatpals
          </p>
        </div>
      </footer>
    </div>
  );
};

// Section component for organizing content
const Section = ({ title, description, children }) => (
  <section>
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
      {description && (
        <p className="text-text-secondary mt-1">{description}</p>
      )}
    </div>
    <div className="p-6 bg-bg-secondary rounded-2xl border border-border">
      {children}
    </div>
  </section>
);

// Simple icon for demo
const HeartIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export default Showcase;

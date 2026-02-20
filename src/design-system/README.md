# EliteRank Design System

A dark-first, premium design system for voting and ranking competitions. Inspired by **Kalshi** (fintech clarity), **Posh** (nightlife luxury), and **Sweatpals** (community energy).

## Quick Start

```jsx
import { Button, Card, Badge, Avatar, Input, Modal, Stats } from './design-system/components';
import { ContestantCard, LeaderboardRow, VoteButton, EventCard } from './design-system/patterns';
import { tokens } from './design-system/tokens';
```

## Design Principles

### 1. 🌙 Dark-First
Everything is designed for dark mode. Light mode is secondary. Our users live in the nightlife aesthetic.

### 2. ✨ Gold = Action
Gold (`#d4af37`) is reserved exclusively for:
- Primary CTAs ("Vote Now", "Enter Contest")
- Winners and top rankings
- Important highlights and achievements

Never use gold for decorative purposes.

### 3. 📊 Trust Through Clarity
Data presentation should feel trustworthy and professional (Kalshi influence):
- Clear vote counts with proper formatting
- Visible trends and changes
- No ambiguity in rankings

### 4. 💫 Aspirational but Accessible
Trendy and premium, but never intimidating (Posh + Sweatpals blend):
- Luxury aesthetics that welcome everyone
- Social proof elements
- Warm community touches

### 5. 🎬 Motion with Purpose
Animations serve function, not flash:
- Subtle hover states (200ms default)
- Bounce for success/celebration
- No gratuitous motion

### 6. 📱 Mobile-Native
Designed for thumbs first:
- Bottom navigation zones
- Touch-friendly tap targets (min 44px)
- Swipeable interactions

---

## Color Palette

### Backgrounds (Dark Mode)
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#08080c` | Page background |
| `bg-secondary` | `#0f0f14` | Section backgrounds |
| `bg-card` | `#141419` | Card backgrounds |
| `bg-elevated` | `#1c1c24` | Elevated surfaces, modals |
| `bg-hover` | `#222230` | Hover states |

### Brand Gold
| Token | Usage |
|-------|-------|
| `gold-50` - `gold-900` | Full spectrum for gradients |
| `gold` (DEFAULT) | `#d4af37` - Primary brand color |

### Status Colors
- **Success**: Green (`#22c55e`) - Votes cast, entries confirmed
- **Warning**: Amber (`#f59e0b`) - Time running out, limits approaching
- **Error**: Red (`#ef4444`) - Failed actions, destructive operations
- **Info**: Blue (`#3b82f6`) - Informational messages

### Accents
- **Pink** (`#ec4899`) - Energetic highlights, notifications
- **Purple** (`#a855f7`) - Premium features, special events
- **Cyan** (`#06b6d4`) - Links, interactive elements

---

## Typography

### Font Stack
```css
--font-display: 'SF Pro Display', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'SF Mono', monospace;
```

### Scale
| Class | Size | Use Case |
|-------|------|----------|
| `text-xs` | 0.75rem | Captions, timestamps |
| `text-sm` | 0.875rem | Secondary text, labels |
| `text-base` | 1rem | Body text |
| `text-lg` | 1.125rem | Emphasized body |
| `text-xl` | 1.25rem | Card titles |
| `text-2xl` | 1.5rem | Section headers |
| `text-3xl` | 1.875rem | Page titles |
| `text-4xl`+ | 2.25rem+ | Hero text, big numbers |

---

## Components Quick Reference

### Button
```jsx
<Button variant="primary" size="lg">Vote Now</Button>
<Button variant="secondary">Learn More</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button loading>Processing...</Button>
```

### Card
```jsx
<Card variant="default">Standard card</Card>
<Card variant="elevated">Raised card</Card>
<Card variant="interactive" onClick={...}>Clickable</Card>
<Card variant="featured">Gold glow for winners</Card>
<Card variant="glass">Glassmorphism</Card>
```

### Badge
```jsx
<Badge variant="live">LIVE</Badge>
<Badge variant="rank" rank={1}>#1</Badge>
<Badge variant="count">1,234 votes</Badge>
<Badge variant="tag">Category</Badge>
```

### Avatar
```jsx
<Avatar src="..." size="md" />
<Avatar src="..." status="online" />
<Avatar src="..." rank={1} />
<AvatarGroup users={[...]} max={3} />
```

### Input
```jsx
<Input placeholder="Search..." />
<Input type="search" icon={<SearchIcon />} />
<Input type="number" min={1} max={100} />
<Select options={[...]} />
```

### Modal
```jsx
<Modal open={open} onClose={...} title="Confirm Vote">
  <ModalBody>...</ModalBody>
  <ModalFooter>...</ModalFooter>
</Modal>

<Modal variant="drawer">Bottom sheet</Modal>
<Modal variant="fullscreen">Full screen</Modal>
```

### Stats
```jsx
<VoteCount count={12345} trend={+5.2} />
<RankDisplay rank={1} />
<ProgressBar value={75} max={100} />
<LeaderboardRow rank={1} user={...} votes={...} />
```

---

## Patterns

### ContestantCard
The primary card for displaying a contestant in a competition.
```jsx
<ContestantCard
  contestant={{
    name: "Alex Johnson",
    image: "...",
    votes: 1234,
    rank: 2,
  }}
  onVote={() => {}}
/>
```

### VoteButton
Specialized CTA for the voting action.
```jsx
<VoteButton
  onClick={handleVote}
  votesRemaining={5}
  disabled={false}
/>
```

### EventCard
Posh-inspired card for events/competitions.
```jsx
<EventCard
  event={{
    title: "NYC's Hottest DJ",
    date: "Dec 15, 2024",
    venue: "Brooklyn Steel",
    image: "...",
    status: "live",
  }}
/>
```

---

## Spacing Guidelines

| Use Case | Value | Tailwind |
|----------|-------|----------|
| Page padding (mobile) | 1.5rem | `px-6` |
| Page padding (desktop) | 3rem | `lg:px-12` |
| Section spacing | 4rem | `py-16` |
| Card padding | 1.25rem | `p-5` |
| Element gap | 0.75rem | `gap-3` |

---

## Animation Guidelines

### Durations
- **Fast** (150ms): Micro-interactions, toggles
- **Default** (200ms): Hovers, focus states
- **Slow** (300ms): Modals, page transitions
- **Slower** (500ms): Complex animations, celebrations

### Easings
- **Default**: `cubic-bezier(0.4, 0, 0.2, 1)` - Smooth, natural
- **In**: `cubic-bezier(0.4, 0, 1, 1)` - Accelerate
- **Out**: `cubic-bezier(0, 0, 0.2, 1)` - Decelerate
- **Bounce**: `cubic-bezier(0.34, 1.56, 0.64, 1)` - Playful success states

---

## Accessibility

- All interactive elements have visible focus states
- Color is never the only indicator (icons/text accompany status)
- Minimum contrast ratio of 4.5:1 for text
- Touch targets minimum 44x44px on mobile
- Proper ARIA labels on interactive components

---

## File Structure

```
src/design-system/
├── README.md              # This file
├── tokens.js              # Design tokens
├── tailwind.config.js     # Tailwind extension
├── components/
│   ├── index.js           # Barrel export
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Badge.jsx
│   ├── Avatar.jsx
│   ├── Input.jsx
│   ├── Modal.jsx
│   └── Stats.jsx
├── patterns/
│   ├── ContestantCard.jsx
│   ├── LeaderboardRow.jsx
│   ├── VoteButton.jsx
│   └── EventCard.jsx
└── Showcase.jsx           # Component demo page
```

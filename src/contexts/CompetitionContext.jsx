import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  INITIAL_COMPETITIONS,
  INITIAL_CONTESTANTS,
  INITIAL_JUDGES,
  INITIAL_SPONSORS,
  INITIAL_EVENTS,
} from '../constants/mockData';

const CompetitionContext = createContext(null);

export function CompetitionProvider({ children }) {
  // Competition selection state
  const [selectedCompetition, setSelectedCompetition] = useState({
    city: 'New York',
    season: '2026',
    phase: 'voting',
    host: null,
    winners: [],
  });

  // Core data states
  const [contestants, setContestants] = useState(INITIAL_CONTESTANTS);
  const [judges, setJudges] = useState(INITIAL_JUDGES);
  const [sponsors, setSponsors] = useState(INITIAL_SPONSORS);
  const [events, setEvents] = useState(INITIAL_EVENTS);

  // Contestant handlers
  const addContestant = useCallback((contestant) => {
    setContestants((prev) => [
      ...prev,
      { id: `c${Date.now()}`, votes: 0, ...contestant },
    ]);
  }, []);

  const updateContestant = useCallback((contestantId, updates) => {
    setContestants((prev) =>
      prev.map((c) => (c.id === contestantId ? { ...c, ...updates } : c))
    );
  }, []);

  const removeContestant = useCallback((contestantId) => {
    setContestants((prev) => prev.filter((c) => c.id !== contestantId));
  }, []);

  // Judge handlers
  const addJudge = useCallback((judge) => {
    setJudges((prev) => [...prev, { id: `j${Date.now()}`, ...judge }]);
  }, []);

  const updateJudge = useCallback((judgeId, updates) => {
    setJudges((prev) =>
      prev.map((j) => (j.id === judgeId ? { ...j, ...updates } : j))
    );
  }, []);

  const removeJudge = useCallback((judgeId) => {
    setJudges((prev) => prev.filter((j) => j.id !== judgeId));
  }, []);

  // Sponsor handlers
  const addSponsor = useCallback((sponsor) => {
    setSponsors((prev) => [...prev, { id: `s${Date.now()}`, ...sponsor }]);
  }, []);

  const updateSponsor = useCallback((sponsorId, updates) => {
    setSponsors((prev) =>
      prev.map((s) => (s.id === sponsorId ? { ...s, ...updates } : s))
    );
  }, []);

  const removeSponsor = useCallback((sponsorId) => {
    setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
  }, []);

  // Event handlers
  const addEvent = useCallback((event) => {
    setEvents((prev) => [...prev, { id: `e${Date.now()}`, ...event }]);
  }, []);

  const updateEvent = useCallback((eventId, updates) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, ...updates } : e))
    );
  }, []);

  const removeEvent = useCallback((eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  // Computed values
  const competitionStats = useMemo(() => {
    const sponsorshipTotal = sponsors.reduce((sum, s) => sum + s.amount, 0);
    return {
      totalRevenue: 125500,
      sponsorships: sponsorshipTotal,
      paidVotes: 42500,
      eventTickets: 20000,
      contestantCount: contestants.length,
      judgeCount: judges.length,
      sponsorCount: sponsors.length,
      eventCount: events.length,
    };
  }, [sponsors, contestants, judges, events]);

  const value = useMemo(
    () => ({
      // State
      selectedCompetition,
      contestants,
      judges,
      sponsors,
      events,
      competitions: INITIAL_COMPETITIONS,
      competitionStats,

      // Competition selection
      setSelectedCompetition,

      // Contestant actions
      addContestant,
      updateContestant,
      removeContestant,

      // Judge actions
      addJudge,
      updateJudge,
      removeJudge,

      // Sponsor actions
      addSponsor,
      updateSponsor,
      removeSponsor,

      // Event actions
      addEvent,
      updateEvent,
      removeEvent,

      // Direct setters for bulk updates
      setContestants,
      setJudges,
      setSponsors,
      setEvents,
    }),
    [
      selectedCompetition,
      contestants,
      judges,
      sponsors,
      events,
      competitionStats,
      addContestant,
      updateContestant,
      removeContestant,
      addJudge,
      updateJudge,
      removeJudge,
      addSponsor,
      updateSponsor,
      removeSponsor,
      addEvent,
      updateEvent,
      removeEvent,
    ]
  );

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
}

export function useCompetitionContext() {
  const context = useContext(CompetitionContext);
  if (!context) {
    throw new Error('useCompetitionContext must be used within a CompetitionProvider');
  }
  return context;
}

export default CompetitionContext;

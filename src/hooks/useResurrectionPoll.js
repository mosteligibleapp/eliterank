import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getResurrectionPoll, castResurrectionVote } from '../lib/resurrection';

/**
 * Loads the resurrection poll for a competition and keeps it fresh.
 *
 * Subscribes to resurrection_polls realtime so the public page reacts when an
 * admin opens or closes a poll. Tally refreshes happen on the voter's own
 * action (a resurrection poll is a deliberate, low-frequency event — not a
 * live ticker like the main leaderboard).
 *
 * @param {string} competitionId
 */
export function useResurrectionPoll(competitionId) {
  const [poll, setPoll] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [myVoteContestantId, setMyVoteContestantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!competitionId) {
      setLoading(false);
      return;
    }
    if (!loadedRef.current) setLoading(true);
    const result = await getResurrectionPoll(competitionId);
    setPoll(result.poll);
    setCandidates(result.candidates || []);
    setMyVoteContestantId(result.myVoteContestantId || null);
    loadedRef.current = true;
    setLoading(false);
  }, [competitionId]);

  useEffect(() => {
    loadedRef.current = false;
    refetch();
  }, [refetch]);

  // React to a poll opening / closing for this competition.
  useEffect(() => {
    if (!competitionId || !supabase) return;
    const channel = supabase
      .channel(`resurrection-${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resurrection_polls',
          filter: `competition_id=eq.${competitionId}`,
        },
        () => refetch()
      )
      .subscribe();
    return () => channel.unsubscribe();
  }, [competitionId, refetch]);

  const castVote = useCallback(
    async (contestantId) => {
      if (!poll?.id) return { success: false, error: 'No active resurrection poll' };
      const result = await castResurrectionVote(poll.id, contestantId);
      if (result.success) await refetch();
      return result;
    },
    [poll?.id, refetch]
  );

  return { poll, candidates, myVoteContestantId, loading, refetch, castVote };
}

export default useResurrectionPoll;

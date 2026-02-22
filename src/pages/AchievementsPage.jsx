/**
 * AchievementsPage - Shows share cards for all competitions the user is in
 * (as a contestant or nominee)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ImagePlus,
  Download,
  Share2,
  Loader,
  Trophy,
  Star,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { useSupabaseAuth } from '../hooks';
import { supabase } from '../lib/supabase';
import {
  generateAchievementCard,
  getAdvancementTitle,
  getPlacementTitle,
} from '../features/achievement-cards';
import './AchievementsPage.css';

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSupabaseAuth();

  const [loading, setLoading] = useState(true);
  const [achievementRecords, setAchievementRecords] = useState([]);
  const [expandedCompetition, setExpandedCompetition] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [shareStatus, setShareStatus] = useState(null);

  // Fetch all competitions the user is in (as contestant or nominee)
  const fetchAchievementRecords = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const contestantSelect = `
        *,
        competition:competitions (
          id,
          name,
          slug,
          city:cities(name),
          season,
          status,
          theme_primary,
          number_of_winners,
          organization:organizations (
            id,
            name,
            slug,
            logo_url
          ),
          voting_rounds (
            id,
            title,
            round_order,
            contestants_advance,
            round_type
          )
        )
      `;

      const nomineeSelect = `
        id,
        name,
        email,
        avatar_url,
        instagram,
        status,
        user_id,
        converted_to_contestant,
        converted_to_contestant_id,
        competition:competitions (
          id,
          name,
          slug,
          city:cities(name),
          season,
          status,
          theme_primary,
          organization:organizations (
            id,
            name,
            slug,
            logo_url
          )
        )
      `;

      // Build separate queries by user_id and email to avoid PostgREST .or()
      // parsing issues with email addresses containing dots.
      // Track contestant vs nominee queries separately for correct deduplication.
      const contestantQueries = [];
      const nomineeQueries = [];

      if (user?.id) {
        contestantQueries.push(
          supabase.from('contestants').select(contestantSelect).eq('user_id', user.id).order('created_at', { ascending: false })
        );
        nomineeQueries.push(
          supabase.from('nominees').select(nomineeSelect).eq('user_id', user.id).not('status', 'in', '("rejected")').order('created_at', { ascending: false })
        );
      }
      if (user?.email) {
        contestantQueries.push(
          supabase.from('contestants').select(contestantSelect).eq('email', user.email).order('created_at', { ascending: false })
        );
        nomineeQueries.push(
          supabase.from('nominees').select(nomineeSelect).eq('email', user.email).not('status', 'in', '("rejected")').order('created_at', { ascending: false })
        );
      }

      const [contestantResults, nomineeResults] = await Promise.all([
        Promise.all(contestantQueries),
        Promise.all(nomineeQueries),
      ]);

      // Merge and deduplicate results by id
      const contestantMap = new Map();
      for (const result of contestantResults) {
        if (result.error) {
          console.error('Error fetching contestant records:', result.error);
          continue;
        }
        for (const row of result.data || []) {
          if (!contestantMap.has(row.id)) contestantMap.set(row.id, row);
        }
      }

      const nomineeMap = new Map();
      for (const result of nomineeResults) {
        if (result.error) {
          console.error('Error fetching nominee records:', result.error);
          continue;
        }
        for (const row of result.data || []) {
          if (!nomineeMap.has(row.id)) nomineeMap.set(row.id, row);
        }
      }

      const contestants = [...contestantMap.values()].filter(c =>
        c.competition &&
        ['publish', 'published', 'live', 'completed'].includes(c.competition.status?.toLowerCase())
      );

      // Track which competition IDs already have contestant records
      const contestantCompetitionIds = new Set(
        contestants.map(c => c.competition?.id).filter(Boolean)
      );

      // Filter nominees: only keep those not already represented as contestants,
      // and not already converted to a contestant
      const nomineeRecords = [...nomineeMap.values()]
        .filter(n =>
          n.competition &&
          ['publish', 'published', 'live', 'completed'].includes(n.competition.status?.toLowerCase()) &&
          !n.converted_to_contestant &&
          !n.converted_to_contestant_id &&
          !contestantCompetitionIds.has(n.competition?.id)
        )
        .map(n => ({
          ...n,
          _source: 'nominee',
        }));

      // Mark contestant records
      const contestantRecords = contestants.map(c => ({
        ...c,
        _source: 'contestant',
      }));

      const merged = [...contestantRecords, ...nomineeRecords];

      setAchievementRecords(merged);

      // Auto-expand first one if only one
      if (merged.length === 1) {
        setExpandedCompetition(merged[0].competition?.id);
      }
    } catch (err) {
      console.error('Error fetching achievement records:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchAchievementRecords();
  }, [fetchAchievementRecords]);

  // Get available cards for a record
  const getAvailableCards = (record) => {
    const cards = [];

    // Nominee-only records can only show the "Nominated" card
    if (record._source === 'nominee') {
      cards.push({
        type: 'nominated',
        title: 'NOMINATED',
        description: 'Share that you\'ve been nominated!',
        icon: <Sparkles size={20} />,
      });
      return cards;
    }

    // Contestant records
    const status = record.status || 'pending';
    const currentRound = record.current_round || 1;
    const rank = record.rank;
    const votingRounds = record.competition?.voting_rounds || [];

    // Nominated - always available
    cards.push({
      type: 'nominated',
      title: 'NOMINATED',
      description: 'Share that you\'ve been nominated!',
      icon: <Sparkles size={20} />,
    });

    // Contestant - if active
    if (status === 'active' || status === 'winner') {
      cards.push({
        type: 'contestant',
        title: 'COMPETING',
        description: 'Let everyone know you\'re competing',
        icon: <Star size={20} />,
      });
    }

    // Advanced - if past round 1
    if (currentRound > 1 && status === 'active') {
      const advancedToRound = votingRounds.find(r => r.round_order === currentRound);
      const advanceCount = advancedToRound?.contestants_advance;

      if (advanceCount) {
        cards.push({
          type: 'advanced',
          customTitle: getAdvancementTitle(advanceCount),
          title: getAdvancementTitle(advanceCount),
          description: `You made the ${advancedToRound?.title || `Round ${currentRound}`}!`,
          icon: <Trophy size={20} />,
        });
      }
    }

    // Finalist
    const sortedRounds = [...votingRounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));
    const finalRound = sortedRounds[sortedRounds.length - 1];
    if (finalRound && currentRound === finalRound.round_order && status === 'active') {
      cards.push({
        type: 'finalist',
        title: 'FINALIST',
        description: 'You\'re in the finals!',
        icon: <Trophy size={20} />,
      });
    }

    // Winner
    if (status === 'winner' && rank) {
      cards.push({
        type: rank === 1 ? 'winner' : 'placement',
        customTitle: rank === 1 ? undefined : getPlacementTitle(rank),
        title: rank === 1 ? 'WINNER' : getPlacementTitle(rank),
        description: rank === 1 ? 'You won! Share your victory!' : `You placed ${rank}${rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'}!`,
        icon: <Trophy size={20} />,
        rank,
      });
    }

    return cards;
  };

  // Generate and download a card
  const handleDownload = async (record, cardOption) => {
    const key = `${record.id}-${cardOption.type}`;
    setGenerating(key);

    try {
      const competition = record.competition;
      const organization = competition?.organization;

      const blob = await generateAchievementCard({
        achievementType: cardOption.type,
        customTitle: cardOption.customTitle,
        name: record.name,
        photoUrl: record.avatar_url,
        handle: record.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city?.name}`,
        season: competition?.season?.toString(),
        organizationName: organization?.name || 'Most Eligible',
        organizationLogoUrl: organization?.logo_url,
        accentColor: competition?.theme_primary || '#d4af37',
        voteUrl: competition?.slug
          ? `mosteligible.co/${organization?.slug || 'most-eligible'}/${competition.slug}`
          : 'mosteligible.co',
        rank: cardOption.rank,
      });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cardOption.type}-${competition?.city?.name || 'card'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  // Share a card
  const handleShare = async (record, cardOption) => {
    const key = `${record.id}-${cardOption.type}`;
    setGenerating(key);

    try {
      const competition = record.competition;
      const organization = competition?.organization;

      const blob = await generateAchievementCard({
        achievementType: cardOption.type,
        customTitle: cardOption.customTitle,
        name: record.name,
        photoUrl: record.avatar_url,
        handle: record.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city?.name}`,
        season: competition?.season?.toString(),
        organizationName: organization?.name || 'Most Eligible',
        organizationLogoUrl: organization?.logo_url,
        accentColor: competition?.theme_primary || '#d4af37',
        voteUrl: competition?.slug
          ? `mosteligible.co/${organization?.slug || 'most-eligible'}/${competition.slug}`
          : 'mosteligible.co',
        rank: cardOption.rank,
      });

      const file = new File([blob], 'share-card.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `I'm ${cardOption.title.toLowerCase()} in ${competition?.name}!`,
        });
        setShareStatus('shared');
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cardOption.type}-${competition?.city?.name || 'card'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShareStatus('downloaded');
      }

      setTimeout(() => setShareStatus(null), 2000);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    } finally {
      setGenerating(null);
    }
  };

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div className="achievements-page">
        <div className="achievements-empty">
          <ImagePlus size={48} />
          <h2>Sign in to view your achievements</h2>
          <p>Access your share cards for all competitions you're in</p>
          <button onClick={() => navigate('/?login=true')} className="achievements-btn-primary">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="achievements-page">
        <div className="achievements-loading">
          <Loader size={32} className="spinning" />
          <p>Loading your achievements...</p>
        </div>
      </div>
    );
  }

  // No competitions
  if (achievementRecords.length === 0) {
    return (
      <div className="achievements-page">
        <header className="achievements-header">
          <button className="achievements-back" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <h1>My Achievements</h1>
        </header>
        <div className="achievements-empty">
          <ImagePlus size={48} />
          <h2>No active achievements</h2>
          <p>You're not currently competing in any competitions</p>
          <button onClick={() => navigate('/')} className="achievements-btn-primary">
            Explore Competitions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="achievements-page">
      <header className="achievements-header">
        <button className="achievements-back" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>My Achievements</h1>
          <p>Share cards for your competitions</p>
        </div>
      </header>

      <div className="achievements-list">
        {achievementRecords.map((record) => {
          const competition = record.competition;
          const isExpanded = expandedCompetition === competition?.id;
          const cards = getAvailableCards(record);
          const isNomineeOnly = record._source === 'nominee';

          return (
            <div key={record.id} className="achievements-competition">
              <button
                className="achievements-competition-header"
                onClick={() => setExpandedCompetition(isExpanded ? null : competition?.id)}
              >
                <div className="achievements-competition-info">
                  <h2>{competition?.name || 'Competition'}</h2>
                  <span className="achievements-competition-meta">
                    {competition?.city?.name} · {competition?.season}
                    {isNomineeOnly && ' · Nominated'}
                    {!isNomineeOnly && record.status === 'active' && ' · Active'}
                    {!isNomineeOnly && record.status === 'winner' && ' · Winner'}
                    {!isNomineeOnly && record.status === 'pending' && ' · Pending'}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isExpanded && (
                <div className="achievements-cards">
                  {cards.map((card) => {
                    const key = `${record.id}-${card.type}`;
                    const isGenerating = generating === key;

                    return (
                      <div key={card.type} className="achievements-card">
                        <div className="achievements-card-icon">{card.icon}</div>
                        <div className="achievements-card-info">
                          <h3>{card.title}</h3>
                          <p>{card.description}</p>
                        </div>
                        <div className="achievements-card-actions">
                          <button
                            className="achievements-card-btn"
                            onClick={() => handleDownload(record, card)}
                            disabled={isGenerating}
                            title="Download"
                          >
                            {isGenerating ? <Loader size={16} className="spinning" /> : <Download size={16} />}
                          </button>
                          <button
                            className="achievements-card-btn achievements-card-btn--primary"
                            onClick={() => handleShare(record, card)}
                            disabled={isGenerating}
                            title="Share"
                          >
                            {isGenerating ? (
                              <Loader size={16} className="spinning" />
                            ) : shareStatus ? (
                              <Check size={16} />
                            ) : (
                              <Share2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

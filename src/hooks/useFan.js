import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { checkIsFan, addFan, removeFan, getFanCount } from '../lib/fans';

export function useFan(profileId) {
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFan, setIsFan] = useState(false);
  const [fanCount, setFanCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const autoFanDone = useRef(false);

  const currentUserId = user?.id;
  const isOwnProfile = currentUserId === profileId;

  useEffect(() => {
    if (!profileId) return;

    getFanCount(profileId).then(setFanCount);

    if (currentUserId && !isOwnProfile) {
      checkIsFan(currentUserId, profileId).then(setIsFan);
    }
  }, [profileId, currentUserId, isOwnProfile]);

  // Auto-fan after login redirect (when ?fan=profileId is in the URL)
  useEffect(() => {
    const fanParam = searchParams.get('fan');
    if (!fanParam || !currentUserId || !profileId || autoFanDone.current) return;
    if (fanParam !== profileId || isOwnProfile) return;

    autoFanDone.current = true;
    // Clear the param from URL
    searchParams.delete('fan');
    setSearchParams(searchParams, { replace: true });

    // Auto-become a fan
    checkIsFan(currentUserId, profileId).then(async (alreadyFan) => {
      if (alreadyFan) {
        setIsFan(true);
        return;
      }
      setIsFan(true);
      setFanCount((c) => c + 1);
      const { error } = await addFan(currentUserId, profileId);
      if (error) {
        setIsFan(false);
        setFanCount((c) => Math.max(c - 1, 0));
      }
    });
  }, [searchParams, currentUserId, profileId, isOwnProfile, setSearchParams]);

  const toggleFan = useCallback(async () => {
    if (!profileId || isOwnProfile || loading) return;

    if (!currentUserId) {
      setShowLoginPrompt(true);
      return;
    }

    setLoading(true);
    const wasFan = isFan;
    setIsFan(!wasFan);
    setFanCount((c) => wasFan ? Math.max(c - 1, 0) : c + 1);

    const { error } = wasFan
      ? await removeFan(currentUserId, profileId)
      : await addFan(currentUserId, profileId);

    if (error) {
      setIsFan(wasFan);
      setFanCount((c) => wasFan ? c + 1 : Math.max(c - 1, 0));
    }
    setLoading(false);
  }, [currentUserId, profileId, isOwnProfile, isFan, loading]);

  return { isFan, fanCount, toggleFan, loading, isOwnProfile, isAuthenticated: !!currentUserId, showLoginPrompt, setShowLoginPrompt };
}

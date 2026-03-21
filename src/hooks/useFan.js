import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores';
import { checkIsFan, addFan, removeFan, getFanCount } from '../lib/fans';

export function useFan(profileId) {
  const user = useAuthStore((state) => state.user);
  const [isFan, setIsFan] = useState(false);
  const [fanCount, setFanCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentUserId = user?.id;
  const isOwnProfile = currentUserId === profileId;

  useEffect(() => {
    if (!profileId) return;

    getFanCount(profileId).then(setFanCount);

    if (currentUserId && !isOwnProfile) {
      checkIsFan(currentUserId, profileId).then(setIsFan);
    }
  }, [profileId, currentUserId, isOwnProfile]);

  const toggleFan = useCallback(async () => {
    if (!currentUserId || !profileId || isOwnProfile || loading) return;

    setLoading(true);
    // Optimistic update
    const wasFan = isFan;
    setIsFan(!wasFan);
    setFanCount((c) => wasFan ? Math.max(c - 1, 0) : c + 1);

    const { error } = wasFan
      ? await removeFan(currentUserId, profileId)
      : await addFan(currentUserId, profileId);

    if (error) {
      // Revert on error
      setIsFan(wasFan);
      setFanCount((c) => wasFan ? c + 1 : Math.max(c - 1, 0));
    }
    setLoading(false);
  }, [currentUserId, profileId, isOwnProfile, isFan, loading]);

  return { isFan, fanCount, toggleFan, loading, isOwnProfile, isAuthenticated: !!currentUserId };
}

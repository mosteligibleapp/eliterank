import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSupabaseAuth } from '../hooks';

const NotificationContext = createContext(null);

const NOTIFICATION_ICONS = {
  nominated: { emoji: '🏆', label: 'Nominated' },
  nomination_approved: { emoji: '✅', label: 'Approved' },
  new_reward: { emoji: '🎁', label: 'Reward' },
  prize_package: { emoji: '🎉', label: 'Prize' },
  rank_change: { emoji: '📊', label: 'Ranking' },
  vote_received: { emoji: '🗳️', label: 'Votes' },
  event_posted: { emoji: '📢', label: 'Event' },
  system_announcement: { emoji: '📣', label: 'System' },
};

export function getNotificationMeta(type) {
  return NOTIFICATION_ICONS[type] || { emoji: '🔔', label: 'Notification' };
}

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef(null);

  // Fetch notifications from Supabase
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [isAuthenticated, user?.id]);

  // Initial fetch on auth
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    fetchUnreadCount();
  }, [isAuthenticated, user?.id, fetchNotifications, fetchUnreadCount]);

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [isAuthenticated, user?.id]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!isSupabaseConfigured()) return;

    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', notificationId)
        .is('read_at', null);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: now } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) return;

    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [isAuthenticated, user?.id]);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close panel
  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = {
    notifications,
    unreadCount,
    isOpen,
    loading,
    togglePanel,
    closePanel,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      loading: false,
      togglePanel: () => {},
      closePanel: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      fetchNotifications: () => {},
    };
  }
  return context;
}

export default NotificationContext;

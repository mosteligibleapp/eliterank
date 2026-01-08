import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for countdown timer functionality
 * @param {Date|string} targetDate - The date to count down to
 * @param {object} options - Configuration options
 * @param {number} options.interval - Update interval in ms (default: 1000)
 * @param {function} options.onComplete - Callback when countdown reaches zero
 * @returns {Object} - Object containing days, hours, minutes, seconds, display helpers, and urgency
 */
export default function useCountdown(targetDate, options = {}) {
  const { interval = 1000, onComplete } = options;

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    expired: !targetDate,
  });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const target = new Date(targetDate);
      const difference = target - new Date();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          total: difference,
          expired: false,
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
          expired: true,
        });
        if (onComplete) {
          onComplete();
        }
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, interval);

    return () => clearInterval(timer);
  }, [targetDate, interval, onComplete]);

  // Formatted display values
  const display = useMemo(() => {
    const { days, hours, minutes, seconds, expired } = timeLeft;

    if (expired) {
      return {
        primary: 'Ended',
        secondary: '',
        full: 'Ended',
      };
    }

    // Format based on time remaining
    if (days > 0) {
      return {
        primary: `${days}d ${hours}h`,
        secondary: `${minutes}m ${seconds}s`,
        full: `${days}d ${hours}h ${minutes}m`,
      };
    }

    if (hours > 0) {
      return {
        primary: `${hours}h ${minutes}m`,
        secondary: `${seconds}s`,
        full: `${hours}h ${minutes}m ${seconds}s`,
      };
    }

    return {
      primary: `${minutes}m ${seconds}s`,
      secondary: '',
      full: `${minutes}m ${seconds}s`,
    };
  }, [timeLeft]);

  // Urgency level for styling
  const urgency = useMemo(() => {
    if (timeLeft.expired) return 'expired';

    const totalHours = timeLeft.total / (1000 * 60 * 60);

    if (totalHours <= 1) return 'critical'; // Less than 1 hour
    if (totalHours <= 24) return 'high'; // Less than 24 hours
    if (totalHours <= 72) return 'medium'; // Less than 3 days
    return 'low';
  }, [timeLeft]);

  return {
    ...timeLeft,
    display,
    urgency,
    isExpired: timeLeft.expired,
  };
}

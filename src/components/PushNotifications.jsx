// src/components/PushNotifications.jsx
import { useEffect } from 'react';

export default function PushNotifications({ userId }) {
  useEffect(() => {
    if (!userId) return;

    // Set external user ID when component mounts
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        // Check if OneSignal methods exist before calling
        if (OneSignal?.login) {
          await OneSignal.login(userId);
        }

        // Optionally show native prompt
        if (OneSignal?.Slidedown?.promptPush) {
          OneSignal.Slidedown.promptPush();
        }
      } catch (err) {
        // Silently handle OneSignal errors - don't block app functionality
        console.warn('[PushNotifications] OneSignal error:', err.message);
      }
    });
  }, [userId]);

  return null; // This component doesn't render anything
}

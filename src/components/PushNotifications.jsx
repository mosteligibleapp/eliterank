// src/components/PushNotifications.jsx
import { useEffect } from 'react';

export default function PushNotifications({ userId }) {
  useEffect(() => {
    if (!userId) return;

    // Set external user ID when component mounts
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.login(userId);
      
      // Optionally show native prompt
      OneSignal.Slidedown.promptPush();
    });
  }, [userId]);

  return null; // This component doesn't render anything
}

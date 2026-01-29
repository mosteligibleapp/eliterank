// src/components/PushNotifications.jsx
import { useEffect, useRef } from 'react';

// OneSignal App ID - should be in env variable in production
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

export default function PushNotifications({ userId }) {
  const initialized = useRef(false);

  useEffect(() => {
    // Skip if no app ID configured
    if (!ONESIGNAL_APP_ID) {
      console.warn('[PushNotifications] OneSignal App ID not configured. Set VITE_ONESIGNAL_APP_ID environment variable.');
      return;
    }

    // Initialize OneSignal only once
    if (!initialized.current) {
      initialized.current = true;

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
          });
          console.log('[PushNotifications] OneSignal initialized');
        } catch (err) {
          console.warn('[PushNotifications] OneSignal init error:', err.message);
        }
      });
    }
  }, []);

  // Handle user login separately after initialization
  useEffect(() => {
    if (!userId || !ONESIGNAL_APP_ID) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        // Check if OneSignal is initialized before calling login
        if (OneSignal.User) {
          await OneSignal.login(userId);
          console.log('[PushNotifications] User logged in:', userId);
        }
      } catch (err) {
        console.warn('[PushNotifications] OneSignal login error:', err.message);
      }
    });
  }, [userId]);

  return null; // This component doesn't render anything
}

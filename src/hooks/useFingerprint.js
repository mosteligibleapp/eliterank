import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise = null;

/**
 * Get or create the FingerprintJS instance (singleton)
 */
function getFingerprintAgent() {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
}

/**
 * Hook to get browser fingerprint for anonymous vote fraud prevention.
 * Returns a stable visitor ID that persists across sessions.
 * 
 * @returns {{ fingerprint: string|null, loading: boolean, error: Error|null }}
 */
export default function useFingerprint() {
  const [fingerprint, setFingerprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function getFingerprint() {
      try {
        const fp = await getFingerprintAgent();
        const result = await fp.get();
        
        if (!cancelled) {
          setFingerprint(result.visitorId);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Fingerprint generation failed:', err);
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    getFingerprint();

    return () => {
      cancelled = true;
    };
  }, []);

  return { fingerprint, loading, error };
}

/**
 * Get fingerprint imperatively (for one-off calls outside React)
 * @returns {Promise<string|null>}
 */
export async function getFingerprint() {
  try {
    const fp = await getFingerprintAgent();
    const result = await fp.get();
    return result.visitorId;
  } catch (err) {
    console.warn('Fingerprint generation failed:', err);
    return null;
  }
}

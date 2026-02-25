import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './styles/competition-phases.css';
import App from './App.jsx';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';

// IMPORTANT: Check for password recovery BEFORE React mounts
// Supabase will clear the hash after processing, so we need to capture it now
(function checkPasswordRecovery() {
  const hash = window.location.hash;
  const search = window.location.search;
  const fullUrl = window.location.href;
  
  console.log('[main.jsx] Checking for recovery. Hash:', hash, 'Search:', search);
  console.log('[main.jsx] Full URL:', fullUrl);
  
  // Check multiple ways the recovery might be indicated
  const isRecovery = 
    hash.includes('type=recovery') || 
    search.includes('reset=true') ||
    fullUrl.includes('type=recovery');
  
  if (isRecovery) {
    console.log('[main.jsx] PASSWORD RECOVERY DETECTED - setting flag');
    sessionStorage.setItem('passwordRecoveryPending', 'true');
  } else {
    console.log('[main.jsx] No recovery detected. Current sessionStorage value:', 
      sessionStorage.getItem('passwordRecoveryPending'));
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);

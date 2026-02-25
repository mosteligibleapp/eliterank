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
  
  if (hash.includes('type=recovery') || search.includes('reset=true')) {
    console.log('[main.jsx] Password recovery detected, setting flag');
    sessionStorage.setItem('passwordRecoveryPending', 'true');
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

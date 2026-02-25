import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './styles/competition-phases.css';
import App from './App.jsx';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';

// NOTE: Password recovery detection happens in index.html BEFORE this file loads
// This is critical because Supabase (imported via App) clears the hash on init
console.log('[main.jsx] sessionStorage passwordRecoveryPending:', 
  sessionStorage.getItem('passwordRecoveryPending'));

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

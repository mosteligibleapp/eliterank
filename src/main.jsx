import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './styles/competition-phases.css';
import App from './App.jsx';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { initSentry } from './lib/sentry';

// Initialize Sentry before React renders
initSentry();

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

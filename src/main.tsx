import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './styles/index.css';
import { App } from './app/App';
import { SIMULATE_KEY } from './services/mock/mock-client';
import { writeJSON } from './utils/storage';

// Demo helper: ?simulate=booking-error makes the next booking submissions fail, to show the error state.
const simulate = new URLSearchParams(window.location.search).get('simulate');
if (simulate) writeJSON(SIMULATE_KEY, simulate === 'off' ? null : simulate, 'session');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

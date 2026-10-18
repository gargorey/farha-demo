import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import '@/styles/index.css';
import { AdminApp } from './AdminApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);

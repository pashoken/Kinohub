import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register('/sw.js').then((registration) => registration.update());
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('kinohub-worker-reloaded')) return;
    sessionStorage.setItem('kinohub-worker-reloaded', '1');
    window.location.reload();
  });
}

// Audit Detective — créé par Gauthier Doumont.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import './ui/styles.css';

// Met l'app en cache pour qu'elle fonctionne hors ligne, et se met à jour toute seule.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

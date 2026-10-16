import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { routeFromPathname } from './app/routes';
import './styles/global.css';

const el = document.getElementById('root');
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App route={routeFromPathname(window.location.pathname)} />
    </StrictMode>,
  );
}

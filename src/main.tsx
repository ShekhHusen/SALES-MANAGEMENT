// Safeguard against libraries attempting to reassign the read-only window.fetch property
// and against JSON.parse("undefined") errors
if (typeof window !== 'undefined') {
  try {
    const fetchDescriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (fetchDescriptor && !fetchDescriptor.writable && !fetchDescriptor.set) {
      const originalFetch = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get: () => originalFetch,
        set: (v) => { console.warn('Suppressed attempt to override read-only window.fetch with:', v); },
        configurable: true
      });
    }

    const originalParse = JSON.parse;
    JSON.parse = function(text, reviver) {
      if (text === 'undefined') {
        console.warn('Suppressed attempt to parse "undefined" as JSON');
        return undefined;
      }
      return originalParse.apply(this, arguments);
    };
  } catch (e) {
    // Ignore errors in re-defining
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

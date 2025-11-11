import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// simple global error overlay to capture runtime errors in the preview
function mountErrorOverlay() {
  const existing = document.getElementById('__error_overlay__');
  if (existing) return existing as HTMLDivElement;
  const el = document.createElement('div');
  el.id = '__error_overlay__';
  el.style.position = 'fixed';
  el.style.left = '12px';
  el.style.right = '12px';
  el.style.top = '12px';
  el.style.padding = '12px';
  el.style.zIndex = '10000000';
  el.style.background = 'rgba(220,38,38,0.95)';
  el.style.color = 'white';
  el.style.fontFamily = 'monospace';
  el.style.fontSize = '13px';
  el.style.borderRadius = '8px';
  el.style.maxHeight = '60vh';
  el.style.overflow = 'auto';
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
}

const overlay = mountErrorOverlay();
window.addEventListener('error', (e) => {
  try {
    overlay.style.display = 'block';
    overlay.innerText = `Error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`;
  } catch (err) {
    console.error(err);
  }
});
window.addEventListener('unhandledrejection', (ev) => {
  try {
    overlay.style.display = 'block';
    overlay.innerText = `Unhandled Rejection: ${String(ev.reason)}`;
  } catch (err) {
    console.error(err);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

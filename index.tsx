import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import * as THREE from 'three';

// Sentry will be initialized in App.tsx to avoid double initialization

// Configure THREE.js globally before any renderers are created
THREE.ColorManagement.enabled = true;

// Dev-only diagnostics: emit as debug-level logs and only in dev builds.
if (import.meta.env?.DEV) {
    console.debug && console.debug('React version:', React.version);
    console.debug && console.debug('Scheduler loaded:', typeof (window as Window & { scheduler?: unknown }).scheduler);
}

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}

// PWA: Service Worker регистрируется автоматически через vite-plugin-pwa (один источник)

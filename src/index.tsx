import './index.css';
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { swManager } from './lib/serviceWorker';

// Display bundle size information
function logBundleSize() {
  if ('performance' in window && 'getEntriesByType' in performance) {
    // Wait a bit for all resources to load
    setTimeout(() => {
      const resources = performance.getEntriesByType('resource');
      const scripts = resources.filter(r => r.name.includes('.js'));
      const styles = resources.filter(r => r.name.includes('.css'));

      let totalSize = 0;
      scripts.forEach(script => {
        if (script.transferSize) {
          totalSize += script.transferSize;
        }
      });
      styles.forEach(style => {
        if (style.transferSize) {
          totalSize += style.transferSize;
        }
      });

      const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      console.log(`📦 Bundle Size: ${formatSize(totalSize)} (${scripts.length} JS files, ${styles.length} CSS files)`);
    }, 1000);
  }
}

// Display contact information
function logContactInfo() {
  const version = '0.0.1'; // From package.json
  console.log(`
🌟 GitHub Forum Platform v${version}
   Template created by: Semyon Fedoseev
   GitHub: https://github.com/fedoseevsm
   Contact: Feel free to reach out for questions or contributions!

💡 This platform is built with React, TypeScript, and Tailwind CSS
   Features: GitHub API integration, Markdown support, Mobile responsive
   Security: Service Worker token protection, CSP headers
  `);
}

console.log('🚀 App starting...');

// Log contact info immediately
logContactInfo();

// Register service worker for secure API requests
swManager.register().catch(error => {
  console.error('Failed to register service worker:', error);
});

// Log bundle size after resources load
logBundleSize();

// Single Page Apps for GitHub Pages
// https://github.com/rafgraph/spa-github-pages
// This script checks to see if a redirect is present in the query string,
// converts it back to the correct url and adds it to the
// browser's history using window.history.replaceState(...),
// which won't cause the browser to attempt to load the new url.
// When the single page app is loaded further down in this file,
// the correct url will be waiting in the browser's history for
// the single page app to route accordingly.
(function(l) {
  if (l.search[1] === '/' ) {
    var decoded = l.search.slice(1).split('&').map(function(s) {
      return s.replace(/~and~/g, '&')
    }).join('?');
    window.history.replaceState(null, null,
        l.pathname.slice(0, -1) + decoded + l.hash
    );
  }
}(window.location));

const container = document.getElementById("root");
if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    console.error('Error rendering app:', error);
    container.innerHTML = '<div style="color: red; padding: 20px;">Error loading app. Check console for details.</div>';
  }
} else {
  console.error('Root element not found');
}
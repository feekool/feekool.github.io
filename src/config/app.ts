import { validateTokenSecurity } from '../lib/utils';
import { swManager } from '../lib/serviceWorker';

export const config = {
  github: {
    owner: 'jetswap',
    repo: 'feekool',
    branch: 'main',
    token: import.meta.env.VITE_API_KEY || ''
  },
  defaultLang: 'en',
  defaultTheme: 'light'
};

// Security validation
if (config.github.token && !validateTokenSecurity(config.github.token)) {
  console.warn('Warning: GitHub token may not meet security requirements');
}

// Initialize service worker with token
if (config.github.token) {
  swManager.setToken(config.github.token);
}

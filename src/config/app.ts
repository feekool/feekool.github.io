import { validateTokenSecurity } from '../lib/utils';

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

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

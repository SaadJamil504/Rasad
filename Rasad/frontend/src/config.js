const IS_PRODUCTION = true; // Set to false for local development

const CONFIG = {
  local: 'http://localhost:8000',
  production: 'https://rasad-production.up.railway.app'
};

export const API_URL = IS_PRODUCTION ? CONFIG.production : CONFIG.local;

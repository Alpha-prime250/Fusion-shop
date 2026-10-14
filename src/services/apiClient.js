import axios from 'axios';

const resolveBaseURL = () => {
  const envUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (process.env.REACT_APP_API_USE_PROXY === 'true') {
    return '/api';
  }

  return 'https://fusion-electronics-api.vercel.app/api';
};

export const API_BASE_URL = resolveBaseURL();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Automatically attach the JWT (if present) to every outgoing request so
// individual pages/components don't need to manage auth headers manually.
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('MERNEcommerceToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers['x-auth-token'] = token;
  }
  return config;
});

export async function withRetry(request, { retries = 2, delay = 400 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      const status = error?.response?.status;
      if (status && status >= 400 && status < 500) {
        throw error;
      }
      lastError = error;
      if (attempt === retries) break;
      await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
    }
  }
  throw lastError;
}

// SerpAPI configuration
export const SERP_API_CONFIG = {
  baseUrl: 'https://serpapi.com/search',
  engine: 'google_hotels',
  getApiKey: () => {
    const key = process.env.SERP_API_KEY;
    if (!key) {
      throw new Error('SERP_API_KEY is not configured');
    }
    return key;
  },
};


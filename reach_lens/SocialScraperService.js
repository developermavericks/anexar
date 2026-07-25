const axios = require('axios');

class SocialScraperService {
    async scrapeReddit(url) {
        const makeRequest = async (useProxy) => {
            const config = {
                params: { q: url, sort: 'new', limit: 25 },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: 10000
            };

            if (useProxy && process.env.DATAIMPULSE_PROXY_URL) {
                const { HttpsProxyAgent } = require('https-proxy-agent');
                const agent = new HttpsProxyAgent(process.env.DATAIMPULSE_PROXY_URL);
                config.httpAgent = agent;
                config.httpsAgent = agent;
                config.timeout = 15000;
            }

            return await axios.get('https://www.reddit.com/search.json', config);
        };

        try {
            console.log(`[SocialScraper] Fetching Reddit directly (unproxied) for: ${url}`);
            let response;
            try {
                response = await makeRequest(false);
            } catch (directErr) {
                console.warn(`[SocialScraper] Reddit direct fetch failed: ${directErr.message}. Retrying via proxy...`);
                if (process.env.DATAIMPULSE_PROXY_URL) {
                    response = await makeRequest(true);
                    console.log(`[SocialScraper] Reddit fetch via proxy succeeded.`);
                } else {
                    throw directErr;
                }
            }

            const posts = response.data?.data?.children || [];
            return {
                count: posts.length,
                posts: posts.map((p) => ({
                    title: p.data.title,
                    permalink: `https://reddit.com${p.data.permalink}`,
                    score: p.data.score,
                    subreddit: p.data.subreddit
                }))
            };
        } catch (error) {
            console.error('[SocialScraper] Reddit scrape failed completely:', error.message);
            return { count: 0, posts: [] };
        }
    }

    async scrapeTwitter(url) {
        // Twitter is hard without API. 
        // Return 0 for now.
        return { count: 0, posts: [] };
    }
}

module.exports = SocialScraperService;


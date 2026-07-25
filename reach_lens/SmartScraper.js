const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const axios = require('axios');
const cheerio = require('cheerio');
const ReachEstimator = require('./ReachEstimator');

const puppeteerExtra = puppeteer.default || puppeteer;
puppeteerExtra.use(StealthPlugin());

class SmartScraper {
    // Random delay between 2-5 seconds
    async delay(min = 2000, max = 5000) {
        const time = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, time));
    }

    // Get random user agent
    getRandomUserAgent() {
        const userAgent = new UserAgent({ deviceCategory: 'desktop' });
        return userAgent.toString();
    }

    async launchBrowser(useProxy) {
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ];

        if (useProxy && process.env.DATAIMPULSE_PROXY_URL) {
            const parsed = new URL(process.env.DATAIMPULSE_PROXY_URL);
            args.push(`--proxy-server=${parsed.host}`);
        }

        const browser = await puppeteerExtra.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args
        });

        return browser;
    }

    async initPage(browserInstance, useProxy) {
        const page = await browserInstance.newPage();
        
        if (useProxy && process.env.DATAIMPULSE_PROXY_URL) {
            const parsed = new URL(process.env.DATAIMPULSE_PROXY_URL);
            if (parsed.username && parsed.password) {
                await page.authenticate({
                    username: decodeURIComponent(parsed.username),
                    password: decodeURIComponent(parsed.password)
                });
            }
        }

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            try {
                const resourceType = req.resourceType();
                const reqUrl = req.url().toLowerCase();
                
                const adKeywords = [
                    'doubleclick', 'google-analytics', 'adservice', 'adsystem', 
                    'adnxs', 'taboola', 'outbrain', 'hotjar', 'facebook', 'amazon-adsystem'
                ];
                
                const isAd = adKeywords.some(keyword => reqUrl.includes(keyword));

                if (isAd || ['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
                    req.abort().catch(() => {});
                } else if (resourceType === 'script') {
                    // Allow Google/Gstatic scripts for Google searches to avoid timeouts/detaches
                    if (reqUrl.includes('google') || reqUrl.includes('gstatic')) {
                        req.continue().catch(() => {});
                    } else {
                        req.abort().catch(() => {});
                    }
                } else {
                    req.continue().catch(() => {});
                }
            } catch (e) {
                // Handled
            }
        });

        const ua = this.getRandomUserAgent();
        await page.setUserAgent(ua);
        await page.setViewport({ width: 1920, height: 1080 });
        return page;
    }

    async scrapeDirectPageAxios(url) {
        try {
            console.log(`[SmartScraper] Attempting fast HTTP fetch for ${url}`);
            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.status === 200 && response.data) {
                const $ = cheerio.load(response.data);
                const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content')?.trim();
                const description = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim();
                
                // Get a meaningful snippet
                let snippet = '';
                const article = $('article, .article-content, .post-content, .article-body, #article-body, .entry-content');
                if (article.length > 0) {
                    snippet = article.text().trim().slice(0, 1000).replace(/\s+/g, ' ');
                } else {
                    // Fallback to paragraph texts
                    const paragraphs = [];
                    $('p').slice(0, 10).each((i, el) => {
                        paragraphs.push($(el).text().trim());
                    });
                    snippet = paragraphs.filter(p => p.length > 20).join(' ').slice(0, 1000).replace(/\s+/g, ' ');
                }

                if (title) {
                    console.log(`[SmartScraper] Fast HTTP fetch successful for ${url}`);
                    return {
                        title,
                        description,
                        snippet: snippet || description || ''
                    };
                }
            }
        } catch (e) {
            console.warn(`[SmartScraper] Fast HTTP fetch failed or blocked: ${e.message}`);
        }
        return null;
    }

    async scrapeUrl(url, title = '') {
        let isFrontPage = false;

        // Extract a robust fallback title from URL path if not provided
        let fallbackTitle = '';
        try {
            if (url) {
                const parsed = new URL(url);
                const segments = parsed.pathname.split('/').filter(Boolean);
                let slug = '';
                for (const segment of segments) {
                    const cleanSeg = segment.replace(/\.[a-zA-Z0-9]+$/, '');
                    if (cleanSeg.includes('-') || cleanSeg.includes('_')) {
                        if (cleanSeg.length > slug.length) {
                            slug = cleanSeg;
                        }
                    }
                }
                if (!slug && segments.length > 0) {
                    slug = segments[segments.length - 1].replace(/\.[a-zA-Z0-9]+$/, '');
                }
                if (slug) {
                    fallbackTitle = slug.replace(/[-_]/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());
                }
            }
        } catch (e) {
            console.warn(`[SmartScraper] Error parsing URL fallback title: ${e.message}`);
        }

        if (!title && fallbackTitle) {
            title = fallbackTitle;
            console.log(`[SmartScraper] Initialized fallback title from URL: "${title}"`);
        }

        // Perform homepage check early
        try {
            if (url) {
                const parsedUrl = new URL(url);
                const origin = parsedUrl.origin;
                const pathname = parsedUrl.pathname;

                if (pathname && pathname.length > 3 && pathname !== '/') {
                    console.log(`[SmartScraper] Running homepage check against origin: ${origin} for path: ${pathname}`);
                    const homepageRes = await axios.get(origin, {
                        timeout: 8000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                        }
                    });

                    if (homepageRes.status === 200 && homepageRes.data) {
                        const html = homepageRes.data;
                        const cleanPath = pathname.trim();
                        const cleanPathNoSlash = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;

                        if (html.includes(url) || html.includes(cleanPath) || (cleanPathNoSlash && html.includes(cleanPathNoSlash))) {
                            isFrontPage = true;
                            console.log(`[SmartScraper] Homepage check MATCHED! Article is on front page.`);
                        } else {
                            console.log(`[SmartScraper] Homepage check: no match found on homepage.`);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn(`[SmartScraper] Homepage check failed or timed out: ${err.message}`);
        }

        const runSearchPhase1 = async (useProxy) => {
            let tempBrowser;
            try {
                console.log(`[SmartScraper] Launching stealth browser for Phase 1 search (useProxy=${useProxy})...`);
                tempBrowser = await this.launchBrowser(useProxy);
                const page = await this.initPage(tempBrowser, useProxy);
                
                console.log(`[SmartScraper] Searching Google for URL (useProxy=${useProxy})...`);
                const res = await this.searchGoogle(page, `"${url}"`);
                if (!res) {
                    throw new Error("CAPTCHA detected or search returned empty/failed");
                }

                console.log(`[SmartScraper] Found ${res.count} mentions. Extracting meta/social...`);
                let meta = {};
                try {
                    meta = await this.scrapeDirectPage(page, url);
                } catch (metaErr) {
                    console.warn(`[SmartScraper] Direct page scrape failed: ${metaErr.message}`);
                }

                let social = { x: 0, linkedin: 0, facebook: 0 };
                try {
                    social = await this.scrapeSocialMentions(url, page);
                } catch (socialErr) {
                    console.warn(`[SmartScraper] Social mentions scrape failed: ${socialErr.message}`);
                }

                await tempBrowser.close();
                return {
                    title: meta.title || title || '',
                    url,
                    totalMentions: res.count,
                    domains: res.domains,
                    prominenceScore: res.avgRankScore,
                    source: 'Direct',
                    status: 'Success',
                    metaDescription: meta.description,
                    snippet: meta.snippet,
                    isFrontPage,
                    socialProof: {
                        ...social,
                        reddit: res.domains.filter(d => d.includes('reddit.com')).length
                    },
                    temporalLog: res.dates
                };
            } catch (err) {
                console.warn(`[SmartScraper] Phase 1 search failed (useProxy=${useProxy}): ${err.message}`);
                if (tempBrowser) {
                    await tempBrowser.close().catch(() => {});
                }
                return null;
            }
        };

        try {
            // Attempt 1: Direct unproxied Search
            let result = await runSearchPhase1(false);

            // Failover to Proxy if direct search fails
            if (!result && process.env.DATAIMPULSE_PROXY_URL) {
                console.log(`[SmartScraper] Direct Google search failed/blocked. Retrying via DataImpulse proxy...`);
                result = await runSearchPhase1(true);
            }

            if (result) {
                return result;
            }

            // Attempt 2: Title Search
            if (title) {
                const part1 = title.split(' - ')[0] || '';
                const cleanTitle = (part1.split(' | ')[0] || '').trim();
                const hostname = new URL(url).hostname;
                const query = `"${cleanTitle}" -site:${hostname}`;

                const runSearchPhase2 = async (useProxy) => {
                    let tempBrowser;
                    try {
                        console.log(`[SmartScraper] Launching stealth browser for Phase 2 title search (useProxy=${useProxy})...`);
                        tempBrowser = await this.launchBrowser(useProxy);
                        const page = await this.initPage(tempBrowser, useProxy);
                        
                        console.log(`[SmartScraper] Searching Google for title (useProxy=${useProxy})...`);
                        const res = await this.searchGoogle(page, query);
                        if (!res) {
                            throw new Error("CAPTCHA detected or search returned empty/failed");
                        }

                        await tempBrowser.close();
                        return {
                            title,
                            url,
                            totalMentions: res.count,
                            domains: res.domains,
                            prominenceScore: res.avgRankScore,
                            source: 'Title',
                            status: 'Success',
                            isFrontPage
                        };
                    } catch (err) {
                        console.warn(`[SmartScraper] Phase 2 title search failed (useProxy=${useProxy}): ${err.message}`);
                        if (tempBrowser) {
                            await tempBrowser.close().catch(() => {});
                        }
                        return null;
                    }
                };

                // Try direct first
                result = await runSearchPhase2(false);

                // Failover to proxy
                if (!result && process.env.DATAIMPULSE_PROXY_URL) {
                    console.log(`[SmartScraper] Direct title search failed/blocked. Retrying via DataImpulse proxy...`);
                    result = await runSearchPhase2(true);
                }

                if (result) {
                    return result;
                }
            }

            throw new Error("All scraping attempts failed");

        } catch (error) {
            console.error(`[SmartScraper] Blocked or Failed: ${error.message}`);
            console.log(`[SmartScraper] Switching to ReachEstimator`);
            const estimate = ReachEstimator.estimate(url, title || '', 'v9', { isFrontPage });
            return {
                title: title || '',
                url,
                totalMentions: estimate.mentions,
                domains: [],
                prominenceScore: 0,
                source: 'Estimator',
                status: 'Fallback',
                isFrontPage
            };
        }
    }

    async searchGoogle(page, query) {
        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            if (await page.$('#captcha-form') || await page.$('iframe[src*="google.com/recaptcha"]')) {
                console.warn("[SmartScraper] CAPTCHA detected!");
                return null;
            }

            const matches = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('.g a'));
                return anchors.map((a, index) => {
                    try {
                        return {
                            host: new URL(a.href).hostname,
                            rank: index + 1
                        };
                    } catch { return null; }
                })
                    .filter(item => item && item.host && !item.host.includes('google') && !item.host.includes('youtube'))
                    .slice(0, 5);
            });

            let totalScore = 0;
            const uniqueDomains = [];

            matches.forEach(m => {
                if (!uniqueDomains.includes(m.host)) {
                    uniqueDomains.push(m.host);
                    if (m.rank === 1) totalScore += 2.0;
                    else if (m.rank <= 3) totalScore += 1.0;
                    else totalScore += 0.5;
                }
            });

            const avgRankScore = uniqueDomains.length > 0 ? totalScore / uniqueDomains.length : 1;

            const statsHandle = await page.$('#result-stats');
            if (statsHandle) {
                const text = await page.evaluate((el) => el.innerText, statsHandle);
                const match = text.match(/([\d,]+)/);
                if (match) {
                    const count = parseInt(match[1].replace(/,/g, ''), 10);
                    const dates = await page.evaluate(() => {
                        const dateSpans = Array.from(document.querySelectorAll('.f, .LE0U9e, .MU91fe'));
                        return dateSpans.map(s => s.innerText.trim()).filter(t => t.length > 0);
                    });
                    return { count, domains: uniqueDomains, avgRankScore, dates };
                }
            }

            const results = await page.$$('.g');
            if (results.length > 0) return { count: results.length, domains: uniqueDomains, avgRankScore, dates: [] };

            return { count: 0, domains: [], avgRankScore: 0, dates: [] };
        } catch (e) {
            console.warn(`[SmartScraper] Search failed for ${query}: ${e}`);
            return null;
        }
    }

    async scrapeSocialMentions(url, page) {
        const platforms = [
            { name: 'x', query: `site:x.com OR site:twitter.com "${url}"` },
            { name: 'linkedin', query: `site:linkedin.com "${url}"` },
            { name: 'facebook', query: `site:facebook.com "${url}"` }
        ];

        const results = { x: 0, linkedin: 0, facebook: 0 };

        for (const p of platforms) {
            console.log(`[SmartScraper] Dorking ${p.name}: ${p.query}`);
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(p.query)}`;
            try {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
                const statsHandle = await page.$('#result-stats');
                if (statsHandle) {
                    const text = await page.evaluate((el) => el.innerText, statsHandle);
                    const match = text.match(/([\d,]+)/);
                    if (match) {
                        results[p.name] = parseInt(match[1].replace(/,/g, ''), 10);
                    }
                }
                await this.delay(1000, 2000);
            } catch (e) {
                console.warn(`[SmartScraper] Social dork for ${p.name} failed: ${e}`);
            }
        }

        return results;
    }

    async scrapeDirectPage(page, url) {
        // Try fast HTTP Axios + Cheerio first
        const fastResult = await this.scrapeDirectPageAxios(url);
        if (fastResult) {
            return fastResult;
        }

        try {
            console.log(`[SmartScraper] Visiting direct page via Puppeteer: ${url}`);
            
            // Try to load with a lower timeout (15s) and catch frame detaches/timeouts
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            } catch (gotoError) {
                console.warn(`[SmartScraper] Navigation warning/timeout (continuing anyway): ${gotoError.message}`);
                // Allow a tiny delay for any pending DOM writes
                await this.delay(1500, 1500);
            }
            
            const meta = await page.evaluate(() => {
                const getMeta = (name) => {
                    const el = document.querySelector(`meta[name="${name}"], meta[property="og:${name}"]`);
                    return el ? el.content : undefined;
                };

                const getSnippet = () => {
                    const article = document.querySelector('article, .article-content, .post-content, .article-body, #article-body, .entry-content');
                    if (article) return article.textContent?.trim().slice(0, 1000);
                    
                    const paragraphs = Array.from(document.querySelectorAll('p')).slice(0, 10);
                    const pText = paragraphs.map(p => p.textContent?.trim() || '').filter(t => t.length > 20).join(' ');
                    if (pText.length > 0) return pText.slice(0, 1000).replace(/\s+/g, ' ');

                    return document.body.textContent?.trim().slice(0, 1000).replace(/\s+/g, ' ');
                };

                return {
                    title: document.title,
                    description: getMeta('description'),
                    snippet: getSnippet()
                };
            });

            return meta;
        } catch (e) {
            console.warn(`[SmartScraper] Direct page Puppeteer scrape failed: ${e}`);
            return {};
        }
    }
}

module.exports = SmartScraper;

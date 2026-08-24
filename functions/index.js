const { onRequest } = require('firebase-functions/v2/https');
const chromium = require('@sparticuz/chromium');
const { JSDOM, VirtualConsole } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const axios = require('axios');

// SmartScraper.js already supports overriding the Chromium binary via
// process.env.PUPPETEER_EXECUTABLE_PATH - we just need to resolve @sparticuz/chromium's
// bundled binary path and set that env var before the first scrape runs. Cached across
// warm invocations of the same instance so it only resolves once per instance.
let chromiumPathPromise = null;
function ensureChromiumPath() {
    if (!chromiumPathPromise) {
        chromiumPathPromise = chromium.executablePath().then((execPath) => {
            process.env.PUPPETEER_EXECUTABLE_PATH = execPath;
            return execPath;
        });
    }
    return chromiumPathPromise;
}

exports.recommend = require('./recommend').recommend;
exports.discoverEventsForSector = require('./discoverEvents').discoverEventsForSector;
exports.parseGoals = require('./parseGoals').parseGoals;
exports.exchangeGoogleAuthCode = require('./calendarAuth').exchangeGoogleAuthCode;
exports.getTeamMemberAvailability = require('./calendarAuth').getTeamMemberAvailability;
exports.createCalendarEvent = require('./calendarAuth').createCalendarEvent;
exports.findInfluencers = require('./influencerFinder').findInfluencers;
exports.enrichInfluencer = require('./influencerFinder').enrichInfluencer;
exports.autoFetchEPapers = require('./autoFetchEPapers').autoFetchEPapers;
exports.syncGmailBriefings = require('./syncGmailBriefings').syncGmailBriefings;
exports.getEPapersByDate = require('./getEPapers').getEPapersByDate;

exports.analyzeReach = onRequest(
    { timeoutSeconds: 300, memory: '1GiB', cors: true },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { url, version } = req.body || {};
        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'url is required' });
            return;
        }

        try {
            await ensureChromiumPath();
            // Required lazily so PUPPETEER_EXECUTABLE_PATH is already set before
            // SmartScraper's puppeteer-extra reads it at launch time.
            const { processUrlInternal } = require('./reach_lens/AnalysisController');
            const result = await processUrlInternal(url, version || 'v10');
            res.json(result);
        } catch (err) {
            console.error('[analyzeReach] Failed:', err);
            res.status(500).json({ error: err.message || 'Analysis failed' });
        }
    }
);

exports.generateArticlePdf = onRequest(
    { timeoutSeconds: 300, memory: '2GiB', cors: true },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { url: rawInputUrl, html: preRenderedHtml, userEmail } = req.body || {};
        if (!rawInputUrl || typeof rawInputUrl !== 'string') {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        const normalizeUrl = (originalUrl) => {
            if (!originalUrl || typeof originalUrl !== 'string') return originalUrl;
            try {
                let cleanUrl = originalUrl.trim();
                const parsed = new URL(cleanUrl);

                if (parsed.hostname === 'm.economictimes.com') {
                    parsed.hostname = 'economictimes.indiatimes.com';
                    if (parsed.pathname.includes('/amp_articleshow/')) {
                        parsed.pathname = parsed.pathname.replace('/amp_articleshow/', '/articleshow/');
                    }
                }

                if (parsed.hostname.includes('thehindu.com')) {
                    if (parsed.pathname.endsWith('/amp/')) {
                        parsed.pathname = parsed.pathname.slice(0, -5);
                    } else if (parsed.pathname.endsWith('/amp')) {
                        parsed.pathname = parsed.pathname.slice(0, -4);
                    }
                }

                const stripParams = ['utm_source', 'utm_medium', 'utm_campaign', 'amp', 'amp_articleshow', 'amp_id', 'amp=1'];
                stripParams.forEach(p => parsed.searchParams.delete(p));

                return parsed.toString();
            } catch (e) {
                return originalUrl;
            }
        };

        const getCookiesForUrl = (targetUrl) => {
            try {
                const hostname = new URL(targetUrl).hostname;
                if (hostname.includes('economictimes.indiatimes.com') || hostname.includes('economictimes.com')) {
                    return process.env.SESSION_COOKIES_ET || process.env.SESSION_COOKIES || '';
                }
                if (hostname.includes('thehindu.com')) {
                    return process.env.SESSION_COOKIES_THEHINDU || process.env.SESSION_COOKIES || '';
                }
                if (hostname.includes('bloomberg.com')) {
                    return process.env.SESSION_COOKIES_BLOOMBERG || process.env.SESSION_COOKIES || '';
                }
                if (hostname.includes('the-ken.com') || hostname.includes('theken.com')) {
                    return process.env.SESSION_COOKIES_THEKEN || process.env.SESSION_COOKIES || '';
                }
                if (hostname.includes('the-captable.com') || hostname.includes('thecaptable.com')) {
                    return process.env.SESSION_COOKIES_CAPTABLE || process.env.SESSION_COOKIES || '';
                }
                return process.env.SESSION_COOKIES || '';
            } catch (e) {
                return '';
            }
        };

        const url = normalizeUrl(rawInputUrl);

        try {
            // 1. Fetch raw HTML
            let rawHtml = '';
            let mode = 'DIRECT';
            const scraperApiKey = process.env.SCRAPER_API_KEY || '4663b0263257ba5337353aeb6fe289cc';

            if (preRenderedHtml && typeof preRenderedHtml === 'string' && preRenderedHtml.trim().length > 0) {
                rawHtml = preRenderedHtml;
                mode = 'EXTENSION_CLIP';
                console.log(`[generateArticlePdf] Using pre-rendered HTML from extension clipper for: ${url}`);
            } else {
                let scrapeBrowser;
                try {
                    await ensureChromiumPath();
                const puppeteerExtra = require('puppeteer-extra');
                scrapeBrowser = await puppeteerExtra.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(),
                    headless: chromium.headless,
                });
                const scrapePage = await scrapeBrowser.newPage();

                 // Strategy 3: Inject session cookies from cloud environment if present
                 const sessionCookiesStr = getCookiesForUrl(url);
                 if (sessionCookiesStr) {
                     try {
                         const cookieArray = sessionCookiesStr.split(';').map(pair => {
                             const trimmed = pair.trim();
                             const equalIdx = trimmed.indexOf('=');
                             if (equalIdx > 0) {
                                 const name = trimmed.slice(0, equalIdx);
                                 const value = decodeURIComponent(trimmed.slice(equalIdx + 1));
                                 const hostname = new URL(url).hostname;
                                 return {
                                     name,
                                     value,
                                     domain: hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1') ? hostname : '.' + hostname,
                                     path: '/',
                                     secure: true,
                                     httpOnly: true
                                 };
                             }
                             return null;
                         }).filter(Boolean);

                         if (cookieArray.length > 0) {
                             await scrapePage.setCookie(...cookieArray);
                         }
                     } catch (cookieErr) {
                         console.error('Error setting cookies:', cookieErr);
                     }
                 }

                  // Configure page JS and headers based on active session status
                  await scrapePage.setJavaScriptEnabled(true);
                  if (sessionCookiesStr) {
                      await scrapePage.setExtraHTTPHeaders({
                          'Referer': 'https://www.google.com/',
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                      });
                  } else {
                      await scrapePage.setExtraHTTPHeaders({
                          'Referer': 'https://www.google.com/',
                          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                      });
                  }

                  // Enable request interception to block ad-trackers and paywall scripts
                  await scrapePage.setRequestInterception(true);
                  scrapePage.on('request', (request) => {
                      const resourceType = request.resourceType();
                      const requestUrl = request.url().toLowerCase();
                      
                      const paywallScriptDomains = [
                          'tinypass.com', 'piano.io', 'poool.fr', 'cxense.com', 
                          'dynamic-paywall.js', 'adnxs.com', 'doubleclick.net', 
                          'adsystem.com', 'google-analytics.com', 'googletagmanager.com'
                      ];
                      
                      const isAdOrPaywall = paywallScriptDomains.some(domain => requestUrl.includes(domain));
                      
                      if (isAdOrPaywall && (resourceType === 'script' || resourceType === 'stylesheet')) {
                          console.log(`[generateArticlePdf] Aborting paywall/ad script: ${request.url()}`);
                          request.abort();
                      } else {
                          request.continue();
                      }
                  });

                 await scrapePage.goto(url, {
                     waitUntil: 'domcontentloaded',
                     timeout: 20000
                 });
                 await new Promise(resolve => setTimeout(resolve, 5000));
                 rawHtml = await scrapePage.content();
            } catch (err) {
                console.warn('[generateArticlePdf] Puppeteer fetch failed, falling back to Axios:', err.message);
                // Fallback: Axios Googlebot
                try {
                    const response = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Referer': 'https://www.google.com/'
                        },
                        timeout: 15000
                    });
                    rawHtml = response.data;
                } catch (axErr) {
                    console.warn('[generateArticlePdf] Direct Axios also failed:', axErr.message);
                }
            } finally {
                if (scrapeBrowser) {
                    await scrapeBrowser.close();
                }
            }
        }

            // 2. Define DOM Pre-Processing & Cleansing Helpers
            const preprocessDOM = (d, articleUrl) => {
                // 3.1 Dropcap Merging
                const paragraphs = d.querySelectorAll('p');
                paragraphs.forEach(p => {
                    const firstChild = p.firstChild;
                    if (firstChild && firstChild.nodeType === 1 && (firstChild.tagName === 'SPAN' || firstChild.tagName === 'DIV')) {
                        const text = firstChild.textContent.trim();
                        if (text.length === 1) {
                            const textNode = d.createTextNode(text);
                            p.replaceChild(textNode, firstChild);
                            p.normalize();
                        }
                    }
                });

                // 3.2 Image Optimization
                const images = d.querySelectorAll('img');
                images.forEach(img => {
                    // Swap lazy-loaded attributes
                    const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-actual-src', 'data-hi-res-src'];
                    for (const attr of lazyAttrs) {
                        const val = img.getAttribute(attr);
                        if (val) {
                            img.setAttribute('src', val);
                            break;
                        }
                    }
                    // Clean srcset
                    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
                    if (srcset) {
                        const firstUrl = srcset.split(',')[0].trim().split(' ')[0];
                        if (firstUrl) {
                            img.setAttribute('src', firstUrl);
                        }
                        img.removeAttribute('srcset');
                        img.removeAttribute('data-srcset');
                    }
                    // Relative to Absolute URL conversion
                    const src = img.getAttribute('src');
                    if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
                        try {
                            const absoluteUrl = new URL(src, articleUrl).href;
                            img.setAttribute('src', absoluteUrl);
                        } catch (e) {}
                    }
                });

                // 4.1 Boilerplate Removal
                const noiseSelectors = ['.also-read', '.related-box', '.ad-container', '.advertisement', '.share-icons', '.social-share', '.newsletter-signup', '.newsletter-box', '[class*="newsletter"]', '[class*="social"]', '[class*="share"]', 'script', 'style', 'iframe', 'noscript'];
                noiseSelectors.forEach(selector => {
                    const elements = d.querySelectorAll(selector);
                    elements.forEach(el => el.remove());
                });

                // 4.2 Paragraph Filter Rules
                const textNodes = d.querySelectorAll('p, div, figcaption, span, h2, h3, h4, li');
                textNodes.forEach(node => {
                    const text = node.textContent.trim();
                    
                    // "Also Read" and "Social Prompts" filters
                    if (text.match(/^(also\s+read|read\s+also|related\s+stories|suggested\s+read)\s*:/i) ||
                        text.match(/follow\s+us\s+on|subscribe\s+to\s+our\s+newsletter|get\s+latest\s+news\s+on/i)) {
                        node.remove();
                        return;
                    }

                    // Branding Clean
                    if (text.toLowerCase() === 'hindustan times' || text.toLowerCase() === 'ht photo' || text.toLowerCase() === 'ht image') {
                        node.remove();
                        return;
                    }
                    if (node.innerHTML && text.match(/^(hindustan\s+times|hindustantimes|ht)\s*\|\s*/i)) {
                        node.innerHTML = node.innerHTML.replace(/^(hindustan\s+times|hindustantimes|ht)\s*\|\s*/i, '');
                    }

                    // Orphan Caption Clean (under 15 words)
                    if (text.match(/^(chart|graph|figure|table|ht image|ht photo)/i)) {
                        const words = text.split(/\s+/).filter(Boolean).length;
                        if (words < 15) {
                            node.remove();
                            return;
                        }
                    }

                    // End Stubs
                    if (text === 'See Less' || text === 'Read More' || text.startsWith('Write to ')) {
                        node.remove();
                    }
                });
            };

            const virtualConsole = new VirtualConsole();
            virtualConsole.on("error", () => { /* ignore style/js parse errors */ });
            
            let dom = new JSDOM(rawHtml, { 
                url,
                virtualConsole
            });
            let doc = dom.window.document;
            preprocessDOM(doc, url);

            // Use Mozilla Readability for core article parsing
            let reader = new Readability(doc);
            let article = reader.parse();

            const paywallKeywords = [
                'subscribe to read',
                'read the full article',
                'sign in to continue',
                'please log in',
                'exclusive content for subscribers',
                'create an account to read',
                'membership required',
                'subscribers only',
                'purchase a subscription',
                'join now to read',
                'sign up to read',
                'become an et prime member',
                'etprime membership',
                'read the full story',
                'read full story',
                'become a member',
                'gift a story',
                'flat 35% off',
                'subscribers love us',
                'unlock this article',
                'subscription plan',
                'reached your free article limit',
                'subscribe to et',
                'member-only story',
                'premium story',
                'read the full news',
                'register to read'
            ];

            const isPaywalled = (art) => {
                if (!art) return true;
                const text = (art.textContent || '').trim();
                const words = text.split(/\s+/).filter(Boolean).length;
                if (words >= 500) {
                    return false; // Safely assumed to be a fully retrieved article, ignoring coincidental keyword matches
                }
                const hasKeywords = paywallKeywords.some(kw => text.toLowerCase().includes(kw));
                return words < 200 || hasKeywords;
            };

            // FALLBACK STEP 0.5: If direct page is paywalled/blocked, try routing via ScraperAPI (residential proxies)
            if (isPaywalled(article)) {
                console.log('[generateArticlePdf] Direct page is paywalled or blocked. Trying ScraperAPI...');
                try {
                    const sessionCookiesStr = getCookiesForUrl(url);
                    const params = {
                        api_key: scraperApiKey,
                        url: url
                    };
                    const headers = {};
                    if (sessionCookiesStr) {
                        params.keep_headers = 'true';
                        headers['Cookie'] = sessionCookiesStr;
                        console.log('[generateArticlePdf] Forwarding session cookies to ScraperAPI');
                    }

                    const response = await axios.get('http://api.scraperapi.com', {
                        params,
                        headers,
                        timeout: 25000
                    });
                    const apiDom = new JSDOM(response.data, { url, virtualConsole });
                    preprocessDOM(apiDom.window.document, url);
                    const apiReader = new Readability(apiDom.window.document);
                    const apiArticle = apiReader.parse();
                    if (apiArticle && !isPaywalled(apiArticle)) {
                        rawHtml = response.data;
                        dom = apiDom;
                        doc = dom.window.document;
                        article = apiArticle;
                        mode = 'SCRAPER_API';
                        console.log('[generateArticlePdf] Successfully recovered article via ScraperAPI!');
                    }
                } catch (apiErr) {
                    console.warn('[generateArticlePdf] ScraperAPI backup failed:', apiErr.message);
                }
            }

            // FALLBACK STEP 1: If paywalled, try Google Web Cache
            if (isPaywalled(article)) {
                console.log('[generateArticlePdf] Direct page is paywalled/too short. Trying Google Cache...');
                try {
                    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
                    const response = await axios.get('http://api.scraperapi.com', {
                        params: {
                            api_key: scraperApiKey,
                            url: cacheUrl
                        },
                        timeout: 15000
                    });
                    const cacheHtml = response.data;
                    const cacheDom = new JSDOM(cacheHtml, { url, virtualConsole });
                    preprocessDOM(cacheDom.window.document, url);
                    const cacheReader = new Readability(cacheDom.window.document);
                    const cacheArticle = cacheReader.parse();
                    if (cacheArticle && !isPaywalled(cacheArticle)) {
                        rawHtml = cacheHtml;
                        dom = cacheDom;
                        doc = dom.window.document;
                        article = cacheArticle;
                        mode = 'GOOGLE_CACHE';
                        console.log('[generateArticlePdf] Successfully recovered article via Google Cache!');
                    }
                } catch (cacheErr) {
                    console.warn('[generateArticlePdf] Google Cache failed:', cacheErr.message);
                }
            }

            // FALLBACK STEP 2: If still paywalled, try Wayback Machine
            if (isPaywalled(article)) {
                console.log('[generateArticlePdf] Google Cache failed or paywalled. Trying Wayback Machine...');
                try {
                    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
                    const apiRes = await axios.get(apiUrl, { timeout: 8000 });
                    const snapshot = apiRes.data?.archived_snapshots?.closest;
                    if (snapshot && snapshot.available && snapshot.url) {
                        const pageRes = await axios.get(snapshot.url, { timeout: 12000 });
                        const archiveHtml = pageRes.data;
                        const archiveDom = new JSDOM(archiveHtml, { url, virtualConsole });
                        preprocessDOM(archiveDom.window.document, url);
                        const archiveReader = new Readability(archiveDom.window.document);
                        const archiveArticle = archiveReader.parse();
                        if (archiveArticle && !isPaywalled(archiveArticle)) {
                            rawHtml = archiveHtml;
                            dom = archiveDom;
                            doc = dom.window.document;
                            article = archiveArticle;
                            mode = 'WAYBACK_ARCHIVE';
                            console.log('[generateArticlePdf] Successfully recovered article via Wayback Machine!');
                        }
                    }
                } catch (archiveErr) {
                    console.warn('[generateArticlePdf] Wayback Machine failed:', archiveErr.message);
                }
            }

            if (!article || isPaywalled(article)) {
                res.status(403).json({
                    error: 'Paywall detected or insufficient article content. The source page is blocking automated readers and no cached version is available.'
                });
                return;
            }

            // 3. Intelligently extract Category Tag
            let category = '';
            const categoryEl = doc.querySelector('.meta-category');
            if (categoryEl) {
                category = categoryEl.textContent.trim();
            } else {
                const sectionMeta = doc.querySelector('meta[property="article:section"]');
                if (sectionMeta) {
                    category = sectionMeta.getAttribute('content');
                }
                if (!category) {
                    try {
                        const parsedUrl = new URL(url);
                        const domainName = parsedUrl.hostname.replace('www.', '').split('.')[0];
                        const pathName = parsedUrl.pathname.split('/').filter(Boolean)[0] || 'General';
                        category = `${domainName.toUpperCase()} — ${pathName.toUpperCase()}`;
                    } catch (e) {
                        category = 'NEWS — ARTICLE';
                    }
                }
            }

            // 4. Extract Publish Date
            let publishedDate = '';
            const dateMeta = doc.querySelector('meta[property="article:published_time"]') || 
                             doc.querySelector('meta[name="publish-date"]') || 
                             doc.querySelector('meta[name="pubdate"]') || 
                             doc.querySelector('meta[property="og:pubdate"]');
            if (dateMeta) {
                publishedDate = dateMeta.getAttribute('content');
            }
            if (!publishedDate) {
                const timeEl = doc.querySelector('time');
                if (timeEl) {
                    publishedDate = timeEl.getAttribute('datetime') || timeEl.textContent;
                }
            }
            if (publishedDate) {
                try {
                    const parsedDate = new Date(publishedDate);
                    if (!isNaN(parsedDate.getTime())) {
                        publishedDate = parsedDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }
                } catch (e) {
                    // Keep raw
                }
            } else {
                publishedDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            // Helper to get absolute image URL including lazy-loaded sources
            const getAbsoluteImageSrc = (imgEl, baseUrl) => {
                if (!imgEl) return '';
                let src = imgEl.getAttribute('data-src') || 
                          imgEl.getAttribute('data-lazy-src') || 
                          imgEl.getAttribute('data-original-src') || 
                          imgEl.getAttribute('src') || '';
                
                if (!src || src.startsWith('data:image/')) {
                    const srcset = imgEl.getAttribute('srcset') || imgEl.getAttribute('data-srcset');
                    if (srcset) {
                        const candidates = srcset.split(',').map(c => c.trim().split(/\s+/)[0]);
                        if (candidates.length > 0) {
                            src = candidates[candidates.length - 1];
                        }
                    }
                }
                
                if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                    try {
                        src = new URL(src, baseUrl).href;
                    } catch (e) {}
                }
                return src;
            };

            // 5. Extract Featured Image & Caption
            let featuredImage = '';
            const featImgEl = doc.querySelector('.featured-image, .story-image, .hero-image, article img, .article-img-container img');
            if (featImgEl) {
                featuredImage = getAbsoluteImageSrc(featImgEl, url);
            }
            
            if (!featuredImage) {
                const ogImage = doc.querySelector('meta[property="og:image"]') || doc.querySelector('meta[name="twitter:image"]');
                if (ogImage) {
                    featuredImage = ogImage.getAttribute('content');
                }
            }

            let imageCaption = '';
            const captionEl = doc.querySelector('.image-caption, .featured-image-caption, figcaption');
            if (captionEl) {
                imageCaption = captionEl.textContent.trim();
            } else {
                const firstImg = doc.querySelector('article img, .story-image img') || featImgEl;
                if (firstImg) {
                    imageCaption = firstImg.getAttribute('alt') || firstImg.getAttribute('title') || '';
                }
            }

            // 6. Extract Highlights Card (Key Takeaways)
            let takeaways = [];
            const highlightsCardEl = doc.querySelector('.highlights-card');
            if (highlightsCardEl) {
                const items = highlightsCardEl.querySelectorAll('li');
                items.forEach(li => {
                    takeaways.push(li.innerHTML);
                });
            }
            if (takeaways.length === 0) {
                const bulletElements = doc.querySelectorAll('.key-takeaways li, .story-summary li, .article-summary li, .brief li');
                bulletElements.forEach(li => {
                    takeaways.push(li.innerHTML);
                });
            }
            if (takeaways.length === 0) {
                const sentences = [];
                if (article.textContent) {
                    const rawSentences = article.textContent
                        .replace(/\s+/g, ' ')
                        .split(/[.!?]\s+/)
                        .filter(s => s.trim().length > 25 && s.trim().length < 200);
                    for (let i = 0; i < Math.min(3, rawSentences.length); i++) {
                        const sent = rawSentences[i].trim() + '.';
                        const words = sent.split(' ');
                        const strongCount = Math.min(3, words.length);
                        const strongPart = words.slice(0, strongCount).join(' ');
                        const restPart = words.slice(strongCount).join(' ');
                        sentences.push(`<strong>${strongPart}</strong> ${restPart}`);
                    }
                }
                takeaways = sentences.length > 0 ? sentences : [
                    `<strong>Main Coverage:</strong> Read the extracted article details using the reference URL.`,
                    `<strong>Print Ready Layout:</strong> Auto-compiled premium typography and visual systems.`
                ];
            }

            // 7. Select Theme Accent (Gold/Amber or Crimson)
            let themeAccent = '#dca53c'; // Default Gold
            const combinedText = (category + ' ' + article.title + ' ' + url).toLowerCase();
            if (combinedText.includes('regulatory') || 
                combinedText.includes('merger') || 
                combinedText.includes('acquisition') || 
                combinedText.includes('court') || 
                combinedText.includes('policy') || 
                combinedText.includes('law') ||
                combinedText.includes('finance') ||
                combinedText.includes('economic') ||
                combinedText.includes('government') ||
                combinedText.includes('investor')) {
                themeAccent = '#b91c1c'; // Crimson
            }

            // Clean up Readability content (strip duplicate title, category tags or highlights inside body)
            let cleanContent = article.content;
            cleanContent = cleanContent.replace(/<h1[^>]*>.*?<\/h1>/gi, '');

            // 8. Render premium styled HTML
            const htmlTemplate = `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
                  
                  :root {
                    --bg-primary: #fcfbf9;
                    --text-primary: #1a1a1a;
                    --text-secondary: #555555;
                    --accent: ${themeAccent};
                    --border-color: #e5e0d8;
                    --card-bg: #f5f2eb;
                    --font-serif: 'Lora', Georgia, serif;
                    --font-sans: 'Plus Jakarta Sans', sans-serif;
                    --font-display: 'Playfair Display', serif;
                  }

                  body {
                    background-color: var(--bg-primary);
                    color: var(--text-primary);
                    font-family: var(--font-serif);
                    font-size: 11pt;
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                  }

                  .pdf-container {
                    max-width: 100%;
                    margin: 0 auto;
                  }

                  header {
                    border-bottom: 2px double var(--border-color);
                    padding-bottom: 1.5rem;
                    margin-bottom: 2rem;
                    text-align: center;
                  }

                  .meta-category {
                    font-family: var(--font-sans);
                    font-weight: 700;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    color: var(--accent);
                    margin-bottom: 0.8rem;
                    display: inline-block;
                  }

                  h1 {
                    font-family: var(--font-display);
                    font-size: 2.2rem;
                    font-weight: 800;
                    line-height: 1.25;
                    margin: 0 0 1rem 0;
                    color: #111;
                  }

                  .meta-byline {
                    font-family: var(--font-sans);
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                  }

                  .meta-byline span {
                    color: var(--text-primary);
                    font-weight: 600;
                  }

                  .featured-image-container {
                    margin-bottom: 2rem;
                    page-break-inside: avoid;
                  }

                  .featured-image {
                    width: 100%;
                    height: auto;
                    border-radius: 6px;
                    display: block;
                  }

                  .image-caption {
                    font-family: var(--font-sans);
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-top: 0.6rem;
                    text-align: center;
                  }

                  .highlights-card {
                    background-color: var(--card-bg);
                    border-top: 3px solid var(--accent);
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                    border-radius: 4px;
                    font-family: var(--font-sans);
                    page-break-inside: avoid;
                  }

                  .highlights-card h3 {
                    margin-top: 0;
                    font-size: 1rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--text-primary);
                    font-weight: 700;
                    margin-bottom: 0.8rem;
                  }

                  .highlights-card ul {
                    padding-left: 1.2rem;
                    margin: 0;
                  }

                  .highlights-card li {
                    margin-bottom: 0.6rem;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    color: var(--text-secondary);
                  }

                  .highlights-card li strong {
                    color: var(--text-primary);
                  }

                  .article-body p {
                    margin-bottom: 1.2rem;
                  }



                  .article-body a {
                    color: #0284c7;
                    text-decoration: none;
                    border-bottom: 1px solid rgba(2, 132, 199, 0.15);
                    transition: all 0.2s ease;
                  }

                  .article-body a:hover {
                    color: #0369a1;
                    border-bottom-color: #0369a1;
                  }

                  blockquote, .skift-take-callout {
                    border-left: 3px solid var(--accent);
                    padding-left: 1.2rem;
                    margin: 1.5rem 0;
                    font-style: italic;
                    color: var(--text-primary);
                    page-break-inside: avoid;
                  }

                  img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 4px;
                    margin: 1.5rem 0;
                    page-break-inside: avoid;
                  }
                  
                  h2, h3, h4 {
                    font-family: var(--font-display);
                    color: #111;
                    page-break-after: avoid;
                  }
                </style>
              </head>
              <body>
                <div class="pdf-container">
                  <header>
                    ${category ? `<span class="meta-category">${category}</span>` : ''}
                    <h1>${article.title}</h1>
                    <div class="meta-byline">
                      Source: <span>${article.siteName || 'News Source'}</span> | Published: <span>${publishedDate}</span> | Author: <span>${article.byline || 'Staff'}</span>
                    </div>
                  </header>

                  ${featuredImage ? `
                  <div class="featured-image-container">
                    <img class="featured-image" src="${featuredImage}" alt="Featured Image">
                    ${imageCaption ? `<div class="image-caption">${imageCaption}</div>` : ''}
                  </div>
                  ` : ''}

                  ${takeaways.length > 0 ? `
                  <div class="highlights-card">
                    <h3>Key Takeaways</h3>
                    <ul>
                      ${takeaways.map(pt => `<li>${pt}</li>`).join('\n')}
                    </ul>
                  </div>
                  ` : ''}

                  <div class="article-body">
                    ${cleanContent}
                  </div>
                </div>
              </body>
              </html>
            `;

            // 9. Generate PDF buffer using headless Chrome
            await ensureChromiumPath();
            const puppeteerExtra = require('puppeteer-extra');
            const browser = await puppeteerExtra.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });
            const page = await browser.newPage();
            // A4 dimensions at 96 DPI (approx 794px x 1123px)
            await page.setViewport({ width: 794, height: 1123 });
            try {
                await page.setContent(htmlTemplate, { waitUntil: 'networkidle2', timeout: 15000 });
            } catch (setContentErr) {
                console.warn('[generateArticlePdf] setContent took too long or hit a timeout, proceeding to print PDF anyway:', setContentErr.message);
            }

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '60px',
                    bottom: '60px',
                    left: '50px',
                    right: '50px'
                }
            });

            await browser.close();

            // Log this action to system audit logs in Firestore
            try {
                const admin = require('firebase-admin');
                if (!admin.apps.length) admin.initializeApp();
                const db = admin.firestore();
                
                const logEmail = (userEmail || 'extension-user@themavericksindia.com').trim().toLowerCase();
                const logDetails = `Generated PDF for: "${article.title || url}" (${mode === 'EXTENSION_CLIP' ? 'via Chrome Extension' : 'via Web Portal'})`;
                
                await db.collection('audit_logs').add({
                    email: logEmail,
                    action: 'PDF Scraper',
                    details: logDetails,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[generateArticlePdf] Successfully logged scraper action in Firestore for ${logEmail}`);
            } catch (auditErr) {
                console.error('[generateArticlePdf] Failed to log action to Firestore:', auditErr);
            }

            // 10. Send PDF back as response stream
            const slugify = (str) => {
                return (str || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, '');
            };
            const cleanTitle = slugify(article.title);
            const cleanSite = slugify(article.siteName || 'article');
            const pdfFilename = `${cleanTitle}-${cleanSite}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.end(pdfBuffer, 'binary');

        } catch (error) {
            console.error('[generateArticlePdf] Error generating PDF:', error);
            res.status(500).json({ error: error.message || 'Failed to process URL or generate PDF.' });
        }
    }
);

const syncToGoogleSheets = require('./syncToGoogleSheets');
exports.syncToGoogleSheetsScheduled = syncToGoogleSheets.syncToGoogleSheetsScheduled;
exports.syncToGoogleSheetsHttp = syncToGoogleSheets.syncToGoogleSheetsHttp;

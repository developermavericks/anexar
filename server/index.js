const express = require('express');
const cors = require('cors');
const { JSDOM, VirtualConsole } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

// Custom .env file parser to load variables into process.env without external dependencies
try {
  const envPath = require('path').resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length > 1) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    });
  }
} catch (envErr) {
  console.error('Failed to parse .env file:', envErr);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend and Chrome extension requests
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('chrome-extension://') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Pre-process JSDOM to fix relative image links, lazy loaded images, and drop caps
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

// In-memory job store for background PDF generation tasks
const jobs = new Map();

// Concurrency guard: each job can launch up to two headless Chrome instances
// (scrape + render), which is heavy on CPU/RAM. Cap how many run at once and
// queue the rest instead of letting unbounded concurrent requests spawn
// unlimited Puppeteer processes and crash the server.
const MAX_CONCURRENT_PDF_JOBS = 3;
let activePdfJobs = 0;
const pdfJobQueue = [];

function runPdfJob(jobId, fn) {
  return new Promise((resolve, reject) => {
    const task = async () => {
      activePdfJobs++;
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      } finally {
        activePdfJobs--;
        const next = pdfJobQueue.shift();
        if (next) next();
      }
    };

    if (activePdfJobs < MAX_CONCURRENT_PDF_JOBS) {
      task();
    } else {
      updateJobStatus(jobId, 'queued', 5, `Waiting for a free processing slot (${pdfJobQueue.length + 1} job(s) ahead)...`);
      pdfJobQueue.push(task);
    }
  });
}

// Helper to push real-time status updates to connected SSE clients
function updateJobStatus(jobId, status, progress, stepLabel, error = null) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = status;
  job.progress = progress;
  job.stepLabel = stepLabel;
  if (error) job.error = error;

  console.log(`[Job ${jobId}] ${status} (${progress}%): ${stepLabel}`);

  const eventData = JSON.stringify({
    status: job.status,
    progress: job.progress,
    stepLabel: job.stepLabel,
    error: job.error
  });

  job.clients.forEach(clientRes => {
    try {
      clientRes.write(`data: ${eventData}\n\n`);
    } catch (err) {
      console.error(`Error sending data to client for job ${jobId}:`, err.message);
    }
  });
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
    if (hostname.includes('wsj.com')) {
      return process.env.SESSION_COOKIES_WSJ || process.env.SESSION_COOKIES || '';
    }
    if (hostname.includes('skift.com')) {
      return process.env.SESSION_COOKIES_SKIFT || process.env.SESSION_COOKIES || '';
    }
    return process.env.SESSION_COOKIES || '';
  } catch (e) {
    return '';
  }
};

// Asynchronous worker function to scrape and render PDF
async function generatePdfForJob(jobId, rawInputUrl) {
  const url = normalizeUrl(rawInputUrl);
  const job = jobs.get(jobId);
  const preRenderedHtml = job ? job.html : null;
  updateJobStatus(jobId, 'scraping', 10, 'Checking connection & normalizing target URL...');

  try {
    // 1. Fetch raw HTML (from live URL, local file path, or extension pre-rendered payload)
    let rawHtml = '';
    let mode = 'DIRECT';
    const scraperApiKey = process.env.SCRAPER_API_KEY || '4663b0263257ba5337353aeb6fe289cc';

    if (preRenderedHtml && typeof preRenderedHtml === 'string' && preRenderedHtml.trim().length > 0) {
      rawHtml = preRenderedHtml;
      mode = 'EXTENSION_CLIP';
      console.log(`[local server] Using pre-rendered HTML from extension clipper for: ${url}`);
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      let browserInstance;
      try {
        updateJobStatus(jobId, 'scraping', 20, 'Bypassing paywalls and fetching raw article HTML via Puppeteer...');
        browserInstance = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browserInstance.newPage();

        // Inject session cookies from environment if present (Solves Strict Paywalls)
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
              await page.setCookie(...cookieArray);
              console.log('Injected session cookies for domain:', new URL(url).hostname);
            }
          } catch (cookieErr) {
            console.error('Error setting session cookies:', cookieErr);
          }
        }

        // Configure page JS and headers based on active session status
        await page.setJavaScriptEnabled(true);
        if (sessionCookiesStr) {
          await page.setExtraHTTPHeaders({
            'Referer': 'https://www.google.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          });
        } else {
          await page.setExtraHTTPHeaders({
            'Referer': 'https://www.google.com/',
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
          });
        }

        // Enable request interception to block ad-trackers and paywall scripts
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const resourceType = request.resourceType();
          const requestUrl = request.url().toLowerCase();
          
          const paywallScriptDomains = [
            'tinypass.com', 'piano.io', 'poool.fr', 'cxense.com', 
            'dynamic-paywall.js', 'adnxs.com', 'doubleclick.net', 
            'adsystem.com', 'google-analytics.com', 'googletagmanager.com'
          ];
          
          const isAdOrPaywall = paywallScriptDomains.some(domain => requestUrl.includes(domain));
          
          if (isAdOrPaywall && (resourceType === 'script' || resourceType === 'stylesheet')) {
            console.log(`[local server] Aborting paywall/ad script: ${request.url()}`);
            request.abort();
          } else {
            request.continue();
          }
        });

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });

        // Wait 5 seconds for client-side React rendering/hydration to complete
        await new Promise(resolve => setTimeout(resolve, 5000));

        rawHtml = await page.content();
      } catch (err) {
        console.warn('Puppeteer fetch failed, falling back to Axios:', err.message);
        updateJobStatus(jobId, 'scraping', 25, 'Direct Puppeteer block; falling back to secondary Axios scraper agents...');
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 15000
          });
          rawHtml = response.data;
        } catch (axErr) {
          console.warn('Direct Axios fetch also failed:', axErr.message);
        }
      } finally {
        if (browserInstance) {
          await browserInstance.close();
        }
      }
    } else {
      updateJobStatus(jobId, 'scraping', 20, 'Reading local source file path...');
      // Decode URL if formatted as file:/// protocol
      let filepath = url;
      if (filepath.startsWith('file:///')) {
        filepath = filepath.replace('file:///', '');
      } else if (filepath.startsWith('file://')) {
        filepath = filepath.replace('file://', '');
      }
      filepath = decodeURIComponent(filepath);

      if (!fs.existsSync(filepath)) {
        throw new Error(`File not found at path: ${filepath}`);
      }
      rawHtml = fs.readFileSync(filepath, 'utf8');
      mode = 'OFFLINE_FILE';
    }

    // 2. Parse details using JSDOM with custom VirtualConsole to ignore CSS errors
    updateJobStatus(jobId, 'parsing', 40, 'Generating DOM tree and cleaning layout artifacts...');
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => { /* ignore style/js parse errors */ });
    
    let dom = new JSDOM(rawHtml, { 
      url: url.startsWith('http') ? url : 'http://localhost',
      virtualConsole
    });
    let doc = dom.window.document;
    preprocessDOM(doc, url);

    // Use Mozilla Readability for core article parsing
    updateJobStatus(jobId, 'parsing', 50, 'Parsing article body structure via Mozilla Readability...');
    let reader = new Readability(doc);
    let article = reader.parse();

    if (!article && mode !== 'OFFLINE_FILE') {
      throw new Error('Failed to parse article content');
    }

    // 2b. Validate parsed article relevance & check for paywalls
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
      const textContent = (art.textContent || '').trim();
      const wordCount = textContent.split(/\s+/).filter(Boolean).length;
      if (wordCount >= 500) {
        return false; // Safely assumed to be a fully retrieved article, ignoring coincidental keyword matches
      }
      const containsPaywallText = paywallKeywords.some(kw => textContent.toLowerCase().includes(kw));
      return wordCount < 200 || containsPaywallText;
    };

    // FALLBACK STEP 0.5: If direct page is paywalled/blocked, try routing via ScraperAPI (residential proxies)
    if (url.startsWith('http') && isPaywalled(article)) {
      console.log('[local server] Direct page is paywalled or blocked. Trying ScraperAPI...');
      updateJobStatus(jobId, 'scraping', 30, 'Direct paywall detected. Re-routing via ScraperAPI proxy residential hubs...');
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
          console.log('[local server] Forwarding session cookies to ScraperAPI');
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
          console.log('[local server] Successfully recovered article via ScraperAPI!');
        }
      } catch (apiErr) {
        console.warn('[local server] ScraperAPI backup failed:', apiErr.message);
      }
    }

    // FALLBACK STEP 1: If paywalled, try Google Web Cache
    if (url.startsWith('http') && isPaywalled(article)) {
      console.log('[local server] Direct page is paywalled/too short. Trying Google Cache...');
      updateJobStatus(jobId, 'scraping', 35, 'Primary paywall still active. Searching Google Web Cache indexes...');
      try {
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const response = await axios.get('http://api.scraperapi.com', {
          params: {
            api_key: scraperApiKey,
            url: cacheUrl
          },
          timeout: 15000
        });
        const cacheDom = new JSDOM(response.data, { url, virtualConsole });
        preprocessDOM(cacheDom.window.document, url);
        const cacheReader = new Readability(cacheDom.window.document);
        const cacheArticle = cacheReader.parse();
        if (cacheArticle && !isPaywalled(cacheArticle)) {
          rawHtml = response.data;
          dom = cacheDom;
          doc = dom.window.document;
          article = cacheArticle;
          mode = 'GOOGLE_CACHE';
          console.log('[local server] Successfully recovered article via Google Cache!');
        }
      } catch (cacheErr) {
        console.warn('[local server] Google Cache failed:', cacheErr.message);
      }
    }

    // FALLBACK STEP 2: If still paywalled, try Wayback Machine
    if (url.startsWith('http') && isPaywalled(article)) {
      console.log('[local server] Google Cache failed or paywalled. Trying Wayback Machine...');
      updateJobStatus(jobId, 'scraping', 38, 'Attempting final recovery via Internet Archive Wayback Machine snapshots...');
      try {
        const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
        const apiRes = await axios.get(apiUrl, { timeout: 8000 });
        const snapshot = apiRes.data?.archived_snapshots?.closest;
        if (snapshot && snapshot.available && snapshot.url) {
          const pageRes = await axios.get(snapshot.url, { timeout: 12000 });
          const archiveDom = new JSDOM(pageRes.data, { url, virtualConsole });
          preprocessDOM(archiveDom.window.document, url);
          const archiveReader = new Readability(archiveDom.window.document);
          const archiveArticle = archiveReader.parse();
          if (archiveArticle && !isPaywalled(archiveArticle)) {
            rawHtml = pageRes.data;
            dom = archiveDom;
            doc = dom.window.document;
            article = archiveArticle;
            mode = 'WAYBACK_ARCHIVE';
            console.log('[local server] Successfully recovered article via Wayback Machine!');
          }
        }
      } catch (archiveErr) {
        console.warn('[local server] Wayback Machine failed:', archiveErr.message);
      }
    }

    if (isPaywalled(article)) {
      throw new Error('Paywall detected or insufficient article content. The source page is blocking automated readers and no cached copies were found.');
    }

    // 3. Intelligently extract Category Tag
    updateJobStatus(jobId, 'parsing', 60, 'Extracting article metadata and category tags...');
    let category = '';
    const categoryEl = doc.querySelector('.meta-category');
    if (categoryEl) {
      category = categoryEl.textContent.trim();
    } else {
      const sectionMeta = doc.querySelector('meta[property="article:section"]');
      if (sectionMeta) {
        category = sectionMeta.getAttribute('content');
      }
      if (!category && url.startsWith('http')) {
        try {
          const parsedUrl = new URL(url);
          const domainName = parsedUrl.hostname.replace('www.', '').split('.')[0];
          const pathName = parsedUrl.pathname.split('/').filter(Boolean)[0] || 'General';
          category = `${domainName.toUpperCase()} — ${pathName.toUpperCase()}`;
        } catch (e) {
          category = 'NEWS — ARTICLE';
        }
      } else if (!category) {
        category = 'NEWS — EDITORIAL';
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
        // Keep raw text on failure
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
      // Fallback: Generate key points from excerpt/content
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
    // Strip empty tags or duplicate h1
    cleanContent = cleanContent.replace(/<h1[^>]*>.*?<\/h1>/gi, '');

    // 8. Render premium styled HTML
    updateJobStatus(jobId, 'parsing', 70, 'Applying premium editorial styling & HSL typography templates...');
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

          .article-body p:first-of-type::first-letter {
            font-family: var(--font-display);
            font-size: 4rem;
            float: left;
            line-height: 0.8;
            margin-right: 0.5rem;
            margin-top: 0.15rem;
            font-weight: 800;
            color: var(--accent);
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
    updateJobStatus(jobId, 'rendering', 80, 'Spinning up Puppeteer headless instance & printing A4 PDF document...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    // A4 dimensions at 96 DPI (approx 794px x 1123px)
    await page.setViewport({ width: 794, height: 1123 });
    try {
      await page.setContent(htmlTemplate, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch (setContentErr) {
      console.warn('[local server] setContent took too long or hit a timeout, proceeding to print PDF anyway:', setContentErr.message);
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

    // 10. Store result & trigger complete
    const job = jobs.get(jobId);
    if (job) {
      const slugify = (str) => {
        return (str || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
      };
      const cleanTitle = slugify(article.title);
      const cleanSite = slugify(article.siteName || 'article');
      
      job.pdfFilename = `${cleanTitle}-${cleanSite}.pdf`;
      job.pdfBuffer = pdfBuffer;
      updateJobStatus(jobId, 'completed', 100, 'PDF buffer successfully generated!');

      // Set timeout to purge job memory after 10 mins
      setTimeout(() => {
        jobs.delete(jobId);
        console.log(`[local server] Auto-cleared job ${jobId} from memory.`);
      }, 10 * 60 * 1000);
    }
  } catch (error) {
    console.error(`Error generating PDF for job ${jobId}:`, error);
    updateJobStatus(jobId, 'failed', 0, 'Scraping / PDF generation failed', error.message || 'Failed to process URL.');
  }
}

// GET Endpoint to sync dynamic Chrome Extension configuration
app.get('/api/extension-config', (req, res) => {
  res.json({
    domains: [
      'nikkei.com',
      'bloomberg.com',
      'economictimes.indiatimes.com',
      'thehindu.com'
    ],
    rules: [
      {
        "id": 1,
        "priority": 1,
        "action": {
          "type": "modifyHeaders",
          "requestHeaders": [
            { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
            { "header": "Referer", "operation": "set", "value": "https://www.google.com/" },
            { "header": "Cookie", "operation": "remove" }
          ]
        },
        "condition": {
          "urlFilter": "||nikkei.com"
        }
      },
      {
        "id": 2,
        "priority": 1,
        "action": {
          "type": "modifyHeaders",
          "requestHeaders": [
            { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
            { "header": "Referer", "operation": "set", "value": "https://www.google.com/" },
            { "header": "Cookie", "operation": "remove" }
          ]
        },
        "condition": {
          "urlFilter": "||bloomberg.com"
        }
      },
      {
        "id": 3,
        "priority": 1,
        "action": {
          "type": "modifyHeaders",
          "requestHeaders": [
            { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
            { "header": "Referer", "operation": "set", "value": "https://www.google.com/" },
            { "header": "Cookie", "operation": "remove" }
          ]
        },
        "condition": {
          "urlFilter": "||economictimes.indiatimes.com"
        }
      },
      {
        "id": 4,
        "priority": 1,
        "action": {
          "type": "modifyHeaders",
          "requestHeaders": [
            { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
            { "header": "Referer", "operation": "set", "value": "https://www.google.com/" },
            { "header": "Cookie", "operation": "remove" }
          ]
        },
        "condition": {
          "urlFilter": "||thehindu.com"
        }
      },
      {
        "id": 5,
        "priority": 2,
        "action": { "type": "block" },
        "condition": { "urlFilter": "||tinypass.com", "resourceTypes": ["script"] }
      },
      {
        "id": 6,
        "priority": 2,
        "action": { "type": "block" },
        "condition": { "urlFilter": "||piano.io", "resourceTypes": ["script"] }
      },
      {
        "id": 7,
        "priority": 2,
        "action": { "type": "block" },
        "condition": { "urlFilter": "||poool.fr", "resourceTypes": ["script"] }
      },
      {
        "id": 8,
        "priority": 2,
        "action": { "type": "block" },
        "condition": { "urlFilter": "||cxense.com", "resourceTypes": ["script"] }
      }
    ]
  });
});

// POST Endpoint for Article scraping and PDF generation (Supports synchronous fallback or async streaming jobs)
app.post('/api/generate-article-pdf', async (req, res) => {
  const { url: rawInputUrl, html: preRenderedHtml, stream } = req.body;

  if (!rawInputUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (stream) {
    const jobId = 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const job = {
      id: jobId,
      url: rawInputUrl,
      html: preRenderedHtml,
      status: 'pending',
      progress: 0,
      stepLabel: 'Initializing job and normalizing URL...',
      pdfBuffer: null,
      error: null,
      clients: []
    };
    jobs.set(jobId, job);

    // Begin async rendering worker (concurrency-limited)
    runPdfJob(jobId, () => generatePdfForJob(jobId, rawInputUrl)).catch(() => {});

    return res.json({ jobId });
  }

  // Synchronous backward-compatible fallback flow
  const jobId = 'sync-job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const job = {
    id: jobId,
    url: rawInputUrl,
    html: preRenderedHtml,
    status: 'pending',
    progress: 0,
    stepLabel: 'Initializing job...',
    pdfBuffer: null,
    error: null,
    clients: []
  };
  jobs.set(jobId, job);

  try {
    await runPdfJob(jobId, () => generatePdfForJob(jobId, rawInputUrl));
    const updatedJob = jobs.get(jobId);
    if (updatedJob.status === 'completed' && updatedJob.pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', updatedJob.pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${updatedJob.pdfFilename || `article-${Date.now()}.pdf`}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.end(updatedJob.pdfBuffer, 'binary');
    } else {
      res.status(500).json({ error: updatedJob.error || 'Failed to generate PDF.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    jobs.delete(jobId);
  }
});

// SSE Route for status monitoring
app.get('/api/generate-article-pdf/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state immediately
  const eventData = JSON.stringify({
    status: job.status,
    progress: job.progress,
    stepLabel: job.stepLabel,
    error: job.error
  });
  res.write(`data: ${eventData}\n\n`);

  // Add this client response to the job listener registry
  job.clients.push(res);

  // Clean up when client closes connection
  req.on('close', () => {
    const activeJob = jobs.get(jobId);
    if (activeJob) {
      activeJob.clients = activeJob.clients.filter(c => c !== res);
    }
  });
});

// Final PDF binary download route
app.get('/api/generate-article-pdf/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or has expired from memory.' });
  }

  if (job.status !== 'completed' || !job.pdfBuffer) {
    return res.status(400).json({ error: 'PDF generation is not complete or has failed.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', job.pdfBuffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${job.pdfFilename || `article-${Date.now()}.pdf`}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.end(job.pdfBuffer, 'binary');
});

// Mock Influencer Fallback Database generator for stable presentations
function getMockInfluencers(sector, location) {
  const categories = ['Journalist', 'Influencer'];
  const firstNames = ['Amit', 'Sneha', 'Rohan', 'Priya', 'Vikram', 'Ananya', 'Rahul', 'Divya', 'Karan', 'Neha'];
  const lastNames = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Rao', 'Deshmukh', 'Mehta', 'Joshi', 'Verma', 'Kumar'];
  
  const results = [];
  for (let i = 0; i < 8; i++) {
    const fn = firstNames[(i + sector.length) % firstNames.length];
    const ln = lastNames[(i + location.length) % lastNames.length];
    const fullName = `${fn} ${ln}`;
    const handle = `${fn.toLowerCase()}_${ln.toLowerCase()}_${i}`;
    const isJournalist = i % 3 === 0;
    
    results.push({
      username: handle,
      fullName: fullName,
      followers: `${(10 + i * 27.5).toFixed(0)}K`,
      engagement: `${(1.5 + (i * 0.7) % 4.5).toFixed(1)}%`,
      email: `contact.${handle}@gmail.com`,
      bio: isJournalist 
        ? `Senior Journalist covering ${sector} stories in ${location}. Writes for major national publications.`
        : `Digital Creator & Influencer sharing trends, insights and tips about ${sector} from ${location}.`,
      link: `https://www.instagram.com/${handle}/`,
      category: isJournalist ? 'Journalist' : 'Influencer',
      sector: sector,
      location: location,
      scrapedAt: new Date().toISOString()
    });
  }
  return results;
}


// Pre-parse Serper organic search results to extract clean metadata
function preParseSerperItem(item) {
  const title = item.title || '';
  const snippet = item.snippet || '';
  const link = item.link || '';
  const combinedText = `${title} ${snippet}`;

  let username = '';
  let fullName = '';

  if (link.includes('instagram.com/')) {
    const titleMatch = title.match(/^([^(]+)\s*\(([^)]+)\)/);
    if (titleMatch) {
      fullName = titleMatch[1].trim();
      username = titleMatch[2].replace('@', '').trim();
    } else {
      const urlParts = link.split('instagram.com/');
      if (urlParts[1]) {
        username = urlParts[1].split('/')[0].split('?')[0].trim();
      }
    }
  } else {
    // Secondary stats-aggregator sources (SocialBlade/HypeAuditor/Phlanx) index the
    // real @handle directly in the page title, e.g. "@handle - 12.4K Followers - Social
    // Blade Stats" -- richer and more reliable than a bare Instagram search snippet.
    const handleMatch = title.match(/@([a-zA-Z0-9_.]+)/) || snippet.match(/@([a-zA-Z0-9_.]+)/);
    if (handleMatch) {
      username = handleMatch[1].trim();
    }
    const nameMatch = title.match(/^([^(@\-|]+)/);
    if (nameMatch) {
      fullName = nameMatch[1].trim();
    }
  }

  if (!username || username.toLowerCase() === 'p' || username.toLowerCase() === 'reel' || username.toLowerCase() === 'explore' || username.toLowerCase() === 'tags') {
    const handleMatch = snippet.match(/@([a-zA-Z0-9_.]+)/) || title.match(/@([a-zA-Z0-9_.]+)/);
    if (handleMatch) {
      username = handleMatch[1].trim();
    }
  }

  username = username.replace(/[^a-zA-Z0-9_.]/g, '');
  if (!username || username.toLowerCase() === 'p' || username.toLowerCase() === 'reel' || username.toLowerCase() === 'explore' || username.toLowerCase() === 'tags') {
    return null;
  }

  let followers = 'Unknown';
  const followersRegex = /(\d+(\.\d+)?[mKk]?)\s*(Followers|followers)/i;
  const fMatch = combinedText.match(followersRegex);
  if (fMatch) {
    followers = fMatch[1].toUpperCase();
  }

  let email = '';
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const eMatch = snippet.match(emailRegex);
  if (eMatch) {
    email = eMatch[0];
  }

  return {
    username,
    fullName: fullName || username,
    followers,
    email,
    rawBio: snippet,
    link: `https://www.instagram.com/${username}/`
  };
}

// POST endpoint to discover/scrape influencers and journalists
app.post('/api/find-influencers', async (req, res) => {
  const { sector, location, query } = req.body;

  let coreTerms = '';
  let igQuery = '';
  let displaySector = sector || 'Custom';
  let displayLocation = location || 'Search';

  if (query && query.trim()) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.toLowerCase().includes('site:')) {
      // Fully custom scoped query from the user -- run it as-is, no stats variant.
      igQuery = trimmedQuery;
    } else {
      // Clean query: strip out noise search terms to focus on high-yield keywords
      let cleaned = trimmedQuery
        .replace(/\b(popular|top|best|find|search|list|influencer|influencers|creator|creators|profile|profiles|account|accounts)\b/gi, '')
        .replace(/\b(in|at|of|with|emails?|email)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleaned) cleaned = trimmedQuery;
      coreTerms = cleaned;
      igQuery = `site:instagram.com ${cleaned} "followers" -college -university -institute -school`;
    }
    displaySector = trimmedQuery;
    displayLocation = 'Query';
  } else if (sector && location) {
    coreTerms = `"${sector}" "${location}"`;
    igQuery = `site:instagram.com ${coreTerms} "followers" -college -university -institute -school`;
  } else {
    return res.status(400).json({ error: 'Search query, or Sector and Location are required' });
  }

  // Secondary query against social-stats aggregator sites (SocialBlade, HypeAuditor,
  // Phlanx). Google indexes these pages with the real @handle and follower count
  // directly in the title, widening the candidate pool with richer data without
  // proportionally increasing Serper spend -- total request volume below is kept
  // roughly equal to the old single-query 8-page loop.
  const statsQuery = coreTerms
    ? `${coreTerms} instagram followers -college -university -institute -school (site:hypeauditor.com OR site:socialblade.com OR site:phlanx.com)`
    : null;

  const serperKeys = (process.env.SERPER_API_KEY || '').split(/[,\n]/).map(k => k.trim()).filter(Boolean);
  const groqKey = process.env.GROQ_API_KEY;

  // Helper for multi-key Serper fetch
  const fetchSerperPage = async (searchQuery, pageNumber) => {
    for (const key of serperKeys) {
      try {
        const response = await axios.post('https://google.serper.dev/search', {
          q: searchQuery,
          page: pageNumber
        }, {
          headers: {
            'X-API-KEY': key,
            'Content-Type': 'application/json'
          }
        });
        if (response.data && response.data.organic) {
          return response.data.organic;
        }
      } catch (err) {
        console.warn(`[influencer-finder] Serper key error on "${searchQuery}" page ${pageNumber}: ${err.message}. Trying backup key...`);
      }
    }
    return [];
  };

  // If credentials are not configured or are dummy, use mock fallback to prevent errors
  if (serperKeys.length === 0 || !groqKey) {
    console.log(`[influencer-finder] Serper/Groq keys missing. Using mock fallback for query: "${igQuery}".`);
    return res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
  }
  try {
    console.log(`[influencer-finder] Querying live search via Serper: instagram="${igQuery}" stats="${statsQuery || 'n/a'}"`);

    const pagePromises = [];
    for (let p = 1; p <= 10; p++) {
      pagePromises.push(fetchSerperPage(igQuery, p));
    }
    if (statsQuery) {
      for (let p = 1; p <= 8; p++) {
        pagePromises.push(fetchSerperPage(statsQuery, p));
      }
    }

    const pagesResults = await Promise.all(pagePromises);
    const items = pagesResults.flat();
    
    if (items.length === 0) {
      console.log(`[influencer-finder] Serper returned 0 results. Using fallback.`);
      return res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
    }

    // Pre-parse results to extract structured profiles
    const preParsedList = items.map(preParseSerperItem).filter(Boolean);
    
    // Deduplicate by username and filter out low follower profiles (< 2,000)
    const uniquePreParsed = [];
    const seen = new Set();

    const parseFollowerCount = (str) => {
      if (!str || str === 'Unknown') return null;
      const cleaned = str.replace(/,/g, '').trim().toUpperCase();
      const num = parseFloat(cleaned);
      if (isNaN(num)) return null;
      if (cleaned.includes('M')) return num * 1000000;
      if (cleaned.includes('K')) return num * 1000;
      return num;
    };

    for (const p of preParsedList) {
      if (!seen.has(p.username.toLowerCase())) {
        seen.add(p.username.toLowerCase());
        
        // Filter out low follower personal accounts (exclude if count < 2000)
        const count = parseFollowerCount(p.followers);
        if (count !== null && count < 2000) {
          console.log(`[influencer-finder] Excluding low follower profile @${p.username} (${p.followers} followers)`);
          continue;
        }

        uniquePreParsed.push(p);
      }
    }

    if (uniquePreParsed.length === 0) {
      console.log(`[influencer-finder] No valid Instagram profiles could be pre-parsed. Using fallback.`);
      return res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
    }

    const prompt = [
      `You are an AI assistant refining a list of pre-parsed social profiles found via search for the topic/sector "${displaySector}" in "${displayLocation}". Here is the list:`,
      JSON.stringify(uniquePreParsed, null, 2),
      `Refine this list and return a clean JSON array of profiles.`,
      `Rules for refinement:`,
      `1. INDIVIDUAL-ONLY TEST: keep an entry only if it represents exactly ONE specific, named human being -- not a group, team, clan, organization, business, brand, gaming cafe/lounge, club, political party, government body, media outlet, or institution of any kind. Judge by what the account actually IS, not by keyword matching: e.g. "TEAM APEX GAMING", "Lan Shack Gaming Cafe", "BJP Delhi", and "Aam Aadmi Party" are all NOT individuals and must be excluded even though they may have real follower counts and even if they are topically related to the search. A "fullName" that reads as a team/venue/party/company name (not a person's name) is a strong signal to exclude. Keep every real individual creator, influencer, journalist, or builder even if some of their fields (email, exact engagement) are missing or uncertain -- incomplete data is never a reason to drop a real person, but representing a non-person entity always is.`,
      `2. RELEVANCE TEST: only keep individuals who are genuinely connected to "${displaySector}" based on their bio/rawBio -- a search engine will surface unrelated accounts that merely happen to share a keyword or location; if a profile's content has nothing to do with "${displaySector}", exclude it even though it appeared in the input list.`,
      `3. Clean up "fullName" (capitalize properly, remove emojis or weird trailing markers).`,
      `4. Rewrite the "bio" to be a rich, descriptive professional sentence about what this person does. DO NOT use lazy placeholder bios like "Tech Influencer" or "Fitness Influencer". Use the context in "rawBio" to specify what they teach, make, build, or promote (e.g. if they teach coding, building startups, engineering, fitness training). If the rawBio is short or empty, write a descriptive sentence using their full name and name context.`,
      `5. Double check the "rawBio" text for emails (e.g. "collabs@...", "contact@...") and ensure it is extracted into "email".`,
      `6. Estimate a realistic "engagement" rate percentage (e.g. "3.5%", "2.1%") based on followers count.`,
      `7. Exclude any profile that has less than 2,000 followers.`,
      `8. Keep every profile that survives rules 1, 2, and 7 -- do not arbitrarily truncate the list to a round number, and never invent a profile that was not in the input list.`,
      `9. Return the output strictly as a JSON object of this shape:`,
      `{ "profiles": [ { "username": "...", "fullName": "...", "followers": "...", "engagement": "...", "email": "...", "bio": "...", "link": "..." } ] }`,
      `Respond ONLY with the JSON object. Do not wrap in markdown code blocks or add other text.`
    ].join('\n');

    console.log(`[influencer-finder] Calling Groq to parse results...`);
    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      }
    });

    const content = groqRes.data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // Add scrap metadata & default fallback link checks
    const finalProfiles = (parsed.profiles || []).map(p => ({
      ...p,
      link: p.link && p.link.includes('instagram.com') ? p.link : `https://www.instagram.com/${p.username}/`,
      sector: displaySector,
      location: displayLocation,
      scrapedAt: new Date().toISOString()
    }));

    return res.json({ profiles: finalProfiles });

  } catch (err) {
    const errorDetails = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`[influencer-finder] Scraper failed:`, errorDetails);
    // Graceful fallback to mock data on network/API failure using display sector/location variables
    return res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
  }
});

// Enrich individual influencer profile via RapidAPI Instagram Scraper Stable API
app.post('/api/enrich-influencer', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (!rapidApiKey) {
    return res.status(400).json({ error: 'RapidAPI Key (RAPIDAPI_KEY) is not configured in .env' });
  }

  try {
    console.log(`[influencer-finder] Enriching profile for username: @${username}`);
    const apiRes = await axios.post(`https://instagram-scraper-stable-api.p.rapidapi.com/ig_get_fb_profile.php`, 
      `username_or_url=${username}&data=basic`, 
      {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const d = apiRes.data || {};
    
    if (d.error) {
      return res.status(400).json({ error: d.error });
    }

    // Helper functions
    const formatFollowers = (count) => {
      if (!count) return 'Unknown';
      if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
      if (count >= 1000) return (count / 1000).toFixed(0) + 'K';
      return count.toString();
    };

    const calculateMockEngagement = (followersCount) => {
      if (!followersCount) return '2.5%';
      if (followersCount > 1000000) return '1.8%';
      if (followersCount > 500000) return '2.3%';
      if (followersCount > 100000) return '3.2%';
      return '4.5%';
    };

    const extractEmailFromText = (text) => {
      if (!text) return '';
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const match = text.match(emailRegex);
      return match ? match[0] : '';
    };

    let email = '';
    if (d.email_from_biography && d.email_from_biography.length > 0) {
      email = d.email_from_biography[0];
    } else if (d.public_email) {
      email = d.public_email;
    } else if (d.biography) {
      email = extractEmailFromText(d.biography);
    }

    const count = d.follower_count || d.followers || 0;
    const bioText = d.biography || d.bio || '';

    const enriched = {
      username: d.username || username,
      fullName: d.full_name || '',
      followers: formatFollowers(count),
      engagement: calculateMockEngagement(count),
      email: email,
      bio: bioText,
      link: `https://www.instagram.com/${username}/`
    };

    console.log(`[influencer-finder] Successfully enriched @${username} (Followers: ${enriched.followers}, Email: ${enriched.email || 'None'})`);
    return res.json({ profile: enriched });

  } catch (err) {
    const details = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`[influencer-finder] Enrichment failed for @${username}:`, details);
    return res.status(500).json({ error: 'Failed to enrich profile: ' + details });
  }
});

// Claude API integration to parse client SOW into structured deliverables/goals
const PARSE_GOALS_MODEL = 'claude-3-5-sonnet-latest';
const PARSE_GOALS_SCHEMA = `{
  "category": "Traditional Media" | "Social Media & Thought Leadership" | "Essentials Series" | "Processes" | "Other",
  "deliverable": "Concise name/title of the task/activity, including a named individual if the source ties it to one (e.g. 'Interviews / RBMs', 'Essay / blog writing for Rahul')",
  "targetText": "Exact target frequency/cadence string as it appears or is implied in the source (e.g. '5-6', '1-2 per month', 'Ongoing', 'As and when', '1')",
  "target": number (numeric target derived from targetText: for ranges like '5-6' output 6; for specific monthly numbers like '1' or '2' output that number; for ongoing/yearly/as-and-when tasks, output 1 as default. Never output range strings or non-numeric values here),
  "period": "Monthly" | "Quarterly" | "Ongoing" | "As and when",
  "description": "Rich, specific notes on this activity — the process, who is responsible, named individuals involved, formats, tools/techniques/acronyms mentioned, and any cross-reference to other channels or deliverables it feeds into. DO NOT just repeat the deliverable title."
}`;

const PARSE_GOALS_SYSTEM_PROMPT = `You are an expert PR, marketing, and business operations assistant who specializes in exhaustively parsing client Scope of Work (SOW) documents, retainer agreements, and deliverables lists into structured data — no matter how messy, inconsistently formatted, or unconventional the source is.

The source text you receive may be:
- Raw pasted prose, in full sentences or paragraphs
- Bulleted or numbered lists, possibly nested or inconsistently indented
- A Word document converted to plain text, where headings and formatting cues have been flattened
- An Excel spreadsheet converted to plain text, appearing as "Sheet: <name>" headers followed by rows of values separated by " | " — treat each meaningful data row as a candidate deliverable, using any header row to interpret which column is the deliverable name, frequency, owner, or notes
- A mix of any of the above in the same document, including tables embedded in prose, one-off notes, and deliverables assigned to a specific named person (a client contact, spokesperson, or founder) rather than described generically

YOUR JOB IS EXHAUSTIVE EXTRACTION. Read the entire text at least twice before finalizing your answer:
1. First pass: identify every section, list, table, and paragraph that could describe a deliverable or commitment.
2. Second pass: for each one, decide if it is a distinct, standalone deliverable — including ones phrased unusually, buried mid-paragraph, named after a specific person, or described only once in passing. A deliverable mentioned only once, in a different format than everything else, is exactly as real as one in a clean bulleted list — do not drop it because it "doesn't match the pattern" of the rest of the document.

Hard rules:
- NEVER merge two distinct deliverables into one entry just because they sit in the same bullet, paragraph, or table row — split them into separate goal objects.
- NEVER split one deliverable into two entries just because it's described across two sentences.
- NEVER drop an item because it is vague, ongoing, informally worded, or doesn't cleanly fit a category — classify it into the closest fitting category and extract it. Only use "Other" when a deliverable genuinely fits nowhere else.
- NEVER hallucinate a deliverable that isn't actually described in the text, and never list the same deliverable twice under different names.
- When a deliverable names a specific individual (e.g. "for Rahul", "written by the CEO"), keep that name in the "deliverable" title exactly as written, and explain their role/involvement in "description".
- Category judgment for edge cases: ghostwritten essays, op-eds, blogs, or long-form written content intended for the client's own distribution (LinkedIn, company blog, newsletters) belong in "Social Media & Thought Leadership" even though the deliverable itself is "writing," because the intent is thought-leadership distribution. Internal reporting, review decks, audits, and operational cadences belong in "Processes". Use your best judgment the same way for any other atypical item — reason about the underlying INTENT of the activity, not just its surface format.
- Preserve maximum useful detail in "description" — process steps, who provides direction vs. who executes, specific techniques or acronyms mentioned (e.g. "AEO/GEO optimised", "600-900 words", "voice note direction"), and any note that a deliverable feeds into or supports another channel (e.g. "source for LinkedIn posts").

Each goal/deliverable object in the output array MUST match this exact schema:
${PARSE_GOALS_SCHEMA}

Ensure the output is ONLY a valid JSON array. Do not include any markdown styling like \`\`\`json, conversational intro, trailing text, or code block notation. Respond purely with the stringified JSON array.`;

function buildParseGoalsGroqPrompt(text) {
  return `You are an expert PR and marketing assistant who exhaustively parses unstructured client Scope of Work (SOW) documents into a structured JSON array of client goals. The source may be raw prose, bulleted/numbered lists, or an Excel sheet converted to "Sheet: <name>" + " | "-separated rows.

Extract EVERY distinct deliverable mentioned anywhere in the text, however it's phrased — including ones named after a specific person (e.g. "Essay / blog writing for Rahul"), buried in a paragraph, or described only once in an unusual format. Do not drop anything for being differently formatted than the rest, and do not merge distinct deliverables together. Only use category "Other" as a genuine last resort — use your best judgment for the intent behind atypical items (e.g. ghostwritten essays/blogs for a founder's own distribution are "Social Media & Thought Leadership"; reporting/audits/reviews are "Processes").

Each goal object MUST match this exact schema:
${PARSE_GOALS_SCHEMA}

You must return a JSON object with a "goals" property containing this array of parsed goals.
Shape: { "goals": [ { "category": "...", "deliverable": "...", "targetText": "...", "target": 1, "period": "...", "description": "..." } ] }
Respond ONLY with this JSON object. Do not wrap in markdown or add extra conversational text.

Text to parse:
${text}`;
}

app.post('/api/parse-goals', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Raw text content is required' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  console.log(`[parse-goals] Processing SOW text (${text.length} chars)...`);

  // Helper to handle Groq Llama fallback
  const runGroqFallback = async (reason) => {
    if (!groqKey) {
      throw new Error(`Claude API failed (${reason}) and Groq API key is unconfigured.`);
    }

    console.log(`[parse-goals] Claude API failed or was skipped (${reason}). Falling back to Groq gpt-oss-120b...`);

    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: buildParseGoalsGroqPrompt(text) }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      }
    });

    const content = groqRes.data.choices[0].message.content;
    const parsed = JSON.parse(content);
    if (!parsed.goals || !Array.isArray(parsed.goals)) {
        throw new Error("Groq response did not contain goals array");
    }

    console.log(`[parse-goals] Successfully parsed SOW via Groq fallback into ${parsed.goals.length} goals.`);
    return parsed.goals;
  };

  try {
    if (!apiKey) {
      const fallbackGoals = await runGroqFallback("Claude API key missing");
      return res.json({ goals: fallbackGoals });
    }

    console.log(`[parse-goals] Trying Claude API (Model: ${PARSE_GOALS_MODEL})...`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: PARSE_GOALS_MODEL,
        max_tokens: 10000,
        thinking: { type: 'adaptive' },
        system: PARSE_GOALS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Please exhaustively parse the following scope of work text into every distinct deliverable it describes: \n\n${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[parse-goals] Claude API returned error ${response.status}. Triggering Groq fallback...`);
      const fallbackGoals = await runGroqFallback(`Claude error: ${errorText}`);
      return res.json({ goals: fallbackGoals });
    }

    const result = await response.json();
    // With adaptive thinking on, content[0] may be a "thinking" block rather
    // than the answer — find the actual text block instead of assuming index 0.
    const textBlock = (result.content || []).find(block => block.type === 'text');
    if (!textBlock) {
      throw new Error('Claude response contained no text block');
    }
    const rawText = textBlock.text.trim();

    // Attempt to extract JSON from rawText in case the model returned formatting blocks
    let cleanJsonStr = rawText;
    if (cleanJsonStr.includes('```')) {
      const match = cleanJsonStr.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        cleanJsonStr = match[1].trim();
      }
    }

    // Try parsing to validate it is a true JSON array
    const parsedGoals = JSON.parse(cleanJsonStr);
    if (!Array.isArray(parsedGoals)) {
      throw new Error("Claude did not return a valid array of goals");
    }

    console.log(`[parse-goals] Successfully parsed SOW via Claude into ${parsedGoals.length} goals.`);
    return res.json({ goals: parsedGoals });

  } catch (err) {
    console.warn(`[parse-goals] Claude API encountered exception: ${err.message}. Triggering Groq fallback...`);
    try {
      const fallbackGoals = await runGroqFallback(err.message);
      return res.json({ goals: fallbackGoals });
    } catch (fallbackErr) {
      console.error('[parse-goals] Both Claude and Groq fallback failed:', fallbackErr);
      return res.status(500).json({ error: 'Parsing SOW failed on both Claude and Groq fallback: ' + fallbackErr.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Cerebro local server running on http://localhost:${PORT}`);
  
  // Automated background sync for Gmail Briefings (Runs at 10:30 AM and 12:00 PM IST)
  let lastSyncedDateSlot1 = ''; // YYYY-MM-DD
  let lastSyncedDateSlot2 = ''; // YYYY-MM-DD
  let isSyncing = false;        // Prevent concurrent execution

  const getISTTimeDetails = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const map = new Map(parts.map(p => [p.type, p.value]));
    
    return {
      dateStr: `${map.get('year')}-${map.get('month')}-${map.get('day')}`,
      hour: parseInt(map.get('hour'), 10),
      minute: parseInt(map.get('minute'), 10)
    };
  };

  const checkDailySync = () => {
    if (isSyncing) return;

    try {
      const ist = getISTTimeDetails();
      
      // Slot 1 Window: 10:30 AM IST to 11:59 AM IST
      const isSlot1Window = (ist.hour === 10 && ist.minute >= 30) || (ist.hour === 11);
      
      // Slot 2 Window: 12:00 PM IST onwards (until end of day)
      const isSlot2Window = (ist.hour >= 12);

      if (isSlot1Window && lastSyncedDateSlot1 !== ist.dateStr) {
        lastSyncedDateSlot1 = ist.dateStr;
        triggerSync('10:30 AM', ist.dateStr);
      } else if (isSlot2Window && lastSyncedDateSlot2 !== ist.dateStr) {
        lastSyncedDateSlot2 = ist.dateStr;
        triggerSync('12:00 PM', ist.dateStr);
      }
    } catch (e) {
      console.error('[Auto-Sync] Error in scheduler tick:', e);
    }
  };

  const triggerSync = (slotLabel, dateStr) => {
    isSyncing = true;
    console.log(`[Auto-Sync ${slotLabel}] Triggering recent Gmail briefing ingestion for ${dateStr}...`);
    import('child_process').then(({ exec }) => {
      exec('node server/parse_gmail_briefings.js', (err, stdout, stderr) => {
        isSyncing = false;
        if (err) {
          console.error(`[Auto-Sync] Briefing sync error for slot ${slotLabel}:`, err.message);
        } else {
          console.log(`[Auto-Sync ${slotLabel}] Recent Gmail news briefings successfully synced for ${dateStr}.`);
        }
      });
    }).catch(err => {
      isSyncing = false;
      console.error('[Auto-Sync] Child process import error:', err);
    });
  };

  // Check schedule every 30 seconds to prevent missing the time window due to lags
  setInterval(checkDailySync, 30 * 1000);
  console.log('[Auto-Sync Scheduler] Registered robust IST 10:30 AM and 12:00 PM briefing sync timer.');
});


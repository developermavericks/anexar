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

// Enable CORS for frontend requests
app.use(cors({
  origin: ['http://localhost:4000', 'http://127.0.0.1:4000', 'http://localhost:5173']
}));

app.use(express.json());

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
  updateJobStatus(jobId, 'scraping', 10, 'Checking connection & normalizing target URL...');

  try {
    // 1. Fetch raw HTML (from live URL or local file path)
    let rawHtml = '';
    let mode = 'DIRECT';
    const scraperApiKey = process.env.SCRAPER_API_KEY || '4663b0263257ba5337353aeb6fe289cc';

    if (url.startsWith('http://') || url.startsWith('https://')) {
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
        if (sessionCookiesStr) {
          await page.setJavaScriptEnabled(true);
          await page.setExtraHTTPHeaders({
            'Referer': 'https://www.google.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          });
        } else {
          await page.setJavaScriptEnabled(false);
          await page.setExtraHTTPHeaders({
            'Referer': 'https://www.google.com/',
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
          });
        }

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });

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

// POST Endpoint for Article scraping and PDF generation (Supports synchronous fallback or async streaming jobs)
app.post('/api/generate-article-pdf', async (req, res) => {
  const { url: rawInputUrl, stream } = req.body;

  if (!rawInputUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (stream) {
    const jobId = 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const job = {
      id: jobId,
      url: rawInputUrl,
      status: 'pending',
      progress: 0,
      stepLabel: 'Initializing job and normalizing URL...',
      pdfBuffer: null,
      error: null,
      clients: []
    };
    jobs.set(jobId, job);
    
    // Begin async rendering worker
    generatePdfForJob(jobId, rawInputUrl);

    return res.json({ jobId });
  }

  // Synchronous backward-compatible fallback flow
  const jobId = 'sync-job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const job = {
    id: jobId,
    url: rawInputUrl,
    status: 'pending',
    progress: 0,
    stepLabel: 'Initializing job...',
    pdfBuffer: null,
    error: null,
    clients: []
  };
  jobs.set(jobId, job);

  try {
    await generatePdfForJob(jobId, rawInputUrl);
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

app.listen(PORT, () => {
  console.log(`Cerebro local server running on http://localhost:${PORT}`);
});

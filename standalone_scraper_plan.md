# Standalone Editorial Scraper & PDF Generator Blueprint

This document contains the complete project structure, source code, and configuration scripts required to build and deploy a standalone Article Scraper and PDF Generator web application.

---

## 1. Project Folder Structure

Create a new directory named `editorial-scraper` on your desktop, and structure it as follows:

```
editorial-scraper/
├── backend/
│   ├── package.json
│   └── index.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

---

## 2. Backend Code (Express Node.js Server)

The backend is configured to run on port `3000`. It features:
* **Strategy 1 (Disable JS):** Disables JS in headless Puppeteer to bypass client-side paywall checkers.
* **Strategy 2 (Mozilla Readability):** Uses heuristics to extract clean article text automatically.
* **First-Click-Free Spoofing:** Configures request headers to pretend the bot is coming from a Google Search referral.
* **Automated Google Web Cache Fallback:** Automatically fetches the article from Google Web Cache if a paywall or blocker is detected.
* **Wayback Machine / Archive Fallback:** Queries the internet archives if Google Web Cache fails to load.

### `backend/package.json`
```json
{
  "name": "scraper-backend",
  "version": "1.0.0",
  "description": "Express Puppeteer Scraper API",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@mozilla/readability": "^0.6.0",
    "axios": "^1.7.9",
    "cors": "^2.8.5",
    "express": "^4.21.1",
    "jsdom": "^25.0.1",
    "puppeteer": "^23.11.1"
  }
}
```

### `backend/index.js`
```javascript
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { JSDOM, VirtualConsole } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// List of words that indicate a paywall or incomplete fetch
const PAYWALL_KEYWORDS = [
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
  'become an et prime member',
  'etprime membership',
  'read the full story',
  'gift a story',
  'flat 35% off',
  'subscribers love us',
  'unlock this article',
  'subscription plan'
];

// Helper to determine if content contains paywall elements
function isPaywalled(text, wordCount) {
  const cleanText = (text || '').toLowerCase();
  return wordCount < 80 || PAYWALL_KEYWORDS.some(kw => cleanText.includes(kw));
}

// Scrape HTML using Headless Puppeteer with JS Disabled and Referrer Spoofing
async function scrapeDirect(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    const page = await browser.newPage();

    // Spoof Referrer (First Click Free bypass) & Googlebot User-Agent
    await page.setExtraHTTPHeaders({
      'Referer': 'https://www.google.com/',
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    });

    // Strategy 1: Disable JavaScript
    await page.setJavaScriptEnabled(false);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const content = await page.content();
    return content;
  } finally {
    if (browser) await browser.close();
  }
}

// Scrape HTML from Google Web Cache
async function scrapeGoogleCache(url) {
  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
  console.log('Attempting Google Web Cache extraction:', cacheUrl);

  const response = await axios.get(cacheUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.google.com/'
    },
    timeout: 10000
  });
  return response.data;
}

// Scrape HTML from Wayback Machine Archive
async function scrapeWaybackArchive(url) {
  console.log('Attempting Wayback Machine API check...');
  const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  
  const apiRes = await axios.get(apiUrl, { timeout: 8000 });
  const snapshot = apiRes.data?.archived_snapshots?.closest;
  
  if (snapshot && snapshot.available && snapshot.url) {
    console.log('Found archive snapshot:', snapshot.url);
    const pageRes = await axios.get(snapshot.url, { timeout: 12000 });
    return pageRes.data;
  }
  throw new Error('No archived snapshot available.');
}

// CORE PDF GENERATION ENDPOINT
app.post('/api/generate-article-pdf', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let rawHtml = '';
  let mode = 'DIRECT';

  try {
    // Stage 1: Try Direct Scrape (JS Disabled + Referrer Spoof)
    rawHtml = await scrapeDirect(url);
    
    // Parse using JSDOM & Readability to evaluate if direct scrape got paywalled
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => {});
    let dom = new JSDOM(rawHtml, { url, virtualConsole });
    let reader = new Readability(dom.window.document);
    let article = reader.parse();
    let text = article ? article.textContent : '';
    let words = text.split(/\s+/).filter(Boolean).length;

    // Stage 2: If direct scrape is paywalled, fallback to Google Web Cache
    if (isPaywalled(text, words)) {
      try {
        rawHtml = await scrapeGoogleCache(url);
        dom = new JSDOM(rawHtml, { url, virtualConsole });
        reader = new Readability(dom.window.document);
        article = reader.parse();
        text = article ? article.textContent : '';
        words = text.split(/\s+/).filter(Boolean).length;
        mode = 'GOOGLE_CACHE';
      } catch (cacheErr) {
        console.warn('Google Web Cache failed, trying Wayback Archive:', cacheErr.message);
      }
    }

    // Stage 3: If still paywalled, fallback to Wayback Archive
    if (isPaywalled(text, words)) {
      try {
        rawHtml = await scrapeWaybackArchive(url);
        dom = new JSDOM(rawHtml, { url, virtualConsole });
        reader = new Readability(dom.window.document);
        article = reader.parse();
        text = article ? article.textContent : '';
        words = text.split(/\s+/).filter(Boolean).length;
        mode = 'WAYBACK_ARCHIVE';
      } catch (archiveErr) {
        console.error('All scraper fallbacks exhausted:', archiveErr.message);
      }
    }

    // Return error if all stages failed to bypass the paywall
    if (isPaywalled(text, words)) {
      return res.status(403).json({
        error: 'Paywall detected. The page is blocking automated readers and no cached copies were found.'
      });
    }

    console.log(`Successfully scraped article via [${mode}]. Generating PDF template...`);

    // 4. Intelligently extract Category Tag
    const doc = dom.window.document;
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
          category = domainName.toUpperCase();
        } catch (e) {
          category = 'NEWS';
        }
      }
    }

    // 5. Extract Publish Date
    let publishedDate = '';
    const dateMeta = doc.querySelector('meta[property="article:published_time"]') || 
                     doc.querySelector('meta[name="publish-date"]') || 
                     doc.querySelector('time');
    if (dateMeta) {
      publishedDate = dateMeta.getAttribute('content') || dateMeta.getAttribute('datetime') || dateMeta.textContent;
    }
    if (publishedDate) {
      try {
        const parsedDate = new Date(publishedDate);
        if (!isNaN(parsedDate.getTime())) {
          publishedDate = parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      } catch (e) {}
    } else {
      publishedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // 6. Extract Featured Image
    let featuredImage = '';
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      featuredImage = ogImage.getAttribute('content');
    }

    // 7. Extract Key Takeaways
    let takeaways = [];
    const bulletElements = doc.querySelectorAll('.key-takeaways li, .story-summary li, .article-summary li');
    bulletElements.forEach(li => takeaways.push(li.innerHTML));
    
    if (takeaways.length === 0) {
      const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 25 && s.trim().length < 150);
      for (let i = 0; i < Math.min(3, sentences.length); i++) {
        const wordsList = sentences[i].trim().split(' ');
        const boldCount = Math.min(3, wordsList.length);
        takeaways.push(`<strong>${wordsList.slice(0, boldCount).join(' ')}</strong> ${wordsList.slice(boldCount).join(' ')}.`);
      }
    }

    // Select dynamic color accent
    let themeAccent = '#dca53c'; // Gold for Travel/Tech
    const combinedText = (category + ' ' + article.title).toLowerCase();
    if (combinedText.match(/merger|acquisition|corporate|regulatory|policy|law|financial|court/)) {
      themeAccent = '#b91c1c'; // Crimson for regulation
    }

    // Clean html content
    let cleanContent = article.content.replace(/<h1[^>]*>.*?<\/h1>/gi, '');

    // Editorial Styled HTML Template (A4 format)
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

          .pdf-container { max-width: 100%; margin: 0 auto; }
          header { border-bottom: 2px double var(--border-color); padding-bottom: 1.5rem; margin-bottom: 2rem; text-align: center; }
          .meta-category { font-family: var(--font-sans); font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--accent); margin-bottom: 0.8rem; display: inline-block; }
          h1 { font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; line-height: 1.25; margin: 0 0 1rem 0; color: #111; }
          .meta-byline { font-family: var(--font-sans); font-size: 0.85rem; color: var(--text-secondary); }
          .meta-byline span { color: var(--text-primary); font-weight: 600; }
          
          .featured-image-container { margin-bottom: 2rem; page-break-inside: avoid; }
          .featured-image { width: 100%; height: auto; border-radius: 6px; display: block; }

          .highlights-card { background-color: var(--card-bg); border-top: 3px solid var(--accent); padding: 1.5rem; margin-bottom: 2rem; border-radius: 4px; font-family: var(--font-sans); page-break-inside: avoid; }
          .highlights-card h3 { margin-top: 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-primary); font-weight: 700; margin-bottom: 0.8rem; }
          .highlights-card ul { padding-left: 1.2rem; margin: 0; }
          .highlights-card li { margin-bottom: 0.6rem; font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary); }
          .highlights-card li strong { color: var(--text-primary); }

          .article-body p { margin-bottom: 1.2rem; }
          .article-body p:first-of-type::first-letter { font-family: var(--font-display); font-size: 4rem; float: left; line-height: 0.8; margin-right: 0.5rem; margin-top: 0.15rem; font-weight: 800; color: var(--accent); }
          .article-body a { color: #0284c7; text-decoration: none; border-bottom: 1px solid rgba(2, 132, 199, 0.15); }
          blockquote { border-left: 3px solid var(--accent); padding-left: 1.2rem; margin: 1.5rem 0; font-style: italic; color: var(--text-primary); page-break-inside: avoid; }
          img { max-width: 100%; height: auto; border-radius: 4px; margin: 1.5rem 0; page-break-inside: avoid; }
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
            <img class="featured-image" src="${featuredImage}" alt="Featured">
          </div>` : ''}
          ${takeaways.length > 0 ? `
          <div class="highlights-card">
            <h3>Key Takeaways</h3>
            <ul>${takeaways.map(pt => `<li>${pt}</li>`).join('')}</ul>
          </div>` : ''}
          <div class="article-body">${cleanContent}</div>
        </div>
      </body>
      </html>
    `;

    // Spin up Puppeteer PDF print job
    const pdfBrowser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const pdfPage = await pdfBrowser.newPage();
    await pdfPage.setViewport({ width: 794, height: 1123 });
    await pdfPage.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

    const pdfBuffer = await pdfPage.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '60px', bottom: '60px', left: '50px', right: '50px' }
    });

    await pdfBrowser.close();

    // Stream binary PDF back
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="article-${Date.now()}.pdf"`);
    res.end(pdfBuffer, 'binary');

  } catch (error) {
    console.error('Scraping Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process URL or compile PDF.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

---

## 3. Frontend Code (Vite React Web App)

The frontend is built using standard React with Vanilla CSS.

### `frontend/package.json`
```json
{
  "name": "scraper-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "lucide-react": "^0.300.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.10"
  }
}
```

### `frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000
  }
})
```

### `frontend/index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Editorial Scraper Portal</title>
  </head>
  <body style="margin: 0; background-color: #0b0f19;">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `frontend/src/main.jsx`
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### `frontend/src/App.jsx`
```javascript
import React from 'react';
import ScraperPortal from './pages/ScraperPortal.jsx';

export default function App() {
  return <ScraperPortal />;
}
```

### `frontend/src/index.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #f8fafc;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.animate-fade-in {
  animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-scale-in {
  animation: scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### `frontend/src/pages/ScraperPortal.jsx`
```javascript
import React, { useState } from 'react';
import { FileDown, Link2, AlertCircle, Loader2, Sparkles, X } from 'lucide-react';

export default function ScraperPortal() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [statusStep, setStatusStep] = useState(0);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api/generate-article-pdf';

  const steps = [
    "Checking direct paywall bypass rules...",
    "Crawling Google Web Cache archives...",
    "Querying Wayback snapshot databases...",
    "Parsing article text using Mozilla Readability...",
    "Compiling layout & printing print-ready PDF..."
  ];

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url.startsWith('http')) {
      setError('Please enter a valid article URL (starting with http/https).');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setStatusStep(0);

    // Step animation ticker
    const interval = setInterval(() => {
      setStatusStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 3000);

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `editorial-article-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Scraper failed to bypass paywall.');
      setShowErrorModal(true);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1e293b, #0f172a, #020617)',
      padding: '3rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '540px',
        backgroundColor: 'rgba(30, 41, 59, 0.45)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '2rem',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }} className="animate-fade-in">
        
        <div style={{
          display: 'inline-flex',
          padding: '1rem',
          borderRadius: '1.25rem',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(220, 38, 38, 0.15))',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={32} color="#f59e0b" />
        </div>

        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
          Editorial PDF Portal
        </h1>
        <p style={{ margin: '0 0 2rem 0', fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
          Enter a web article URL to automatically bypass paywalls using Google Cache / Archive fallbacks and download a print-ready A4 PDF.
        </p>

        <form onSubmit={handleScrape} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Link2 size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Paste article URL (e.g. bloomberg.com/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '1rem 1rem 1rem 2.8rem',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !url}
            style={{
              padding: '1rem',
              borderRadius: '1rem',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'transform 0.2s',
              opacity: (loading || !url) ? 0.6 : 1
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <FileDown size={18} />
                <span>Fetch & Generate PDF</span>
              </>
            )}
          </button>
        </form>

        {loading && (
          <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Pipeline Progress
            </span>
            <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{steps[statusStep]}</span>
          </div>
        )}
      </div>

      {/* Error Alert Modal */}
      {showErrorModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: 'rgba(2, 6, 23, 0.7)',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '400px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
          }} className="animate-scale-in">
            <button onClick={() => setShowErrorModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', marginBottom: '1rem' }}>
              <AlertCircle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Scraping Interrupted</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
              {error}
            </p>
            <button onClick={() => setShowErrorModal(false)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Dismiss Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. How to Deploy (Vercel & Render)

### Step 1: Initialize Git Repository
In your root folder:
```bash
git init
git add .
git commit -m "Initial commit"
```
Publish this repository to a private Github repository.

### Step 2: Deploy Backend to Render.com
1. Go to [Render.com](https://render.com) and create a **Web Service**.
2. Connect your Github repository.
3. Configure settings:
   * **Root Directory:** `backend`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
4. Copy the generated Web Service URL (e.g. `https://scraper-backend.onrender.com`).

### Step 3: Deploy Frontend to Vercel
1. Go to [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Connect your Github repository.
3. Configure settings:
   * **Root Directory:** `frontend`
   * **Framework Preset:** `Vite`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
4. Add an **Environment Variable** under settings:
   * **Key:** `VITE_BACKEND_URL`
   * **Value:** `https://scraper-backend.onrender.com/api/generate-article-pdf` *(your Render backend URL)*
5. Click **Deploy**.

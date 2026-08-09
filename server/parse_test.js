const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const html = fs.readFileSync(path.join(__dirname, 'test_page.html'), 'utf-8');
const dom = new JSDOM(html, { url: 'https://the-ken.com' });
const doc = dom.window.document;

// Preprocess as in server
// remove ads, comments, scripts, etc.
const removeSelectors = [
  'script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav',
  'aside', '.ads', '.advertisement', '.sidebar', '.comments',
  '.social-share', '.related-posts', '.author-bio', '.newsletter-signup',
  '.promo-banner', '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]'
];
removeSelectors.forEach(sel => {
  doc.querySelectorAll(sel).forEach(el => el.remove());
});

const reader = new Readability(doc);
const article = reader.parse();

if (article) {
  console.log('Parsed Title:', article.title);
  console.log('Parsed SiteName:', article.siteName);
  console.log('Word Count:', article.textContent.trim().split(/\s+/).filter(Boolean).length);
  console.log('Excerpt (150 chars):', article.excerpt);
  console.log('First 500 chars of body:', article.textContent.trim().substring(0, 500));
} else {
  console.log('Failed to parse article');
}

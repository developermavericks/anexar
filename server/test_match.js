const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const html = fs.readFileSync(path.join(__dirname, 'test_page.html'), 'utf-8');
const dom = new JSDOM(html, { url: 'https://the-ken.com' });
const doc = dom.window.document;

// Preprocess
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

if (article) {
  const textContent = (article.textContent || '').trim().toLowerCase();
  paywallKeywords.forEach(kw => {
    if (textContent.includes(kw)) {
      console.log('MATCHED KEYWORD:', kw);
    }
  });
} else {
  console.log('Could not parse article');
}

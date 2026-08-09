const fs = require('fs');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const filepath = "C:/Users/DEll/Downloads/Tata 1mg refused to get carried away in the e-pharmacy battle. It’s in no mood to change its mind - The Ken.html";

try {
  const html = fs.readFileSync(filepath, 'utf-8');
  const dom = new JSDOM(html, { url: 'https://the-ken.com' });
  const doc = dom.window.document;

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
    const textContent = article.textContent.trim();
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    console.log('Word Count in Saved HTML:', wordCount);
    console.log('First 500 chars of body:', textContent.substring(0, 500));
    console.log('Last 500 chars of body:', textContent.substring(textContent.length - 500));
  } else {
    console.log('Failed to parse saved HTML');
  }
} catch (err) {
  console.error('Error reading/parsing file:', err.message);
}

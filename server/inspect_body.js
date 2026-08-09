const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const html = fs.readFileSync(path.join(__dirname, 'test_page.html'), 'utf-8');
const dom = new JSDOM(html, { url: 'https://the-ken.com' });
const doc = dom.window.document;

// Log what raw paragraphs are present in the DOM before readability strips them
const pElements = doc.querySelectorAll('.article-body p, .story-content p, p');
console.log('Total <p> elements in page:', pElements.length);

// Print first 5 paragraphs
Array.from(pElements).slice(0, 10).forEach((p, idx) => {
  console.log(`Paragraph ${idx + 1}:`, p.textContent.trim().substring(0, 150));
});

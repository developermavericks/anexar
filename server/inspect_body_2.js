const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'test_page.html'), 'utf-8');
const dom = new JSDOM(html, { url: 'https://the-ken.com' });
const doc = dom.window.document;

// The Ken article body typically resides inside the article wrapper, let's find it.
// Let's print out all divs that contain a lot of paragraphs or have class names like 'story', 'article', 'content'
const divs = doc.querySelectorAll('div, section, article');
console.log('Searching content wrappers...');
Array.from(divs).forEach(el => {
  const pCount = el.querySelectorAll('p').length;
  const classes = el.className || '';
  const id = el.id || '';
  if (pCount > 5 && (classes.includes('story') || classes.includes('article') || classes.includes('content') || id.includes('story') || id.includes('content'))) {
    console.log(`Wrapper: <${el.tagName}> ID: "${id}" Class: "${classes}" (Contains ${pCount} paragraphs)`);
  }
});

// Let's print paragraphs under the main story content container.
// On The Ken, the article body is usually inside '.story-content-wrapper' or '.content-wrapper' or similar
const storyContent = doc.querySelector('.story-content-wrapper, .story-content, .article-content, .entry-content');
if (storyContent) {
  console.log('\n--- Found Story Content Wrapper ---');
  const storyPs = storyContent.querySelectorAll('p');
  console.log(`Total paragraphs in story content wrapper: ${storyPs.length}`);
  Array.from(storyPs).forEach((p, idx) => {
    console.log(`Story Paragraph ${idx + 1}:`, p.textContent.trim().substring(0, 150));
  });
} else {
  console.log('\nNo standard story content wrapper found. Printing all paragraphs containing "Tata 1mg":');
  const allPs = doc.querySelectorAll('p');
  let matched = 0;
  Array.from(allPs).forEach((p) => {
    const text = p.textContent.trim();
    if (text.includes('Tata 1mg') || text.includes('e-pharmacy')) {
      matched++;
      console.log(`Matched Paragraph ${matched}:`, text.substring(0, 150));
    }
  });
}

import fs from 'fs';
import * as cheerio from 'cheerio';

async function parseClickHtml() {
  try {
    const html = fs.readFileSync('zdrive_after_click.html', 'utf8');
    const $ = cheerio.load(html);
    console.log('--- Buttons & Anchors in Page ---');
    $('button, a').each((i, el) => {
      const tag = $(el).prop('tagName');
      const id = $(el).attr('id') || '';
      const cls = $(el).attr('class') || '';
      const txt = $(el).text().trim().replace(/\s+/g, ' ');
      const href = $(el).attr('href') || '';
      if (txt || href || id) {
        console.log(`[${tag}] ID: "${id}" | Text: "${txt}" | Href: "${href}"`);
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

parseClickHtml();

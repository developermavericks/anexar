const fs = require('fs');
const cheerio = require('cheerio');

function parseClickHtml() {
  try {
    const html = fs.readFileSync('../server/zdrive_after_click2.html', 'utf8');
    const $ = cheerio.load(html);
    
    console.log('--- Search for word "download" ---');
    $('*').each((i, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes('download') && $(el).children().length === 0) {
        console.log('Tag:', $(el).prop('tagName'));
        console.log('Outer HTML:', $.html(el));
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

parseClickHtml();



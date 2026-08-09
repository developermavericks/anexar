const axios = require('axios');
const { JSDOM } = require('jsdom');
const Readability = require('@mozilla/readability').Readability;

const waybackUrl = 'http://web.archive.org/web/20260728090527/https://economictimes.indiatimes.com/tech/technology/unacademy-investors-to-get-upgrad-board-seat-as-rs-1955-crore-merger-nears-close/articleshow/132678586.cms';

async function run() {
    try {
        console.log('Fetching Wayback snapshot page...');
        const res = await axios.get(waybackUrl, { timeout: 15000 });
        const dom = new JSDOM(res.data);
        
        // Clean up Wayback banner elements
        const wmBanner = dom.window.document.getElementById('wm-ipp-base');
        if (wmBanner) wmBanner.remove();
        
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article) {
            console.log('--- WAYBACK PARSER RESULTS ---');
            console.log('Title:', article.title);
            console.log('Words:', article.textContent.split(/\s+/).filter(Boolean).length);
            console.log('Snippet:\n', article.textContent.slice(0, 1000));
        } else {
            console.log('Failed to parse text.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();

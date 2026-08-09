const axios = require('axios');
const { JSDOM } = require('jsdom');
const Readability = require('@mozilla/readability').Readability;

const apiKey = '4663b0263257ba5337353aeb6fe289cc';
const url = 'https://m.economictimes.com/tech/technology/unacademy-investors-to-get-upgrad-board-seat-as-rs-1955-crore-merger-nears-close/amp_articleshow/132678586.cms';

async function run() {
    try {
        console.log('Fetching via ScraperAPI (No JS)...');
        const res = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: url }
        });
        const dom = new JSDOM(res.data);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article) {
            console.log('--- READABILITY SUCCESS ---');
            console.log('Title:', article.title);
            console.log('Word count:', article.textContent.split(/\s+/).filter(Boolean).length);
            console.log('Snippet:', article.textContent.slice(0, 500));
        } else {
            console.log('Readability failed to parse.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();

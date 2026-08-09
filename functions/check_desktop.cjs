const axios = require('axios');
const { JSDOM } = require('jsdom');
const Readability = require('@mozilla/readability').Readability;

const apiKey = '4663b0263257ba5337353aeb6fe289cc';
// Normalizing URL to Desktop version:
const url = 'https://economictimes.indiatimes.com/tech/technology/unacademy-investors-to-get-upgrad-board-seat-as-rs-1955-crore-merger-nears-close/articleshow/132678586.cms';

async function run() {
    try {
        console.log('Fetching Desktop URL via ScraperAPI (No JS)...');
        const resDirect = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: url }
        });
        const domDirect = new JSDOM(resDirect.data);
        const readerDirect = new Readability(domDirect.window.document);
        const articleDirect = readerDirect.parse();
        console.log('--- DIRECT DESKTOP RESULTS ---');
        console.log('Words:', articleDirect ? articleDirect.textContent.split(/\s+/).filter(Boolean).length : 0);

        console.log('\nFetching Desktop Google Cache via ScraperAPI...');
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const resCache = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: cacheUrl }
        });
        const domCache = new JSDOM(resCache.data);
        const readerCache = new Readability(domCache.window.document);
        const articleCache = readerCache.parse();
        console.log('--- GOOGLE CACHE DESKTOP RESULTS ---');
        if (articleCache) {
            console.log('Title:', articleCache.title);
            console.log('Words:', articleCache.textContent.split(/\s+/).filter(Boolean).length);
            console.log('Snippet:', articleCache.textContent.slice(0, 800));
        } else {
            console.log('Failed to parse Google Cache.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();

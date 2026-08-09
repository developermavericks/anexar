const axios = require('axios');
const { JSDOM } = require('jsdom');
const Readability = require('@mozilla/readability').Readability;

const apiKey = '4663b0263257ba5337353aeb6fe289cc';
const url = 'https://www.thehindu.com/opinion/lead/lessons-from-the-fcra-bill-expansion/article68291039.ece';

async function run() {
    try {
        console.log('1. Trying Direct Fetch via ScraperAPI...');
        const resDirect = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: url }
        });
        let dom = new JSDOM(resDirect.data);
        let reader = new Readability(dom.window.document);
        let article = reader.parse();
        let words = article ? article.textContent.split(/\s+/).filter(Boolean).length : 0;
        console.log('Direct words:', words);

        console.log('2. Trying Google Cache via ScraperAPI...');
        const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const resCache = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: cacheUrl }
        });
        dom = new JSDOM(resCache.data);
        reader = new Readability(dom.window.document);
        article = reader.parse();
        words = article ? article.textContent.split(/\s+/).filter(Boolean).length : 0;
        console.log('Google Cache words:', words);
        if (article) {
            console.log('Snippet:', article.textContent.slice(0, 400));
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();

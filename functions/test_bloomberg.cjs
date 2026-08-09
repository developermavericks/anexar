const axios = require('axios');
const { JSDOM } = require('jsdom');
const Readability = require('@mozilla/readability').Readability;

const apiKey = '4663b0263257ba5337353aeb6fe289cc';
const url = 'https://www.bloomberg.com/news/articles/2024-07-31/intel-is-said-to-plan-thousands-of-job-cuts-to-reduce-costs';

async function run() {
    try {
        console.log('1. Trying Direct Fetch via ScraperAPI...');
        const res = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: url }
        });
        const dom = new JSDOM(res.data);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        const words = article ? article.textContent.split(/\s+/).filter(Boolean).length : 0;
        console.log('Words fetched:', words);
        if (article) {
            console.log('Title:', article.title);
            console.log('Snippet:', article.textContent.slice(0, 500));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();

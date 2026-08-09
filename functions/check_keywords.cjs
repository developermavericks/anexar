const axios = require('axios');
const { JSDOM } = require('jsdom');
const Readability = require('@mozilla/readability').Readability;

const apiKey = '4663b0263257ba5337353aeb6fe289cc';
const url = 'https://m.economictimes.com/tech/technology/unacademy-investors-to-get-upgrad-board-seat-as-rs-1955-crore-merger-nears-close/amp_articleshow/132678586.cms';

const paywallKeywords = [
    'subscribe to read',
    'read the full article',
    'sign in to continue',
    'please log in',
    'exclusive content for subscribers',
    'create an account to read',
    'membership required',
    'subscribers only',
    'purchase a subscription',
    'join now to read',
    'sign up to read',
    'become an et prime member',
    'etprime membership',
    'read the full story',
    'read full story',
    'become a member',
    'gift a story',
    'flat 35% off',
    'subscribers love us',
    'unlock this article',
    'subscription plan',
    'reached your free article limit',
    'subscribe to et',
    'member-only story',
    'premium story',
    'read the full news',
    'register to read'
];

async function run() {
    try {
        const res = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: url }
        });
        const dom = new JSDOM(res.data);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article) {
            const text = article.textContent.toLowerCase();
            console.log('--- Checking Keywords ---');
            for (const kw of paywallKeywords) {
                if (text.includes(kw)) {
                    console.log('TRIGGERED KEYWORD MATCH:', kw);
                }
            }
            console.log('Full content length:', text.length);
        }
    } catch (e) {
        console.error(e.message);
    }
}

run();

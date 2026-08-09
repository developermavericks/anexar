const axios = require('axios');
const apiKey = '4663b0263257ba5337353aeb6fe289cc';
const url = 'https://economictimes.indiatimes.com/tech/technology/unacademy-investors-to-get-upgrad-board-seat-as-rs-1955-crore-merger-nears-close/articleshow/132678586.cms';
const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;

async function run() {
    try {
        console.log('Sending request...');
        const res = await axios.get('http://api.scraperapi.com', {
            params: { api_key: apiKey, url: cacheUrl }
        });
        console.log('Status code:', res.status);
        console.log('Data length:', res.data ? res.data.length : 0);
        console.log('Snippet:', res.data ? res.data.slice(0, 800) : 'None');
    } catch (e) {
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data length:', e.response.data ? e.response.data.length : 0);
            console.error('Data snippet:', e.response.data ? e.response.data.slice(0, 800) : 'None');
        } else {
            console.error('Error:', e.message);
        }
    }
}
run();

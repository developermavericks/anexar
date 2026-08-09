const axios = require('axios');
const url = 'https://www.bloomberg.com/news/articles/2024-07-31/intel-is-said-to-plan-thousands-of-job-cuts-to-reduce-costs';
const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;

async function run() {
    try {
        const res = await axios.get(apiUrl);
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}
run();

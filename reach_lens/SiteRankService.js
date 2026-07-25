const axios = require('axios');
const readline = require('readline');
const domainRankings = new Map();
let isLoaded = false;

async function initRankings() {
    try {
        console.log('[SiteRank] Downloading and parsing global rankings list...');
        const response = await axios({
            method: 'get',
            url: 'https://downloads.majestic.com/majestic_million.csv',
            responseType: 'stream',
            timeout: 25000
        });
        const rl = readline.createInterface({
            input: response.data,
            crlfDelay: Infinity
        });
        let lineIndex = 0;
        for await (const line of rl) {
            lineIndex++;
            if (lineIndex === 1) continue; // Skip CSV header row
            const parts = line.split(',');
            if (parts.length >= 3) {
                const rank = parseInt(parts[0], 10);
                const domain = parts[2].toLowerCase().trim();
                domainRankings.set(domain, rank);
            }
        }
        
        isLoaded = true;
        console.log(`[SiteRank] Loaded ${domainRankings.size} domain rankings.`);
    } catch (err) {
        console.error('[SiteRank] Failed to load domain rankings:', err.message);
    }
}

function getRank(domain) {
    if (!isLoaded || !domain) return null;
    const cleanDomain = domain.toLowerCase().replace('www.', '').trim();
    return domainRankings.get(cleanDomain) || null;
}

module.exports = { initRankings, getRank };

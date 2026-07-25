const axios = require('axios');
const API_KEY = process.env.OPENPAGERANK_API_KEY || 'kgok0kswgwc4sk0g8gkcwo0w8ksogswkc8ckoco4';
const CACHE_TTL_DAYS = 30;

// In-memory replacement for the domain_authority_cache DB table (same 30-day TTL)
const domainRankCache = new Map();

function cleanDomainName(domain) {
    if (typeof domain !== 'string') return '';
    return domain.toLowerCase().replace('www.', '').trim();
}

async function getDomainRanks(domains) {
    const results = new Map();
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return results;
    }
    const cleanDomains = [...new Set(domains.map(cleanDomainName).filter(Boolean))];
    if (cleanDomains.length === 0) {
        return results;
    }

    const cachedMap = new Map();
    const now = new Date();
    for (const domain of cleanDomains) {
        const cached = domainRankCache.get(domain);
        if (cached) {
            const ageInDays = (now - cached.updatedAt) / (1000 * 3600 * 24);
            if (ageInDays < CACHE_TTL_DAYS) {
                cachedMap.set(domain, cached.pageRankDecimal);
            }
        }
    }

    const misses = cleanDomains.filter(d => !cachedMap.has(d));
    for (const d of cleanDomains) {
        if (cachedMap.has(d)) {
            results.set(d, cachedMap.get(d));
        }
    }

    if (misses.length === 0) {
        return results;
    }

    if (!API_KEY) {
        console.warn('[OpenPageRank] Warning: API KEY not configured. Falling back.');
        for (const d of misses) {
            results.set(d, 0.0);
        }
        return results;
    }

    const batchSize = 100;
    for (let i = 0; i < misses.length; i += batchSize) {
        const batch = misses.slice(i, i + batchSize);
        try {
            const queryParams = batch.map(d => `domains[]=${encodeURIComponent(d)}`).join('&');
            const apiUrl = `https://openpagerank.com/api/v1.0/getPageRank?${queryParams}`;
            const apiResponse = await axios.get(apiUrl, {
                headers: { 'API-OPR': API_KEY },
                timeout: 10000
            });
            if (apiResponse.data && apiResponse.data.status_code === 200 && Array.isArray(apiResponse.data.response)) {
                for (const item of apiResponse.data.response) {
                    const domain = cleanDomainName(item.domain);
                    const decimalScore = parseFloat(item.page_rank_decimal) || 0.0;
                    const integerScore = parseInt(item.page_rank_integer, 10) || 0;
                    const rankValue = item.rank ? parseInt(item.rank, 10) : null;
                    results.set(domain, decimalScore);

                    domainRankCache.set(domain, {
                        pageRankDecimal: decimalScore,
                        pageRankInteger: integerScore,
                        rank: rankValue,
                        updatedAt: new Date()
                    });
                }
            } else {
                for (const d of batch) results.set(d, 0.0);
            }
        } catch (apiErr) {
            console.error('[OpenPageRank] API lookup error:', apiErr.message);
            for (const d of batch) results.set(d, 0.0);
        }
    }
    return results;
}

async function getDomainRank(domain) {
    if (!domain) return 0.0;
    const cleanD = cleanDomainName(domain);
    const ranks = await getDomainRanks([cleanD]);
    return ranks.get(cleanD) || 0.0;
}

module.exports = { getDomainRanks, getDomainRank };

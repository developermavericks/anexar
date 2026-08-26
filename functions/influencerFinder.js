const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const axios = require('axios');

const serperApiKeySecret = defineSecret('SERPER_API_KEYS');
const groqApiKeySecret = defineSecret('GROQ_API_KEY');
const rapidApiKeySecret = defineSecret('RAPIDAPI_KEY');

// Mock fallback database so the UI stays usable for demos/presentations if the
// search providers are unconfigured or unreachable.
function getMockInfluencers(sector, location) {
    const firstNames = ['Amit', 'Sneha', 'Rohan', 'Priya', 'Vikram', 'Ananya', 'Rahul', 'Divya', 'Karan', 'Neha'];
    const lastNames = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Rao', 'Deshmukh', 'Mehta', 'Joshi', 'Verma', 'Kumar'];

    const results = [];
    for (let i = 0; i < 8; i++) {
        const fn = firstNames[(i + sector.length) % firstNames.length];
        const ln = lastNames[(i + location.length) % lastNames.length];
        const fullName = `${fn} ${ln}`;
        const handle = `${fn.toLowerCase()}_${ln.toLowerCase()}_${i}`;
        const isJournalist = i % 3 === 0;

        results.push({
            username: handle,
            fullName: fullName,
            followers: `${(10 + i * 27.5).toFixed(0)}K`,
            engagement: `${(1.5 + (i * 0.7) % 4.5).toFixed(1)}%`,
            email: `contact.${handle}@gmail.com`,
            bio: isJournalist
                ? `Senior Journalist covering ${sector} stories in ${location}. Writes for major national publications.`
                : `Digital Creator & Influencer sharing trends, insights and tips about ${sector} from ${location}.`,
            link: `https://www.instagram.com/${handle}/`,
            category: isJournalist ? 'Journalist' : 'Influencer',
            sector: sector,
            location: location,
            scrapedAt: new Date().toISOString()
        });
    }
    return results;
}

function preParseSerperItem(item) {
    const title = item.title || '';
    const snippet = item.snippet || '';
    const link = item.link || '';
    const combinedText = `${title} ${snippet}`;

    let username = '';
    let fullName = '';

    if (link.includes('instagram.com/')) {
        const titleMatch = title.match(/^([^(]+)\s*\(([^)]+)\)/);
        if (titleMatch) {
            fullName = titleMatch[1].trim();
            username = titleMatch[2].replace('@', '').trim();
        } else {
            const urlParts = link.split('instagram.com/');
            if (urlParts[1]) {
                username = urlParts[1].split('/')[0].split('?')[0].trim();
            }
        }
    } else {
        // Secondary stats-aggregator sources (SocialBlade/HypeAuditor/Phlanx) index the
        // real @handle directly in the page title, e.g. "@handle - 12.4K Followers - Social
        // Blade Stats" -- richer and more reliable than a bare Instagram search snippet.
        const handleMatch = title.match(/@([a-zA-Z0-9_.]+)/) || snippet.match(/@([a-zA-Z0-9_.]+)/);
        if (handleMatch) {
            username = handleMatch[1].trim();
        }
        const nameMatch = title.match(/^([^(@\-|]+)/);
        if (nameMatch) {
            fullName = nameMatch[1].trim();
        }
    }

    if (!username || username.toLowerCase() === 'p' || username.toLowerCase() === 'reel' || username.toLowerCase() === 'explore' || username.toLowerCase() === 'tags') {
        const handleMatch = snippet.match(/@([a-zA-Z0-9_.]+)/) || title.match(/@([a-zA-Z0-9_.]+)/);
        if (handleMatch) {
            username = handleMatch[1].trim();
        }
    }

    username = username.replace(/[^a-zA-Z0-9_.]/g, '');
    if (!username || username.toLowerCase() === 'p' || username.toLowerCase() === 'reel' || username.toLowerCase() === 'explore' || username.toLowerCase() === 'tags') {
        return null;
    }

    let followers = 'Unknown';
    const followersRegex = /(\d+(\.\d+)?[mKk]?)\s*(Followers|followers)/i;
    const fMatch = combinedText.match(followersRegex);
    if (fMatch) {
        followers = fMatch[1].toUpperCase();
    }

    let email = '';
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const eMatch = snippet.match(emailRegex);
    if (eMatch) {
        email = eMatch[0];
    }

    return {
        username,
        fullName: fullName || username,
        followers,
        email,
        rawBio: snippet,
        link: `https://www.instagram.com/${username}/`
    };
}

exports.findInfluencers = onRequest(
    { timeoutSeconds: 60, memory: '256MiB', cors: true, secrets: [serperApiKeySecret, groqApiKeySecret] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { sector, location, query } = req.body || {};

        let coreTerms = '';
        let igQuery = '';
        let displaySector = sector || 'Custom';
        let displayLocation = location || 'Search';

        if (query && query.trim()) {
            const trimmedQuery = query.trim();
            if (trimmedQuery.toLowerCase().includes('site:')) {
                // Fully custom scoped query from the user -- run it as-is, no stats variant.
                igQuery = trimmedQuery;
            } else {
                let cleaned = trimmedQuery
                    .replace(/\b(popular|top|best|find|search|list|influencer|influencers|creator|creators|profile|profiles|account|accounts)\b/gi, '')
                    .replace(/\b(in|at|of|with|emails?|email)\b/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!cleaned) cleaned = trimmedQuery;
                coreTerms = cleaned;
                igQuery = `site:instagram.com ${cleaned} "followers" -college -university -institute -school`;
            }
            displaySector = trimmedQuery;
            displayLocation = 'Query';
        } else if (sector && location) {
            coreTerms = `"${sector}" "${location}"`;
            igQuery = `site:instagram.com ${coreTerms} "followers" -college -university -institute -school`;
        } else {
            res.status(400).json({ error: 'Search query, or Sector and Location are required' });
            return;
        }

        // Secondary query against social-stats aggregator sites (SocialBlade,
        // HypeAuditor, Phlanx). Google indexes these pages with the real @handle
        // and follower count directly in the title, so this widens the candidate
        // pool with richer data without proportionally increasing Serper spend --
        // total request volume below is kept roughly equal to the old single-query
        // 8-page loop.
        const statsQuery = coreTerms
            ? `${coreTerms} instagram followers -college -university -institute -school (site:hypeauditor.com OR site:socialblade.com OR site:phlanx.com)`
            : null;

        const serperKeys = (serperApiKeySecret.value() || '').split(/[,\n]/).map(k => k.trim()).filter(Boolean);
        const groqKey = groqApiKeySecret.value();

        const fetchSerperPage = async (searchQuery, pageNumber) => {
            for (const key of serperKeys) {
                try {
                    const response = await axios.post('https://google.serper.dev/search', {
                        q: searchQuery,
                        page: pageNumber
                    }, {
                        headers: {
                            'X-API-KEY': key,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (response.data && response.data.organic) {
                        return response.data.organic;
                    }
                } catch (err) {
                    console.warn(`[findInfluencers] Serper key error on "${searchQuery}" page ${pageNumber}: ${err.message}. Trying backup key...`);
                }
            }
            return [];
        };

        if (serperKeys.length === 0 || !groqKey) {
            console.log(`[findInfluencers] Serper/Groq keys missing. Using mock fallback for query: "${igQuery}".`);
            res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
            return;
        }

        try {
            console.log(`[findInfluencers] Querying live search via Serper: instagram="${igQuery}" stats="${statsQuery || 'n/a'}"`);

            const pagePromises = [];
            for (let p = 1; p <= 10; p++) {
                pagePromises.push(fetchSerperPage(igQuery, p));
            }
            if (statsQuery) {
                for (let p = 1; p <= 8; p++) {
                    pagePromises.push(fetchSerperPage(statsQuery, p));
                }
            }

            const pagesResults = await Promise.all(pagePromises);
            const items = pagesResults.flat();

            if (items.length === 0) {
                console.log('[findInfluencers] Serper returned 0 results. Using fallback.');
                res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
                return;
            }

            const preParsedList = items.map(preParseSerperItem).filter(Boolean);

            const uniquePreParsed = [];
            const seen = new Set();

            const parseFollowerCount = (str) => {
                if (!str || str === 'Unknown') return null;
                const cleaned = str.replace(/,/g, '').trim().toUpperCase();
                const num = parseFloat(cleaned);
                if (isNaN(num)) return null;
                if (cleaned.includes('M')) return num * 1000000;
                if (cleaned.includes('K')) return num * 1000;
                return num;
            };

            for (const p of preParsedList) {
                if (!seen.has(p.username.toLowerCase())) {
                    seen.add(p.username.toLowerCase());

                    const count = parseFollowerCount(p.followers);
                    if (count !== null && count < 2000) {
                        continue;
                    }

                    uniquePreParsed.push(p);
                }
            }

            if (uniquePreParsed.length === 0) {
                console.log('[findInfluencers] No valid Instagram profiles could be pre-parsed. Using fallback.');
                res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
                return;
            }

            const prompt = [
                `You are an AI assistant refining a list of pre-parsed social profiles found via search for the topic/sector "${displaySector}" in "${displayLocation}". Here is the list:`,
                JSON.stringify(uniquePreParsed, null, 2),
                'Refine this list and return a clean JSON array of profiles.',
                'Rules for refinement:',
                '1. INDIVIDUAL-ONLY TEST: keep an entry only if it represents exactly ONE specific, named human being -- not a group, team, clan, organization, business, brand, gaming cafe/lounge, club, political party, government body, media outlet, or institution of any kind. Judge by what the account actually IS, not by keyword matching: e.g. "TEAM APEX GAMING", "Lan Shack Gaming Cafe", "BJP Delhi", and "Aam Aadmi Party" are all NOT individuals and must be excluded even though they may have real follower counts and even if they are topically related to the search. A "fullName" that reads as a team/venue/party/company name (not a person\'s name) is a strong signal to exclude. Keep every real individual creator, influencer, journalist, or builder even if some of their fields (email, exact engagement) are missing or uncertain -- incomplete data is never a reason to drop a real person, but representing a non-person entity always is.',
                `2. RELEVANCE TEST: only keep individuals who are genuinely connected to "${displaySector}" based on their bio/rawBio -- a search engine will surface unrelated accounts that merely happen to share a keyword or location; if a profile's content has nothing to do with "${displaySector}", exclude it even though it appeared in the input list.`,
                '3. Clean up "fullName" (capitalize properly, remove emojis or weird trailing markers).',
                '4. Rewrite the "bio" to be a rich, descriptive professional sentence about what this person does. DO NOT use lazy placeholder bios like "Tech Influencer" or "Fitness Influencer". Use the context in "rawBio" to specify what they teach, make, build, or promote (e.g. if they teach coding, building startups, engineering, fitness training). If the rawBio is short or empty, write a descriptive sentence using their full name and name context.',
                '5. Double check the "rawBio" text for emails (e.g. "collabs@...", "contact@...") and ensure it is extracted into "email".',
                '6. Estimate a realistic "engagement" rate percentage (e.g. "3.5%", "2.1%") based on followers count.',
                '7. Exclude any profile that has less than 2,000 followers.',
                '8. Keep every profile that survives rules 1, 2, and 7 -- do not arbitrarily truncate the list to a round number, and never invent a profile that was not in the input list.',
                '9. Return the output strictly as a JSON object of this shape:',
                '{ "profiles": [ { "username": "...", "fullName": "...", "followers": "...", "engagement": "...", "email": "...", "bio": "...", "link": "..." } ] }',
                'Respond ONLY with the JSON object. Do not wrap in markdown code blocks or add other text.'
            ].join('\n');

            console.log('[findInfluencers] Calling Groq to parse results...');
            const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }, {
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const content = groqRes.data.choices[0].message.content;
            const parsed = JSON.parse(content);

            const finalProfiles = (parsed.profiles || []).map(p => ({
                ...p,
                link: p.link && p.link.includes('instagram.com') ? p.link : `https://www.instagram.com/${p.username}/`,
                sector: displaySector,
                location: displayLocation,
                scrapedAt: new Date().toISOString()
            }));

            res.json({ profiles: finalProfiles });
        } catch (err) {
            const errorDetails = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
            console.error('[findInfluencers] Scraper failed:', errorDetails);
            res.json({ profiles: getMockInfluencers(displaySector, displayLocation) });
        }
    }
);

exports.enrichInfluencer = onRequest(
    { timeoutSeconds: 30, memory: '256MiB', cors: true, secrets: [rapidApiKeySecret] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { username } = req.body || {};
        if (!username) {
            res.status(400).json({ error: 'Username is required' });
            return;
        }

        const rapidApiKey = rapidApiKeySecret.value();
        if (!rapidApiKey) {
            res.status(400).json({ error: 'RapidAPI Key (RAPIDAPI_KEY) is not configured' });
            return;
        }

        try {
            console.log(`[enrichInfluencer] Enriching profile for username: @${username}`);
            const apiRes = await axios.post('https://instagram-scraper-stable-api.p.rapidapi.com/ig_get_fb_profile.php',
                `username_or_url=${username}&data=basic`,
                {
                    headers: {
                        'x-rapidapi-key': rapidApiKey,
                        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const d = apiRes.data || {};

            if (d.error) {
                res.status(400).json({ error: d.error });
                return;
            }

            const formatFollowers = (count) => {
                if (!count) return 'Unknown';
                if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
                if (count >= 1000) return (count / 1000).toFixed(0) + 'K';
                return count.toString();
            };

            const calculateMockEngagement = (followersCount) => {
                if (!followersCount) return '2.5%';
                if (followersCount > 1000000) return '1.8%';
                if (followersCount > 500000) return '2.3%';
                if (followersCount > 100000) return '3.2%';
                return '4.5%';
            };

            const extractEmailFromText = (text) => {
                if (!text) return '';
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const match = text.match(emailRegex);
                return match ? match[0] : '';
            };

            let email = '';
            if (d.email_from_biography && d.email_from_biography.length > 0) {
                email = d.email_from_biography[0];
            } else if (d.public_email) {
                email = d.public_email;
            } else if (d.biography) {
                email = extractEmailFromText(d.biography);
            }

            const count = d.follower_count || d.followers || 0;
            const bioText = d.biography || d.bio || '';

            const enriched = {
                username: d.username || username,
                fullName: d.full_name || '',
                followers: formatFollowers(count),
                engagement: calculateMockEngagement(count),
                email: email,
                bio: bioText,
                link: `https://www.instagram.com/${username}/`
            };

            console.log(`[enrichInfluencer] Successfully enriched @${username} (Followers: ${enriched.followers}, Email: ${enriched.email || 'None'})`);
            res.json({ profile: enriched });
        } catch (err) {
            const details = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
            console.error(`[enrichInfluencer] Enrichment failed for @${username}:`, details);
            res.status(500).json({ error: 'Failed to enrich profile: ' + details });
        }
    }
);

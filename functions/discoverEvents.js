const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const serperApiKeys = defineSecret('SERPER_API_KEYS'); // comma/newline-separated - supports multiple accounts
const groqApiKey = defineSecret('GROQ_API_KEY');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SERPER_URL = 'https://google.serper.dev/search';
const EVENTS_COLLECTION = 'events_awards';

function getDb() {
    if (!admin.apps.length) admin.initializeApp();
    return admin.firestore();
}

// Round-robins across all configured Serper keys, skipping ones already known
// to be exhausted this run, so one drained account (or a different email's
// key) doesn't stall discovery - just add more keys to the secret to extend it.
let lastGoodKeyIndex = 0;

async function serperSearch(query, keysCsv) {
    const keys = keysCsv.split(/[,\n]/).map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) throw new Error('No Serper API keys configured');

    let lastError = null;
    for (let attempt = 0; attempt < keys.length; attempt++) {
        const idx = (lastGoodKeyIndex + attempt) % keys.length;
        const key = keys[idx];
        try {
            const res = await fetch(SERPER_URL, {
                method: 'POST',
                headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: query, gl: 'in', num: 10 })
            });

            if (res.status === 403 || res.status === 429) {
                lastError = new Error(`Serper key #${idx + 1} exhausted/rate-limited (${res.status})`);
                continue; // try the next key
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`Serper error (${res.status}): ${text.slice(0, 200)}`);
            }

            lastGoodKeyIndex = idx; // stick with the key that worked
            return await res.json();
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('All Serper keys failed');
}

function buildExtractionPrompt(sector, organicResults) {
    const listText = organicResults.map((r, i) =>
        `[${i}] title="${(r.title || '').replace(/"/g, "'")}" link="${r.link || ''}" snippet="${(r.snippet || '').replace(/"/g, "'").slice(0, 300)}"`
    ).join('\n');

    return [
        `You are screening raw Google search results for real, nameable industry awards or events in the "${sector}" sector in India.`,
        'Most search results will NOT be a real award/event listing (news articles, unrelated pages, generic company sites) - only include ones that clearly ARE an actual award programme or industry event, with nomination or attendance info.',
        'For each one that qualifies, extract only what the title/snippet actually states - never invent a deadline, date, or detail not present.',
        '',
        'Results:',
        listText,
        '',
        'Respond ONLY with JSON in this exact shape, no other text:',
        '{"events": [{"index": <number from list>, "event_name": "...", "event_type": "Awards" or "Event", "status": "NOMINATIONS_OPEN" or "UPCOMING" or "CONCLUDED", "event_date": "" or "<DD/MM/YYYY date if present in text, else empty>", "nomination_deadline": "" or "<date as stated>", "confidence": <0-100 integer, how clearly this is a real, current award/event>}]}',
        'Omit any result that is not a genuine award/event listing.'
    ].join('\n');
}

async function callGroq(prompt, apiKey) {
    const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        })
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Groq API error (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('Groq response had no content');
    return JSON.parse(content);
}

function makeEventKey(name, location) {
    return `${(name || '').toLowerCase().trim()}||${(location || '').toLowerCase().trim()}`;
}

async function fetchExistingKeys(db) {
    const snap = await db.collection(EVENTS_COLLECTION).select('event_key', 'event_name', 'name', 'location', 'venue').get();
    const keys = new Set();
    snap.forEach(doc => {
        const d = doc.data();
        keys.add((d.event_key || makeEventKey(d.event_name || d.name, d.location || d.venue)).toLowerCase());
    });
    return keys;
}

exports.discoverEventsForSector = onRequest(
    { timeoutSeconds: 120, memory: '256MiB', cors: true, secrets: [serperApiKeys, groqApiKey] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { sector } = req.body || {};
        if (!sector || typeof sector !== 'string') {
            res.status(400).json({ error: 'sector is required' });
            return;
        }

        try {
            const db = getDb();
            const queries = [
                `${sector} industry awards India 2026 nominations`,
                `${sector} leadership award India`
            ];

            const searchResults = await Promise.all(queries.map(q => serperSearch(q, serperApiKeys.value())));
            const organic = searchResults.flatMap(r => r.organic || []);

            if (organic.length === 0) {
                res.json({ sector, newFound: 0, events: [] });
                return;
            }

            const extraction = await callGroq(buildExtractionPrompt(sector, organic), groqApiKey.value());
            const candidates = Array.isArray(extraction.events) ? extraction.events : [];

            const existingKeys = await fetchExistingKeys(db);
            const toWrite = [];
            const seenThisRun = new Set();

            for (const c of candidates) {
                const source = organic[c.index];
                if (!source || !source.link) continue;

                const key = makeEventKey(c.event_name, 'India');
                if (existingKeys.has(key) || seenThisRun.has(key)) continue;
                seenThisRun.add(key);

                toWrite.push({
                    event_name: c.event_name || source.title,
                    event_type: c.event_type || 'Awards',
                    type: c.event_type || 'Awards',
                    sector,
                    location: 'India',
                    status: c.status || 'UPCOMING',
                    nomination_deadline: c.nomination_deadline || '',
                    confidence: typeof c.confidence === 'number' ? c.confidence : 50,
                    source_url: source.link,
                    source_title: source.title || '',
                    event_key: key,
                    date: c.event_date || '',
                    venue: '',
                    organizer: '',
                    scraped_at: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                });
            }

            if (toWrite.length > 0) {
                const batch = db.batch();
                toWrite.forEach(ev => {
                    const docRef = db.collection(EVENTS_COLLECTION).doc();
                    batch.set(docRef, ev);
                });
                await batch.commit();
            }

            res.json({ sector, newFound: toWrite.length, events: toWrite });
        } catch (err) {
            console.error('[discoverEventsForSector] Failed:', err);
            res.status(500).json({ error: err.message || 'Discovery failed' });
        }
    }
);

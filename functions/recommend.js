const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const groqApiKey = defineSecret('GROQ_API_KEY');

// If Groq renames/retires this model slug, check https://console.groq.com/docs/models
// and update this constant - everything else in this file is model-agnostic.
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PREFILTER_TOP_N = 80; // keeps the prompt small/cheap regardless of how large the collection grows

function getDb() {
    if (!admin.apps.length) admin.initializeApp();
    return admin.firestore();
}



const STOP_WORDS = new Set([
    'the', 'and', 'a', 'of', 'to', 'in', 'is', 'that', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'an', 'this', 'about', 'from', 'or', 'are', 'be', 'your', 'our'
]);

function scoreRecord(record, type, queryWords, rawQuery) {
    let score = 0;
    
    // 1. Exact phrase match boost
    const cleanQuery = rawQuery.toLowerCase().trim();
    if (cleanQuery.length >= 3) {
        const nameField = (type === 'journalists' ? record.name : (record.event_name || record.name)) || '';
        const categoryField = (type === 'journalists' ? record.category : record.sector) || '';
        
        if (nameField.toLowerCase().includes(cleanQuery)) score += 15;
        if (categoryField.toLowerCase().includes(cleanQuery)) score += 10;
    }
    
    // 2. Individual word matches with weights
    queryWords.forEach(w => {
        if (type === 'journalists') {
            const name = (record.name || '').toLowerCase();
            const pub = (record.publication || '').toLowerCase();
            const cat = (record.category || '').toLowerCase();
            const role = (record.role || '').toLowerCase();
            const bio = (record.bio || '').toLowerCase();
            
            if (name.includes(w)) score += 5;
            if (pub.includes(w)) score += 3;
            if (cat.includes(w)) score += 3;
            if (role.includes(w)) score += 3;
            if (bio.includes(w)) score += 1;
        } else {
            const name = ((record.event_name || record.name) || '').toLowerCase();
            const sector = (record.sector || '').toLowerCase();
            const loc = [record.location, record.venue].filter(Boolean).join(' ').toLowerCase();
            const org = (record.organizer || '').toLowerCase();
            
            if (name.includes(w)) score += 5;
            if (sector.includes(w)) score += 3;
            if (loc.includes(w)) score += 1;
            if (org.includes(w)) score += 1;
        }
    });
    
    return score;
}

// Cheap keyword-overlap pre-filter so the LLM prompt stays small even as the
// underlying collection grows daily - no embeddings/vector DB needed at this scale.
function preFilter(records, type, query, topN) {
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
    const scored = records.map(r => {
        const score = scoreRecord(r, type, queryWords, query);
        return { r, score };
    });
    scored.sort((a, b) => b.score - a.score);

    // A very free-form query might not keyword-match anything even though the
    // records themselves are relevant - fall back to the full scored list
    // (still capped at topN) rather than returning nothing.
    const withHits = scored.filter(s => s.score > 0);
    const chosen = withHits.length >= 10 ? withHits : scored;
    return chosen.slice(0, topN).map(s => s.r);
}

async function fetchCollection(collectionName) {
    const snap = await getDb().collection(collectionName).get();
    const list = [];
    snap.forEach(doc => list.push({ docId: doc.id, ...doc.data() }));
    return list;
}

function buildPrompt(type, query, candidates) {
    const listText = candidates.map((c, i) => {
        if (type === 'journalists') {
            const locStr = [c.address, c.city, c.state, c.country].filter(Boolean).join(', ');
            const socialsStr = [c.linkedin, c.twitter].filter(Boolean).join(', ');
            return `[${i}] name="${c.name || ''}" role="${c.role || ''}" publication="${c.publication || ''}" category="${c.category || ''}" location="${locStr}" email="${c.email || ''}" phone="${c.phone || ''}" socials="${socialsStr}" media="${c.mediaTypes || ''}" bio="${(c.bio || '').slice(0, 200)}"`;
        }
        return `[${i}] name="${c.event_name || c.name || ''}" type="${c.event_type || c.type || ''}" sector="${c.sector || ''}" location="${c.location || c.venue || ''}" status="${c.status || ''}" deadline="${c.nomination_deadline || ''}"`;
    }).join('\n');

    const itemLabel = type === 'journalists' ? 'journalists' : 'events/awards';

    return [
        `You are a PR recommendation assistant for an agency. Below is a numbered list of ${itemLabel}.`,
        'Given the request, pick the best matches, ranked best first. Use ONLY the details given below - never invent names, emails, dates, or any detail not present in the list.',
        'If nothing is a good match, return an empty "picks" array rather than forcing weak matches.',
        '',
        'List:',
        listText,
        '',
        `Request: "${query}"`,
        '',
        'Respond ONLY with JSON in this exact shape, no other text:',
        '{"picks": [{"index": <number from the list above>, "reason": "<one sentence, specific, referencing why this one fits the request>"}]}',
        'Return at most 10 picks.'
    ].join('\n');
}

async function callGroq(prompt, apiKey) {
    const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
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

exports.recommend = onRequest(
    { timeoutSeconds: 60, memory: '256MiB', cors: true, secrets: [groqApiKey] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { type, query } = req.body || {};
        if (!query || typeof query !== 'string' || !query.trim()) {
            res.status(400).json({ error: 'query is required' });
            return;
        }
        if (type !== 'journalists' && type !== 'events') {
            res.status(400).json({ error: "type must be 'journalists' or 'events'" });
            return;
        }

        try {
            const collectionName = type === 'journalists' ? 'journalists' : 'events_awards';

            const all = await fetchCollection(collectionName);
            if (all.length === 0) {
                res.json({ picks: [] });
                return;
            }

            const candidates = preFilter(all, type, query, PREFILTER_TOP_N);
            const prompt = buildPrompt(type, query, candidates);
            const parsed = await callGroq(prompt, groqApiKey.value());

            const picks = Array.isArray(parsed.picks) ? parsed.picks : [];
            const results = picks
                .filter(p => typeof p.index === 'number' && candidates[p.index])
                .map(p => ({ ...candidates[p.index], reason: p.reason || '' }));

            res.json({ picks: results, candidatesConsidered: candidates.length, totalRecords: all.length });
        } catch (err) {
            console.error('[recommend] Failed:', err);
            res.status(500).json({ error: err.message || 'Recommendation failed' });
        }
    }
);

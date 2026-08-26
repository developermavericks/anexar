const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const claudeApiKey = defineSecret('CLAUDE_API_KEY');
const groqApiKey = defineSecret('GROQ_API_KEY');

const CLAUDE_MODEL = 'claude-3-5-sonnet-latest';
const GROQ_MODEL = 'openai/gpt-oss-120b';

const SCHEMA_BLOCK = `{
  "category": "Traditional Media" | "Social Media & Thought Leadership" | "Essentials Series" | "Processes" | "Other",
  "deliverable": "Concise name/title of the task/activity, including a named individual if the source ties it to one (e.g. 'Interviews / RBMs', 'Essay / blog writing for Rahul')",
  "targetText": "Exact target frequency/cadence string as it appears or is implied in the source (e.g. '5-6', '1-2 per month', 'Ongoing', 'As and when', '1')",
  "target": number (numeric target derived from targetText: for ranges like '5-6' output 6; for specific monthly numbers like '1' or '2' output that number; for ongoing/yearly/as-and-when tasks, output 1 as default. Never output range strings or non-numeric values here),
  "period": "Monthly" | "Quarterly" | "Ongoing" | "As and when",
  "description": "Rich, specific notes on this activity — the process, who is responsible, named individuals involved, formats, tools/techniques/acronyms mentioned, and any cross-reference to other channels or deliverables it feeds into. DO NOT just repeat the deliverable title."
}`;

const PROMPT_SYSTEM = `You are an expert PR, marketing, and business operations assistant who specializes in exhaustively parsing client Scope of Work (SOW) documents, retainer agreements, and deliverables lists into structured data — no matter how messy, inconsistently formatted, or unconventional the source is.

The source text you receive may be:
- Raw pasted prose, in full sentences or paragraphs
- Bulleted or numbered lists, possibly nested or inconsistently indented
- A Word document converted to plain text, where headings and formatting cues have been flattened
- An Excel spreadsheet converted to plain text, appearing as "Sheet: <name>" headers followed by rows of values separated by " | " — treat each meaningful data row as a candidate deliverable, using any header row to interpret which column is the deliverable name, frequency, owner, or notes
- A mix of any of the above in the same document, including tables embedded in prose, one-off notes, and deliverables assigned to a specific named person (a client contact, spokesperson, or founder) rather than described generically

YOUR JOB IS EXHAUSTIVE EXTRACTION. Read the entire text at least twice before finalizing your answer:
1. First pass: identify every section, list, table, and paragraph that could describe a deliverable or commitment.
2. Second pass: for each one, decide if it is a distinct, standalone deliverable — including ones phrased unusually, buried mid-paragraph, named after a specific person, or described only once in passing. A deliverable mentioned only once, in a different format than everything else, is exactly as real as one in a clean bulleted list — do not drop it because it "doesn't match the pattern" of the rest of the document.

Hard rules:
- NEVER merge two distinct deliverables into one entry just because they sit in the same bullet, paragraph, or table row — split them into separate goal objects.
- NEVER split one deliverable into two entries just because it's described across two sentences.
- NEVER drop an item because it is vague, ongoing, informally worded, or doesn't cleanly fit a category — classify it into the closest fitting category and extract it. Only use "Other" when a deliverable genuinely fits nowhere else.
- NEVER hallucinate a deliverable that isn't actually described in the text, and never list the same deliverable twice under different names.
- When a deliverable names a specific individual (e.g. "for Rahul", "written by the CEO"), keep that name in the "deliverable" title exactly as written, and explain their role/involvement in "description".
- Category judgment for edge cases: ghostwritten essays, op-eds, blogs, or long-form written content intended for the client's own distribution (LinkedIn, company blog, newsletters) belong in "Social Media & Thought Leadership" even though the deliverable itself is "writing," because the intent is thought-leadership distribution. Internal reporting, review decks, audits, and operational cadences belong in "Processes". Use your best judgment the same way for any other atypical item — reason about the underlying INTENT of the activity, not just its surface format.
- Preserve maximum useful detail in "description" — process steps, who provides direction vs. who executes, specific techniques or acronyms mentioned (e.g. "AEO/GEO optimised", "600-900 words", "voice note direction"), and any note that a deliverable feeds into or supports another channel (e.g. "source for LinkedIn posts").

Each goal/deliverable object in the output array MUST match this exact schema:
${SCHEMA_BLOCK}

Ensure the output is ONLY a valid JSON array. Do not include any markdown styling like \`\`\`json, conversational intro, trailing text, or code block notation. Respond purely with the stringified JSON array.`;

function buildGroqPrompt(text) {
    return `You are an expert PR and marketing assistant who exhaustively parses unstructured client Scope of Work (SOW) documents into a structured JSON array of client goals. The source may be raw prose, bulleted/numbered lists, or an Excel sheet converted to "Sheet: <name>" + " | "-separated rows.

Extract EVERY distinct deliverable mentioned anywhere in the text, however it's phrased — including ones named after a specific person (e.g. "Essay / blog writing for Rahul"), buried in a paragraph, or described only once in an unusual format. Do not drop anything for being differently formatted than the rest, and do not merge distinct deliverables together. Only use category "Other" as a genuine last resort — use your best judgment for the intent behind atypical items (e.g. ghostwritten essays/blogs for a founder's own distribution are "Social Media & Thought Leadership"; reporting/audits/reviews are "Processes").

Each goal object MUST match this exact schema:
${SCHEMA_BLOCK}

You must return a JSON object with a "goals" property containing this array of parsed goals.
Shape: { "goals": [ { "category": "...", "deliverable": "...", "targetText": "...", "target": 1, "period": "...", "description": "..." } ] }
Respond ONLY with this JSON object. Do not wrap in markdown or add extra conversational text.

Text to parse:
${text}`;
}

async function runGroqFallback(text, groqKey, reason) {
    if (!groqKey) {
        throw new Error(`Claude API failed (${reason}) and Groq API key is unconfigured.`);
    }

    console.log(`[parseGoals] Claude API failed or was skipped (${reason}). Falling back to Groq...`);

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: buildGroqPrompt(text) }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        })
    });

    if (!groqRes.ok) {
        const errText = await groqRes.text().catch(() => '');
        throw new Error(`Groq API error (${groqRes.status}): ${errText.slice(0, 300)}`);
    }

    const groqData = await groqRes.json();
    const content = groqData.choices && groqData.choices[0] && groqData.choices[0].message && groqData.choices[0].message.content;
    if (!content) throw new Error('Groq response had no content');

    const parsed = JSON.parse(content);
    if (!parsed.goals || !Array.isArray(parsed.goals)) {
        throw new Error('Groq response did not contain a goals array');
    }

    console.log(`[parseGoals] Successfully parsed SOW via Groq fallback into ${parsed.goals.length} goals.`);
    return parsed.goals;
}

exports.parseGoals = onRequest(
    { timeoutSeconds: 120, memory: '256MiB', cors: true, secrets: [claudeApiKey, groqApiKey] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { text } = req.body || {};
        if (!text || typeof text !== 'string' || !text.trim()) {
            res.status(400).json({ error: 'Raw text content is required' });
            return;
        }

        const apiKey = claudeApiKey.value();
        const groqKey = groqApiKey.value();

        console.log(`[parseGoals] Processing SOW text (${text.length} chars)...`);

        try {
            if (!apiKey) {
                const fallbackGoals = await runGroqFallback(text, groqKey, 'Claude API key missing');
                res.json({ goals: fallbackGoals });
                return;
            }

            console.log(`[parseGoals] Trying Claude API (Model: ${CLAUDE_MODEL})...`);

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: CLAUDE_MODEL,
                    max_tokens: 10000,
                    thinking: { type: 'adaptive' },
                    system: PROMPT_SYSTEM,
                    messages: [
                        { role: 'user', content: `Please exhaustively parse the following scope of work text into every distinct deliverable it describes: \n\n${text}` }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`[parseGoals] Claude API returned error ${response.status}. Triggering Groq fallback...`);
                const fallbackGoals = await runGroqFallback(text, groqKey, `Claude error: ${errorText}`);
                res.json({ goals: fallbackGoals });
                return;
            }

            const result = await response.json();
            // With adaptive thinking on, content[0] may be a "thinking" block rather
            // than the answer — find the actual text block instead of assuming index 0.
            const textBlock = (result.content || []).find(block => block.type === 'text');
            if (!textBlock) {
                throw new Error('Claude response contained no text block');
            }
            const rawText = textBlock.text.trim();

            let cleanJsonStr = rawText;
            if (cleanJsonStr.includes('```')) {
                const match = cleanJsonStr.match(/```(?:json)?([\s\S]*?)```/);
                if (match) {
                    cleanJsonStr = match[1].trim();
                }
            }

            const parsedGoals = JSON.parse(cleanJsonStr);
            if (!Array.isArray(parsedGoals)) {
                throw new Error('Claude did not return a valid array of goals');
            }

            console.log(`[parseGoals] Successfully parsed SOW via Claude into ${parsedGoals.length} goals.`);
            res.json({ goals: parsedGoals });
        } catch (err) {
            console.warn(`[parseGoals] Claude API encountered exception: ${err.message}. Triggering Groq fallback...`);
            try {
                const fallbackGoals = await runGroqFallback(text, groqKey, err.message);
                res.json({ goals: fallbackGoals });
            } catch (fallbackErr) {
                console.error('[parseGoals] Both Claude and Groq fallback failed:', fallbackErr);
                res.status(500).json({ error: 'Parsing SOW failed on both Claude and Groq fallback: ' + fallbackErr.message });
            }
        }
    }
);

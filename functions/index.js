const { onRequest } = require('firebase-functions/v2/https');
const chromium = require('@sparticuz/chromium');

// SmartScraper.js already supports overriding the Chromium binary via
// process.env.PUPPETEER_EXECUTABLE_PATH - we just need to resolve @sparticuz/chromium's
// bundled binary path and set that env var before the first scrape runs. Cached across
// warm invocations of the same instance so it only resolves once per instance.
let chromiumPathPromise = null;
function ensureChromiumPath() {
    if (!chromiumPathPromise) {
        chromiumPathPromise = chromium.executablePath().then((execPath) => {
            process.env.PUPPETEER_EXECUTABLE_PATH = execPath;
            return execPath;
        });
    }
    return chromiumPathPromise;
}

exports.recommend = require('./recommend').recommend;
exports.discoverEventsForSector = require('./discoverEvents').discoverEventsForSector;

exports.analyzeReach = onRequest(
    { timeoutSeconds: 300, memory: '1GiB', cors: true },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { url, version } = req.body || {};
        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'url is required' });
            return;
        }

        try {
            await ensureChromiumPath();
            // Required lazily so PUPPETEER_EXECUTABLE_PATH is already set before
            // SmartScraper's puppeteer-extra reads it at launch time.
            const { processUrlInternal } = require('./reach_lens/AnalysisController');
            const result = await processUrlInternal(url, version || 'v10');
            res.json(result);
        } catch (err) {
            console.error('[analyzeReach] Failed:', err);
            res.status(500).json({ error: err.message || 'Analysis failed' });
        }
    }
);

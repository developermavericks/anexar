/**
 * Copies the canonical reach_lens source (repo root) into functions/reach_lens/
 * so Cloud Functions has it bundled at deploy time. The root reach_lens/ folder
 * stays the single source of truth - edit there, then re-run this (or just
 * deploy, since firebase.json's predeploy hook runs it automatically).
 *
 * BatchProcessor.js is intentionally excluded: it still has its own
 * require('../db') and isn't used by the analyzeReach endpoint.
 */
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'reach_lens');
const DEST_DIR = path.join(__dirname, '..', 'reach_lens');
const EXCLUDE = new Set(['BatchProcessor.js']);

fs.rmSync(DEST_DIR, { recursive: true, force: true });
fs.mkdirSync(DEST_DIR, { recursive: true });

const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.js') && !EXCLUDE.has(f));
for (const file of files) {
    fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(DEST_DIR, file));
}

console.log(`[sync-reach-lens] Copied ${files.length} file(s) into functions/reach_lens/:`, files.join(', '));

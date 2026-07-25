const SmartScraper = require('./SmartScraper');
const SocialScraperService = require('./SocialScraperService');
const ReachEstimator = require('./ReachEstimator');

const smartScraper = new SmartScraper();
const socialScraper = new SocialScraperService();

const processUrlInternal = async (url, version = 'v9') => {
    if (!url) {
        throw new Error('URL is required');
    }

    // Default to v10 if not specified
    if (!version) version = 'v10';
    // Validate version
    if (!['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'].includes(version)) version = 'v10';

    try {
        const [smartResult, redditResult] = await Promise.all([
            smartScraper.scrapeUrl(url),
            socialScraper.scrapeReddit(url)
        ]);

        const googleCount = smartResult.totalMentions || 0;
        const redditCount = redditResult.count || 0;
        const totalMentions = googleCount + redditCount;

        // Unified Domain Weight & Ranks Prefetching
        let targetHostname = '';
        try {
            targetHostname = new URL(url).hostname;
        } catch (e) {
            targetHostname = url;
        }
        if (typeof targetHostname === 'string') {
            targetHostname = targetHostname.replace('www.', '').toLowerCase().trim();
        } else {
            targetHostname = 'unknown.com';
        }

        const domainsToFetch = [targetHostname];
        if (smartResult.domains && Array.isArray(smartResult.domains)) {
            smartResult.domains.forEach(d => {
                if (typeof d === 'string') {
                    const clean = d.replace('www.', '').toLowerCase().trim();
                    if (clean && !domainsToFetch.includes(clean)) {
                        domainsToFetch.push(clean);
                    }
                }
            });
        }

        // Prefetch ranks/weights asynchronously from OpenPageRank/DB
        const OpenPageRank = require('./OpenPageRankService');
        await OpenPageRank.getDomainRanks(domainsToFetch).catch(err => {
            console.error('[AnalysisController] OpenPageRank pre-fetch failed:', err.message);
        });

        // Compute weights
        const targetDomainWeight = await ReachEstimator.getDomainWeight(targetHostname);
        smartResult.domainWeight = targetDomainWeight;

        let avgDomainWeight = 1.0;
        if (smartResult.domains && smartResult.domains.length > 0) {
            const weights = await Promise.all(smartResult.domains.map(d => ReachEstimator.getDomainWeight(d)));
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            avgDomainWeight = totalWeight / weights.length;
        }
        smartResult.avgDomainWeight = avgDomainWeight;

        let estimatedReach = 0;
        let confidenceScore = 0;
        let sentimentScore = 0;

        // --- Versioned Logic ---
        let uv = 0;
        let upv = 0;

        // Enrich smartResult with extra fields needed by v10
        smartResult.redditMentions = redditCount;
        smartResult.title = smartResult.title || '';

        if (smartResult.source === 'Estimator') {
            // CORE 2: The "Estimator" Path
            const estimate = ReachEstimator.estimate(url, smartResult.title || '', version, smartResult);
            estimatedReach = estimate.reach;
            confidenceScore = estimate.confidence;
            sentimentScore = estimate.sentimentScore;
            if (estimate.uv) uv = estimate.uv;
            if (estimate.upv) upv = estimate.upv;

        } else {
            // CORE 1: The "Stealth" Path (Real Data)
            confidenceScore = 100;

            // 1. Domain Authority Weight (Common)
            // Reusing pre-calculated avgDomainWeight
            const finalDomainWeight = smartResult.avgDomainWeight || 1.0;

            // 2. Base Value & Positional Logic
            let baseVal = 500; // v2 default
            let positionalWeight = 1.0;
            if (version === 'v4') baseVal = 425;
            if (version === 'v5') baseVal = 380;
            if (version === 'v6') baseVal = 350; // v6 default (Grounded Base simulation)

            if (version !== 'v2') {
                // v3+ uses Heat Map
                positionalWeight = smartResult.prominenceScore || 1.0;
            }

            // 3. Indexing Bonus
            let indexingBonus = 5000;
            const domainsList = Array.isArray(smartResult.domains) ? smartResult.domains : [];
            if (domainsList.some(d => typeof d === 'string' && (d.includes('news') || d.includes('times') || d.includes('post')))) {
                indexingBonus = 10000;
            }

            // v4/v5/v6 GEO Boost
            if ((version === 'v4' || version === 'v5' || version === 'v6') &&
                domainsList.some(d => typeof d === 'string' && (d.includes('perplexity') || d.includes('gemini') || d.includes('chatgpt')))) {
                indexingBonus += 25000;
            }

            // Stealth Formula
            estimatedReach = ((googleCount + redditCount) * baseVal * finalDomainWeight * positionalWeight) + indexingBonus;

            if (smartResult.isFrontPage === true) {
                console.log(`[AnalysisController] Front page detected. Applying 4.0x boost to Stealth reach.`);
                estimatedReach = estimatedReach * 4.0;
            }

            // Sentiment (v4+) - Weighted Analysis
            if ((version === 'v4' || version === 'v5' || version === 'v6')) {
                sentimentScore = ReachEstimator.analyzeSentiment(
                    smartResult.title || '',
                    smartResult.metaDescription,
                    smartResult.snippet
                );
            }

            // ── v10 Apex Override ────────────────────────────────────────────────────
            if (version === 'v10') {
                // FIX 2: Continuous (non-bucketed) domain weight
                const continuousWeight = await ReachEstimator.getDomainWeightContinuous(targetHostname);

                // FIX 1: Deduplicate Google mentions by domain diversity
                const rawDomains = Array.isArray(smartResult.domains) ? smartResult.domains : [];
                const uniqueRootDomains = new Set(rawDomains.map(d =>
                    d.replace('www.', '').split('.').slice(-2).join('.')));
                const diversityRatio = rawDomains.length > 0
                    ? Math.min(1.0, uniqueRootDomains.size / rawDomains.length)
                    : 1.0;
                const effectiveGoogleCount = Math.max(1, Math.ceil(googleCount * (0.5 + diversityRatio * 0.5)));

                // FIX 6: Reddit as amplification %, NOT added to mention count
                const redditBoost = redditCount > 0
                    ? 1.0 + Math.min(0.15, (Math.log10(redditCount + 1) / Math.log10(201)) * 0.15)
                    : 1.0;

                // FIX 4: Strict front-page detection (require ≥ 2 path segments)
                let strictFrontPage = false;
                if (smartResult.isFrontPage === true) {
                    try {
                        const segments = new URL(url).pathname.split('/').filter(Boolean);
                        strictFrontPage = segments.length >= 2;
                    } catch (_) { strictFrontPage = false; }
                }

                const v10Positional = smartResult.prominenceScore || 1.0;
                estimatedReach = (effectiveGoogleCount * 415 * continuousWeight * v10Positional * redditBoost);

                if (strictFrontPage) estimatedReach *= 3.0; // Calibrated vs v9's 4×

                // FIX 3: Calculate sentiment ONCE — stored for display & used once in modifiers
                sentimentScore = ReachEstimator.analyzeSentiment(
                    smartResult.title || '',
                    smartResult.metaDescription || '',
                    smartResult.snippet || ''
                );
                // Apply sentiment once here (modifiers v10 will NOT re-apply)
                let v10SentimentMult = 1.0;
                if      (sentimentScore >  3.0) v10SentimentMult = 1.22;
                else if (sentimentScore >  1.0) v10SentimentMult = 1.08;
                else if (sentimentScore < -3.0) v10SentimentMult = 1.28;
                else if (sentimentScore < -1.0) v10SentimentMult = 1.12;
                estimatedReach *= v10SentimentMult;
            }
            // ─────────────────────────────────────────────────────────────────────────
        }

        // --- Universal Modifiers (Versioned) ---

        // v9.0 / v10.0: Content Provenance Graph (CPG) & 5-Tier Classification
        let provenanceTier = 'T0';
        if (version === 'v9' || version === 'v10') {
            const topDomains = smartResult.domains.slice(0, 5);
            let targetDomain = '';
            try {
                targetDomain = new URL(url).hostname.replace('www.', '');
            } catch (e) {
                targetDomain = url.replace('www.', '');
            }
            const isTargetInTop3 = topDomains.slice(0, 3).some(d => targetDomain.includes(d));
            
            if (isTargetInTop3) {
                provenanceTier = 'T0'; // Origin
            } else if (topDomains.some(d => d.includes('msn.com') || d.includes('yahoo.com') || d.includes('apnews.com') || d.includes('reuters.com'))) {
                provenanceTier = 'T1'; // Licensed Syndication
            } else if (topDomains.length > 0) {
                provenanceTier = 'T2'; // Indexed Reprint
            } else {
                provenanceTier = 'T3'; // Probable Scraper/Thin
            }
        }

        // v8.0/v9.0 integration for reprint flag
        const isReprint = provenanceTier !== 'T0';

        const modifiers = ReachEstimator.applyModifiers(estimatedReach, version, new Date(), smartResult.domains || [], {
            ...smartResult,
            isReprint,
            provenanceTier,
            url
        });
        estimatedReach = modifiers.finalReach;
        const velocity = modifiers.velocity;
        const agenticStatus = modifiers.agenticStatus;
        const deviation = modifiers.deviation;
        const uvr = modifiers.uv; // v9 UVR (Unique Verified Reach)

        const result = {
            id: Math.floor(Math.random() * 1000000), // Random ID for response
            url,
            title: smartResult.title || '',
            totalMentions,
            estimatedReach,
            confidenceScore,
            sentimentScore,
            velocity,
            agenticStatus,
            version,
            breakdown: {
                google: { ...smartResult, totalMentions: googleCount },
                reddit: redditResult,
                meta: {
                    agenticStatus: agenticStatus,
                    logic: getVersionName(version),
                    uv: uvr || uv || modifiers.uv || undefined,
                    upv: modifiers.upv || undefined,
                    socialProof: smartResult.socialProof,
                    deviation: deviation,
                    isReprint: isReprint,
                    provenanceTier: provenanceTier,
                    entropy: modifiers.entropy || undefined
                }
            }
        };

        return result;

    } catch (error) {
        console.error(error);
        throw error;
    }
};

const analyzeUrl = async (req, res) => {
    let { url, version } = req.body;
    try {
        const result = await processUrlInternal(url, version);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Analysis failed' });
    }
};

function getVersionName(v) {
    if (v === 'v2') return 'Dual-Core (Verified + Drift)';
    if (v === 'v3') return 'Contextual (Heat Map + Industry)';
    if (v === 'v4') return 'Causal (Sentiment + GEO Detection)';
    if (v === 'v5') return 'Behavioral (Agentic + SISI)';
    if (v === 'v6') return 'Integrated (Grounded + Stickiness)';
    if (v === 'v7') return 'Truth Engine (Maximum Accuracy)';
    if (v === 'v8') return 'Oracle Truth Engine (Monte Carlo)';
    if (v === 'v9') return 'Sovereign Precision (QMC Sequence)';
    if (v === 'v10') return 'Apex Precision (Deduplicated QMC + Bayesian)';
    return 'Integrated (Grounded + Stickiness)';
}

module.exports = {
    analyzeUrl,
    processUrlInternal
};

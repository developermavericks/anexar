import React, { useState, useEffect } from 'react';
import { 
    FileDown, 
    Link2, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Sparkles, 
    BookOpen, 
    Trash2, 
    ArrowRight, 
    ExternalLink,
    X
} from 'lucide-react';
export default function ArticlePdfScraper() {

    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressLabel, setProgressLabel] = useState('Initializing job...');
    const [error, setError] = useState(null);
    const [scrapedResult, setScrapedResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [showErrorModal, setShowErrorModal] = useState(false);

    const getApiUrl = () => {
        const envUrl = import.meta.env.VITE_GENERATE_PDF_API_URL;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return envUrl || 'http://localhost:3100/api/generate-article-pdf';
        }
        // Production: route directly to the secure Cloud Function
        return 'https://generatearticlepdf-mjsmlxvrgq-uc.a.run.app';
    };

    const GENERATE_PDF_API_URL = getApiUrl();

    // Steps list for generation progress mapping
    const steps = [
        { label: "Extracting article content & fetching source...", minProgress: 20 },
        { label: "Parsing article DOM via Mozilla Readability...", minProgress: 40 },
        { label: "Applying premium editorial HSL typography...", minProgress: 70 },
        { label: "Spinning up Puppeteer headless instance...", minProgress: 80 },
        { label: "Printing A4 PDF buffer and initiating stream...", minProgress: 100 }
    ];

    // Load history from localStorage on mount
    useEffect(() => {
        const storedHistory = localStorage.getItem('anexar_scraped_history');
        if (storedHistory) {
            try {
                setHistory(JSON.parse(storedHistory));
            } catch (err) {
                console.error("Failed to parse history from localStorage", err);
            }
        }
    }, []);

    // Save history to localStorage
    const saveToHistory = (item) => {
        const updated = [item, ...history.filter(h => h.url !== item.url)].slice(0, 10);
        setHistory(updated);
        localStorage.setItem('anexar_scraped_history', JSON.stringify(updated));
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('anexar_scraped_history');
    };

    // Helper to monitor progress through Server-Sent Events (SSE)
    const startProgressTracking = (jobId, originalUrl, targetFilename, onComplete) => {
        const statusUrl = `${GENERATE_PDF_API_URL.replace(/\/$/, '')}/status/${jobId}`;
        const eventSource = new EventSource(statusUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (typeof data.progress === 'number') {
                    setProgressPercent(data.progress);
                }
                if (data.stepLabel) {
                    setProgressLabel(data.stepLabel);
                }

                if (data.status === 'completed') {
                    eventSource.close();
                    onComplete();
                } else if (data.status === 'failed') {
                    eventSource.close();
                    setError(data.error || 'Failed to generate PDF.');
                    setShowErrorModal(true);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error parsing status event:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE connection error, attempting fallback finish:", err);
            eventSource.close();
            // Fallback: wait 6 seconds and try completing
            setTimeout(() => {
                onComplete();
            }, 6000);
        };
        
        return eventSource;
    };

    const handleDownloadJobPdf = async (jobId, originalUrl, filenameOverride) => {
        try {
            const downloadUrl = `${GENERATE_PDF_API_URL.replace(/\/$/, '')}/download/${jobId}`;
            const res = await fetch(downloadUrl);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to download generated PDF.');
            }

            const blob = await res.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;

            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = filenameOverride || `article-${Date.now()}.pdf`;
            if (contentDisposition && !filenameOverride) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objectUrl);

            const domain = new URL(originalUrl).hostname.replace('www.', '');
            const successMeta = {
                title: filename.replace('.pdf', '').replace('article-', 'Scraped Article '),
                byline: domain,
                url: originalUrl,
                timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                filename
            };
            setScrapedResult(successMeta);
            saveToHistory(successMeta);
        } catch (err) {
            console.error('Error fetching completed job PDF:', err);
            setError(err.message || 'Failed to fetch the compiled PDF file.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleScrape = async (e) => {
        if (e) e.preventDefault();
        if (!url || (!url.startsWith('http') && !url.startsWith('file:///'))) {
            setError('Please enter a valid HTTP/HTTPS URL or a local file:/// path.');
            return;
        }

        setLoading(true);
        setError(null);
        setScrapedResult(null);
        setProgressPercent(0);
        setProgressLabel('Initializing scraper job...');

        let activeEventSource = null;

        try {
            const res = await fetch(GENERATE_PDF_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, stream: true })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server returned error status ${res.status}`);
            }

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/pdf')) {
                // Direct PDF download path (Cloud Function)
                setProgressPercent(90);
                setProgressLabel('Downloading compiled PDF...');
                
                const blob = await res.blob();
                const objectUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = objectUrl;
                
                const contentDisposition = res.headers.get('Content-Disposition');
                const cleanTitle = url.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40) || 'article';
                let filename = `scraped-${cleanTitle}.pdf`;
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (match && match[1]) {
                        filename = match[1];
                    }
                }
                
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(objectUrl);
                
                const domain = new URL(url).hostname.replace('www.', '');
                const successMeta = {
                    title: filename.replace('.pdf', '').replace('scraped-', 'Scraped Article '),
                    byline: domain,
                    url: url,
                    timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    filename
                };
                setScrapedResult(successMeta);
                saveToHistory(successMeta);
                setProgressPercent(100);
                setProgressLabel('Completed!');
                setLoading(false);
            } else {
                // Async queue path (Local Server)
                const { jobId } = await res.json();
                activeEventSource = startProgressTracking(jobId, url, `article-${Date.now()}.pdf`, () => {
                    handleDownloadJobPdf(jobId, url, null);
                });
            }

        } catch (err) {
            console.error('Error generating editorial PDF:', err);
            setError(err.message || 'An unexpected error occurred while processing the URL.');
            setShowErrorModal(true);
            setLoading(false);
            if (activeEventSource) activeEventSource.close();
        }
    };

    const handleReDownload = async (historyItem) => {
        setUrl(historyItem.url);
        setError(null);
        setScrapedResult(null);
        
        setLoading(true);
        setProgressPercent(0);
        setProgressLabel('Re-initializing PDF build job...');

        let activeEventSource = null;

        try {
            const res = await fetch(GENERATE_PDF_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: historyItem.url, stream: true })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server returned error status ${res.status}`);
            }

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/pdf')) {
                // Direct PDF download path
                setProgressPercent(90);
                setProgressLabel('Downloading compiled PDF...');
                
                const blob = await res.blob();
                const objectUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = objectUrl;
                
                link.setAttribute('download', historyItem.filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(objectUrl);
                
                const domain = new URL(historyItem.url).hostname.replace('www.', '');
                const successMeta = {
                    title: historyItem.filename.replace('.pdf', '').replace('scraped-', 'Scraped Article '),
                    byline: domain,
                    url: historyItem.url,
                    timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    filename: historyItem.filename
                };
                setScrapedResult(successMeta);
                saveToHistory(successMeta);
                setProgressPercent(100);
                setProgressLabel('Completed!');
                setLoading(false);
            } else {
                // Async queue path
                const { jobId } = await res.json();
                activeEventSource = startProgressTracking(jobId, historyItem.url, historyItem.filename, () => {
                    handleDownloadJobPdf(jobId, historyItem.url, historyItem.filename);
                });
            }

        } catch (err) {
            console.error('Error in re-downloading:', err);
            setError(err.message || 'Failed to download the PDF.');
            setShowErrorModal(true);
            setLoading(false);
            if (activeEventSource) activeEventSource.close();
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto px-4 py-8 font-sans animate-fade-in">
            {/* Scoped animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes gold-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.06); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .gold-pulse-icon {
                    animation: gold-pulse 2.5s infinite ease-in-out;
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 165, 60, 0.4); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(220, 165, 60, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 165, 60, 0); }
                }
                .pulse-ring-element {
                    animation: pulse-ring 2s infinite;
                }
            `}} />

            {/* Premium Editorial Header Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl transition-all duration-500 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12)] group">
                
                {/* Visual Background Accent Glow Backdrops */}
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-3xl transition-all duration-700 group-hover:bg-amber-500/15"></div>
                <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl transition-all duration-700 group-hover:bg-indigo-500/10"></div>

                {/* Header Brand Band with Editorial Gold/Charcoal Gradient */}
                <div className="relative bg-gradient-to-r from-slate-900 via-[#1A1A1A] to-slate-900 dark:from-slate-950 dark:via-[#111] dark:to-slate-950 px-8 py-8 md:px-10 text-white border-b border-amber-500/20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(220,165,60,0.15),transparent_60%)]"></div>
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 gold-pulse-icon">
                                    <BookOpen size={26} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 bg-amber-400/25 border border-amber-400/35 text-white text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
                                        PREMIUM EDITORIAL
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                                        Editorial Scraper & PDF Generator
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed mt-2">
                            Submit any news article URL to extract its core content, optimize the typography using our layout parser, and export a ready-to-print, formatted editorial A4 PDF.
                        </p>
                    </div>
                </div>

                {/* Form Input Section */}
                <div className="p-8 md:p-10 space-y-6">
                    <form onSubmit={handleScrape} className="space-y-4">
                        <div>
                            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                Target Article URL
                            </label>
                            <div className="relative rounded-2xl shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <Link2 size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/editorial-news-story..."
                                    disabled={loading}
                                    className="block w-full pl-12 pr-4 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loading || !url}
                                className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-305 cursor-pointer ${
                                    loading || !url
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-650 cursor-not-allowed border border-slate-200/50 dark:border-slate-850'
                                    : 'bg-slate-900 hover:bg-slate-850 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Scraping & Formatting...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileDown size={16} />
                                        <span>Generate Styled PDF</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Loader Pipeline Status Component */}
                    {loading && (
                        <div className="p-6 rounded-2xl bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 space-y-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Pipeline execution status</span>
                                </div>
                                <span className="text-amber-600 dark:text-amber-400 text-xs font-black">
                                    {progressPercent}%
                                </span>
                            </div>

                            {/* Live Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-slate-800">
                                <div 
                                    className="bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 h-full rounded-full transition-all duration-500 ease-out" 
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {/* Dynamic Live Step Label */}
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 py-1.5 px-3 rounded-lg border border-slate-200/40 dark:border-slate-850/50 truncate">
                                Current Node: {progressLabel}
                            </div>
                            
                            {/* Steps Progression List */}
                            <div className="space-y-3 pt-2">
                                {steps.map((step, idx) => {
                                    const nextStep = steps[idx + 1];
                                    const isDone = progressPercent >= (nextStep ? nextStep.minProgress : 100);
                                    const isActive = progressPercent >= step.minProgress && !isDone;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                                                isDone ? 'text-emerald-600 dark:text-emerald-400 font-medium' :
                                                isActive ? 'text-amber-600 dark:text-amber-400 font-bold scale-[1.01]' :
                                                'text-slate-400 dark:text-slate-655 opacity-60'
                                            }`}
                                        >
                                            <div className="flex-shrink-0">
                                                {isDone ? (
                                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                                ) : isActive ? (
                                                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-[9px] font-black pulse-ring-element">
                                                        •
                                                    </span>
                                                ) : (
                                                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-300 dark:border-slate-750 text-[9px] font-medium">
                                                        {idx + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="truncate">{step.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Custom Styling Preview Notification */}
                            <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3.5 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                    <Sparkles size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-slate-650 dark:text-slate-300 leading-relaxed">
                                        <strong className="font-bold block mb-0.5 text-slate-800 dark:text-amber-400">Applying Premium Theme:</strong>
                                        Applying Playfair Display for headings, Lora typography with drop-cap start, gold border accents, and cream backdrop formats.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Scraped Result Notification */}
                    {scrapedResult && !loading && (
                        <div className="p-6 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={24} className="flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-sm">PDF Compiled & Downloaded!</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Successfully generated and streamed the print-ready document.</p>
                                </div>
                            </div>

                            <div className="border-t border-emerald-500/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">File Output Name</span>
                                    <span className="block text-xs font-mono font-medium text-slate-700 dark:text-slate-300 break-all">{scrapedResult.filename}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Scraped From Domain</span>
                                    <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        {scrapedResult.byline}
                                        <a href={scrapedResult.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600">
                                            <ExternalLink size={12} />
                                        </a>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                            <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-xs text-rose-800 dark:text-rose-450">Scraper Pipeline Failed</h3>
                                <p className="text-[11px] text-rose-700/80 dark:text-rose-450 mt-1 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* History Logs Section */}
            <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                            Scrape History Logs
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Access recently compiled PDF documents without repeating the parsing pipeline.
                        </p>
                    </div>

                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 hover:bg-slate-50 hover:text-rose-500 dark:hover:bg-slate-900 dark:text-slate-400 dark:hover:text-rose-400 transition-all cursor-pointer"
                        >
                            <Trash2 size={12} />
                            <span>Clear logs</span>
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800">
                        <FileDown size={36} className="text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-xs text-slate-400 dark:text-slate-500">No scraped articles in local logs yet.</p>
                        <p className="text-[10px] text-slate-350 dark:text-slate-600 mt-1">Submit a URL above to generate your first premium print PDF.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                            <thead>
                                <tr className="text-left text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                    <th className="pb-3 font-semibold">Article & Domain</th>
                                    <th className="pb-3 font-semibold hidden md:table-cell">Scraped Date</th>
                                    <th className="pb-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-900 text-xs text-slate-700 dark:text-slate-300">
                                {history.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                                        <td className="py-4 pr-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-slate-800 dark:text-slate-150 line-clamp-1 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                                                    {item.byline}
                                                    <a href={item.url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity">
                                                        <ExternalLink size={10} />
                                                    </a>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-slate-400 dark:text-slate-500 hidden md:table-cell">
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                <span>{item.timestamp}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right">
                                            <button
                                                onClick={() => handleReDownload(item)}
                                                disabled={loading}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400 transition-all font-semibold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <FileDown size={12} />
                                                <span>Download PDF</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Error Modal Popup */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4 animate-scale-in">
                        <div className="absolute top-6 right-6">
                            <button 
                                onClick={() => setShowErrorModal(false)}
                                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer border-none bg-transparent"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-3.5 text-rose-500">
                            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                <AlertCircle size={22} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white text-base">Scraping Interrupted</h3>
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Paywall or Missing Content</span>
                            </div>
                        </div>
                        
                        <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed pt-2">
                            {error || 'The source article website has blocked automated reader requests. No PDF was generated.'}
                        </p>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3.5 space-y-2 border border-slate-100 dark:border-slate-850">
                            <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Troubleshooting Suggestions:</span>
                            <ul className="list-disc pl-4 text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                                <li>Check if the source URL has a strict login barrier (e.g. WSJ, NYT).</li>
                                <li>Make sure the website supports reader-mode content indexing.</li>
                                <li>Try downloading the page HTML locally and inputting its local file path to scrape offline.</li>
                            </ul>
                        </div>
                        
                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer border-none"
                            >
                                Dismiss Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

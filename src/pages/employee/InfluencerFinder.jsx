import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, query, where, getDocs, getDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { 
    Search, 
    Instagram, 
    Mail, 
    ExternalLink, 
    Download, 
    Sparkles, 
    Check, 
    Copy, 
    Bookmark, 
    BookmarkCheck,
    RefreshCw, 
    AlertCircle,
    UserCheck,
    Radio
} from 'lucide-react';

const SECTORS = [
    'Technology', 'BFSI', 'Healthcare', 'Fintech',
    'Commercial Vehicle', 'Marketing', 'Retail',
    'Real Estate', 'Startups', 'Manufacturing',
    'Education', 'Hospitality'
];

// Local dev hits the Cerebro Express server; everywhere else routes to the deployed Cloud Functions.
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const FIND_INFLUENCERS_API_URL = isLocalHost
    ? (import.meta.env.VITE_FIND_INFLUENCERS_API_URL || 'http://localhost:3100/api/find-influencers')
    : 'https://us-central1-anexar-9820c.cloudfunctions.net/findInfluencers';
const ENRICH_INFLUENCER_API_URL = isLocalHost
    ? (import.meta.env.VITE_ENRICH_INFLUENCER_API_URL || 'http://localhost:3100/api/enrich-influencer')
    : 'https://us-central1-anexar-9820c.cloudfunctions.net/enrichInfluencer';

export default function InfluencerFinder() {
    const { user: contextUser } = useUser();
    const isDark = contextUser.theme === 'dark';

    // State parameters
    const [queryText, setQueryText] = useState('Tech influencers in Bangalore');
    const [keyword, setKeyword] = useState('');
    const [viewMode, setViewMode] = useState('search'); // 'search' | 'directory'
    const [directoryProfiles, setDirectoryProfiles] = useState([]);
    
    // Core data states
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cacheStatus, setCacheStatus] = useState(''); // 'hit' | 'miss' | ''
    const [error, setError] = useState('');
    const [copiedEmail, setCopiedEmail] = useState('');
    const [savedProfiles, setSavedProfiles] = useState(new Set());
    const [enrichingUsers, setEnrichingUsers] = useState({});

    // Restore search state from sessionStorage on mount
    useEffect(() => {
        const savedState = sessionStorage.getItem('anexar_influencer_finder_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.queryText !== undefined) setQueryText(parsed.queryText);
                if (parsed.profiles) setProfiles(parsed.profiles);
            } catch (err) {
                console.error("Failed to restore state from sessionStorage:", err);
            }
        }

        const loadSavedPins = async () => {
            try {
                const snap = await getDocs(collection(db, 'saved_influencers'));
                const pins = new Set();
                const list = [];
                snap.forEach(d => {
                    pins.add(d.id);
                    list.push({ ...d.data(), username: d.id });
                });
                setSavedProfiles(pins);
                setDirectoryProfiles(list);
            } catch (err) {
                console.error("Failed to load saved pins from Firestore:", err);
            }
        };
        loadSavedPins();
    }, []);

    // Save search state to sessionStorage on updates
    useEffect(() => {
        const stateToSave = { queryText, profiles };
        sessionStorage.setItem('anexar_influencer_finder_state', JSON.stringify(stateToSave));
    }, [queryText, profiles]);

    // Reload saved directory list from Firestore when mode changes
    useEffect(() => {
        if (viewMode === 'directory') {
            const loadSavedDirectory = async () => {
                setLoading(true);
                try {
                    const snap = await getDocs(collection(db, 'saved_influencers'));
                    const list = [];
                    const pins = new Set();
                    snap.forEach(d => {
                        pins.add(d.id);
                        list.push({ ...d.data(), username: d.id });
                    });
                    setDirectoryProfiles(list);
                    setSavedProfiles(pins);
                } catch (err) {
                    console.error("Failed to reload saved directory:", err);
                } finally {
                    setLoading(false);
                }
            };
            loadSavedDirectory();
        }
    }, [viewMode]);

    // Handle Pinning/Saving profiles globally in Firestore
    const toggleSaveProfile = async (profile) => {
        const docRef = doc(db, 'saved_influencers', profile.username);
        const isSaved = savedProfiles.has(profile.username);
        
        try {
            if (isSaved) {
                await deleteDoc(docRef);
                setSavedProfiles(prev => {
                    const next = new Set(prev);
                    next.delete(profile.username);
                    return next;
                });
                setDirectoryProfiles(prev => prev.filter(p => p.username !== profile.username));
            } else {
                const newProfileData = {
                    username: profile.username,
                    fullName: profile.fullName || '',
                    email: profile.email || '',
                    bio: profile.bio || '',
                    followers: profile.followers || 'Unknown',
                    engagement: profile.engagement || 'Unknown',
                    link: profile.link || '',
                    category: profile.category || 'Influencer',
                    sector: profile.sector || queryText,
                    location: profile.location || 'India',
                    savedAt: new Date().toISOString()
                };
                await setDoc(docRef, newProfileData);
                setSavedProfiles(prev => {
                    const next = new Set(prev);
                    next.add(profile.username);
                    return next;
                });
                setDirectoryProfiles(prev => [newProfileData, ...prev]);
            }
        } catch (err) {
            console.error("Failed to toggle pin in Firestore:", err);
        }
    };

    // Enrich profile details via RapidAPI Instagram Scraper Stable API
    const enrichProfileData = async (username) => {
        setEnrichingUsers(prev => ({ ...prev, [username]: true }));
        setError('');
        
        try {
            const res = await fetch(ENRICH_INFLUENCER_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to enrich profile');
            }

            const data = await res.json();
            const enrichedProfile = data.profile;

            // Update profiles list
            setProfiles(prev => prev.map(p => {
                if (p.username.toLowerCase() === username.toLowerCase()) {
                    return { ...p, ...enrichedProfile };
                }
                return p;
            }));

            // Update directory list
            setDirectoryProfiles(prev => prev.map(p => {
                if (p.username.toLowerCase() === username.toLowerCase()) {
                    return { ...p, ...enrichedProfile };
                }
                return p;
            }));

            // If the profile is saved in Firestore, update it there too
            if (savedProfiles.has(username)) {
                const docRef = doc(db, 'saved_influencers', username);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    await setDoc(docRef, {
                        ...snap.data(),
                        ...enrichedProfile
                    });
                }
            }

        } catch (err) {
            console.error("Enrichment failed:", err);
            if (err.message.includes("You are not subscribed")) {
                setError("Subscription Required: Please make sure you clicked the blue 'Subscribe to Test' button on your RapidAPI dashboard for the Instagram Scraper Stable API.");
            } else {
                setError("Enrichment error: " + err.message);
            }
        } finally {
            setEnrichingUsers(prev => ({ ...prev, [username]: false }));
        }
    };

    // Copy to clipboard helper
    const handleCopyEmail = (email) => {
        navigator.clipboard.writeText(email);
        setCopiedEmail(email);
        setTimeout(() => setCopiedEmail(''), 2000);
    };

    // Trigger Scraper and Caching logic
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!queryText.trim()) {
            setError('Please enter a search query.');
            return;
        }

        setLoading(true);
        setError('');
        setCacheStatus('');
        setProfiles([]);

        // Strip site:instagram.com if they typed it to normalize the log/save key
        const normalizedQuery = queryText.toLowerCase().replace('site:instagram.com', '').trim();
        const cacheKey = encodeURIComponent(normalizedQuery);

        try {
            // "Live Discover" means live -- every search hits the real API fresh.
            // We still log/save results below (for the global 'influencers' directory
            // and search history), but we never short-circuit a search by serving an
            // old cached result instead of actually searching.
            console.log(`[Live Discover] Fetching fresh results for: "${cacheKey}"`);
            setCacheStatus('miss');

            const response = await fetch(FIND_INFLUENCERS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryText })
            });

            if (!response.ok) {
                throw new Error(`Scraper request failed with status: ${response.status}`);
            }

            const data = await response.json();
            const results = data.profiles || [];
            setProfiles(results);

            // 3. DUAL SAVE TO FIRESTORE (UPSERT PROFILES AND WRITE SEARCH CACHE)
            if (results.length > 0) {
                // Save search query cache map
                await setDoc(doc(db, 'search_cache', cacheKey), {
                    queryText,
                    profiles: results,
                    createdAt: new Date().toISOString()
                });

                // Upsert profiles globally into 'influencers' collection
                for (const profile of results) {
                    await setDoc(doc(db, 'influencers', profile.username), {
                        ...profile,
                        updatedAt: new Date().toISOString()
                    });
                }
                console.log('[Firestore] Profiles and cache updated successfully.');
            }

        } catch (err) {
            console.error('Search Discovery failed:', err);
            setError(err.message || 'Scraper / Connection error. Please make sure the local Express server on port 3100 is running.');
        } finally {
            setLoading(false);
        }
    };

    const activeProfiles = viewMode === 'directory' ? directoryProfiles : profiles;

    // Filter results locally by Keyword
    const filteredProfiles = activeProfiles.filter(p => {
        const matchesKeyword = !keyword.trim() || 
            (p.fullName || '').toLowerCase().includes(keyword.toLowerCase()) ||
            (p.username || '').toLowerCase().includes(keyword.toLowerCase()) ||
            (p.bio || '').toLowerCase().includes(keyword.toLowerCase()) ||
            (p.email || '').toLowerCase().includes(keyword.toLowerCase());
        return matchesKeyword;
    });

    // Export output list to CSV
    const exportToCSV = () => {
        if (filteredProfiles.length === 0) return;

        const headers = ['Full Name', 'Username', 'Category', 'Query', 'Followers', 'Engagement', 'Email', 'Profile Link'];
        const rows = filteredProfiles.map(p => [
            p.fullName || '',
            `@${p.username}`,
            p.category || 'Influencer',
            p.sector || queryText,
            p.followers || 'Unknown',
            p.engagement || 'Unknown',
            p.email || '',
            p.link || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeName = queryText.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        link.setAttribute("download", `influencers_${safeName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={`space-y-6 ${isDark ? 'dark' : ''}`}>
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Radio className="text-brand-amber animate-pulse" size={24} />
                        Influencer Finder
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Find and connect with verified Instagram creators and influencers.
                    </p>
                </div>
                {profiles.length > 0 && (
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#2C2C2C] text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                    >
                        <Download size={14} />
                        Export Press List (CSV)
                    </button>
                )}
            </div>

            {/* Top Config/Filters Board */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Search Form Card */}
                <form onSubmit={handleSearch} className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={16} className="text-brand-amber" />
                        Scraper Search engine
                    </h3>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Search Query / Prompt</label>
                        <textarea
                            rows={4}
                            placeholder="e.g. BFSI journalists in Mumbai, Fashion influencers in Delhi with emails..."
                            value={queryText}
                            onChange={(e) => setQueryText(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-amber resize-none transition-all leading-normal"
                            required
                        />
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                            Type any search description in natural language. The system will search Instagram in real-time and extract individual creator profiles.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs rounded-xl shadow-sm tracking-wider uppercase flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="animate-spin" size={14} />
                                Scanning & Scrutinizing...
                            </>
                        ) : (
                            <>
                                <Search size={14} />
                                Start Discovery Scrape
                            </>
                        )}
                    </button>
                </form>

                {/* Profiles & Filter Interface */}
                <div className="lg:col-span-8 space-y-4">
                    {/* Inline Filter Tools */}
                    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Keyword Filter */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, handle, bio, or email..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-850 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-amber transition-all"
                            />
                        </div>

                        {/* Directory Mode Toggles */}
                        <div className="flex bg-slate-100 dark:bg-[#111827] p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('search')}
                                className={`px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'search'
                                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                                }`}
                            >
                                🔍 Live Discover
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('directory')}
                                className={`px-3 py-1.5 text-3xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'directory'
                                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                                }`}
                            >
                                📌 Saved List ({savedProfiles.size})
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-2xl text-xs font-semibold flex items-start gap-2 leading-relaxed">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Results Loading Overlay */}
                    {loading ? (
                        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-16 shadow-sm flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-brand-amber animate-spin" />
                                <Instagram className="absolute inset-0 m-auto text-brand-amber" size={16} />
                            </div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 text-center uppercase tracking-wider">
                                Scanning Google Index & Extracting Profiles
                            </p>
                            <p className="text-xs text-slate-400 text-center max-w-sm">
                                Querying API endpoints and utilizing Groq AI to read bios, parse contact emails, and categorize profiles...
                            </p>
                        </div>
                    ) : filteredProfiles.length === 0 ? (
                        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-brand-amber/10 flex items-center justify-center text-brand-amber">
                                <Search size={22} />
                            </div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                {profiles.length > 0 ? "No Filter Results" : "Discovery Idle"}
                            </p>
                            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                                {profiles.length > 0 
                                  ? "No profiles match your search filter keywords. Try broadening your query criteria."
                                  : "Select your target sector and location, then click \"Start Discovery Scrape\" above to source live profiles."}
                            </p>
                        </div>
                    ) : (
                        /* Results Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProfiles.map((p, idx) => {
                                const initials = (p.fullName || p.username || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                const isSaved = savedProfiles.has(p.username);

                                return (
                                    <div key={idx} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                        <div className="space-y-3">
                                            {/* Top Metadata Row */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar block with gradient */}
                                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1A1A1A] to-brand-amber dark:from-amber-500/20 dark:to-amber-500 p-0.5 flex items-center justify-center font-bold text-white dark:text-amber-400 text-sm shadow-xs shrink-0">
                                                        <div className="w-full h-full bg-[#1A1A1A] dark:bg-slate-900 rounded-[10px] flex items-center justify-center uppercase">
                                                            {initials}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{p.fullName || 'Anonymous Profile'}</h4>
                                                        <p className="text-3xs font-semibold text-slate-450 truncate">@{p.username}</p>
                                                    </div>
                                                </div>

                                                {/* Bookmark pin & category badge */}
                                                <div className="flex items-center gap-1.5">
                                                    {/* Enrich Stats Button */}
                                                    <button 
                                                        onClick={() => enrichProfileData(p.username)}
                                                        disabled={enrichingUsers[p.username]}
                                                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                                            enrichingUsers[p.username]
                                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 animate-pulse border-slate-200' 
                                                            : 'bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500 hover:text-white border-brand-amber/30 text-brand-amber'
                                                        }`}
                                                        title="Enrich Profile with Live Stats"
                                                    >
                                                        <Sparkles size={13} className={enrichingUsers[p.username] ? 'animate-spin' : ''} />
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleSaveProfile(p)}
                                                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                                            isSaved 
                                                            ? 'bg-amber-50 dark:bg-amber-950/20 border-brand-amber text-brand-amber' 
                                                            : 'bg-slate-50 dark:bg-[#111827] border-slate-200 dark:border-slate-850 text-slate-400 hover:text-slate-600'
                                                        }`}
                                                        title={isSaved ? "Saved Profile" : "Save Profile"}
                                                    >
                                                        {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                                                    </button>
                                                    
                                                    <span className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 flex items-center gap-1">
                                                        <Instagram size={10} />
                                                        Instagram
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bio summary */}
                                            <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                                                {p.bio || 'No profile description available.'}
                                            </p>

                                            {/* Metrics Info Row */}
                                            <div className="flex items-center gap-3 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Followers</span>
                                                    <span className="text-2xs font-extrabold text-slate-800 dark:text-slate-200">{p.followers || 'Unknown'}</span>
                                                </div>
                                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Engagement</span>
                                                    <span className="text-2xs font-extrabold text-slate-800 dark:text-slate-200">{p.engagement || 'Unknown'}</span>
                                                </div>
                                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Location</span>
                                                    <span className="text-2xs font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{p.location || location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-150 dark:border-slate-800">
                                            {p.email ? (
                                                <button
                                                    onClick={() => handleCopyEmail(p.email)}
                                                    className="flex-1 py-2 bg-slate-50 dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-3xs rounded-xl shadow-3xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    {copiedEmail === p.email ? (
                                                        <>
                                                            <Check className="text-emerald-500 animate-bounce" size={11} />
                                                            Email Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Mail size={11} />
                                                            Copy Email
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-850/50 text-slate-400 font-bold text-3xs rounded-xl tracking-wider uppercase flex items-center justify-center gap-1.5"
                                                    title="No public email address found in profile details."
                                                >
                                                    <Mail className="opacity-40" size={11} />
                                                    No Public Email
                                                </button>
                                            )}

                                            <a
                                                href={p.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 font-bold text-3xs rounded-xl shadow-3xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <Instagram size={11} />
                                                Visit Profile
                                                <ExternalLink size={9} />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

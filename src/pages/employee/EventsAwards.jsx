import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Square,
    Calendar,
    MapPin,
    Search,
    Database,
    ExternalLink,
    Download,
    Cpu,
    TrendingUp,
    Bookmark,
    Sparkles,
    ChevronRight
} from 'lucide-react';
import { db } from '../../lib/firebaseClient';
import { collection, doc, onSnapshot, orderBy, query, writeBatch, runTransaction } from 'firebase/firestore';

// Seed data used only to populate Firestore the first time the collection is empty
import defaultEvents from '../../data/events_data.json';

const EVENTS_COLLECTION = 'events_awards';
const SEED_BATCH_SIZE = 400; // stay safely under Firestore's 500-write batch limit
const SEED_LOCK_REF_PATH = ['events_awards_meta', 'seed_lock'];

export default function EventsAwards() {
    // ----------------------------------------------------
    // STATE MANAGEMENT
    // ----------------------------------------------------
    const [events, setEvents] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [scrapingStatus, setScrapingStatus] = useState({ running: false, current_sector: null, new_found: 0 });

    // Filter controls
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'Awards', 'Event'
    const [selectedSector, setSelectedSector] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedCity, setSelectedCity] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const [isFetching, setIsFetching] = useState(false);

    // Flips true when "Stop Fetching" is clicked; the discovery loop checks this
    // between sectors (an in-flight sector call still finishes, but no new one starts).
    const stopRequestedRef = useRef(false);

    // List of dynamic cities & sectors for filters
    const [citiesList, setCitiesList] = useState([]);
    const [sectorsList, setSectorsList] = useState([]);

    // AI recommendation panel state
    const [recQuery, setRecQuery] = useState('');
    const [recLoading, setRecLoading] = useState(false);
    const [recResults, setRecResults] = useState(null);
    const [recError, setRecError] = useState('');
    const RECOMMEND_API_URL = import.meta.env.VITE_RECOMMEND_API_URL || '';

    const handleGetRecommendations = async () => {
        if (!RECOMMEND_API_URL) {
            setRecError("Recommendations aren't configured yet. Set VITE_RECOMMEND_API_URL in .env.");
            return;
        }
        if (!recQuery.trim()) return;

        setRecLoading(true);
        setRecError('');
        setRecResults(null);

        try {
            const res = await fetch(RECOMMEND_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'events', query: recQuery.trim() })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
            setRecResults(data.picks || []);
        } catch (err) {
            console.error('Error fetching event/award recommendations:', err);
            setRecError(err.message || 'Failed to get recommendations.');
        } finally {
            setRecLoading(false);
        }
    };

    const handleExportRecommendations = () => {
        if (!recResults || recResults.length === 0) return;
        const headers = "Rank,Event Name,Sector,Location,Venue,Date,Reason,Source Link\n";
        const rows = recResults.map((ev, i) => {
            const cleanNe = String(ev.event_name || ev.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const localEv = events.find(e => {
                const cleanName = String(e.event_name || e.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanName === cleanNe;
            });
            const name = ev.event_name || ev.name || '';
            const sector = ev.sector || '';
            const loc = localEv?.location || ev.location || 'India';
            const venue = localEv?.venue || ev.venue || 'N/A';
            const date = localEv?.date || ev.date || 'TBD';
            const reason = (ev.reason || '').replace(/"/g, '""');
            const link = localEv?.source_url || ev.source_url || '';
            return `"${i + 1}","${name}","${sector}","${loc}","${venue}","${date}","${reason}","${link}"`;
        }).join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "event_recommendations_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ----------------------------------------------------
    // FIRESTORE LIVE SYNC (seeds the bundled 723-event dataset once, if empty)
    // ----------------------------------------------------
    useEffect(() => {
        const q = query(collection(db, EVENTS_COLLECTION), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                seedEventsToFirestore();
                return;
            }

            const list = [];
            snapshot.forEach(docSnap => list.push({ docId: docSnap.id, ...docSnap.data() }));
            setEvents(list);
            setIsConnected(true);

            const uniqueSectors = Array.from(new Set(list.map(e => e.sector))).filter(Boolean);
            const uniqueCities = Array.from(new Set(list.map(e => e.location))).filter(Boolean);
            setSectorsList(uniqueSectors.sort());
            setCitiesList(uniqueCities.sort());
        }, (err) => {
            console.error('Error listening to events_awards:', err);
            setIsConnected(false);
        });

        return () => {
            unsubscribe();
            stopRequestedRef.current = true;
        };
    }, []);

    const seedEventsToFirestore = async () => {
        // onSnapshot can fire "empty" more than once before a previous seed's
        // writes are visible (page reloads, multiple tabs, HMR) - a transaction
        // that atomically checks-and-sets a lock doc guarantees only one caller
        // ever actually seeds, no matter how many times this gets triggered.
        const lockRef = doc(db, ...SEED_LOCK_REF_PATH);
        try {
            const alreadySeeded = await runTransaction(db, async (transaction) => {
                const lockSnap = await transaction.get(lockRef);
                if (lockSnap.exists()) return true;
                transaction.set(lockRef, { seededAt: new Date().toISOString() });
                return false;
            });
            if (alreadySeeded) return;
        } catch (err) {
            console.error('Error acquiring events_awards seed lock:', err);
            return;
        }

        try {
            for (let i = 0; i < defaultEvents.length; i += SEED_BATCH_SIZE) {
                const chunk = defaultEvents.slice(i, i + SEED_BATCH_SIZE);
                const batch = writeBatch(db);
                chunk.forEach((item, idx) => {
                    const docRef = doc(collection(db, EVENTS_COLLECTION));
                    batch.set(docRef, {
                        ...item,
                        // Stagger seed timestamps so the original dataset order survives the
                        // createdAt-desc sort (newest real discoveries still land above it).
                        createdAt: new Date(Date.now() - (defaultEvents.length - (i + idx)) * 1000).toISOString()
                    });
                });
                await batch.commit();
            }
        } catch (err) {
            console.error('Error seeding events_awards to Firestore:', err);
        }
    };

    // ----------------------------------------------------
    // ACTIVE START / STOP CONTROLS
    // ----------------------------------------------------
    const DISCOVERY_SECTORS = [
        'BFSI', 'Technology', 'Healthcare', 'Fintech', 'Commercial Vehicle',
        'Marketing', 'Retail', 'Real Estate', 'Startups', 'Manufacturing',
        'Education', 'Hospitality'
    ];
    const DISCOVER_EVENTS_API_URL = import.meta.env.VITE_DISCOVER_EVENTS_API_URL || '';

    const startFetching = async () => {
        if (isFetching) return;
        if (!DISCOVER_EVENTS_API_URL) {
            alert("Discovery isn't configured yet. Set VITE_DISCOVER_EVENTS_API_URL in .env once the Cloud Function is deployed.");
            return;
        }

        setIsFetching(true);
        stopRequestedRef.current = false;
        let totalFound = 0;

        for (const sector of DISCOVERY_SECTORS) {
            if (stopRequestedRef.current) break;

            setScrapingStatus({ running: true, current_sector: `Scanning: ${sector} sector...`, new_found: totalFound });

            try {
                const res = await fetch(DISCOVER_EVENTS_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sector })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    totalFound += data.newFound || 0;
                    setScrapingStatus({
                        running: true,
                        current_sector: `${sector}: found ${data.newFound || 0} new`,
                        new_found: totalFound
                    });
                } else {
                    console.error(`Discovery failed for ${sector}:`, data.error);
                }
            } catch (err) {
                console.error(`Discovery request failed for ${sector}:`, err);
            }
        }

        setIsFetching(false);
        setScrapingStatus({ running: false, current_sector: null, new_found: totalFound });
    };

    const stopFetching = () => {
        stopRequestedRef.current = true;
        setScrapingStatus(prev => ({ ...prev, current_sector: 'Stopping after current sector...' }));
    };

    const handleExport = () => {
        const headers = "Event Name,Category,Sector,Date,Location,Venue,Status,Confidence,Source\n";
        const rows = events.map(e =>
            `"${e.event_name || e.name}","${e.event_type || e.type || 'Event'}","${e.sector}","${e.date || 'TBD'}","${e.location || 'India'}","${e.venue || ''}","${e.status}","${e.confidence}%","${e.source_url || ''}"`
        ).join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "discoveries_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ----------------------------------------------------
    // FILTER ENGINE
    // ----------------------------------------------------
    const filteredEvents = events.filter(e => {
        const evName = e.event_name || e.name || '';
        const evType = e.event_type || e.type || e.category || 'Event';
        const evSector = e.sector || '';
        const evStatus = e.status || 'UPCOMING';
        const evLocation = e.location || e.venue || '';
        const evOrganizer = e.organizer || '';

        // Tab category filter
        const matchTab = activeTab === 'all' || 
                         (activeTab === 'Awards' && evType.toLowerCase() === 'awards') ||
                         (activeTab === 'Event' && (evType.toLowerCase() === 'event' || evType.toLowerCase() === 'events'));
        // Sector filter
        const matchSector = selectedSector === 'all' || evSector === selectedSector;
        // Status filter
        const matchStatus = selectedStatus === 'all' || evStatus === selectedStatus;
        // City filter
        const matchCity = selectedCity === 'all' || evLocation.toLowerCase().includes(selectedCity.toLowerCase());
        // Keyword filter
        const matchKeyword = !searchKeyword || evName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                            evOrganizer.toLowerCase().includes(searchKeyword.toLowerCase());

        return matchTab && matchSector && matchStatus && matchCity && matchKeyword;
    });

    // Stats calculations
    const totalAwards = events.filter(e => {
        const evType = e.event_type || e.type || e.category || '';
        return evType.toLowerCase() === 'awards';
    }).length;
    
    const totalEvents = events.filter(e => {
        const evType = e.event_type || e.type || e.category || '';
        return evType.toLowerCase() === 'event' || evType.toLowerCase() === 'events';
    }).length;

    // Confidence ratings styling
    const getConfidenceDetails = (score) => {
        if (score >= 90) return { color: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]', label: 'Platinum' };
        if (score >= 75) return { color: 'bg-emerald-400 shadow-[0_0_8px_#34d399]', label: 'High' };
        if (score >= 50) return { color: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]', label: 'Medium' };
        return { color: 'bg-rose-400 shadow-[0_0_8px_#f87171]', label: 'Low' };
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 font-sans">
            
            {/* Real-time Status Overlay Modal */}
            <AnimatePresence>
                {isFetching && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[2000] flex flex-col items-center justify-center text-white"
                    >
                        <div className="relative flex flex-col items-center max-w-md text-center p-8 bg-[#111827] rounded-3xl border border-slate-800 shadow-2xl">
                            {/* Spinning glow ring */}
                            <div className="relative h-20 w-20 mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                                <Cpu className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={28} />
                            </div>

                            <h2 className="text-xl font-black uppercase tracking-wider text-white">Discovery Engine Active</h2>
                            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-semibold">Scanning Serper Web Index...</p>
                            
                            {/* Scanning path progress log */}
                            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 my-5 text-[10px] font-mono text-left space-y-1.5 overflow-hidden">
                                <div className="text-indigo-400 font-bold">&gt;_ SCRAPER RUNNING...</div>
                                <div className="text-slate-300 truncate">Status: {scrapingStatus.current_sector || 'Initializing queries...'}</div>
                                <div className="text-emerald-400 font-bold">New Discoveries Found: {scrapingStatus.new_found || 0}</div>
                            </div>

                            <button
                                onClick={stopFetching}
                                className="flex items-center gap-1.5 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                            >
                                <Square size={11} fill="currentColor" />
                                Stop Fetching
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Dashboard Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
                
                <div className="relative flex items-center gap-4">
                    <div className="h-12 w-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl shadow-lg flex items-center justify-center font-black text-white text-lg">E</div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight uppercase italic flex items-center gap-2">
                            E&A Discovery <span className="text-indigo-400 font-bold not-italic">Dashboard</span>
                        </h1>
                        <p className="text-slate-400 text-xs font-semibold mt-0.5">High-Signal Scraper Engine & Dynamic Registry</p>
                    </div>
                </div>

                {/* Firestore connection + registry size badge */}
                <div className="relative flex items-center gap-4 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
                    <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Discoveries</p>
                        <p className="text-sm font-black text-indigo-400 mt-0.5">{events.length}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-300">{isConnected ? 'Live' : 'Connecting...'}</span>
                    </div>
                </div>
            </div>

            {/* AI Recommendation Panel */}
            <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200/40 dark:border-indigo-800/40 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" />
                    Get Event/Award Recommendations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                    Describe the client/profile in plain language - picks come from the real registry, ranked with a reason for each.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={recQuery}
                        onChange={(e) => setRecQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGetRecommendations()}
                        placeholder="e.g. fintech startup client in Mumbai looking for leadership awards"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <button
                        onClick={handleGetRecommendations}
                        disabled={recLoading || !recQuery.trim()}
                        className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {recLoading ? (
                            <>
                                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Thinking...
                            </>
                        ) : (
                            <>
                                <Sparkles size={13} />
                                Get Recommendations
                            </>
                        )}
                    </button>
                </div>

                {recError && (
                    <p className="text-xs font-bold text-rose-500">{recError}</p>
                )}

                {recResults && (
                    recResults.length === 0 ? (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
                            No strong matches found in the current registry for this request.
                        </p>
                    ) : (
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between pb-1">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Recommended Matches ({recResults.length})</span>
                                <button
                                    onClick={handleExportRecommendations}
                                    className="flex items-center gap-1 text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-md transition-all cursor-pointer"
                                >
                                    <Download size={10} /> Export Excel
                                </button>
                            </div>
                            {recResults.map((ev, i) => {
                                const cleanNe = String(ev.event_name || ev.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                const localEv = events.find(e => {
                                    const cleanName = String(e.event_name || e.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                    return cleanName === cleanNe;
                                });
                                const finalName = localEv?.event_name || localEv?.name || ev.event_name || ev.name;
                                const finalSector = localEv?.sector || ev.sector;
                                const finalLoc = localEv?.location || ev.location || 'India';
                                const finalVenue = localEv?.venue || ev.venue || 'N/A';
                                const finalDeadline = localEv?.nomination_deadline || ev.nomination_deadline;
                                const finalLink = localEv?.source_url || ev.source_url;

                                return (
                                    <button
                                        key={ev.docId || i}
                                        type="button"
                                        onClick={() => {
                                            setSearchKeyword(finalName);
                                            setSelectedSector('all');
                                            setActiveTab('all');
                                            setSelectedStatus('all');
                                            setSelectedCity('all');
                                            document.getElementById('events-table-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="w-full text-left bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                                    >
                                        <span className="shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-[10px] font-black flex items-center justify-center mt-0.5">
                                            {i + 1}
                                        </span>
                                        <div className="sm:w-56 shrink-0">
                                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">{finalName}</p>
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mt-0.5">{finalSector} &middot; {finalLoc} {finalVenue !== 'N/A' && `(${finalVenue})`}</p>
                                            {finalDeadline && <p className="text-[10px] text-rose-500 font-bold mt-0.5">Deadline: {finalDeadline}</p>}
                                        </div>
                                        <p className="flex-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">{ev.reason}</p>
                                        {finalLink ? (
                                            <a
                                                href={finalLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-wide bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                                            >
                                                Visit Site <ExternalLink size={11} />
                                            </a>
                                        ) : (
                                            <span className="shrink-0 text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-wide px-2.5 py-1.5">No link</span>
                                        )}
                                        <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-indigo-500 transition-colors mt-0.5" />
                                    </button>
                                );
                            })}
                        </div>
                    )
                )}

            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Bookmark size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Awards</p>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalAwards}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500"><Calendar size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Events</p>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{totalEvents}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs flex items-center gap-4">
                    <div className="p-3 bg-sky-500/10 rounded-xl text-sky-500"><TrendingUp size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Discoveries</p>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{events.length}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500"><Database size={20} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Industries Tracked</p>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{sectorsList.length}</h3>
                    </div>
                </div>
            </div>

            {/* Actions Panel with Play & Stop controls */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {/* START BUTTON */}
                    <button
                        onClick={startFetching}
                        disabled={isFetching}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                            isFetching 
                            ? 'bg-slate-100 dark:bg-slate-800 text-gray-400' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10 hover:-translate-y-0.5'
                        }`}
                    >
                        <Play size={11} fill="currentColor" />
                        Start Fetching
                    </button>

                    {/* STOP BUTTON */}
                    <button
                        onClick={stopFetching}
                        disabled={!isFetching}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                            !isFetching 
                            ? 'bg-slate-100 dark:bg-slate-800 text-gray-400' 
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10 hover:-translate-y-0.5'
                        }`}
                    >
                        <Square size={11} fill="currentColor" />
                        Stop Fetching
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-slate-200/40"
                    >
                        <Download size={12} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters panel layout */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* View Categories Tabs */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">View Category</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                            <button 
                                onClick={() => setActiveTab('all')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setActiveTab('Awards')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'Awards' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                Awards
                            </button>
                            <button 
                                onClick={() => setActiveTab('Event')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'Event' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                            >
                                Events
                            </button>
                        </div>
                    </div>

                    {/* Sector select option */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Industry Sector</label>
                        <select
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none"
                            value={selectedSector}
                            onChange={e => setSelectedSector(e.target.value)}
                        >
                            <option value="all">All Sectors</option>
                            {sectorsList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Status select option */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                        <select
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none"
                            value={selectedStatus}
                            onChange={e => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="NOMINATIONS_OPEN">Nominations Open</option>
                            <option value="UPCOMING">Upcoming</option>
                            <option value="CONCLUDED">Concluded</option>
                        </select>
                    </div>

                    {/* City select option */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">City / Location</label>
                        <select
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none"
                            value={selectedCity}
                            onChange={e => setSelectedCity(e.target.value)}
                        >
                            <option value="all">All Cities</option>
                            {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Keyword search input */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input 
                        type="text"
                        placeholder="Search event title or keywords..."
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 pl-10 pr-4 py-2 text-xs font-semibold text-gray-800 dark:text-gray-100 placeholder-gray-400 rounded-xl focus:outline-none"
                    />
                </div>
            </div>

            {/* Scraped Results Data Table */}
            <div id="events-table-section" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-3xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                <th className="p-4 pl-6 min-w-[280px]">Event / Award Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Sector</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4 min-w-[150px]">Location / Venue</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Confidence</th>
                                <th className="p-4 pr-6">Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-16 text-center text-gray-400 font-bold uppercase tracking-wider text-xs">
                                        No matching discoveries found.
                                    </td>
                                </tr>
                            ) : (
                                filteredEvents.map((e, index) => {
                                    const conf = getConfidenceDetails(e.confidence);
                                    
                                    // Status tag styling
                                    let statusBg = 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 border border-sky-200/30';
                                    if (e.status === 'NOMINATIONS_OPEN') statusBg = 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200/30';
                                    if (e.status === 'CONCLUDED') statusBg = 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/20';

                                    return (
                                        <tr key={e.docId || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group">
                                            {/* Name */}
                                            <td className="p-4 pl-6">
                                                <div className="font-extrabold text-xs text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                                                    {e.event_name || e.name || 'Unnamed Discovery'}
                                                </div>
                                                {e.nomination_deadline && (
                                                    <div className="text-[9px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1 mt-1">
                                                        <span>⏰ Deadline:</span>
                                                        <span>{e.nomination_deadline}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Type */}
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[9px] font-black uppercase tracking-wider">
                                                    {e.event_type || e.type || e.category || 'Event'}
                                                </span>
                                            </td>

                                            {/* Sector */}
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-black uppercase tracking-wider">
                                                    {e.sector}
                                                </span>
                                            </td>

                                            {/* Dates */}
                                            <td className="p-4">
                                                <div className="text-xs font-bold text-gray-700 dark:text-slate-300">
                                                    {e.date || 'TBD'}
                                                </div>
                                            </td>

                                            {/* Location */}
                                            <td className="p-4">
                                                <div className="text-xs font-extrabold text-gray-800 dark:text-slate-200">
                                                    {e.location || e.venue || 'India'}
                                                </div>
                                                {e.venue && (
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                                        <MapPin size={9} /> {e.venue}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="p-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusBg}`}>
                                                    {(e.status || 'UPCOMING').replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Confidence */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300">
                                                    <span className={`h-2 w-2 rounded-full ${conf.color}`} />
                                                    <span>{e.confidence}%</span>
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">({conf.label})</span>
                                                </div>
                                            </td>

                                            {/* Source */}
                                            <td className="p-4 pr-6">
                                                <a 
                                                    href={e.source_url || '#'} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-wider outline-none"
                                                >
                                                    <span>Link</span>
                                                    <ExternalLink size={10} />
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

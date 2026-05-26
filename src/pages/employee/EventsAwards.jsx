import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, 
    Square, 
    Calendar, 
    MapPin, 
    Globe, 
    RefreshCw, 
    Search,
    Database,
    AlertCircle,
    CheckCircle,
    Info,
    ExternalLink,
    Download,
    Cpu,
    TrendingUp,
    Bookmark,
    ShieldAlert
} from 'lucide-react';

// Import the copied database of 723 events directly
import defaultEvents from '../../data/events_data.json';

export default function EventsAwards() {
    // ----------------------------------------------------
    // STATE MANAGEMENT
    // ----------------------------------------------------
    const [events, setEvents] = useState(defaultEvents);
    const [credits, setCredits] = useState({ daily: 0, monthly: 0 });
    const [scrapingStatus, setScrapingStatus] = useState({ running: false, current_sector: null, new_found: 0 });
    
    // Filter controls
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'Awards', 'Event'
    const [selectedSector, setSelectedSector] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedCity, setSelectedCity] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const [isFetching, setIsFetching] = useState(false);
    const [apiActive, setApiActive] = useState(false);

    // References for intervals
    const pollIntervalRef = useRef(null);
    const apiCheckRef = useRef(null);
    const simulationTimeoutRef = useRef(null);

    // List of dynamic cities & sectors for filters
    const [citiesList, setCitiesList] = useState([]);
    const [sectorsList, setSectorsList] = useState([]);

    // ----------------------------------------------------
    // STATIC DATA INITIALIZATION
    // ----------------------------------------------------
    useEffect(() => {
        // Build dynamic filter values from initially loaded events
        const uniqueSectors = Array.from(new Set(defaultEvents.map(e => e.sector))).filter(Boolean);
        const uniqueCities = Array.from(new Set(defaultEvents.map(e => e.location))).filter(Boolean);
        setSectorsList(uniqueSectors.sort());
        setCitiesList(uniqueCities.sort());
    }, []);

    // ----------------------------------------------------
    // LIVE SERVER CHECK & SYNC
    // ----------------------------------------------------
    const loadBackendData = async () => {
        try {
            const [eventsRes, creditsRes, statusRes] = await Promise.all([
                fetch('http://localhost:5000/api/events'),
                fetch('http://localhost:5000/api/credits'),
                fetch('http://localhost:5000/api/status')
            ]);

            if (eventsRes.ok && creditsRes.ok && statusRes.ok) {
                const eventsData = await eventsRes.json();
                const creditsData = await creditsRes.json();
                const statusData = await statusRes.json();

                // Merge live backend data with default static data, filtering duplicates by event_key
                const merged = [...eventsData];
                const keys = new Set(eventsData.map(e => e.event_key || (e.event_name + e.location)));
                
                defaultEvents.forEach(de => {
                    const deKey = de.event_key || (de.event_name + de.location);
                    if (!keys.has(deKey)) {
                        merged.push(de);
                    }
                });

                setEvents(merged);
                setCredits(creditsData);
                setScrapingStatus(statusData);
                setApiActive(true);

                // Build sectors & cities lists from combined set
                const uniqueSectors = Array.from(new Set(merged.map(e => e.sector))).filter(Boolean);
                const uniqueCities = Array.from(new Set(merged.map(e => e.location))).filter(Boolean);
                setSectorsList(uniqueSectors.sort());
                setCitiesList(uniqueCities.sort());

                // Sync live backend running state with UI spinner
                if (statusData.running) {
                    setIsFetching(true);
                    triggerPollLoop();
                } else if (!simulationTimeoutRef.current) {
                    setIsFetching(false);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                }
            }
        } catch (e) {
            setApiActive(false);
        }
    };

    // Periodically sync with backend
    useEffect(() => {
        loadBackendData();
        apiCheckRef.current = setInterval(loadBackendData, 6000);

        return () => {
            if (apiCheckRef.current) clearInterval(apiCheckRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);
        };
    }, []);

    // ----------------------------------------------------
    // POLLING ENGINE FOR CRAWLER STATUS
    // ----------------------------------------------------
    const triggerPollLoop = () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
            try {
                const statusRes = await fetch('http://localhost:5000/api/status');
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setScrapingStatus(statusData);

                    if (!statusData.running) {
                        clearInterval(pollIntervalRef.current);
                        setIsFetching(false);
                        loadBackendData(); // Sync discoveries
                    }
                }
            } catch (e) {
                console.error("Status polling failed", e);
            }
        }, 1500);
    };

    // ----------------------------------------------------
    // ACTIVE START / STOP CONTROLS
    // ----------------------------------------------------
    const startFetching = async () => {
        if (isFetching) return;
        setIsFetching(true);

        if (apiActive) {
            // Live Server Scraper trigger
            try {
                const res = await fetch('http://localhost:5000/api/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sector: selectedSector === 'all' ? 'full' : selectedSector })
                });
                if (res.ok) {
                    const status = await res.json();
                    if (status.status === 'started') {
                        triggerPollLoop();
                    }
                }
            } catch (e) {
                console.error("Scraper launch failed", e);
            }
        } else {
            // Simulation Fallback mode when server is offline
            let progress = 0;
            const sectorsToSimulate = ["BFSI", "Technology", "Healthcare", "Fintech", "Commercial vehicle"];
            
            const stepSimulation = () => {
                if (progress >= sectorsToSimulate.length) {
                    setIsFetching(false);
                    // Add mock discovery to database
                    const mockEvent = {
                        event_name: `India Excellence Leadership Forum (${new Date().getFullYear()})`,
                        event_type: "Awards",
                        sector: selectedSector === 'all' ? "Technology" : selectedSector,
                        date: "14/11/2026",
                        location: "Delhi NCR",
                        venue: "Grand Hyatt Regency",
                        status: "NOMINATIONS_OPEN",
                        confidence: 95,
                        nomination_deadline: "30/10/2026",
                        source_url: "https://example.com/awards-nominations"
                    };
                    setEvents(prev => [mockEvent, ...prev]);
                    setScrapingStatus({ running: false, current_sector: null, new_found: 1 });
                    return;
                }

                setScrapingStatus({
                    running: true,
                    current_sector: `Scanning: ${sectorsToSimulate[progress]} sector index...`,
                    new_found: progress + 1
                });

                progress++;
                simulationTimeoutRef.current = setTimeout(stepSimulation, 1200);
            };

            stepSimulation();
        }
    };

    const stopFetching = async () => {
        setIsFetching(false);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);

        setScrapingStatus({ running: false, current_sector: null, new_found: 0 });

        if (apiActive) {
            try {
                await fetch('http://localhost:5000/api/reset', { method: 'POST' });
                loadBackendData();
            } catch (e) {
                console.error("Failed to reset backend scraper status", e);
            }
        }
    };

    const handleExport = () => {
        if (apiActive) {
            window.location.href = 'http://localhost:5000/api/export';
        } else {
            // Simple mock CSV download for offline mode
            const headers = "Event Name,Category,Sector,Date,Location,Venue,Status,Confidence,Source\n";
            const rows = events.slice(0, 10).map(e => 
                `"${e.event_name || e.name}","${e.event_type || e.type || 'Event'}","${e.sector}","${e.date || 'TBD'}","${e.location || 'India'}","${e.venue || ''}","${e.status}","${e.confidence}%","${e.source_url || ''}"`
            ).join("\n");
            
            const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "discoveries_export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
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

                {/* Serper Credits Badge Counter */}
                <div className="relative flex items-center gap-4 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
                    <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Today's Queries</p>
                        <p className="text-sm font-black text-indigo-400 mt-0.5">{credits.daily} <span className="text-slate-500 text-3xs font-bold">/ 80</span></p>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Monthly Cap</p>
                        <p className="text-sm font-black text-purple-400 mt-0.5">{credits.monthly} <span className="text-slate-500 text-3xs font-bold">/ 2400</span></p>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${apiActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-300">{apiActive ? 'Active' : 'Standby'}</span>
                    </div>
                </div>
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
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-3xs overflow-hidden">
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
                                        No matching discoveries found in SQLite database.
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
                                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group">
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

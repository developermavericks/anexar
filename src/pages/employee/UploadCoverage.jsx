import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    FileText,
    Plus,
    Trash2,
    Calendar,
    Award,
    TrendingUp,
    TrendingDown,
    Minus,
    CheckCircle2,
    Briefcase,
    Globe,
    Activity,
    ChevronRight,
    Search
} from 'lucide-react';
import { pressReleases as defaultPress } from '../../mock/clientData';

export default function UploadCoverage() {
    // ----------------------------------------------------
    // INITIALIZE FROM LOCALSTORAGE
    // ----------------------------------------------------
    const [coverageList, setCoverageList] = useState(() => {
        const saved = localStorage.getItem('anexar_press_releases');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return defaultPress;
    });

    const [assignedClients] = useState(() => {
        const saved = localStorage.getItem('anexar_assigned_clients');
        return saved ? JSON.parse(saved) : ['RedBull Racing', 'Spotify', 'Vercel', 'Acura Corporate', 'Nike'];
    });

    // Form states
    const [title, setTitle] = useState('');
    const [clientName, setClientName] = useState('Spotify');
    const [dateSent, setDateSent] = useState(new Date().toISOString().split('T')[0]);
    const [pressPickups, setPressPickups] = useState(25);
    const [estimatedReach, setEstimatedReach] = useState('1.5M');
    const [sentiment, setSentiment] = useState('Positive');
    const [status, setStatus] = useState('Published');
    
    // Search
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        localStorage.setItem('anexar_press_releases', JSON.stringify(coverageList));
    }, [coverageList]);

    // ----------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------
    const handleUpload = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const newCoverage = {
            id: Date.now(),
            title: title.trim(),
            client: clientName,
            dateSent,
            pressPickups: parseInt(pressPickups) || 0,
            estimatedReach: estimatedReach || '100K',
            sentiment,
            status
        };

        setCoverageList([newCoverage, ...coverageList]);
        setTitle('');
        setEstimatedReach('1.5M');
        setPressPickups(25);
        
        // Add dynamic client update as well to feed!
        const savedUpdates = localStorage.getItem('anexar_client_updates');
        let currentUpdates = [];
        if (savedUpdates) {
            try { currentUpdates = JSON.parse(savedUpdates); } catch (e) { console.error(e); }
        }
        const newUpdate = {
            id: Date.now() + 1,
            client: clientName,
            update: `New press coverage published: "${newCoverage.title}" (Estimated Reach: ${newCoverage.estimatedReach}).`,
            time: 'Just now'
        };
        localStorage.setItem('anexar_client_updates', JSON.stringify([newUpdate, ...currentUpdates]));
    };

    const handleDelete = (id) => {
        const updated = coverageList.filter(item => item.id !== id);
        setCoverageList(updated);
    };

    const getSentimentColor = (sent) => {
        switch (sent) {
            case 'Positive': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            case 'Negative': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
            default: return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    const filteredCoverage = coverageList.filter(c => {
        const term = searchTerm.toLowerCase();
        return c.title.toLowerCase().includes(term) || 
               (c.client && c.client.toLowerCase().includes(term));
    });

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-8">
            {/* Heading Banner */}
            <div className="border-b border-brand-border/20 pb-5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-brand-amber stroke-[2.5px]" size={24} />
                    Upload Press & Media Coverage
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Upload and configure news coverage. Uploads automatically publish live directly to client campaign portals.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLUMN 1: UPLOAD FORM CARD */}
                <div className="lg:col-span-1">
                    <Card className="border-none shadow-soft bg-white dark:bg-slate-900 sticky top-24">
                        <CardContent className="p-6">
                            <div className="border-b border-brand-border/20 pb-3 mb-5">
                                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Plus size={16} className="text-brand-amber" />
                                    Declare Media Hit
                                </h3>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-4">
                                {/* Title */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Press Release / Headline Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Spotify Launching New Premium Hi-Fi Tier..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                </div>

                                {/* Target Client Dropdown */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Target Client Account</label>
                                    <select
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
                                    >
                                        {assignedClients.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Date Sent */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Date Sent</label>
                                        <input
                                            type="date"
                                            value={dateSent}
                                            onChange={(e) => setDateSent(e.target.value)}
                                            required
                                            className="h-10 px-3 text-2xs font-semibold rounded-xl border border-brand-border/40 bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
                                        />
                                    </div>

                                    {/* Estimated Reach */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Estimated Reach</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1.2M"
                                            value={estimatedReach}
                                            onChange={(e) => setEstimatedReach(e.target.value)}
                                            required
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Media Pickups */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Pickups Count</label>
                                        <input
                                            type="number"
                                            value={pressPickups}
                                            onChange={(e) => setPressPickups(e.target.value)}
                                            required
                                            min="0"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
                                        />
                                    </div>

                                    {/* Sentiment */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Sentiment</label>
                                        <select
                                            value={sentiment}
                                            onChange={(e) => setSentiment(e.target.value)}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
                                        >
                                            <option value="Positive">Positive</option>
                                            <option value="Neutral">Neutral</option>
                                            <option value="Negative">Negative</option>
                                        </select>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full cursor-pointer h-10 text-xs font-bold mt-4 flex items-center justify-center gap-1.5 shadow-sm">
                                    <Plus size={15} />
                                    <span>Upload & Sync Live</span>
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* COLUMN 2: REGISTRY ARCHIVE VIEW */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search bar */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#EAE8E4] dark:border-slate-800 shadow-3xs">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search uploaded press items by headline or brand..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 text-xs font-semibold rounded-xl border border-[#EAE8E4] dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber bg-[#FDFBF7] dark:bg-slate-800 text-brand-charcoal dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Coverage Listing Cards */}
                    <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                        {filteredCoverage.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 border border-dashed rounded-2xl">
                                No coverage details listed. Use the upload panel to declare headlines.
                            </div>
                        ) : (
                            filteredCoverage.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-5 bg-white dark:bg-slate-900 border border-[#EAE8E4] dark:border-slate-800 rounded-2xl hover:border-brand-amber/35 transition-all flex items-start justify-between gap-4 shadow-3xs"
                                >
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2 py-0.5 bg-brand-amber/15 text-brand-amber text-4xs font-extrabold uppercase tracking-widest rounded-full">
                                                {item.client || 'General'}
                                            </span>
                                            <span className={`px-2 py-0.5 text-4xs font-extrabold uppercase tracking-wider rounded border ${getSentimentColor(item.sentiment)}`}>
                                                {item.sentiment}
                                            </span>
                                        </div>
                                        <h4 className="font-extrabold text-sm text-brand-charcoal dark:text-white leading-relaxed">
                                            {item.title}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-4xs font-extrabold text-brand-gray uppercase tracking-wider pt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={11} className="text-brand-amber" />
                                                Sent: {item.dateSent}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Activity size={11} className="text-brand-amber" />
                                                Pickups: {item.pressPickups}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Globe size={11} className="text-brand-amber" />
                                                Reach: {item.estimatedReach}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-brand-gray hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                        title="Delete press coverage record"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

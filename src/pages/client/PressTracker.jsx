import React, { useState } from 'react';
import { pressReleases as defaultPress } from '../../mock/clientData';
import { Search, Newspaper, Calendar, User, Sparkles, Filter, AlertCircle, FileSpreadsheet, X, Eye, ArrowUpDown } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const PressTracker = () => {
    const { user } = useUser();
    const [searchTerm, setSearchTerm] = useState('');
    
    // Check if the user is the developer/tester Satyam or Google User to enable smart demo capabilities
    const isDeveloperTest = user?.name?.toLowerCase().includes('satyam') || user?.name?.toLowerCase().includes('google user');
    const isClientRole = user?.role === 'client' && !isDeveloperTest;

    const [pressList, setPressList] = useState(() => {
        const saved = localStorage.getItem('anexar_press_releases');
        if (saved) {
            try { 
                return JSON.parse(saved); 
            } catch (e) { 
                console.error(e); 
            }
        }
        // Format default mock releases
        return defaultPress.map(p => ({
            id: p.id,
            client: p.client || 'Visionary Media',
            month: 'May',
            year: '2026',
            type: 'manual',
            coverage: `Visionary Media secure major press hit: "${p.title}". Secured standard syndication and strategic mentions across major industry tech outlets.`
        }));
    });

    // Smart default filter for developers/testers to auto-select their uploaded client (e.g. fujifilm)
    const [selectedClient, setSelectedClient] = useState(() => {
        const customClient = pressList.find(pr => pr.client && pr.client.toLowerCase() !== 'visionary media');
        if (customClient) return customClient.client;
        return 'All';
    });

    // Modal sheet viewer state
    const [selectedExcelReport, setSelectedExcelReport] = useState(null);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Filter to selected client or logged-in client
    const clientToFilter = isClientRole ? user.name : selectedClient;

    // Dynamic unique list of client names for filter dropdown
    const clientOptions = ['All', ...new Set(pressList.map(pr => pr.client || 'Spotify'))];

    const filteredPress = pressList.filter(pr => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = pr.type === 'excel'
            ? ((pr.client && pr.client.toLowerCase().includes(term)) || (pr.fileName && pr.fileName.toLowerCase().includes(term)))
            : ((pr.client && pr.client.toLowerCase().includes(term)) || (pr.coverage && pr.coverage.toLowerCase().includes(term)));
        
        const matchesClient = isClientRole
            ? (pr.client && pr.client.toLowerCase() === clientToFilter.toLowerCase())
            : (selectedClient === 'All' || pr.client === selectedClient);

        return matchesSearch && matchesClient;
    });

    // Reset states when modal closes
    const handleCloseModal = () => {
        setSelectedExcelReport(null);
        setSortColumn(null);
    };

    const handleSortByHeader = (header) => {
        if (sortColumn === header) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(header);
            setSortDirection('asc');
        }
    };

    const getSortedRows = () => {
        if (!selectedExcelReport) return [];
        const rows = selectedExcelReport.rows;
        if (!sortColumn) return rows;

        return [...rows].sort((a, b) => {
            const valA = (a[sortColumn] || '').toString().trim().toLowerCase();
            const valB = (b[sortColumn] || '').toString().trim().toLowerCase();

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-12 text-slate-900 dark:text-slate-100 animate-fade-in relative">
            
            {/* Elegant glassmorphic banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-indigo-650/10 dark:from-amber-500/20 dark:to-indigo-600/20 border border-amber-500/20 rounded-3xl p-8 shadow-xl">
                <div className="absolute -right-16 -top-16 w-36 h-36 bg-amber-500/20 dark:bg-amber-500/30 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 flex items-center gap-3">
                            <Newspaper className="text-amber-500 dark:text-amber-400 stroke-[2.5px]" size={28} />
                            Media & Press Coverage
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xl font-medium">
                            {isClientRole 
                                ? `Monitor published media wins, coverage trackers, and files secured for ${user.name}.`
                                : `Monitor published media wins, press distribution, and campaign coverage.`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-900 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search coverage content..."
                        className="w-full h-11 pl-11 pr-4 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-900 dark:text-white transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Show brand selector dropdown if logged in as admin/developer (Satyam) for quick demo testing */}
                {!isClientRole && (
                    <div className="relative w-full md:w-64 flex items-center gap-2">
                        <Filter className="text-amber-550 shrink-0" size={16} />
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="w-full h-11 px-4 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                        >
                            {clientOptions.map(client => (
                                <option key={client} value={client}>
                                    {client === 'All' ? 'Filter by Client: All' : `Client: ${client}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Interactive Grid Feed of Whole Coverage Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPress.length > 0 ? (
                    filteredPress.map((pr) => (
                        <div
                            key={pr.id}
                            onClick={() => pr.type === 'excel' && setSelectedExcelReport(pr)}
                            className={`group relative bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-6 rounded-3xl shadow-lg hover:shadow-2xl hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between overflow-hidden ${pr.type === 'excel' ? 'cursor-pointer' : ''}`}
                        >
                            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${pr.type === 'excel' ? 'from-purple-500 to-indigo-650' : 'from-amber-500 to-amber-600'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                            
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                        <User size={10} className="shrink-0" />
                                        {pr.client || 'Visionary Media'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                        <Calendar size={10} className="shrink-0" />
                                        {pr.month || 'May'} {pr.year || '2026'}
                                    </span>
                                    {pr.type === 'excel' && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/10 text-purple-650 dark:text-purple-455 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                            Spreadsheet: {pr.rows.length} Rows
                                        </span>
                                    )}
                                </div>

                                {pr.type === 'excel' ? (
                                    <div className="bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl p-5 border border-purple-500/10 flex items-center justify-between group-hover:bg-purple-500/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="text-purple-555 animate-pulse" size={24} />
                                            <div>
                                                <p className="text-xs font-black text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-450 transition-colors">
                                                    {pr.fileName}
                                                </p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase mt-0.5">
                                                    Click to open interactive tracker
                                                </p>
                                            </div>
                                        </div>
                                        <Eye className="text-purple-400 group-hover:text-purple-600 transition-colors shrink-0" size={16} />
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-100/80 dark:border-slate-905/80 transition-all">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed whitespace-pre-wrap">
                                            {pr.coverage}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-16 text-center text-slate-400 bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
                        <AlertCircle className="mx-auto text-slate-305 dark:text-slate-700 mb-3" size={40} />
                        <p className="text-xs font-bold uppercase tracking-widest">No Coverage wins Found</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            {isClientRole 
                                ? `No media wins have been uploaded for ${user.name} yet.`
                                : "Try adapting your search or filter requirements."}
                        </p>
                    </div>
                )}
            </div>

            {/* DYNAMIC SPREADSHEET TABLE VIEWER MODAL */}
            {selectedExcelReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-950 w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-850 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="text-purple-500 animate-pulse" size={22} />
                                    {selectedExcelReport.fileName}
                                </h3>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500 mt-1">
                                    Client: {selectedExcelReport.client} | Period: {selectedExcelReport.month} {selectedExcelReport.year} | {selectedExcelReport.rows.length} rows loaded
                                </p>
                            </div>

                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Interactive Table with Sticky Headers */}
                        <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/10">
                            <div className="border border-slate-150 dark:border-slate-855 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                                <table className="w-full text-left border-collapse text-xs font-semibold">
                                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold sticky top-0 uppercase tracking-wider text-[9px] border-b border-slate-200 dark:border-slate-800 z-10">
                                        <tr>
                                            {selectedExcelReport.headers.map((h, i) => {
                                                const isActive = sortColumn === h;
                                                return (
                                                    <th 
                                                        key={i} 
                                                        onClick={() => handleSortByHeader(h)}
                                                        className={`p-4 relative select-none transition-colors border-r border-slate-200 dark:border-slate-800/60 cursor-pointer hover:text-amber-500 ${isActive ? 'bg-slate-250/60 dark:bg-slate-900/60 text-amber-600 dark:text-amber-400' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{h}</span>
                                                            <ArrowUpDown size={11} className={`opacity-40 transition-opacity ${isActive ? 'opacity-100 text-amber-500' : ''}`} />
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {getSortedRows().map((row, rIdx) => {
                                            const rowValues = Object.values(row).filter(v => v !== null && v !== undefined && v.toString().trim() !== "");
                                            const isDividerRow = rowValues.length === 1;

                                            if (isDividerRow) {
                                                return (
                                                    <tr key={rIdx} className="bg-amber-550/5 dark:bg-amber-500/10 font-black text-amber-600 dark:text-amber-400">
                                                        <td colSpan={selectedExcelReport.headers.length} className="p-4 text-center font-bold tracking-wider uppercase text-2xs bg-amber-500/5">
                                                            {rowValues[0]}
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors text-slate-655 dark:text-slate-400">
                                                    {selectedExcelReport.headers.map((h, cIdx) => (
                                                        <td key={cIdx} className="p-4 align-top whitespace-pre-wrap max-w-sm border-r border-slate-100 dark:border-slate-900/60 last:border-r-0">
                                                            {row[h] !== undefined ? row[h].toString() : ''}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PressTracker;

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
    Search, 
    Mail, 
    Phone, 
    MapPin, 
    Building2, 
    Tag, 
    Plus, 
    User, 
    Copy, 
    Check, 
    Sparkles,
    Trash2,
    X,
    Filter,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import INITIAL_JOURNALISTS from '../../data/journalists_extracted.json';

export default function JournalistSource() {
    const [journalists, setJournalists] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    
    // Modal, upload & notification states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [notification, setNotification] = useState(null);
    
    // Form state for manual add
    const [newJournalist, setNewJournalist] = useState({
        name: '',
        role: '',
        publication: '',
        category: 'Technology & Startups',
        email: '',
        phone: '',
        address: '',
        bio: ''
    });

    // Load from local storage or seed initial
    useEffect(() => {
        const stored = localStorage.getItem('anexar_journalist_db');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setJournalists(parsed);
                if (parsed.length > 0) {
                    setSelectedId(parsed[0].id);
                }
            } catch (e) {
                console.error(e);
                setJournalists(INITIAL_JOURNALISTS);
                setSelectedId(INITIAL_JOURNALISTS[0].id);
            }
        } else {
            localStorage.setItem('anexar_journalist_db', JSON.stringify(INITIAL_JOURNALISTS));
            setJournalists(INITIAL_JOURNALISTS);
            setSelectedId(INITIAL_JOURNALISTS[0].id);
        }
    }, []);

    // Save db helper
    const saveDatabase = (updatedList) => {
        setJournalists(updatedList);
        localStorage.setItem('anexar_journalist_db', JSON.stringify(updatedList));
    };

    const triggerNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleAddJournalist = (e) => {
        e.preventDefault();
        if (!newJournalist.name || !newJournalist.email) return;
        
        const added = {
            ...newJournalist,
            id: 'man_' + Date.now()
        };
        
        const updated = [added, ...journalists];
        saveDatabase(updated);
        setSelectedId(added.id);
        setIsAddModalOpen(false);
        setNewJournalist({
            name: '',
            role: '',
            publication: '',
            category: 'Technology & Startups',
            email: '',
            phone: '',
            address: '',
            bio: ''
        });
        triggerNotification(`${added.name} added to the directory.`, 'success');
    };

    const handleDeleteJournalist = (id) => {
        const remaining = journalists.filter(j => j.id !== id);
        saveDatabase(remaining);
        if (selectedId === id && remaining.length > 0) {
            setSelectedId(remaining[0].id);
        }
        triggerNotification('Journalist record deleted.', 'info');
    };

    // CSV and Excel Import Handler
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const fileName = file.name;
        const fileExt = fileName.split('.').pop().toLowerCase();

        // If it's a CSV file, parse actual text content
        if (fileExt === 'csv') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                try {
                    const parsedRecords = parseCSV(text);
                    if (parsedRecords.length === 0) {
                        triggerNotification('Could not find valid columns in CSV. Expected: name, email, role...', 'error');
                        setIsImporting(false);
                        return;
                    }
                    const updated = [...parsedRecords, ...journalists];
                    saveDatabase(updated);
                    if (parsedRecords.length > 0) {
                        setSelectedId(parsedRecords[0].id);
                    }
                    triggerNotification(`Successfully imported ${parsedRecords.length} contacts from CSV!`, 'success');
                } catch (err) {
                    triggerNotification('Failed to parse CSV file.', 'error');
                }
                setIsImporting(false);
            };
            reader.readAsText(file);
        } 
        // If it's Excel, perform a high-fidelity simulation
        else if (fileExt === 'xlsx' || fileExt === 'xls') {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length <= 1) {
                        triggerNotification('The Excel file is empty or does not contain data.', 'error');
                        setIsImporting(false);
                        return;
                    }
                    
                    const headers = jsonData[0].map(h => String(h).trim().toLowerCase());
                    const parsedRecords = [];
                    
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;
                        
                        const getVal = (name, index, defaultVal) => {
                            const headerIdx = headers.indexOf(name);
                            if (headerIdx !== -1 && row[headerIdx] !== undefined) {
                                return String(row[headerIdx]).trim();
                            }
                            if (row[index] !== undefined) {
                                return String(row[index]).trim();
                            }
                            return defaultVal;
                        };
                        
                        const name = getVal('name', 0, '');
                        if (!name) continue;
                        
                        parsedRecords.push({
                            id: 'xls_' + Date.now() + '_' + i,
                            name: name,
                            role: getVal('role', 1, 'Reporter'),
                            publication: getVal('publication', 2, 'Independent'),
                            category: getVal('category', 3, 'Technology & Startups'),
                            email: getVal('email', 4, 'contact@media.com'),
                            phone: getVal('phone', 5, '+1 (555) 000-0000'),
                            address: getVal('address', 6, 'Remote Office'),
                            bio: getVal('bio', 7, 'Imported from spreadsheet.')
                        });
                    }
                    
                    if (parsedRecords.length === 0) {
                        triggerNotification('Could not extract any valid journalist records from Excel.', 'error');
                        setIsImporting(false);
                        return;
                    }
                    
                    const updated = [...parsedRecords, ...journalists];
                    saveDatabase(updated);
                    setSelectedId(parsedRecords[0].id);
                    triggerNotification(`Successfully imported ${parsedRecords.length} contacts from Excel!`, 'success');
                } catch (err) {
                    console.error(err);
                    triggerNotification('Failed to parse Excel file.', 'error');
                }
                setIsImporting(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            triggerNotification('Unsupported file type. Please upload a .csv, .xls or .xlsx spreadsheet.', 'error');
            setIsImporting(false);
        }
    };

    // Helper: Parse CSV Text
    const parseCSV = (text) => {
        const lines = text.split('\n');
        if (lines.length <= 1) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const results = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;
            
            const getVal = (name, defaultVal) => {
                const idx = headers.indexOf(name);
                return idx !== -1 && cols[idx] ? cols[idx] : defaultVal;
            };
            
            results.push({
                id: 'csv_' + Date.now() + '_' + i,
                name: getVal('name', cols[0] || 'Unknown Journalist'),
                role: getVal('role', cols[1] || 'Reporter'),
                publication: getVal('publication', cols[2] || 'Independent'),
                category: getVal('category', 'Technology & Startups'),
                email: getVal('email', cols[3] || 'imported@email.com'),
                phone: getVal('phone', cols[4] || '+1 (555) 000-0000'),
                address: getVal('address', cols[5] || 'Remote Office'),
                bio: getVal('bio', cols[6] || 'Imported via CSV database spreadsheet.')
            });
        }
        return results;
    };

    // Helper: Simulate Excel Import with high-fidelity mock data
    const simulateExcelImport = (fileName) => {
        return [
            {
                id: 'xls_' + Date.now() + '_1',
                name: 'Charlotte Vance',
                role: 'Enterprise Software Editor',
                publication: 'TechCrunch',
                category: 'Technology & Startups',
                email: 'c.vance@techcrunch.com',
                phone: '+1 (555) 789-0123',
                address: 'Silicon Valley Bureau, CA',
                bio: `Imported from ${fileName}. Covers next-gen databases, cloud computing platforms, and API tooling.`
            },
            {
                id: 'xls_' + Date.now() + '_2',
                name: 'Oliver Thorne',
                role: 'Senior Finance Reporter',
                publication: 'Wall Street Journal',
                category: 'Finance & Markets',
                email: 'o.thorne@wsj.com',
                phone: '+1 (555) 345-6789',
                address: 'Financial District, NY',
                bio: `Imported from ${fileName}. Focuses on retail investments, stock market volatility, and treasury yields.`
            },
            {
                id: 'xls_' + Date.now() + '_3',
                name: 'Sophia Patel',
                role: 'AI Policy Correspondent',
                publication: 'Wired',
                category: 'AI & Tech Ethics',
                email: 's.patel@wired.com',
                phone: '+1 (555) 890-1234',
                address: 'San Francisco, CA',
                bio: `Imported from ${fileName}. Specializes in global AI regulation, data usage policies, and copyright frameworks.`
            },
            {
                id: 'xls_' + Date.now() + '_4',
                name: 'Lucas Dupont',
                role: 'Executive Features Lead',
                publication: 'Forbes',
                category: 'Business & Leadership',
                email: 'l.dupont@forbes.com',
                phone: '+33 1 42 27 78 90',
                address: 'Paris, France',
                bio: `Imported from ${fileName}. Interviews European business leaders, sustainability officers, and VC partners.`
            },
            {
                id: 'xls_' + Date.now() + '_5',
                name: 'Avery Morgan',
                role: 'Cryptocurrency Editor',
                publication: 'Bloomberg',
                category: 'Finance & Markets',
                email: 'a.morgan@bloomberg.net',
                phone: '+1 (555) 567-8901',
                address: 'New York, NY',
                bio: `Imported from ${fileName}. Tracks decentralized finance protocols, stablecoin liquidities, and SEC enforcement.`
            }
        ];
    };

    // Filter logic
    const filteredJournalists = journalists.filter(j => {
        const matchesSearch = j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            j.publication.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            j.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (j.bio && j.bio.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategoryFilter === 'All' || j.category === selectedCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    const selectedJournalist = journalists.find(j => j.id === selectedId) || filteredJournalists[0] || null;

    const categories = ['All', ...Array.from(new Set(journalists.map(j => j.category)))];

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4 py-6 text-slate-900 dark:text-slate-100 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Journalist Directory
                    </h1>
                    <p className="text-gray-550 dark:text-gray-400 mt-2 font-medium">
                        Search, import, and manage media databases for your outreach campaigns.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Excel/CSV File Upload */}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            id="excel_db_upload"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            disabled={isImporting}
                        />
                        <button
                            type="button"
                            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer ${
                                isImporting
                                    ? 'bg-slate-100 text-slate-400'
                                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm'
                            }`}
                        >
                            {isImporting ? (
                                <>
                                    <span className="h-4 w-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></span>
                                    <span>Importing Database...</span>
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet size={16} className="text-indigo-500" />
                                    <span>Import Spreadsheet (.xlsx, .csv)</span>
                                </>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-xs tracking-wider uppercase bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Journalist</span>
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-xl flex items-center gap-3 border shadow-md font-semibold text-xs ${
                            notification.type === 'success' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/20 text-emerald-700 dark:text-emerald-450' 
                                : notification.type === 'error'
                                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-250/20 text-rose-700 dark:text-rose-450'
                                : 'bg-blue-50 dark:bg-blue-950/20 border-blue-250/20 text-blue-700 dark:text-blue-405'
                        }`}
                    >
                        {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Side: Search & Directory List */}
                <div className="lg:col-span-5 space-y-4">
                    
                    {/* Search and filter controls */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4.5 w-4.5" />
                            <input
                                type="text"
                                placeholder="Search name, outlet, title, or bio..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                            />
                        </div>

                        {/* Category Badges Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategoryFilter(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                        selectedCategoryFilter === cat
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Directory List Container */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden max-h-[500px] overflow-y-auto">
                        {filteredJournalists.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="font-semibold text-xs">No journalists found matching your search.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                                {filteredJournalists.map((j) => (
                                    <div
                                        key={j.id}
                                        onClick={() => setSelectedId(j.id)}
                                        className={`p-4 flex items-center justify-between transition-all duration-250 cursor-pointer group ${
                                            selectedId === j.id
                                                ? 'bg-indigo-55/20 dark:bg-indigo-950/20 border-l-4 border-indigo-600'
                                                : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105 ${
                                                selectedId === j.id 
                                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                            }`}>
                                                {j.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {j.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-semibold">
                                                    {j.role} • <span className="font-bold text-indigo-500 dark:text-indigo-400">{j.publication}</span>
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteJournalist(j.id);
                                            }}
                                            className="text-gray-450 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Delete Contact"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: High Fidelity Profile View */}
                <div className="lg:col-span-7">
                    {selectedJournalist ? (
                        <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-8 shadow-xl transition-all duration-300">
                            {/* Decorative gradient blur background inside the profile */}
                            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl" />
                            
                            {/* Profile Header */}
                            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                                    {selectedJournalist.name.charAt(0)}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {selectedJournalist.name}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {selectedJournalist.publication}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                                            <Tag className="h-3.5 w-3.5" />
                                            {selectedJournalist.category}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 pt-0.5">
                                        {selectedJournalist.role}
                                    </p>
                                </div>
                            </div>

                            {/* Contact Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                {/* Left Side: Details Card Block */}
                                <div className="space-y-5 bg-white/40 dark:bg-gray-800/40 rounded-2xl p-5 border border-gray-100/50 dark:border-gray-800/50">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                                        Contact Information
                                    </h3>
                                    
                                    {/* Email */}
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <Mail className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-3xs text-gray-400 uppercase font-semibold">Email Address</p>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                                    {selectedJournalist.email}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.email, 'email')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Email"
                                        >
                                            {copiedField === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Phone */}
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <Phone className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-3xs text-gray-400 uppercase font-semibold">Phone Number</p>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                                    {selectedJournalist.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.phone, 'phone')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Phone"
                                        >
                                            {copiedField === 'phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Address */}
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <MapPin className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-3xs text-gray-400 uppercase font-semibold">Location / Address</p>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                                    {selectedJournalist.address}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.address, 'address')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Address"
                                        >
                                            {copiedField === 'address' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Right Side: Brief / Bio & Pitch actions */}
                                <div className="flex flex-col justify-between space-y-5 bg-white/40 dark:bg-gray-800/40 rounded-2xl p-5 border border-gray-100/50 dark:border-gray-800/50">
                                    <div className="space-y-3">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="h-4 w-4 text-indigo-500" />
                                            Outreach Insights
                                        </h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">
                                            {selectedJournalist.bio || "No custom bio or pitching insight available for this contact."}
                                        </p>
                                    </div>

                                    {/* Action button */}
                                    <a
                                        href={`mailto:${selectedJournalist.email}?subject=Exclusive pitch from Anexar`}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 hover:-translate-y-0.5 transition-all duration-200 text-xs tracking-wider uppercase cursor-pointer"
                                    >
                                        <Mail className="h-4 w-4" />
                                        <span>Draft Pitch Email</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-12 text-center text-gray-400">
                            <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg">Select a journalist from the directory list to view details.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Journalist Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsAddModalOpen(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-[#FDFBF7] dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Journalist</h2>
                            <p className="text-xs text-gray-550 dark:text-gray-400 mt-1 font-semibold">
                                Populate standard contact fields to store this contact inside your workspace.
                            </p>
                        </div>

                        <form onSubmit={handleAddJournalist} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-450 mb-1">Journalist Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newJournalist.name}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, name: e.target.value })}
                                        placeholder="e.g. Liam Foster"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-450 mb-1">Publication *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newJournalist.publication}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, publication: e.target.value })}
                                        placeholder="e.g. VentureBeat"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Role / Job Title</label>
                                    <input
                                        type="text"
                                        value={newJournalist.role}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, role: e.target.value })}
                                        placeholder="e.g. Venture Reporter"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Category</label>
                                    <select
                                        value={newJournalist.category}
                                        onChange={(e) => setNewJournalist({ ...newJournalist, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all cursor-pointer font-semibold"
                                    >
                                        <option value="Technology & Startups">Technology & Startups</option>
                                        <option value="Finance & Markets">Finance & Markets</option>
                                        <option value="Business & Leadership">Business & Leadership</option>
                                        <option value="AI & Tech Ethics">AI & Tech Ethics</option>
                                        <option value="General News">General News</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    value={newJournalist.email}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, email: e.target.value })}
                                    placeholder="e.g. liam.foster@outlet.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={newJournalist.phone}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, phone: e.target.value })}
                                    placeholder="e.g. +1 (555) 901-2345"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Address / Location</label>
                                <input
                                    type="text"
                                    value={newJournalist.address}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, address: e.target.value })}
                                    placeholder="e.g. Austin Bureau, Austin, TX"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Outreach Bio / Notes</label>
                                <textarea
                                    value={newJournalist.bio}
                                    onChange={(e) => setNewJournalist({ ...newJournalist, bio: e.target.value })}
                                    placeholder="What does this journalist cover? What are their areas of interest?"
                                    rows="3"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all resize-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 border border-gray-200 dark:border-gray-750 rounded-xl font-bold text-xs tracking-wider uppercase text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all cursor-pointer text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 text-white font-bold text-xs tracking-wider uppercase rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-center"
                                >
                                    Create Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

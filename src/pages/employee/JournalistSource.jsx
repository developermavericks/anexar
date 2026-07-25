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
    CheckCircle2,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebaseClient';
import { collection, addDoc, doc, deleteDoc, query, onSnapshot, orderBy, writeBatch } from 'firebase/firestore';

import INITIAL_JOURNALISTS from '../../data/journalists_extracted.json';

export default function JournalistSource() {
    const [journalists, setJournalists] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    
    // Modal, upload & notification states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [notification, setNotification] = useState(null);
    const [visibleCount, setVisibleCount] = useState(12);

    // AI recommendation panel state
    const [recQuery, setRecQuery] = useState('');
    const [recLoading, setRecLoading] = useState(false);
    const [recResults, setRecResults] = useState(null);
    const [recError, setRecError] = useState('');
    
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

    // Reset pagination on search or filter change
    useEffect(() => {
        setVisibleCount(12);
    }, [searchQuery, selectedCategoryFilter]);

    // Load from Firestore or seed initial subset if database is empty
    useEffect(() => {
        const q = query(collection(db, "journalists"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, id: docSnap.id, ...docSnap.data() });
            });
            
            if (list.length === 0) {
                const seedData = async () => {
                    try {
                        // Seed first 150 items using a single batch commit
                        const subset = INITIAL_JOURNALISTS.slice(0, 150);
                        const batch = writeBatch(db);
                        subset.forEach(item => {
                            const docRef = doc(collection(db, "journalists"));
                            batch.set(docRef, {
                                name: item.name || '',
                                role: item.role || 'Reporter',
                                publication: item.publication || 'Independent',
                                category: item.category || 'General',
                                email: item.email || '',
                                phone: item.phone || '',
                                address: item.address || '',
                                bio: item.bio || '',
                                createdAt: new Date().toISOString()
                            });
                        });
                        await batch.commit();
                    } catch (err) {
                        console.error("Error seeding initial journalists to Firestore:", err);
                    }
                };
                seedData();
            } else {
                list.sort((a, b) => {
                    const nameA = (a.name || '').trim().toLowerCase();
                    const nameB = (b.name || '').trim().toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                setJournalists(list);
                if (list.length > 0 && !selectedId) {
                    setSelectedId(list[0].id);
                }
            }
        }, (err) => {
            console.error("Error listening to journalists collection:", err);
        });
        return () => unsubscribe();
    }, []);

    const triggerNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const RECOMMEND_API_URL = import.meta.env.VITE_RECOMMEND_API_URL || '';

    const handleGetRecommendations = async () => {
        if (!RECOMMEND_API_URL) {
            triggerNotification("Recommendations aren't configured yet. Set VITE_RECOMMEND_API_URL in .env.", 'error');
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
                body: JSON.stringify({ type: 'journalists', query: recQuery.trim() })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
            setRecResults(data.picks || []);
        } catch (err) {
            console.error('Error fetching journalist recommendations:', err);
            setRecError(err.message || 'Failed to get recommendations.');
        } finally {
            setRecLoading(false);
        }
    };

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleAddJournalist = async (e) => {
        e.preventDefault();
        const displayName = newJournalist.name.trim();
        if (!displayName) {
            triggerNotification('Journalist Name is required.', 'error');
            return;
        }
        
        try {
            const docRef = await addDoc(collection(db, "journalists"), {
                name: displayName,
                role: newJournalist.role || '',
                publication: newJournalist.publication || '',
                category: newJournalist.category || 'General',
                email: newJournalist.email || '',
                phone: newJournalist.phone || '',
                address: newJournalist.address || '',
                bio: newJournalist.bio || '',
                createdAt: new Date().toISOString()
            });
            
            setSelectedId(docRef.id);
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
            triggerNotification(`${displayName} successfully added to cloud.`, 'success');
        } catch (err) {
            console.error("Error adding journalist to cloud:", err);
            triggerNotification('Failed to add journalist contact.', 'error');
        }
    };

    const handleDeleteJournalist = async (id) => {
        if (!window.confirm("Are you sure you want to delete this journalist contact?")) return;
        try {
            await deleteDoc(doc(db, "journalists", id));
            setIsDetailModalOpen(false);
            if (selectedId === id && journalists.length > 1) {
                const remaining = journalists.filter(j => j.id !== id);
                setSelectedId(remaining[0].id);
            }
            triggerNotification('Journalist contact deleted from cloud.', 'info');
        } catch (err) {
            console.error("Error deleting journalist contact:", err);
            triggerNotification('Failed to delete contact.', 'error');
        }
    };

    const uploadInBatches = async (records) => {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
            const chunk = records.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach((record) => {
                const docRef = doc(collection(db, "journalists"));
                batch.set(docRef, {
                    name: record.name || 'Unnamed Journalist',
                    role: record.role || 'Reporter',
                    publication: record.publication || 'Independent',
                    category: record.category || 'General',
                    email: record.email || '',
                    phone: record.phone || '',
                    address: record.address || '',
                    bio: record.bio || '',
                    createdAt: new Date().toISOString()
                });
            });
            await batch.commit();
        }
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
            reader.onload = async (event) => {
                const text = event.target.result;
                try {
                    const parsedRecords = parseCSV(text);
                    if (parsedRecords.length === 0) {
                        triggerNotification('Could not find valid columns in CSV. Expected: name, email, role...', 'error');
                        setIsImporting(false);
                        return;
                    }
                    await uploadInBatches(parsedRecords);
                    triggerNotification(`Successfully uploaded ${parsedRecords.length} contacts to cloud from CSV!`, 'success');
                } catch (err) {
                    console.error("Error uploading CSV records:", err);
                    triggerNotification('Failed to parse and upload CSV file.', 'error');
                }
                setIsImporting(false);
            };
            reader.readAsText(file);
        } 
        // If it's Excel, perform a high-fidelity simulation
        else if (fileExt === 'xlsx' || fileExt === 'xls') {
            const reader = new FileReader();
            reader.onload = async (event) => {
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
                    await uploadInBatches(parsedRecords);
                    triggerNotification(`Successfully uploaded ${parsedRecords.length} contacts to cloud from Excel!`, 'success');
                } catch (err) {
                    console.error("Error uploading Excel records:", err);
                    triggerNotification('Failed to parse and upload Excel file.', 'error');
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
        const nameVal = (j.name || '').toLowerCase();
        const pubVal = (j.publication || '').toLowerCase();
        const roleVal = (j.role || '').toLowerCase();
        const bioVal = (j.bio || '').toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        
        const matchesSearch = nameVal.includes(searchLower) ||
                            pubVal.includes(searchLower) ||
                            roleVal.includes(searchLower) ||
                            bioVal.includes(searchLower);
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

            {/* AI Recommendation Panel */}
            <div className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-200/40 dark:border-indigo-800/40 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" />
                    Get Journalist Recommendations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                    Describe the story or pitch in plain language - the picks come from your real journalist directory, ranked with a reason for each.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={recQuery}
                        onChange={(e) => setRecQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGetRecommendations()}
                        placeholder="e.g. story about AI in healthcare diagnostics"
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
                            No strong matches found in the current directory for this request.
                        </p>
                    ) : (
                        <div className="space-y-2 pt-2">
                            {recResults.map((j, i) => (
                                <button
                                    key={j.docId || i}
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(j.docId || j.id);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="w-full text-left bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                                >
                                    <span className="shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-[10px] font-black flex items-center justify-center mt-0.5">
                                        {i + 1}
                                    </span>
                                    <div className="sm:w-56 shrink-0">
                                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{j.name}</p>
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">{j.publication || j.role}</p>
                                        {j.email && <p className="text-[10px] text-slate-400 mt-0.5">{j.email}</p>}
                                    </div>
                                    <p className="flex-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{j.reason}</p>
                                    <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-indigo-500 transition-colors mt-0.5" />
                                </button>
                            ))}
                        </div>
                    )
                )}
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

            {/* Search and filter controls - stacked nicely */}
            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl border border-gray-150 dark:border-gray-800 p-5 shadow-sm space-y-4">
                {/* Search Bar - Full Width / Maximum visibility */}
                <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Search name, publication, role, or bio..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all font-semibold"
                    />
                </div>

                {/* Category Badges Filter - Horizontal Scroll below search */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full">
                    <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategoryFilter(cat)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                selectedCategoryFilter === cat
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards Grid */}
            {filteredJournalists.length === 0 ? (
                <div className="bg-white/60 dark:bg-gray-900/60 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-gray-400 dark:text-gray-500">
                    <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="font-semibold text-sm">No journalists found matching your search criteria.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredJournalists.slice(0, visibleCount).map((j) => {
                            // Define gradient based on category
                            let grad = "from-indigo-500 to-purple-600";
                            const catLower = (j.category || "").toLowerCase();
                            if (catLower.includes("tech") || catLower.includes("start")) {
                                grad = "from-blue-500 to-indigo-600";
                            } else if (catLower.includes("market") || catLower.includes("finance") || catLower.includes("business") || catLower.includes("economy")) {
                                grad = "from-emerald-500 to-teal-600";
                            } else if (catLower.includes("politics") || catLower.includes("ethics") || catLower.includes("opinion")) {
                                grad = "from-rose-500 to-orange-500";
                            } else if (catLower.includes("general") || catLower.includes("news") || catLower.includes("current")) {
                                grad = "from-slate-500 to-slate-700";
                            }

                            return (
                                <div
                                    key={j.id}
                                    onClick={() => {
                                        setSelectedId(j.id);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="relative bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                                >
                                    {/* Delete Button inside Card (small & subtle) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteJournalist(j.id);
                                        }}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100 duration-200"
                                        title="Delete Contact"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    <div>
                                        <div className="flex items-center gap-3.5 mb-5">
                                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${grad} text-white flex items-center justify-center font-black text-md shadow-sm shrink-0`}>
                                                {j.name ? j.name.charAt(0) : '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {j.name}
                                                </h3>
                                                <p className="text-4xs text-slate-450 dark:text-slate-500 font-black uppercase tracking-wider truncate mt-0.5">
                                                    {j.role || 'Reporter'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5 mb-5 text-xs font-semibold text-slate-650 dark:text-slate-400">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Building2 size={13} className="text-indigo-500 shrink-0" />
                                                <span className="truncate">{j.publication || 'Independent'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Tag size={13} className="text-purple-500 shrink-0" />
                                                <span className="truncate text-[10px] py-0.5 px-2 bg-slate-100 dark:bg-slate-800 rounded-lg">{j.category}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-850 flex justify-between items-center text-3xs text-slate-400">
                                        <span className="font-bold uppercase tracking-wider">{j.address || 'Remote Bureau'}</span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline flex items-center gap-0.5">
                                            View Details &rarr;
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Load More Button */}
                    {filteredJournalists.length > visibleCount && (
                        <div className="flex justify-center pt-2">
                            <button
                                onClick={() => setVisibleCount(prev => prev + 12)}
                                className="px-6 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm hover:shadow-md cursor-pointer"
                            >
                                Load More Contacts ({filteredJournalists.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Detailed Journalist Profile Modal */}
            {isDetailModalOpen && selectedJournalist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsDetailModalOpen(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative bg-[#FDFBF7] dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 z-10">
                        {/* Decorative gradient blur background */}
                        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
                        
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer z-10"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {/* Profile Header */}
                        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-650 flex items-center justify-center text-white font-extrabold text-2xl shadow-md shrink-0">
                                {selectedJournalist.name.charAt(0)}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {selectedJournalist.name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-405">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-6">
                            {/* Left Side: Details Card Block */}
                            <div className="space-y-5 bg-white/40 dark:bg-slate-850/40 rounded-2xl p-5 border border-slate-100/50 dark:border-slate-800/50">
                                <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                                    Contact Information
                                </h3>
                                
                                {/* Email */}
                                <div className="flex items-center justify-between group/row">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Mail className="h-4.5 w-4.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-gray-450 uppercase font-bold">Email Address</p>
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-205 truncate">
                                                {selectedJournalist.email || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedJournalist.email && (
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.email, 'email')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Email"
                                        >
                                            {copiedField === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="flex items-center justify-between group/row">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Phone className="h-4.5 w-4.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-gray-455 uppercase font-bold">Phone Number</p>
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-205 truncate">
                                                {selectedJournalist.phone || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedJournalist.phone && (
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.phone, 'phone')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Phone"
                                        >
                                            {copiedField === 'phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>

                                {/* Address */}
                                <div className="flex items-center justify-between group/row">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <MapPin className="h-4.5 w-4.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-gray-455 uppercase font-bold">Location / Address</p>
                                            <p className="text-xs font-bold text-gray-800 dark:text-gray-205 truncate">
                                                {selectedJournalist.address || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedJournalist.address && (
                                        <button
                                            onClick={() => handleCopy(selectedJournalist.address, 'address')}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Copy Address"
                                        >
                                            {copiedField === 'address' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right Side: Brief / Bio & Pitch actions */}
                            <div className="flex flex-col justify-between space-y-5 bg-white/40 dark:bg-slate-850/40 rounded-2xl p-5 border border-slate-100/50 dark:border-slate-800/50">
                                <div className="space-y-3">
                                    <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                        Outreach Insights
                                    </h3>
                                    <p className="text-xs text-gray-650 dark:text-slate-350 leading-relaxed font-semibold">
                                        {selectedJournalist.bio || "No custom bio or pitching insight available for this contact."}
                                    </p>
                                </div>

                                {/* Action button */}
                                {selectedJournalist.email && (
                                    <a
                                        href={`mailto:${selectedJournalist.email}?subject=Exclusive pitch from Anexar`}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 hover:-translate-y-0.5 transition-all duration-200 text-xs tracking-wider uppercase cursor-pointer"
                                    >
                                        <Mail className="h-4 w-4" />
                                        <span>Draft Pitch Email</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3">
                            <button
                                onClick={() => {
                                    handleDeleteJournalist(selectedJournalist.id);
                                }}
                                className="px-4.5 py-3 border border-red-200 dark:border-red-950/50 rounded-xl font-bold text-xs tracking-wider uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 size={14} />
                                <span>Delete Contact</span>
                            </button>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-6 py-3 text-white font-bold text-xs tracking-wider uppercase rounded-xl bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 shadow-md transition-all cursor-pointer text-center"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Publication</label>
                                    <input
                                        type="text"
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
                                <label className="block text-3xs font-extrabold uppercase tracking-wider text-gray-455 mb-1">Email Address</label>
                                <input
                                    type="email"
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

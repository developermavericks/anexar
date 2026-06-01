import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Newspaper,
    Trash2,
    Calendar,
    User,
    Plus,
    Search,
    Sparkles,
    UploadCloud,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    Maximize2,
    X,
    Eye,
    ArrowUpDown
} from 'lucide-react';
import { pressReleases as defaultPress } from '../../mock/clientData';
import * as XLSX from 'xlsx';
import fujifilmData from '../../mock/fujifilm_data.json';

export default function UploadCoverage() {
    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

    // ----------------------------------------------------
    // INITIALIZE FROM LOCALSTORAGE
    // ----------------------------------------------------
    const [coverageList, setCoverageList] = useState(() => {
        const saved = localStorage.getItem('anexar_press_releases');
        if (saved) {
            try { 
                return JSON.parse(saved); 
            } catch (e) { 
                console.error(e); 
            }
        }
        // Fallback to formatted default mock data
        const defaultItems = defaultPress.map(p => ({
            id: p.id,
            client: p.client || 'Visionary Media',
            month: 'May',
            year: '2026',
            type: 'manual',
            coverage: `Visionary Media secure major press hit: "${p.title}". Secured standard syndication and strategic mentions across major industry tech outlets.`
        }));

        const fujifilmDefaultExcel = {
            id: 99999,
            client: 'Fujifilm',
            month: 'April',
            year: '2026',
            type: 'excel',
            fileName: 'FUJIFILM India Coverage Tracker 2026-27 - April.xlsx',
            headers: fujifilmData.headers,
            rows: fujifilmData.rows
        };

        return [fujifilmDefaultExcel, ...defaultItems];
    });

    // Form states
    const [clientName, setClientName] = useState('fujifilm');
    const [month, setMonth] = useState('April');
    const [year, setYear] = useState('2026');
    const [coverageText, setCoverageText] = useState('');
    
    // Excel upload states
    const [excelRows, setExcelRows] = useState([]);
    const [excelHeaders, setExcelHeaders] = useState([]);
    const [excelFileName, setExcelFileName] = useState('');
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef(null);

    // Active Excel modal viewer state
    const [selectedExcelReport, setSelectedExcelReport] = useState(null);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        localStorage.setItem('anexar_press_releases', JSON.stringify(coverageList));
    }, [coverageList]);

    // Reset states when modal closes
    const handleCloseModal = () => {
        setSelectedExcelReport(null);
        setSortColumn(null);
    };

    // ----------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------
    const handleUpload = (e) => {
        e.preventDefault();
        if (!clientName.trim() || !coverageText.trim()) return;

        const newCoverage = {
            id: Date.now(),
            client: clientName.trim(),
            month,
            year,
            type: 'manual',
            coverage: coverageText.trim(),
            dateSent: new Date().toISOString().split('T')[0]
        };

        setCoverageList([newCoverage, ...coverageList]);
        setCoverageText('');

        // Push updates to feed
        const savedUpdates = localStorage.getItem('anexar_client_updates');
        let currentUpdates = [];
        if (savedUpdates) {
            try { currentUpdates = JSON.parse(savedUpdates); } catch (err) { console.error(err); }
        }
        const newUpdate = {
            id: Date.now() + 1,
            client: clientName.trim(),
            update: `New media coverage published for ${month} ${year}: "${newCoverage.coverage.substring(0, 60)}..."`,
            time: 'Just now'
        };
        localStorage.setItem('anexar_client_updates', JSON.stringify([newUpdate, ...currentUpdates]));
    };

    // ----------------------------------------------------
    // EXCEL / CSV PARSING
    // ----------------------------------------------------
    const handleExcelFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setExcelFileName(file.name);
        setImportSuccess(false);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Parse raw JSON rows from sheet
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                
                if (jsonData.length === 0) {
                    alert('Spreadsheet is empty.');
                    return;
                }

                const range = XLSX.utils.decode_range(worksheet['!ref']);
                const startRow = range.s.r + 1;
                const rowsWithLinks = jsonData.map((row, i) => {
                    const r = i + startRow;
                    let linkVal = "";
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cellAddress = XLSX.utils.encode_cell({ r, c: C });
                        const cell = worksheet[cellAddress];
                        if (cell && cell.l && cell.l.Target) {
                            linkVal = cell.l.Target;
                            break;
                        }
                    }
                    return {
                        ...row,
                        'Link': linkVal
                    };
                });

                // Dynamically extract all unique headers from all rows
                const allKeys = new Set();
                rowsWithLinks.forEach(row => {
                    Object.keys(row).forEach(key => {
                        if (key && !key.startsWith('__EMPTY')) {
                            allKeys.add(key);
                        }
                    });
                });
                
                // Add 'Link' column to headers
                allKeys.add('Link');
                const headers = Array.from(allKeys);

                setExcelRows(rowsWithLinks);
                setExcelHeaders(headers);
            } catch (error) {
                console.error('Error parsing excel:', error);
                alert('Failed to parse file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImportExcelRows = () => {
        if (excelRows.length === 0) return;

        const newExcelReport = {
            id: Date.now(),
            client: clientName.trim(),
            month,
            year,
            type: 'excel',
            fileName: excelFileName,
            headers: excelHeaders,
            rows: excelRows
        };

        setCoverageList([newExcelReport, ...coverageList]);

        // Push update notification
        const savedUpdates = localStorage.getItem('anexar_client_updates');
        let currentUpdates = [];
        if (savedUpdates) {
            try { currentUpdates = JSON.parse(savedUpdates); } catch (err) { console.error(err); }
        }
        const newUpdate = {
            id: Date.now() + 1,
            client: clientName.trim(),
            update: `Bulk Excel Coverage Document uploaded: "${excelFileName}" (${excelRows.length} rows)`,
            time: 'Just now'
        };
        localStorage.setItem('anexar_client_updates', JSON.stringify([newUpdate, ...currentUpdates]));
        
        setExcelRows([]);
        setExcelHeaders([]);
        setExcelFileName('');
        setImportSuccess(true);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setTimeout(() => setImportSuccess(false), 5000);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { 'S. No.': 1, 'Date': '10th April, 2026', 'Publication': 'Pharmabiz', 'Spokesperson': 'Dheeraj Chaudhri, Head of Endoscopy Division', 'Division': 'Endoscopy', 'Headline': 'AI integration in endoscopy will improve detection of cancer', 'Category': 'A' },
            { 'S. No.': 2, 'Date': '20th April, 2026', 'Publication': 'Print3', 'Spokesperson': 'Mr. Priyatosh Kumar, Head of Graphic Communication', 'Division': 'Graphics', 'Headline': 'The Smart Print Revolution: How Intelligent Devices Redefine Productivity', 'Category': 'B' }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Coverage Template");
        XLSX.writeFile(workbook, "coverage_bulk_upload_template.xlsx");
    };

    const handleDelete = (id) => {
        const updated = coverageList.filter(item => item.id !== id);
        setCoverageList(updated);
    };

    const filteredCoverage = coverageList.filter(c => {
        const term = searchTerm.toLowerCase();
        if (c.type === 'excel') {
            return (c.client && c.client.toLowerCase().includes(term)) ||
                   (c.fileName && c.fileName.toLowerCase().includes(term));
        }
        return (c.client && c.client.toLowerCase().includes(term)) ||
               (c.coverage && c.coverage.toLowerCase().includes(term));
    });

    // ----------------------------------------------------
    // SORTING LOGIC FOR INTERACTIVE SHEET VIEWER
    // ----------------------------------------------------
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
        <div className="space-y-8 max-w-6xl mx-auto font-sans pb-12 text-slate-900 dark:text-slate-100 animate-fade-in relative">
            
            {/* Header section with premium styling */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-purple-600/10 dark:from-amber-500/20 dark:to-purple-600/20 border border-amber-500/20 rounded-3xl p-8 shadow-xl">
                <div className="absolute -right-16 -top-16 w-36 h-36 bg-amber-500/20 dark:bg-amber-500/30 rounded-full blur-3xl"></div>
                <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-purple-500/20 dark:bg-purple-500/30 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 flex items-center gap-3">
                        <Newspaper className="text-amber-500 dark:text-amber-400 stroke-[2.5px]" size={28} />
                        Publish Media Coverage
                    </h1>
                    <p className="text-sm text-slate-650 dark:text-slate-300 mt-2 max-w-2xl font-medium">
                        Upload custom client coverage hits manually by brand, or bulk import direct Excel files. Click on any report in the feed to open the dynamic spreadsheet viewer.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* UPLOAD FORM PANEL (Left Column - col-span-5) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* MANUAL FORM CARD */}
                    <Card className="border-none shadow-2xl bg-white dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="h-1.5 bg-gradient-to-r from-amber-500 to-amber-600"></div>
                        <CardContent className="p-7 space-y-5">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="text-amber-500 dark:text-amber-400 animate-pulse" size={16} />
                                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Manual Entry
                                </h3>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-4">
                                {/* Client Account Name */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <User size={14} className="text-amber-500" />
                                        Client Account Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Type client name manually... (e.g. fujifilm)"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        required
                                        className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                    />
                                    {/* Quick Suggestion Tags */}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {['fujifilm', 'Visionary Media', 'Spotify', 'RedBull Racing', 'Nike'].map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setClientName(c)}
                                                className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border transition-all ${clientName === c 
                                                    ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' 
                                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Month & Year Dropdowns */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                            <Calendar size={14} className="text-amber-500" />
                                            Month
                                        </label>
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                            className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                        >
                                            {MONTHS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                            <Calendar size={14} className="text-amber-500" />
                                            Year
                                        </label>
                                        <select
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                        >
                                            {YEARS.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Upload Coverage TextArea */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Newspaper size={14} className="text-amber-500" />
                                        Upload Coverage
                                    </label>
                                    <textarea
                                        rows={5}
                                        placeholder="Paste the whole coverage text here. It will display in full on the client portal..."
                                        value={coverageText}
                                        onChange={(e) => setCoverageText(e.target.value)}
                                        required
                                        className="w-full p-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none resize-none"
                                    />
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full h-11 rounded-2xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
                                >
                                    <Plus size={15} />
                                    <span>Upload & Sync Live</span>
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* BULK UPLOAD CARD */}
                    <Card className="border-none shadow-2xl bg-white dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="h-1.5 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                        <CardContent className="p-7 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="text-purple-500 dark:text-purple-400 animate-pulse" size={16} />
                                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Bulk Import Excel
                                    </h3>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    title="Download Excel Upload Template"
                                    className="flex items-center gap-1 text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                >
                                    <Download size={11} />
                                    <span>Template</span>
                                </button>
                            </div>

                            {/* Drag and Drop Zone */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-purple-500/5 transition-all space-y-2 group"
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleExcelFileChange}
                                    accept=".xlsx, .xls, .csv" 
                                    className="hidden" 
                                />
                                <UploadCloud className="mx-auto text-slate-400 group-hover:text-purple-500 transition-colors" size={32} />
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {excelFileName ? excelFileName : "Click to select or drag spreadsheet"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                    Supports dynamic columns & headers automatically
                                </p>
                            </div>

                            {/* Success Toast */}
                            {importSuccess && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center gap-2 text-2xs font-extrabold uppercase tracking-wide">
                                    <CheckCircle2 size={14} />
                                    <span>Import completed successfully!</span>
                                </div>
                            )}

                            {/* Pending Import Preview */}
                            {excelRows.length > 0 && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-between text-2xs font-extrabold uppercase tracking-wide">
                                        <span>Found {excelRows.length} columns & records</span>
                                        <button
                                            onClick={() => { setExcelRows([]); setExcelFileName(''); }}
                                            className="text-[10px] underline hover:text-purple-800 cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <Button
                                        onClick={handleImportExcelRows}
                                        className="w-full h-11 rounded-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <CheckCircle2 size={15} />
                                        <span>Import Spreadsheet Live</span>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ARCHIVE FEED LIST (Right Column - col-span-7) */}
                <div className="lg:col-span-7 space-y-5">
                    {/* Premium search bar */}
                    <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-3xl p-5 shadow-xl flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search uploaded coverage by client name or content..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-900 dark:text-white transition-all"
                            />
                        </div>
                        {coverageList.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to delete all coverage records and clear the feed?")) {
                                        setCoverageList([]);
                                        localStorage.setItem('anexar_press_releases', JSON.stringify([]));
                                    }
                                }}
                                className="h-11 px-4 text-xs font-bold text-red-500 hover:text-white bg-red-500/10 hover:bg-red-655 border border-red-500/20 rounded-2xl transition-all cursor-pointer shrink-0"
                            >
                                Clear Feed
                            </button>
                        )}
                    </div>

                    {/* Coverage Listing Feed */}
                    <div className="space-y-5 max-h-[700px] overflow-y-auto pr-2">
                        {filteredCoverage.length === 0 ? (
                            <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
                                <Newspaper className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
                                <p className="text-xs font-bold uppercase tracking-widest">No Coverage Found</p>
                                <p className="text-[11px] text-slate-500 mt-1">Ready for custom client press uploads.</p>
                            </div>
                        ) : (
                            filteredCoverage.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => item.type === 'excel' && setSelectedExcelReport(item)}
                                    className={`group relative bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-909 p-6 rounded-3xl shadow-lg hover:shadow-2xl hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between gap-4 overflow-hidden ${item.type === 'excel' ? 'cursor-pointer' : ''}`}
                                >
                                    {/* Accent background line on hover */}
                                    <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${item.type === 'excel' ? 'from-purple-500 to-indigo-650' : 'from-amber-500 to-amber-600'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex gap-2">
                                                <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                                    {item.client || 'General'}
                                                </span>
                                                <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                                    {item.month} {item.year}
                                                </span>
                                                {item.type === 'excel' && (
                                                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-650 dark:text-indigo-450 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                                        Spreadsheet: {item.rows.length} rows
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                                title="Delete record"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Render spreadsheet files or manual coverages appropriately */}
                                        {item.type === 'excel' ? (
                                            <div className="bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl p-5 border border-purple-500/10 flex items-center justify-between group-hover:bg-purple-500/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <FileSpreadsheet className="text-purple-555 animate-pulse" size={24} />
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                            {item.fileName}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-505 font-extrabold uppercase mt-0.5">
                                                            Click card to open interactive spreadsheet
                                                        </p>
                                                    </div>
                                                </div>
                                                <Eye className="text-purple-400 group-hover:text-purple-600 transition-colors shrink-0" size={16} />
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100/85 dark:border-slate-800/40">
                                                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed whitespace-pre-wrap">
                                                    {item.coverage}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* DYNAMIC EXCEL FULL-SCREEN TABLE MODAL VIEWER */}
            {selectedExcelReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-950 w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="text-purple-500" size={22} />
                                    {selectedExcelReport.fileName}
                                </h3>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
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

                        {/* Table with Sticky Headers */}
                        <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/10">
                            <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
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
                                                    <tr key={rIdx} className="bg-amber-500/5 dark:bg-amber-500/10 font-black text-amber-600 dark:text-amber-400">
                                                        <td colSpan={selectedExcelReport.headers.length} className="p-4 text-center font-bold tracking-wider uppercase text-2xs bg-amber-500/5">
                                                            {rowValues[0]}
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors text-slate-600 dark:text-slate-400">
                                                    {selectedExcelReport.headers.map((h, cIdx) => {
                                                        const val = row[h] !== undefined ? row[h].toString() : '';
                                                        const isUrl = val.startsWith('http://') || val.startsWith('https://');
                                                        return (
                                                            <td key={cIdx} className="p-4 align-top whitespace-pre-wrap max-w-sm border-r border-slate-100 dark:border-slate-900/60 last:border-r-0">
                                                                {isUrl ? (
                                                                    <a 
                                                                        href={val} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-amber-500 hover:text-amber-600 hover:underline font-bold break-all"
                                                                    >
                                                                        View Link
                                                                    </a>
                                                                ) : val}
                                                            </td>
                                                        );
                                                    })}
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
}

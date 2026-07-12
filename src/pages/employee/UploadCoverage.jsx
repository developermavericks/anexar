import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { db } from '../../lib/firebaseClient';
import { supabase } from '../../lib/supabaseClient';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';
import mammoth from 'mammoth';
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
    ArrowUpDown,
    FileText,
    Layers,
    Send,
    FileCheck,
    Clock,
    Target,
    Upload,
    ShieldCheck,
    ChevronDown,
    Users
} from 'lucide-react';
import { pressReleases as defaultPress } from '../../mock/clientData';
import * as XLSX from 'xlsx';
import fujifilmData from '../../mock/fujifilm_data.json';

export default function UploadCoverage() {
    const { user } = useAuth();

    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

    // ----------------------------------------------------
    // INITIALIZE FROM FIRESTORE
    // ----------------------------------------------------
    const [coverageList, setCoverageList] = useState([]);

    const [activeClients, setActiveClients] = useState(() => {
        const saved = localStorage.getItem('anexar_assigned_clients');
        return saved ? JSON.parse(saved) : ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];
    });

    useEffect(() => {
        const fetchClientsList = async () => {
            if (!user || !user.email) return;

            const emailLower = user.email.toLowerCase();
            const isDeveloperSatyam = emailLower.includes('satyam') || emailLower.includes('ss1084169') || emailLower.includes('test') || user.name?.toLowerCase().includes('satyam');
            const isChetan = emailLower === 'chetan@themavericksindia.com' || user.name?.toLowerCase().includes('chetan');
            const hasWholeAccess = isChetan || isDeveloperSatyam;

            try {
                // 1. Core, Manager, or Satyam (Developer) bypass - fetch all active clients
                if (hasWholeAccess) {
                    const { data, error } = await supabase
                        .from('clients')
                        .select('name')
                        .eq('is_active', true)
                        .order('name', { ascending: true });

                    if (error) throw error;
                    if (data && data.length > 0) {
                        setActiveClients(data.map(c => c.name));
                        return;
                    }
                }

                // 2. Otherwise try loading user clients from Firestore
                const docRef = doc(db, "user_clients", emailLower);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists() && docSnap.data().clients) {
                    const clientNames = docSnap.data().clients;
                    if (clientNames.length > 0) {
                        setActiveClients(clientNames);
                        return; // Successfully loaded from Firestore!
                    }
                }

                // 3. Fallback to Supabase allocations
                if (user.id) {
                    const [weeklyRes, monthlyRes] = await Promise.all([
                        supabase
                            .from('allocations_weekly')
                            .select('clients(name)')
                            .eq('user_id', user.id),
                        supabase
                            .from('allocations_monthly')
                            .select('clients(name)')
                            .eq('user_id', user.id)
                    ]);

                    const clientNamesSet = new Set();
                    
                    if (weeklyRes.data) {
                        weeklyRes.data.forEach(item => {
                            if (item.clients?.name) clientNamesSet.add(item.clients.name);
                        });
                    }
                    if (monthlyRes.data) {
                        monthlyRes.data.forEach(item => {
                            if (item.clients?.name) clientNamesSet.add(item.clients.name);
                        });
                    }

                    const clientNames = Array.from(clientNamesSet);
                    if (clientNames.length > 0) {
                        setActiveClients(clientNames);
                        return;
                    }
                }

                setActiveClients([]); // Empty list if no allocations mapped
            } catch (err) {
                console.error("Error loading active clients:", err);
                setActiveClients([]);
            }
        };
        fetchClientsList();
    }, [user, user?.id]);

    // Form states
    const [clientName, setClientName] = useState('FUJIFILM');
    const [month, setMonth] = useState('April');
    const [year, setYear] = useState('2026');
    const [coverageText, setCoverageText] = useState('');

    useEffect(() => {
        if (activeClients.length > 0 && !activeClients.includes(clientName)) {
            setClientName(activeClients[0]);
        }
    }, [activeClients, clientName]);
    
    // File upload states
    const [excelRows, setExcelRows] = useState([]);
    const [excelHeaders, setExcelHeaders] = useState([]);
    const [excelFileName, setExcelFileName] = useState('');
    const [fileType, setFileType] = useState(''); // 'excel' or 'docx'
    const [docxHtml, setDocxHtml] = useState('');
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef(null);

    // Active Excel modal viewer state
    const [selectedExcelReport, setSelectedExcelReport] = useState(null);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Search
    const [searchTerm, setSearchTerm] = useState('');



    // Multi-tab layout states
    const [activeTab, setActiveTab] = useState('press'); // 'press', 'reports', 'overall'
    
    // Reports tab form states
    const [reportType, setReportType] = useState('Daily Tracker');
    const [reportFile, setReportFile] = useState(null);
    const [reportUploading, setReportUploading] = useState(false);
    const reportFileInputRef = useRef(null);

    // Overall Work Updates form states
    const [overallWorkText, setOverallWorkText] = useState('');
    const [overallWorkSubmitting, setOverallWorkSubmitting] = useState(false);

    // Pitch Proposals form states
    const [pitchTitle, setPitchTitle] = useState('');
    const [pitchDeadline, setPitchDeadline] = useState('');
    const [pitchMatchScore, setPitchMatchScore] = useState('95');
    const [pitchSubmitting, setPitchSubmitting] = useState(false);

    // Dynamic documents and updates feeds from Firestore
    const [documentList, setDocumentList] = useState([]);
    const [overallBriefsList, setOverallBriefsList] = useState([]);
    const [pitchList, setPitchList] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "press_releases"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            setCoverageList(list);
        }, (err) => {
            console.error("Error listening to Firestore press_releases:", err);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "client_documents"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            setDocumentList(list);
        }, (err) => {
            console.error("Error listening to client_documents:", err);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "client_overall_work"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            setOverallBriefsList(list);
        }, (err) => {
            console.error("Error listening to client_overall_work:", err);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "thought_leadership"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            setPitchList(list);
        }, (err) => {
            console.error("Error listening to thought_leadership collection:", err);
        });
        return () => unsubscribe();
    }, []);

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!reportFile) {
            alert("Please select a file to upload.");
            return;
        }
        setReportUploading(true);

        try {
            const newDoc = {
                client: clientName,
                type: reportType,
                fileName: reportFile.name,
                fileSize: (reportFile.size / 1024).toFixed(1) + ' KB',
                uploadedBy: user?.email || user?.name || 'Manager',
                month,
                year,
                createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, "client_documents"), newDoc);
            
            // Send Firestore Header Bell Notification for coordinator
            await addDoc(collection(db, "notifications"), {
                email: user?.email || '',
                title: "New Report Uploaded",
                description: `${reportType} uploaded for ${clientName} (${month} ${year})`,
                read: false,
                createdAt: new Date().toISOString()
            });

            setReportFile(null);
            if (reportFileInputRef.current) reportFileInputRef.current.value = "";
            alert("Report onboarded and published to client portal successfully!");
        } catch (err) {
            console.error("Error uploading report document:", err);
            alert("Failed to publish report document.");
        } finally {
            setReportUploading(false);
        }
    };

    const handleOverallWorkSubmit = async (e) => {
        e.preventDefault();
        if (!overallWorkText.trim()) {
            alert("Please enter some update brief notes.");
            return;
        }
        setOverallWorkSubmitting(true);

        try {
            const newBrief = {
                client: clientName,
                text: overallWorkText.trim(),
                uploadedBy: user?.email || user?.name || 'Manager',
                createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, "client_overall_work"), newBrief);

            // Send notification
            await addDoc(collection(db, "notifications"), {
                email: user?.email || '',
                title: "Client Brief Updated",
                description: `Overall work update published for ${clientName}`,
                read: false,
                createdAt: new Date().toISOString()
            });

            setOverallWorkText('');
            alert("Overall Work Brief updated and published successfully!");
        } catch (err) {
            console.error("Error publishing overall work updates:", err);
            alert("Failed to update brief.");
        } finally {
            setOverallWorkSubmitting(false);
        }
    };

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this document record?")) return;
        try {
            await deleteDoc(doc(db, "client_documents", docId));
        } catch (err) {
            console.error("Error deleting document record:", err);
            alert("Failed to delete document record.");
        }
    };

    const handleDeleteOverallBrief = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this brief record?")) return;
        try {
            await deleteDoc(doc(db, "client_overall_work", docId));
        } catch (err) {
            console.error("Error deleting brief record:", err);
            alert("Failed to delete brief record.");
        }
    };

    const handlePitchSubmit = async (e) => {
        e.preventDefault();
        if (!pitchTitle.trim() || !pitchDeadline || !pitchMatchScore) {
            alert("Please fill out all pitch proposal fields.");
            return;
        }

        setPitchSubmitting(true);

        try {
            const newProposal = {
                client: clientName,
                title: pitchTitle.trim(),
                deadline: pitchDeadline,
                matchScore: parseInt(pitchMatchScore, 10) || 90,
                status: 'Pending',
                proposedBy: user?.email || user?.name || 'Manager',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "thought_leadership"), newProposal);

            // Send notification for coordinator
            await addDoc(collection(db, "notifications"), {
                email: user?.email || '',
                title: "New Pitch Proposal",
                description: `Thought Leadership idea pitched for ${clientName}`,
                read: false,
                createdAt: new Date().toISOString()
            });

            setPitchTitle('');
            setPitchDeadline('');
            setPitchMatchScore('95');
            alert("Thought leadership proposal published successfully to client portal!");
        } catch (err) {
            console.error("Error creating pitch proposal:", err);
            alert("Failed to publish pitch proposal.");
        } finally {
            setPitchSubmitting(false);
        }
    };

    const handleDeletePitch = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this pitch proposal?")) return;
        try {
            await deleteDoc(doc(db, "thought_leadership", docId));
            alert("Pitch proposal deleted successfully.");
        } catch (err) {
            console.error("Error deleting pitch proposal:", err);
            alert("Failed to delete pitch proposal.");
        }
    };

    // Reset states when modal closes
    const handleCloseModal = () => {
        setSelectedExcelReport(null);
        setSortColumn(null);
    };

    // ----------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!clientName.trim() || !coverageText.trim()) return;

        const newCoverage = {
            id: Date.now(),
            client: clientName.trim(),
            month,
            year,
            type: 'manual',
            coverage: coverageText.trim(),
            dateSent: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "press_releases"), newCoverage);
            setCoverageText('');

            // Push updates to feed in Firestore
            const newUpdate = {
                client: clientName.trim(),
                update: `New media coverage published for ${month} ${year}: "${newCoverage.coverage.substring(0, 60)}..."`,
                timestamp: new Date().toLocaleString(),
                createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, "client_updates"), newUpdate);
        } catch (err) {
            console.error("Error publishing coverage to Firestore:", err);
            alert("Failed to publish coverage to Firestore database.");
        }
    };

    // ----------------------------------------------------
    // UNIFIED FILE PARSING (EXCEL / CSV / DOCX)
    // ----------------------------------------------------
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setExcelFileName(file.name);
        setImportSuccess(false);
        setExcelRows([]);
        setExcelHeaders([]);
        setDocxHtml('');

        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'docx') {
            setFileType('docx');
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                    setDocxHtml(result.value);
                } catch (error) {
                    console.error('Error parsing docx:', error);
                    alert('Failed to parse Word document. Please ensure it is a valid .docx file.');
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
            setFileType('excel');
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
        } else {
            alert('Unsupported file format. Please upload .xlsx, .xls, .csv, or .docx.');
            setExcelFileName('');
        }
    };

    const handleImportFile = async () => {
        if (!excelFileName) return;

        let newReport = {
            id: Date.now(),
            client: clientName.trim(),
            month,
            year,
            type: fileType,
            fileName: excelFileName,
            createdAt: new Date().toISOString()
        };

        if (fileType === 'excel') {
            if (excelRows.length === 0) return;
            newReport.headers = excelHeaders;
            newReport.rows = excelRows;
        } else if (fileType === 'docx') {
            if (!docxHtml) return;
            newReport.content = docxHtml;
        }

        try {
            await addDoc(collection(db, "press_releases"), newReport);

            // Push update notification to Firestore
            const displayType = fileType === 'excel' ? 'Spreadsheet' : 'Word Document';
            const newUpdate = {
                client: clientName.trim(),
                update: `Bulk ${displayType} Coverage uploaded: "${excelFileName}"`,
                timestamp: new Date().toLocaleString(),
                createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, "client_updates"), newUpdate);
            
            setExcelRows([]);
            setExcelHeaders([]);
            setDocxHtml('');
            setExcelFileName('');
            setFileType('');
            setImportSuccess(true);
            if (fileInputRef.current) fileInputRef.current.value = '';

            setTimeout(() => setImportSuccess(false), 5000);
        } catch (err) {
            console.error("Error importing file to Firestore:", err);
            alert("Failed to upload file to Firestore database.");
        }
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

    const handleDelete = async (item) => {
        if (!item.docId) {
            // Fallback for non-persisted local items
            setCoverageList(coverageList.filter(c => c.id !== item.id));
            return;
        }
        try {
            await deleteDoc(doc(db, "press_releases", item.docId));
        } catch (err) {
            console.error("Error deleting document from Firestore:", err);
            alert("Failed to delete coverage record.");
        }
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
                        Publish Portal Updates
                    </h1>
                    <p className="text-sm text-slate-650 dark:text-slate-300 mt-2 max-w-2xl font-medium">
                        Onboard daily/weekly/monthly trackers, outreach pipeline documents, annual reports, weekly briefs, or upload spreadsheet media coverage hits directly to client portals.
                    </p>
                </div>
            </div>

            {activeClients.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 rounded-[2rem] p-8 text-center text-slate-400 dark:text-slate-500 py-16 flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <Users className="mb-4 text-slate-350 dark:text-slate-700" size={48} />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-750 dark:text-slate-355">No Allocated Clients</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-555 max-w-md mx-auto mt-2 font-medium">
                        You are not currently allocated to any client workspaces. Please contact an administrator or manager to assign client accounts to your profile.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* UPLOAD FORM PANEL (Left Column - col-span-5) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Tab Navigation */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
                        <button
                            type="button"
                            onClick={() => setActiveTab('press')}
                            className={`py-2 px-3 text-[10px] font-extrabold uppercase tracking-wide rounded-xl transition-all cursor-pointer ${
                                activeTab === 'press'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/55 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            Press Releases
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('reports')}
                            className={`py-2 px-3 text-[10px] font-extrabold uppercase tracking-wide rounded-xl transition-all cursor-pointer ${
                                activeTab === 'reports'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/55 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            Trackers & Reports
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('overall')}
                            className={`py-2 px-3 text-[10px] font-extrabold uppercase tracking-wide rounded-xl transition-all cursor-pointer ${
                                activeTab === 'overall'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/55 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            Overall Briefs
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('pitch')}
                            className={`py-2 px-3 text-[10px] font-extrabold uppercase tracking-wide rounded-xl transition-all cursor-pointer ${
                                activeTab === 'pitch'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/55 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            Pitch Proposals
                        </button>
                    </div>

                    {/* Left Form Card */}
                    <Card className="border-none shadow-2xl bg-white dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="h-1.5 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                        <CardContent className="p-7 space-y-5">
                            
                            {/* Card header label */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {activeTab === 'press' && (
                                        <>
                                            <FileSpreadsheet className="text-purple-500 dark:text-purple-400 animate-pulse" size={16} />
                                            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Upload Press Coverage
                                            </h3>
                                        </>
                                    )}
                                    {activeTab === 'reports' && (
                                         <>
                                             <Layers className="text-purple-550 dark:text-purple-400 animate-pulse" size={16} />
                                             <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                 Onboard Trackers & Reports
                                             </h3>
                                         </>
                                     )}
                                     {activeTab === 'pitch' && (
                                         <>
                                             <Sparkles className="text-purple-500 dark:text-purple-400 animate-pulse" size={16} />
                                             <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                 Thought Leadership Pitch
                                             </h3>
                                         </>
                                     )}
                                    {activeTab === 'overall' && (
                                        <>
                                            <Send className="text-purple-500 dark:text-purple-400 animate-pulse" size={16} />
                                            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                Overall Work Update Brief
                                            </h3>
                                        </>
                                    )}
                                </div>
                                {activeTab === 'press' && (
                                    <button
                                        onClick={handleDownloadTemplate}
                                        title="Download Excel Upload Template"
                                        className="flex items-center gap-1 text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                    >
                                        <Download size={11} />
                                        <span>Template</span>
                                    </button>
                                )}
                            </div>

                            {/* Client & Date Selection */}
                            <div className="space-y-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                                {/* Client Account Name */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <User size={14} className="text-purple-500" />
                                        Client Account Name
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            required
                                            className="w-full h-11 px-4 pr-10 text-xs font-bold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">-- Select Client --</option>
                                            {activeClients.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                {/* Month & Year Dropdowns (for press releases & trackers/reports) */}
                                {activeTab !== 'overall' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Calendar size={14} className="text-purple-500" />
                                                Month
                                            </label>
                                            <select
                                                value={month}
                                                onChange={(e) => setMonth(e.target.value)}
                                                className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                            >
                                                {MONTHS.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Calendar size={14} className="text-purple-500" />
                                                Year
                                            </label>
                                            <select
                                                value={year}
                                                onChange={(e) => setYear(e.target.value)}
                                                className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                            >
                                                {YEARS.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* CONDITIONAL TAB INPUT RENDERS */}

                            {/* TAB 1: PRESS COVERAGE */}
                            {activeTab === 'press' && (
                                <div className="space-y-4">
                                    {/* Drag and Drop Zone */}
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/50 hover:bg-purple-500/5 transition-all space-y-2 group"
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange}
                                            accept=".xlsx, .xls, .csv, .docx" 
                                            className="hidden" 
                                        />
                                        <UploadCloud className="mx-auto text-slate-400 group-hover:text-purple-500 transition-colors" size={32} />
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {excelFileName ? excelFileName : "Click to select or drag file"}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-semibold">
                                            Supports Excel (.xlsx, .xls, .csv) & Word Documents (.docx)
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
                                    {(excelRows.length > 0 || docxHtml) && (
                                        <div className="space-y-3">
                                            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-between text-2xs font-extrabold uppercase tracking-wide">
                                                <span>
                                                    {fileType === 'excel' 
                                                        ? `Found ${excelRows.length} columns & records` 
                                                        : "Word Document Loaded Successfully"}
                                                </span>
                                                <button
                                                    onClick={() => { 
                                                        setExcelRows([]); 
                                                        setExcelFileName(''); 
                                                        setDocxHtml(''); 
                                                        setFileType(''); 
                                                    }}
                                                    className="text-[10px] underline hover:text-purple-800 cursor-pointer animate-pulse"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                            <Button
                                                onClick={handleImportFile}
                                                className="w-full h-11 rounded-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <CheckCircle2 size={15} />
                                                <span>Import File Live</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: REPORTS & TRACKERS */}
                            {activeTab === 'reports' && (
                                <form onSubmit={handleReportSubmit} className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Report Category</label>
                                        <select
                                            value={reportType}
                                            onChange={(e) => setReportType(e.target.value)}
                                            className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                        >
                                            <option value="Daily Tracker">Daily Tracker</option>
                                            <option value="Weekly Tracker">Weekly Tracker</option>
                                            <option value="Monthly Tracker">Monthly Tracker</option>
                                            <option value="Annual Report">Annual Report</option>
                                            <option value="Outreach">Outreach</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Choose File</label>
                                        <div 
                                            onClick={() => reportFileInputRef.current?.click()}
                                            className="border border-dashed border-slate-250 dark:border-slate-850 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/35 hover:bg-purple-500/5 transition-colors relative cursor-pointer animate-fade-in"
                                        >
                                            <input
                                                type="file"
                                                ref={reportFileInputRef}
                                                onChange={(e) => setReportFile(e.target.files[0])}
                                                className="hidden"
                                            />
                                            <UploadCloud size={20} className="text-slate-400 mb-1.5" />
                                            <span className="text-2xs text-slate-655 dark:text-slate-300 font-bold">
                                                {reportFile ? reportFile.name : "Select tracker or report file"}
                                            </span>
                                            <span className="text-4xs text-slate-400 mt-0.5">XLSX, PDF, Word up to 15MB</span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={reportUploading || !reportFile}
                                        className={`w-full h-11 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                            reportFile && !reportUploading
                                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/10'
                                                : 'bg-slate-100 dark:bg-slate-900 text-slate-450 dark:text-slate-600 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
                                        }`}
                                    >
                                        {reportUploading ? (
                                            <>
                                                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span>Onboarding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileCheck size={14} />
                                                <span>Onboard Report</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* TAB 3: OVERALL WORK BRIEF */}
                            {activeTab === 'overall' && (
                                <form onSubmit={handleOverallWorkSubmit} className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Brief Updates & Summary</label>
                                        <textarea
                                            value={overallWorkText}
                                            onChange={(e) => setOverallWorkText(e.target.value)}
                                            placeholder="Write general achievements or weekly briefs here..."
                                            rows={5}
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-semibold text-xs leading-relaxed"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={overallWorkSubmitting || !overallWorkText.trim()}
                                        className={`w-full h-11 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                            overallWorkText.trim() && !overallWorkSubmitting
                                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/10'
                                                : 'bg-slate-100 dark:bg-slate-900 text-slate-450 dark:text-slate-600 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
                                        }`}
                                    >
                                        {overallWorkSubmitting ? (
                                            <>
                                                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span>Publishing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={14} />
                                                <span>Publish Brief Update</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* TAB 4: THOUGHT LEADERSHIP PITCH PROPOSALS */}
                            {activeTab === 'pitch' && (
                                <form onSubmit={handlePitchSubmit} className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Proposed Topic Title</label>
                                        <input
                                            type="text"
                                            value={pitchTitle}
                                            onChange={(e) => setPitchTitle(e.target.value)}
                                            placeholder="e.g. The Future of AI in PR"
                                            required
                                            className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Pitch Deadline</label>
                                            <input
                                                type="date"
                                                value={pitchDeadline}
                                                onChange={(e) => setPitchDeadline(e.target.value)}
                                                required
                                                className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Match Score (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={pitchMatchScore}
                                                onChange={(e) => setPitchMatchScore(e.target.value)}
                                                required
                                                className="w-full h-11 px-4 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={pitchSubmitting || !pitchTitle.trim() || !pitchDeadline}
                                        className={`w-full h-11 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                            pitchTitle.trim() && pitchDeadline && !pitchSubmitting
                                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/10'
                                                : 'bg-slate-100 dark:bg-slate-900 text-slate-450 dark:text-slate-600 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
                                        }`}
                                    >
                                        {pitchSubmitting ? (
                                            <>
                                                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span>Publishing Pitch...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={14} />
                                                <span>Publish Pitch Proposal</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                        </CardContent>
                    </Card>
                </div>

                {/* ARCHIVE FEED LIST (Right Column - col-span-7) */}
                <div className="lg:col-span-7 space-y-5">
                    {/* Premium search bar */}
                    <div className="bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-905 rounded-3xl p-5 shadow-xl flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-555" size={16} />
                            <input
                                type="text"
                                placeholder={`Search by client name...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-805 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-slate-50 dark:bg-slate-900 dark:text-white transition-all"
                            />
                        </div>
                        {activeTab === 'press' && coverageList.length > 0 && (
                            <button
                                onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete all coverage records and clear the feed?")) {
                                        for (const item of coverageList) {
                                            if (item.docId) {
                                                await deleteDoc(doc(db, "press_releases", item.docId));
                                            }
                                        }
                                    }
                                }}
                                className="h-11 px-4 text-xs font-bold text-red-500 hover:text-white bg-red-500/10 hover:bg-red-655 border border-red-500/20 rounded-2xl transition-all cursor-pointer shrink-0"
                            >
                                Clear Feed
                            </button>
                        )}
                    </div>

                    {/* TAB 1: PRESS RELEASES LIST */}
                    {activeTab === 'press' && (
                        <div className="space-y-5 max-h-[700px] overflow-y-auto pr-2 animate-fade-in">
                            {filteredCoverage.length === 0 ? (
                                <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
                                    <Newspaper className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
                                    <p className="text-xs font-bold uppercase tracking-widest">No Coverage Found</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Ready for custom client press uploads.</p>
                                </div>
                            ) : (
                                filteredCoverage.map((item) => (
                                    <div
                                        key={item.id || item.docId}
                                        onClick={() => (item.type === 'excel' || item.type === 'docx') && setSelectedExcelReport(item)}
                                        className={`group relative bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-909 p-6 rounded-3xl shadow-lg hover:shadow-2xl hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all flex flex-col justify-between gap-4 overflow-hidden ${(item.type === 'excel' || item.type === 'docx') ? 'cursor-pointer' : ''}`}
                                    >
                                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${item.type === 'excel' ? 'from-purple-500 to-indigo-650' : item.type === 'docx' ? 'from-blue-500 to-cyan-500' : 'from-amber-500 to-amber-600'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex gap-2">
                                                    <span className="px-3 py-1 bg-purple-500/10 text-purple-650 dark:text-purple-405 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                                        {item.client || 'General'}
                                                    </span>
                                                    <span className="px-3 py-1 bg-purple-500/10 text-purple-655 dark:text-purple-405 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                                        {item.month} {item.year}
                                                    </span>
                                                    {item.type === 'excel' && (
                                                        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-655 dark:text-indigo-405 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                                            Spreadsheet: {item.rows.length} rows
                                                        </span>
                                                    )}
                                                    {item.type === 'docx' && (
                                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                                                            Word Document
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                                    className="p-2 text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                                    title="Delete record"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {item.type === 'excel' ? (
                                                <div className="bg-purple-500/5 dark:bg-purple-500/10 rounded-2xl p-5 border border-purple-500/10 flex items-center justify-between group-hover:bg-purple-500/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <FileSpreadsheet className="text-purple-550 animate-pulse" size={24} />
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                                {item.fileName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase mt-0.5">
                                                                Click card to open interactive spreadsheet
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Eye className="text-purple-400 group-hover:text-purple-600 transition-colors shrink-0" size={16} />
                                                </div>
                                            ) : item.type === 'docx' ? (
                                                <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl p-5 border border-blue-500/10 flex items-center justify-between group-hover:bg-blue-500/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="text-blue-550 animate-pulse" size={24} />
                                                        <div>
                                                            <p className="text-xs font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                {item.fileName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase mt-0.5">
                                                                Click card to open document reader
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Eye className="text-blue-400 group-hover:text-blue-600 transition-colors shrink-0" size={16} />
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
                    )}

                    {/* TAB 2: TRACKERS & REPORTS LIST */}
                    {activeTab === 'reports' && (
                        <div className="space-y-5 max-h-[700px] overflow-y-auto pr-2 animate-fade-in">
                            {documentList.filter(d => d.client.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                <div className="p-16 text-center text-slate-405 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
                                    <Layers className="mx-auto text-slate-300 dark:border-slate-700 mb-3" size={40} />
                                    <p className="text-xs font-bold uppercase tracking-widest">No Documents Found</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Ready for custom client reports & trackers.</p>
                                </div>
                            ) : (
                                documentList
                                    .filter(d => d.client.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((doc) => (
                                        <div key={doc.docId} className="bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-905 p-6 rounded-3xl shadow-lg flex items-center justify-between gap-4 relative overflow-hidden">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-purple-500/10 text-purple-650 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0 border border-purple-200/20">
                                                    <FileSpreadsheet size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex gap-1.5 mb-1 items-center">
                                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-650 dark:text-purple-400 text-[9px] font-extrabold uppercase rounded">
                                                            {doc.client}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {doc.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{doc.fileName}</p>
                                                    <p className="text-[10px] text-slate-450 font-semibold">{doc.fileSize} • Uploaded by {doc.uploadedBy} on {new Date(doc.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteDocument(doc.docId)}
                                                className="p-2 text-slate-405 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer shrink-0"
                                                title="Delete document"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    )}

                    {/* TAB 3: OVERALL BRIEFS LIST */}
                    {activeTab === 'overall' && (
                        <div className="space-y-5 max-h-[700px] overflow-y-auto pr-2 animate-fade-in">
                            {overallBriefsList.filter(b => b.client.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                <div className="p-16 text-center text-slate-455 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
                                    <Send className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
                                    <p className="text-xs font-bold uppercase tracking-widest">No Brief Updates Found</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Ready for overall work updates & operational summaries.</p>
                                </div>
                            ) : (
                                overallBriefsList
                                    .filter(b => b.client.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((brief) => (
                                        <div key={brief.docId} className="bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-905 p-6 rounded-3xl shadow-lg flex flex-col gap-3 relative overflow-hidden">
                                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                                                <div className="flex gap-2 items-center">
                                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-655 dark:text-purple-400 text-[9px] font-extrabold uppercase rounded">
                                                        {brief.client}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        Brief Update
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteOverallBrief(brief.docId)}
                                                    className="p-2 text-slate-405 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                                    title="Delete brief"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-semibold italic">
                                                "{brief.text}"
                                            </p>
                                            <p className="text-[10px] text-slate-450 font-semibold self-end">
                                                Updated by {brief.uploadedBy} on {new Date(brief.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                            )}
                        </div>
                    )}

                    {/* TAB 4: THOUGHT LEADERSHIP PITCH LIST */}
                    {activeTab === 'pitch' && (
                        <div className="space-y-5 max-h-[700px] overflow-y-auto pr-2 animate-fade-in">
                            {pitchList.filter(p => p.client.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                <div className="p-16 text-center text-slate-455 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
                                    <Sparkles className="mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-pulse" size={40} />
                                    <p className="text-xs font-bold uppercase tracking-widest">No Pitch Proposals Found</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Ready for custom thought leadership pitches.</p>
                                </div>
                            ) : (
                                pitchList
                                    .filter(p => p.client.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((pitch) => (
                                        <div key={pitch.docId} className="bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-905 p-6 rounded-3xl shadow-lg flex flex-col gap-3 relative overflow-hidden">
                                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                                                <div className="flex gap-2 items-center flex-wrap">
                                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-655 dark:text-purple-400 text-[9px] font-extrabold uppercase rounded">
                                                        {pitch.client}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-655 dark:text-amber-400 text-[9px] font-extrabold uppercase rounded flex items-center gap-1">
                                                        Match: {pitch.matchScore}%
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                                                        pitch.status === 'Approved'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : pitch.status === 'Rejected'
                                                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                        {pitch.status || 'Pending'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeletePitch(pitch.docId)}
                                                    className="p-2 text-slate-405 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                                    title="Delete pitch proposal"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {pitch.title}
                                                </p>
                                                <p className="text-[10px] text-slate-450 font-semibold mt-1">
                                                    Deadline: {pitch.deadline} • Proposed by {pitch.proposedBy} on {new Date(pitch.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* DYNAMIC EXCEL & DOCX FULL-SCREEN MODAL VIEWER */}
            {selectedExcelReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in animate-duration-150">
                    <div className="bg-white dark:bg-slate-950 w-full max-w-6xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    {selectedExcelReport.type === 'excel' ? (
                                        <FileSpreadsheet className="text-purple-500 animate-pulse" size={22} />
                                    ) : (
                                        <FileText className="text-blue-500 animate-pulse" size={22} />
                                    )}
                                    {selectedExcelReport.fileName}
                                </h3>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                                    Client: {selectedExcelReport.client} | Period: {selectedExcelReport.month} {selectedExcelReport.year} | {selectedExcelReport.type === 'excel' ? `${selectedExcelReport.rows.length} rows loaded` : "Word Document Report"}
                                </p>
                            </div>
                            
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body Content (Word Document html OR Excel Table) */}
                        {selectedExcelReport.type === 'docx' ? (
                            <div className="flex-1 overflow-auto p-8 bg-slate-50 dark:bg-slate-900/10 flex justify-center">
                                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl p-10 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-y-auto prose dark:prose-invert prose-slate select-text text-sm leading-relaxed max-h-full">
                                    <div 
                                        dangerouslySetInnerHTML={{ __html: selectedExcelReport.content }}
                                        className="space-y-4"
                                    />
                                </div>
                            </div>
                        ) : (
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
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

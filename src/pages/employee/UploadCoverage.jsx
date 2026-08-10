import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { db } from '../../lib/firebaseClient';
import { supabase } from '../../lib/supabaseClient';
import { collection, addDoc, deleteDoc, doc, setDoc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';
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
    Users,
    Link2,
    ExternalLink,
    TrendingUp
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
        try {
            const saved = localStorage.getItem('anexar_assigned_clients');
            const parsed = saved ? JSON.parse(saved) : [];
            if (parsed && parsed.length > 0) return parsed;
        } catch (e) {}
        return ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];
    });

    useEffect(() => {
        const fetchClientsList = async () => {
            if (!user || !user.email) return;

            const emailLower = user.email.toLowerCase();
            const isDeveloperSatyam = emailLower.includes('satyam') || emailLower.includes('ss1084169') || emailLower.includes('test') || user.name?.toLowerCase().includes('satyam');
            const isCoreUser = user.role?.toLowerCase() === 'core' || user.role?.toLowerCase() === 'manager';
            const isChetan = emailLower === 'chetan@themavericksindia.com' || user.name?.toLowerCase().includes('chetan');
            const hasWholeAccess = isChetan || isDeveloperSatyam || isCoreUser;

            const DEFAULT_FALLBACK = ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];

            try {
                // 1. Core, Manager, or Developer bypass - fetch all active clients
                if (hasWholeAccess) {
                    try {
                        const { data, error } = await supabase
                            .from('clients')
                            .select('name')
                            .eq('is_active', true)
                            .order('name', { ascending: true });

                        if (!error && data && data.length > 0) {
                            setActiveClients(data.map(c => c.name));
                            return;
                        }
                    } catch (e) {
                        console.error("Supabase client fetch exception:", e);
                    }
                    setActiveClients(DEFAULT_FALLBACK);
                    return;
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

                setActiveClients(DEFAULT_FALLBACK);
            } catch (err) {
                console.error("Error loading active clients:", err);
                setActiveClients(DEFAULT_FALLBACK);
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

    // ReachLens results, keyed by row index, for the Excel viewer and the day-preview table
    const [excelReachResults, setExcelReachResults] = useState({});
    const [excelReachRunning, setExcelReachRunning] = useState(false);
    const [dayPreviewReachResults, setDayPreviewReachResults] = useState({});
    const [dayPreviewReachRunning, setDayPreviewReachRunning] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');
    const [openChoiceDoc, setOpenChoiceDoc] = useState(null);
    const [selectedExistingLinkId, setSelectedExistingLinkId] = useState('');
    const [exportNewLinkName, setExportNewLinkName] = useState('');
    const [customLinks, setCustomLinks] = useState([]);



    // Multi-tab layout states
    const [activeTab, setActiveTab] = useState('reports'); // 'press', 'reports'
    
    // Reports tab form states
    const [reportType, setReportType] = useState('Daily Tracker');
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportFile, setReportFile] = useState(null);
    const [reportUploading, setReportUploading] = useState(false);
    const reportFileInputRef = useRef(null);

    // Dynamic documents and updates feeds from Firestore
    const [documentList, setDocumentList] = useState([]);

    // Client segregation pill states & memos
    const [selectedFeedClient, setSelectedFeedClient] = useState('All');

    const uniqueClients = React.useMemo(() => {
        const clientsSet = new Set(documentList.map(d => d.client).filter(Boolean));
        return ['All', ...Array.from(clientsSet).sort()];
    }, [documentList]);

    const processedDocuments = React.useMemo(() => {
        return documentList
            .filter(d => {
                const matchesSearch = d.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                     d.fileName.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesClient = selectedFeedClient === 'All' || d.client.toLowerCase() === selectedFeedClient.toLowerCase();
                return matchesSearch && matchesClient;
            })
            .sort((a, b) => {
                const dateA = new Date(a.reportDate || a.createdAt).getTime();
                const dateB = new Date(b.reportDate || b.createdAt).getTime();
                return dateB - dateA;
            });
    }, [documentList, searchTerm, selectedFeedClient]);

    // Master Live Links states (Google Sheets & Docs)
    const DEFAULT_CLIENT_MASTER_LINKS = {
        'Scapia': {
            cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/1AurFLe0YYeM81fYoMCJF_b70UjgGVe-A/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
            filteredDocUrl: 'https://docs.google.com/document/d/1PteVNfa7xF9szNX2eGcq3lMqI7B2lcBMs0GFGjaijm4/edit?usp=drivesdk',
            masterDocUrl: 'https://docs.google.com/document/d/16XWEakARxprnrsf2fHgHm8GGqqFdN5hYwZH_gvjZm-Y/edit?usp=drivesdk'
        },
        'Wadhwani AI': {
            cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/1PQCIQM8yU-luDNmfT35pO5zk5jI4Ib0y/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
            filteredDocUrl: 'https://docs.google.com/document/d/1ZszkbDi7kFLIOMLYAmaUijctT8IddlY7NPCf68tANBg/edit?usp=drivesdk',
            masterDocUrl: 'https://docs.google.com/document/d/1qQpENdja3Tg1O-ED4jzKuaHkq5wgZit1lbIGOdJBZ8o/edit?usp=drivesdk'
        },
        'Wadhwani': {
            cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/1PQCIQM8yU-luDNmfT35pO5zk5jI4Ib0y/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
            filteredDocUrl: 'https://docs.google.com/document/d/1ZszkbDi7kFLIOMLYAmaUijctT8IddlY7NPCf68tANBg/edit?usp=drivesdk',
            masterDocUrl: 'https://docs.google.com/document/d/1qQpENdja3Tg1O-ED4jzKuaHkq5wgZit1lbIGOdJBZ8o/edit?usp=drivesdk'
        },
        'E3 Electric AI': {
            cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/16AbQMygKpWhYmvhmyFc7oxcz5WNsYacs/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
            filteredDocUrl: 'https://docs.google.com/document/d/1_VCUF7QaCtsqiS5nz191RVZ0ayt0Paves52OMo4EmOY/edit?usp=drivesdk',
            masterDocUrl: 'https://docs.google.com/document/d/1RHG8y63xEVd-N4o5Kb0pThgXTpu4yfSzGvAlELu2788/edit?usp=drivesdk'
        },
        'E3 Electric.AI': {
            cumulativeSheetUrl: 'https://docs.google.com/spreadsheets/d/16AbQMygKpWhYmvhmyFc7oxcz5WNsYacs/edit?usp=drivesdk&ouid=111134406246031913275&rtpof=true&sd=true',
            filteredDocUrl: 'https://docs.google.com/document/d/1_VCUF7QaCtsqiS5nz191RVZ0ayt0Paves52OMo4EmOY/edit?usp=drivesdk',
            masterDocUrl: 'https://docs.google.com/document/d/1RHG8y63xEVd-N4o5Kb0pThgXTpu4yfSzGvAlELu2788/edit?usp=drivesdk'
        },
        'Murf AI': {
            cumulativeSheetUrl: '',
            filteredDocUrl: 'https://docs.google.com/document/d/11o3qSpOeuPRwAHNdhHNqHTLLctMSPLTIDhwitajq9TA/edit?usp=drivesdk',
            masterDocUrl: 'https://docs.google.com/document/d/1qCxg--XA89qV1luwtJA5K0GMg9NOGfQInW3B4wBwkTw/edit?usp=drivesdk'
        }
    };

    const [cumulativeSheetUrl, setCumulativeSheetUrl] = useState('');
    const [filteredDocUrl, setFilteredDocUrl] = useState('');
    const [masterDocUrl, setMasterDocUrl] = useState('');
    const [isSavingMasterLinks, setIsSavingMasterLinks] = useState(false);
    const [masterLinksSaveSuccess, setMasterLinksSaveSuccess] = useState(false);

    const APPS_SCRIPT_EXPORT_URL = import.meta.env.VITE_APPS_SCRIPT_EXPORT_URL || '';
    const REACH_LENS_API_URL = import.meta.env.VITE_REACH_LENS_API_URL || '';
    const REACH_CONCURRENCY = 3;

    const fetchReachForUrl = async (url) => {
        const res = await fetch(REACH_LENS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, version: 'v10' })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data;
    };

    // Reach is expensive (a real Puppeteer scrape) and, once calculated for a
    // given article, doesn't need recalculating - persist it in Firestore keyed
    // by URL so it survives closing the modal, reopening it later, or even
    // opening the same article from a different client/day/table.
    const REACH_CACHE_COLLECTION = 'reach_cache';
    const urlToReachCacheId = (url) => encodeURIComponent(url);

    const getCachedReach = async (url) => {
        try {
            const snap = await getDoc(doc(db, REACH_CACHE_COLLECTION, urlToReachCacheId(url)));
            if (snap.exists()) return snap.data().reach;
        } catch (err) {
            console.error('Error reading reach cache:', err);
        }
        return null;
    };

    const setCachedReach = async (url, reach) => {
        try {
            await setDoc(doc(db, REACH_CACHE_COLLECTION, urlToReachCacheId(url)), {
                url,
                reach,
                calculatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error writing reach cache:', err);
        }
    };

    // Runs ReachLens over a list of {key, url} jobs with limited concurrency,
    // reporting each result back via onUpdate(key, {status, reach, error}) as it lands.
    // Cache hits resolve instantly with no Cloud Function call.
    const runReachBatch = async (jobs, onUpdate) => {
        let cursor = 0;
        const worker = async () => {
            while (cursor < jobs.length) {
                const job = jobs[cursor++];
                onUpdate(job.key, { status: 'loading' });
                try {
                    const cachedReach = await getCachedReach(job.url);
                    if (cachedReach !== null) {
                        onUpdate(job.key, { status: 'done', reach: cachedReach });
                        continue;
                    }
                    const result = await fetchReachForUrl(job.url);
                    await setCachedReach(job.url, result.estimatedReach);
                    onUpdate(job.key, { status: 'done', reach: result.estimatedReach });
                } catch (err) {
                    onUpdate(job.key, { status: 'error', error: err.message });
                }
            }
        };
        const workers = Array.from({ length: Math.min(REACH_CONCURRENCY, jobs.length) }, () => worker());
        await Promise.all(workers);
    };

    // On opening a table, silently pull in whatever's already cached (no API
    // calls) so previously-calculated days show their reach immediately -
    // "Calculate Reach" only ever has to compute what's genuinely new.
    const hydrateCachedReach = async (jobs, setResults) => {
        if (jobs.length === 0) return;
        const entries = await Promise.all(jobs.map(async (job) => {
            const cachedReach = await getCachedReach(job.url);
            return cachedReach !== null ? [job.key, { status: 'done', reach: cachedReach }] : null;
        }));
        const updates = {};
        entries.filter(Boolean).forEach(([key, val]) => { updates[key] = val; });
        if (Object.keys(updates).length > 0) {
            setResults(prev => ({ ...prev, ...updates }));
        }
    };

    const extractGoogleId = (url) => {
        if (!url) return null;
        const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetMatch) return { id: sheetMatch[1], type: 'sheet' };
        const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (docMatch) return { id: docMatch[1], type: 'doc' };
        return null;
    };

    const getGoogleExportUrl = (url, format = 'xlsx') => {
        if (!url) return '#';
        if (url.includes('/spreadsheets/d/')) {
            const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            if (idMatch && idMatch[1]) {
                return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=${format}`;
            }
        }
        if (url.includes('/document/d/')) {
            const idMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
            if (idMatch && idMatch[1]) {
                return `https://docs.google.com/document/d/${idMatch[1]}/export?format=${format === 'xlsx' ? 'docx' : format}`;
            }
        }
        return url;
    };

    const [dayPreview, setDayPreview] = useState(null);

    const handlePreviewSingleDay = async (rawUrl, clientNameStr, reportDateIso, docType = 'Filtered_Report') => {
        if (!rawUrl) return;
        if (!APPS_SCRIPT_EXPORT_URL) {
            alert("Preview isn't configured yet. Deploy google-apps-script/Code.gs and set VITE_APPS_SCRIPT_EXPORT_URL in .env.");
            return;
        }
        if (!reportDateIso) {
            alert("Please select a Daily Tracker Date first.");
            return;
        }
        const parsed = extractGoogleId(rawUrl);
        if (!parsed) {
            alert("Could not read a valid Google Doc/Sheet ID from this URL.");
            return;
        }

        setDayPreview({ type: parsed.type, clientName: clientNameStr, dateLabel: reportDateIso, docType, loading: true, error: '', html: '', rows: [] });
        setDayPreviewReachResults({});
        setDayPreviewReachRunning(false);

        try {
            const params = new URLSearchParams({
                mode: 'preview',
                docId: parsed.id,
                type: parsed.type,
                date: reportDateIso,
                client: clientNameStr || 'Client',
                docType
            });
            const res = await fetch(`${APPS_SCRIPT_EXPORT_URL}?${params.toString()}`);
            const data = await res.json();
            if (!data.found) {
                setDayPreview(prev => prev ? { ...prev, loading: false, error: data.message || 'No matching section found for this date.' } : null);
                return;
            }
            setDayPreview(prev => prev ? {
                ...prev,
                loading: false,
                html: data.html || '',
                rows: data.rows || []
            } : null);
        } catch (err) {
            console.error("Error previewing single day:", err);
            setDayPreview(prev => prev ? { ...prev, loading: false, error: 'Failed to load preview. Check the Apps Script deployment.' } : null);
        }
    };

    const handleExtractSingleDayFile = (rawUrl, clientNameStr, reportDateIso, docType = 'Filtered_Report') => {
        if (!rawUrl) return;
        if (!APPS_SCRIPT_EXPORT_URL) {
            alert("Single-day extraction isn't configured yet. Deploy google-apps-script/Code.gs as a Web App and set its URL as VITE_APPS_SCRIPT_EXPORT_URL in .env.");
            return;
        }
        if (!reportDateIso) {
            alert("Please select a Daily Tracker Date first.");
            return;
        }
        const parsed = extractGoogleId(rawUrl);
        if (!parsed) {
            alert("Could not read a valid Google Doc/Sheet ID from this URL.");
            return;
        }

        const params = new URLSearchParams({
            docId: parsed.id,
            type: parsed.type,
            date: reportDateIso,
            client: clientNameStr || 'Client',
            docType
        });
        window.open(`${APPS_SCRIPT_EXPORT_URL}?${params.toString()}`, '_blank');
    };

    useEffect(() => {
        if (!clientName) return;
        const docRef = doc(db, "client_master_links", clientName);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCumulativeSheetUrl(data.cumulativeSheetUrl || '');
                setFilteredDocUrl(data.filteredDocUrl || '');
                setMasterDocUrl(data.masterDocUrl || '');
            } else {
                const foundKey = Object.keys(DEFAULT_CLIENT_MASTER_LINKS).find(k => k.toLowerCase() === clientName.toLowerCase());
                const defaults = foundKey ? DEFAULT_CLIENT_MASTER_LINKS[foundKey] : null;
                setCumulativeSheetUrl(defaults?.cumulativeSheetUrl || '');
                setFilteredDocUrl(defaults?.filteredDocUrl || '');
                setMasterDocUrl(defaults?.masterDocUrl || '');
            }
        });
        return () => unsubscribe();
    }, [clientName]);

    const handleSaveMasterLinks = async (e) => {
        e.preventDefault();
        if (!clientName) {
            alert("Please select a client account name first.");
            return;
        }
        setIsSavingMasterLinks(true);
        try {
            await setDoc(doc(db, "client_master_links", clientName), {
                client: clientName,
                cumulativeSheetUrl: cumulativeSheetUrl.trim(),
                filteredDocUrl: filteredDocUrl.trim(),
                masterDocUrl: masterDocUrl.trim(),
                updatedAt: new Date().toISOString(),
                updatedBy: user?.email || user?.name || 'Team'
            }, { merge: true });
            setMasterLinksSaveSuccess(true);
            setTimeout(() => setMasterLinksSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Error saving client master links:", err);
            alert("Failed to save master links.");
        } finally {
            setIsSavingMasterLinks(false);
        }
    };

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

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!reportFile) {
            alert("Please select a file to upload.");
            return;
        }
        setReportUploading(true);

        try {
            let fileData = null;
            if (reportFile) {
                fileData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(reportFile);
                });
            }

            const newDoc = {
                client: clientName,
                type: reportType,
                fileName: reportFile.name,
                fileSize: (reportFile.size / 1024).toFixed(1) + ' KB',
                uploadedBy: user?.email || user?.name || 'Manager',
                reportDate: reportDate || new Date().toISOString().split('T')[0],
                month,
                year,
                fileData,
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

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this document record?")) return;
        try {
            await deleteDoc(doc(db, "client_documents", docId));
        } catch (err) {
            console.error("Error deleting document record:", err);
            alert("Failed to delete document record.");
        }
    };

    const handleDownloadDocument = (docItem) => {
        if (docItem.fileData) {
            const link = document.createElement('a');
            link.href = docItem.fileData;
            link.download = docItem.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (docItem.type === 'excel' && docItem.rows && docItem.headers) {
            const dataToExport = docItem.rows.map(row => {
                const cleanRow = {};
                docItem.headers.forEach(h => {
                    if (row[h] !== undefined) {
                        cleanRow[h] = row[h];
                    }
                });
                return cleanRow;
            });
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tracker");
            XLSX.writeFile(workbook, `${docItem.fileName || 'Tracker'}.xlsx`);
        } else if (docItem.type === 'docx' && docItem.content) {
            const blob = new Blob([docItem.content], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${docItem.fileName || 'Document'}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            alert("No download source available for this item.");
        }
    };

    const handleViewDocumentNewWindow = (docItem) => {
        if (docItem.type === 'excel' && docItem.rows && docItem.headers) {
            const newWindow = window.open();
            if (newWindow) {
                let tableHtml = `
                    <html>
                    <head>
                        <title>${docItem.fileName}</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; background: #f8fafc; color: #1e293b; }
                            .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                            h3 { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
                            p { margin: 5px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                            .table-container { overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 12px; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                            table { border-collapse: collapse; width: 100%; }
                            th, td { border-bottom: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 12px; }
                            th { background: #f1f5f9; font-weight: bold; color: #334155; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                            tr:last-child td { border-bottom: none; }
                            tr:hover { background: #f8fafc; }
                            a { color: #3b82f6; text-decoration: none; font-weight: 600; }
                            a:hover { text-decoration: underline; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h3>${docItem.fileName}</h3>
                            <p>Client: ${docItem.client} | Ingested via Gmail</p>
                        </div>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        ${docItem.headers.map(h => `<th>${h}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${docItem.rows.map(row => `
                                        <tr>
                                            ${docItem.headers.map(h => {
                                                const val = row[h] !== undefined ? row[h] : '';
                                                if (h === 'Link' && val) {
                                                    return `<td><a href="${val}" target="_blank" rel="noopener noreferrer">View Link</a></td>`;
                                                }
                                                return `<td>${val}</td>`;
                                            }).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </body>
                    </html>
                `;
                newWindow.document.write(tableHtml);
                newWindow.document.close();
            }
        } else if (docItem.type === 'docx' && docItem.content) {
            const blob = new Blob([docItem.content], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } else if (docItem.fileData) {
            window.open(docItem.fileData, '_blank');
        } else {
            alert("No preview source available to open in new tab.");
        }
    };

    const triggerOpenChoiceDoc = (docItem) => {
        setOpenChoiceDoc(docItem);
        setExportNewLinkName(docItem.fileName.replace(/\.[^/.]+$/, ""));
        
        const links = [];
        if (docItem.type === 'excel') {
            if (cumulativeSheetUrl) links.push('cumulativeSheetUrl');
            customLinks.forEach(link => { if (link.type === 'excel') links.push(link.id); });
        } else {
            if (filteredDocUrl) links.push('filteredDocUrl');
            if (masterDocUrl) links.push('masterDocUrl');
            customLinks.forEach(link => { if (link.type === 'docx') links.push(link.id); });
        }
        setSelectedExistingLinkId(links[0] || '');
    };

    const getEligibleExistingLinks = () => {
        if (!openChoiceDoc) return [];
        const links = [];
        if (openChoiceDoc.type === 'excel') {
            if (cumulativeSheetUrl) {
                links.push({ id: 'cumulativeSheetUrl', name: '1. Cumulative Master Google Sheet', url: cumulativeSheetUrl });
            }
            customLinks.forEach(link => {
                if (link.type === 'excel') {
                    links.push({ id: link.id, name: `Custom: ${link.name}`, url: link.url });
                }
            });
        } else {
            if (filteredDocUrl) {
                links.push({ id: 'filteredDocUrl', name: '2. Filtered Report Google Doc (Relevant)', url: filteredDocUrl });
            }
            if (masterDocUrl) {
                links.push({ id: 'masterDocUrl', name: '3. Master Report Google Doc (All)', url: masterDocUrl });
            }
            customLinks.forEach(link => {
                if (link.type === 'docx') {
                    links.push({ id: link.id, name: `Custom: ${link.name}`, url: link.url });
                }
            });
        }
        return links;
    };

    const handleOpenGoogleDoc = async (docItem, mode) => {
        try {
            if (docItem.type === 'excel' && docItem.rows && docItem.headers) {
                const tsvLines = [];
                tsvLines.push(docItem.headers.join('\t'));
                docItem.rows.forEach(row => {
                    const line = docItem.headers.map(h => row[h] !== undefined ? row[h] : '').join('\t');
                    tsvLines.push(line);
                });
                const tsvString = tsvLines.join('\n');
                await navigator.clipboard.writeText(tsvString);
            } else if (docItem.type === 'docx' && docItem.content) {
                const blob = new Blob([docItem.content], { type: 'text/html' });
                const clipboardItem = new ClipboardItem({ 'text/html': blob });
                await navigator.clipboard.write([clipboardItem]);
            }

            let targetUrl = '';
            if (mode === 'new') {
                targetUrl = docItem.type === 'excel' ? 'https://sheets.new' : 'https://docs.new';
                const newLink = {
                    id: Date.now().toString(),
                    name: exportNewLinkName.trim() || docItem.fileName,
                    url: targetUrl,
                    type: docItem.type
                };
                const updatedLinks = [...customLinks, newLink];
                await setDoc(doc(db, "client_master_links", clientName), {
                    customLinks: updatedLinks
                }, { merge: true });
            } else {
                if (selectedExistingLinkId === 'cumulativeSheetUrl') {
                    targetUrl = cumulativeSheetUrl;
                } else if (selectedExistingLinkId === 'filteredDocUrl') {
                    targetUrl = filteredDocUrl;
                } else if (selectedExistingLinkId === 'masterDocUrl') {
                    targetUrl = masterDocUrl;
                } else {
                    const found = customLinks.find(link => link.id === selectedExistingLinkId);
                    targetUrl = found ? found.url : '';
                }
            }

            window.open(targetUrl || 'https://drive.google.com', '_blank');
            alert(`Briefing data successfully copied to clipboard! Just click inside your Google ${docItem.type === 'excel' ? 'Sheet' : 'Doc'} and press Ctrl+V (Paste).`);
        } catch (err) {
            console.error("Clipboard export failed:", err);
            alert("Failed to copy content to clipboard automatically. Opening viewer instead.");
            handleViewDocumentNewWindow(docItem);
        }
    };

    // Reset states when modal closes
    const handleCloseModal = () => {
        setSelectedExcelReport(null);
        setSortColumn(null);
        setExcelReachResults({});
        setExcelReachRunning(false);
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

    const getRowLinkExcel = (row) => {
        if (!selectedExcelReport) return null;
        for (const h of selectedExcelReport.headers) {
            const val = row[h] !== undefined ? row[h].toString() : '';
            if (val.startsWith('http://') || val.startsWith('https://')) return val;
        }
        return null;
    };

    const handleCalculateExcelReach = async () => {
        if (!REACH_LENS_API_URL) {
            alert("ReachLens isn't configured yet. Set VITE_REACH_LENS_API_URL in .env once the Cloud Function is deployed.");
            return;
        }
        const rows = getSortedRows();
        const jobs = rows
            .map(row => ({ key: getRowLinkExcel(row), url: getRowLinkExcel(row) }))
            .filter(job => job.url);

        if (jobs.length === 0) return;

        setExcelReachRunning(true);
        setExcelReachResults(prev => {
            const next = { ...prev };
            jobs.forEach(job => { next[job.key] = { status: 'loading' }; });
            return next;
        });

        await runReachBatch(jobs, (key, update) => {
            setExcelReachResults(prev => ({ ...prev, [key]: update }));
        });

        setExcelReachRunning(false);
    };

    const getRowLinkDayPreview = (row) => {
        const cell = row.find(c => c && c.url);
        return cell ? cell.url : null;
    };

    const handleCalculateDayPreviewReach = async () => {
        if (!REACH_LENS_API_URL) {
            alert("ReachLens isn't configured yet. Set VITE_REACH_LENS_API_URL in .env once the Cloud Function is deployed.");
            return;
        }
        if (!dayPreview || dayPreview.type !== 'sheet') return;
        const jobs = dayPreview.rows
            .map(row => ({ key: getRowLinkDayPreview(row), url: getRowLinkDayPreview(row) }))
            .filter(job => job.url);

        if (jobs.length === 0) return;

        setDayPreviewReachRunning(true);
        setDayPreviewReachResults(prev => {
            const next = { ...prev };
            jobs.forEach(job => { next[job.key] = { status: 'loading' }; });
            return next;
        });

        await runReachBatch(jobs, (key, update) => {
            setDayPreviewReachResults(prev => ({ ...prev, [key]: update }));
        });

        setDayPreviewReachRunning(false);
    };

    // Auto-fill already-cached reach values as soon as a table's data is ready,
    // with no API calls - "Calculate Reach" then only has genuinely new links left to do.
    useEffect(() => {
        if (dayPreview && dayPreview.type === 'sheet' && !dayPreview.loading && !dayPreview.error) {
            const jobs = dayPreview.rows
                .map(row => ({ key: getRowLinkDayPreview(row), url: getRowLinkDayPreview(row) }))
                .filter(job => job.url);
            hydrateCachedReach(jobs, setDayPreviewReachResults);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayPreview]);

    useEffect(() => {
        if (selectedExcelReport && selectedExcelReport.type === 'excel') {
            const jobs = (selectedExcelReport.rows || [])
                .map(row => ({ key: getRowLinkExcel(row), url: getRowLinkExcel(row) }))
                .filter(job => job.url);
            hydrateCachedReach(jobs, setExcelReachResults);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedExcelReport]);

    // Builds a client-ready .xlsx with a Reach column appended, preserving the
    // original article hyperlinks, and triggers a browser download.
    const downloadDayPreviewWithReach = () => {
        if (!dayPreview || dayPreview.type !== 'sheet') return;

        const aoa = dayPreview.rows.map((row, r) => {
            const values = row.map(cell => cell?.text ?? '');
            if (r === 0) return [...values, 'Reach'];
            const link = getRowLinkDayPreview(row);
            const result = link ? dayPreviewReachResults[link] : null;
            const reachValue = result?.status === 'done' ? Math.round(result.reach) : '';
            return [...values, reachValue];
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        dayPreview.rows.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell?.url) {
                    const cellRef = XLSX.utils.encode_cell({ r, c });
                    if (ws[cellRef]) ws[cellRef].l = { Target: cell.url };
                }
            });
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, String(dayPreview.dateLabel || 'Sheet1').slice(0, 31));
        XLSX.writeFile(wb, `${dayPreview.clientName || 'Client'}_${dayPreview.docType || 'Report'}_${dayPreview.dateLabel}_with_Reach.xlsx`);
    };

    const downloadExcelReportWithReach = () => {
        if (!selectedExcelReport) return;
        const rows = getSortedRows();
        const headers = [...selectedExcelReport.headers, 'Reach'];
        const aoa = [headers];

        rows.forEach(row => {
            const values = selectedExcelReport.headers.map(h => row[h] !== undefined ? row[h].toString() : '');
            const link = getRowLinkExcel(row);
            const result = link ? excelReachResults[link] : null;
            const reachValue = result?.status === 'done' ? Math.round(result.reach) : '';
            aoa.push([...values, reachValue]);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        rows.forEach((row, rIdx) => {
            selectedExcelReport.headers.forEach((h, cIdx) => {
                const val = row[h] !== undefined ? row[h].toString() : '';
                if (val.startsWith('http://') || val.startsWith('https://')) {
                    const cellRef = XLSX.utils.encode_cell({ r: rIdx + 1, c: cIdx });
                    if (ws[cellRef]) ws[cellRef].l = { Target: val };
                }
            });
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        const baseName = (selectedExcelReport.fileName || 'Report').replace(/\.[^.]+$/, '');
        XLSX.writeFile(wb, `${baseName}_with_Reach.xlsx`);
    };

    const renderReachCell = (result) => {
        if (!result) return <span className="text-slate-300 dark:text-slate-700">&mdash;</span>;
        if (result.status === 'loading') {
            return <span className="inline-block h-3 w-3 border-2 border-slate-300 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin"></span>;
        }
        if (result.status === 'error') {
            return <span className="text-red-500 text-2xs font-bold" title={result.error}>Failed</span>;
        }
        return <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round(result.reach).toLocaleString()}</span>;
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
                    <div className="grid grid-cols-1 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
                        {/* 
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
                        */}
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

                                {/* Date (Day-wise), Month & Year Dropdowns */}
                                {activeTab !== 'overall' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Calendar size={14} className="text-purple-500" />
                                                Daily Tracker Date
                                            </label>
                                            <input
                                                type="date"
                                                value={reportDate}
                                                onChange={(e) => {
                                                    setReportDate(e.target.value);
                                                    if (e.target.value) {
                                                        const d = new Date(e.target.value);
                                                        const monthName = d.toLocaleString('default', { month: 'long' });
                                                        setMonth(monthName);
                                                        setYear(d.getFullYear().toString());
                                                    }
                                                }}
                                                className="w-full h-11 px-3 text-xs font-semibold rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white transition-all outline-none"
                                            />
                                        </div>

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

                            {/* TAB 2: TRACKERS & REPORTS (MASTER LINKS & FILE ONBOARDING) */}
                            {activeTab === 'reports' && (
                                <div className="space-y-6">
                                    {/* Pinned Master Live Links (Google Sheets & Docs) */}
                                    <div className="bg-purple-500/5 dark:bg-purple-500/10 p-5 rounded-2xl border border-purple-500/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                                <Link2 size={14} className="text-purple-500" />
                                                Pinned Master Live Links
                                            </h4>
                                            {masterLinksSaveSuccess && (
                                                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Live Saved!
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                            Set permanent Google Sheet & Doc master links for <strong className="text-purple-600 dark:text-purple-400">{clientName || 'selected client'}</strong>. Updated daily date-wise.
                                        </p>

                                        <div className="space-y-3 pt-1">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">1. Cumulative Master Google Sheet URL</label>
                                                    {cumulativeSheetUrl && (
                                                        <div className="flex items-center gap-2">
                                                            <a href={cumulativeSheetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-0.5">
                                                                Open Sheet <ExternalLink size={10} />
                                                            </a>
                                                            {(() => {
                                                                const matchingDoc = processedDocuments.find(d => 
                                                                    d.client.toLowerCase() === clientName.toLowerCase() && 
                                                                    d.reportDate === reportDate &&
                                                                    d.type === 'excel'
                                                                );
                                                                if (matchingDoc) {
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => triggerOpenChoiceDoc(matchingDoc)}
                                                                            className="text-[10px] text-indigo-650 dark:text-indigo-400 font-black hover:underline flex items-center gap-0.5 cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border-0 transition-all"
                                                                            title="Open and copy daily tracker contents to clipboard"
                                                                        >
                                                                            Open & Paste <Sparkles size={10} className="text-indigo-500 animate-pulse" />
                                                                        </button>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePreviewSingleDay(cumulativeSheetUrl, clientName, reportDate, 'Daily_Tracker')}
                                                                title={`Preview ${reportDate} in-app`}
                                                                className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-lg font-bold hover:bg-sky-500/20 flex items-center gap-1 transition-all cursor-pointer border-0"
                                                            >
                                                                <Eye size={10} /> Preview
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleExtractSingleDayFile(cumulativeSheetUrl, clientName, reportDate, 'Daily_Tracker')}
                                                                title={`Extract only ${reportDate} into a standalone .xlsx`}
                                                                className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg font-bold hover:bg-emerald-500/20 flex items-center gap-1 transition-all cursor-pointer border-0"
                                                            >
                                                                <Download size={10} /> Extract Day
                                                            </button>
                                                            <a href={getGoogleExportUrl(cumulativeSheetUrl, 'xlsx')} target="_blank" rel="noopener noreferrer" title="Downloads the full cumulative month, not just one day" className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold hover:underline flex items-center gap-1">
                                                                Full Export
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="url"
                                                    value={cumulativeSheetUrl}
                                                    onChange={(e) => setCumulativeSheetUrl(e.target.value)}
                                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">2. Filtered Report Google Doc (Relevant Articles)</label>
                                                    {filteredDocUrl && (
                                                        <div className="flex items-center gap-2">
                                                            <a href={filteredDocUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-0.5">
                                                                Open Doc <ExternalLink size={10} />
                                                            </a>
                                                            {(() => {
                                                                const matchingDoc = processedDocuments.find(d => 
                                                                    d.client.toLowerCase() === clientName.toLowerCase() && 
                                                                    d.reportDate === reportDate &&
                                                                    d.type === 'docx'
                                                                );
                                                                if (matchingDoc) {
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => triggerOpenChoiceDoc(matchingDoc)}
                                                                            className="text-[10px] text-indigo-650 dark:text-indigo-400 font-black hover:underline flex items-center gap-0.5 cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border-0 transition-all"
                                                                            title="Open and copy daily newsletter briefing contents to clipboard"
                                                                        >
                                                                            Open & Paste <Sparkles size={10} className="text-indigo-500 animate-pulse" />
                                                                        </button>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePreviewSingleDay(filteredDocUrl, clientName, reportDate, 'Filtered_Report')}
                                                                title={`Preview ${reportDate} in-app`}
                                                                className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-lg font-bold hover:bg-sky-500/20 flex items-center gap-1 transition-all cursor-pointer border-0"
                                                            >
                                                                <Eye size={10} /> Preview
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleExtractSingleDayFile(filteredDocUrl, clientName, reportDate, 'Filtered_Report')}
                                                                title={`Extract only ${reportDate} into a standalone .docx`}
                                                                className="text-[10px] bg-purple-500/10 text-purple-650 dark:text-purple-400 px-2 py-0.5 rounded-lg font-bold hover:bg-purple-500/20 flex items-center gap-1 transition-all cursor-pointer border-0"
                                                            >
                                                                <Download size={10} /> Extract Day
                                                            </button>
                                                            <a href={getGoogleExportUrl(filteredDocUrl, 'docx')} target="_blank" rel="noopener noreferrer" title="Downloads the full cumulative month, not just one day" className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold hover:underline flex items-center gap-1">
                                                                Full Export
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="url"
                                                    value={filteredDocUrl}
                                                    onChange={(e) => setFilteredDocUrl(e.target.value)}
                                                    placeholder="https://docs.google.com/document/d/..."
                                                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">3. Master Report Google Doc (All Search Matches)</label>
                                                    {masterDocUrl && (
                                                        <div className="flex items-center gap-2">
                                                            <a href={masterDocUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5">
                                                                Open Doc <ExternalLink size={10} />
                                                            </a>
                                                            {(() => {
                                                                const matchingDoc = processedDocuments.find(d => 
                                                                    d.client.toLowerCase() === clientName.toLowerCase() && 
                                                                    d.reportDate === reportDate &&
                                                                    d.type === 'docx'
                                                                );
                                                                if (matchingDoc) {
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => triggerOpenChoiceDoc(matchingDoc)}
                                                                            className="text-[10px] text-indigo-655 dark:text-indigo-400 font-black hover:underline flex items-center gap-0.5 cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border-0 transition-all"
                                                                            title="Open and copy daily newsletter briefing contents to clipboard"
                                                                        >
                                                                            Open & Paste <Sparkles size={10} className="text-indigo-500 animate-pulse" />
                                                                        </button>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePreviewSingleDay(masterDocUrl, clientName, reportDate, 'Master_Report')}
                                                                title={`Preview ${reportDate} in-app`}
                                                                className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-lg font-bold hover:bg-sky-500/20 flex items-center gap-1 transition-all cursor-pointer border-0"
                                                            >
                                                                <Eye size={10} /> Preview
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleExtractSingleDayFile(masterDocUrl, clientName, reportDate, 'Master_Report')}
                                                                title={`Extract only ${reportDate} into a standalone .docx`}
                                                                className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-lg font-bold hover:bg-indigo-500/20 flex items-center gap-1 transition-all cursor-pointer border-0"
                                                            >
                                                                <Download size={10} /> Extract Day
                                                            </button>
                                                            <a href={getGoogleExportUrl(masterDocUrl, 'docx')} target="_blank" rel="noopener noreferrer" title="Downloads the full cumulative month, not just one day" className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold hover:underline flex items-center gap-1">
                                                                Full Export
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="url"
                                                    value={masterDocUrl}
                                                    onChange={(e) => setMasterDocUrl(e.target.value)}
                                                    placeholder="https://docs.google.com/document/d/..."
                                                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleSaveMasterLinks}
                                                disabled={isSavingMasterLinks || !clientName}
                                                className="w-full h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                                            >
                                                {isSavingMasterLinks ? "Saving Links..." : `Pin All 3 Master Links for ${clientName || 'Client'}`}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Daily Snapshot File Onboarding Form - Commented out safely via conditional rendering */}
                                    {false && (
                                        <form onSubmit={handleReportSubmit} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                                <UploadCloud size={14} className="text-purple-500" />
                                                Onboard Daily Snapshot File (.xlsx / .docx)
                                            </h4>
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
                                                    className="border border-dashed border-slate-250 dark:border-slate-855 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/35 hover:bg-purple-500/5 transition-colors relative cursor-pointer"
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
                                                        : 'bg-slate-100 dark:bg-slate-900 text-slate-455 dark:text-slate-600 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
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
                                </div>
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

                    {/* Client Segregation Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none select-none -mt-1 shrink-0">
                        {uniqueClients.map(c => {
                            const isSelected = selectedFeedClient.toLowerCase() === c.toLowerCase();
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setSelectedFeedClient(c)}
                                    className={`px-3 py-1.5 rounded-2xl text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                                        isSelected
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10'
                                            : 'bg-white dark:bg-slate-955 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-905 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    {c}
                                </button>
                            );
                        })}
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
                            {processedDocuments.length === 0 ? (
                                <div className="p-16 text-center text-slate-405 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
                                    <Layers className="mx-auto text-slate-300 dark:border-slate-700 mb-3" size={40} />
                                    <p className="text-xs font-bold uppercase tracking-widest">No Documents Found</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Ready for custom client reports & trackers.</p>
                                </div>
                            ) : (
                                processedDocuments.map((doc) => {
                                    const hasPreview = doc.content || doc.type === 'docx' || doc.type === 'excel' || doc.fileData;
                                    return (
                                        <div 
                                            key={doc.docId} 
                                            onClick={() => hasPreview && setSelectedExcelReport(doc)}
                                            className={`bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-905 p-6 rounded-3xl shadow-lg flex items-center justify-between gap-4 relative overflow-hidden transition-all ${hasPreview ? 'cursor-pointer hover:border-purple-500/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-purple-500/10 text-purple-650 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0 border border-purple-200/20">
                                                    {doc.type === 'excel' ? <FileSpreadsheet size={20} /> : <FileText size={20} />}
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
                                            <div className="flex items-center gap-2 shrink-0">
                                                {hasPreview && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedExcelReport(doc); }}
                                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer"
                                                        title="View in Existing Tab (Modal)"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc); }}
                                                    className="p-2 text-purple-650 dark:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all cursor-pointer"
                                                    title="Download Report"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.docId); }}
                                                    className="p-2 text-slate-405 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer shrink-0"
                                                    title="Delete document"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* DYNAMIC EXCEL & DOCX FULL-SCREEN MODAL VIEWER */}
            {selectedExcelReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in animate-duration-150">
                    <div className={`bg-white dark:bg-slate-955 w-full h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col ${selectedExcelReport.type === 'excel' ? 'max-w-6xl lg:max-w-7xl' : 'max-w-4xl'}`}>
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

                            <div className="flex items-center gap-2">
                                {selectedExcelReport.type === 'excel' && (
                                    <button
                                        onClick={handleCalculateExcelReach}
                                        disabled={excelReachRunning}
                                        className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <TrendingUp size={14} />
                                        {excelReachRunning ? 'Calculating Reach...' : 'Calculate Reach'}
                                    </button>
                                )}
                                {selectedExcelReport.type === 'excel' && (
                                    <button
                                        onClick={downloadExcelReportWithReach}
                                        title="Download an .xlsx with the Reach column included, ready to send to the client"
                                        className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                                    >
                                        <Download size={14} />
                                        Download with Reach
                                    </button>
                                )}
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body Content (Word Document html OR Excel Table) */}
                        {selectedExcelReport.type === 'docx' ? (
                            <div className="flex-1 overflow-hidden p-6 bg-slate-50 dark:bg-slate-900/10 flex justify-center h-full">
                                <div className="bg-white w-full max-w-5xl h-full rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                                    <iframe 
                                        srcDoc={
                                            selectedExcelReport.content.includes('<html') || selectedExcelReport.content.includes('<!DOCTYPE')
                                                ? selectedExcelReport.content
                                                : `<!DOCTYPE html>
                                                   <html>
                                                   <head>
                                                       <meta charset="utf-8">
                                                       <style>
                                                           body {
                                                               font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                                               padding: 30px;
                                                               line-height: 1.6;
                                                               color: #1e293b;
                                                               background-color: #ffffff;
                                                           }
                                                           img { max-width: 100%; height: auto; }
                                                       </style>
                                                   </head>
                                                   <body>
                                                       ${selectedExcelReport.content}
                                                   </body>
                                                   </html>`
                                        }
                                        title="Mailer Preview"
                                        className="w-full h-full border-none bg-white"
                                        sandbox="allow-same-origin"
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
                                                <th className="p-4 min-w-[100px] w-[100px] bg-amber-500/5 border-l border-amber-500/20">
                                                    <div className="flex items-center gap-1.5">
                                                        <TrendingUp size={11} /> Reach
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {getSortedRows().map((row, rIdx) => {
                                                const rowValues = Object.values(row).filter(v => v !== null && v !== undefined && v.toString().trim() !== "");
                                                const isDividerRow = rowValues.length === 1;

                                                if (isDividerRow) {
                                                    return (
                                                        <tr key={rIdx} className="bg-amber-500/5 dark:bg-amber-500/10 font-black text-amber-600 dark:text-amber-400">
                                                            <td colSpan={selectedExcelReport.headers.length + 1} className="p-4 text-center font-bold tracking-wider uppercase text-2xs bg-amber-500/5">
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
                                                        <td className="p-4 align-top text-center min-w-[100px] w-[100px] bg-amber-500/5 border-l border-amber-500/20">
                                                            {renderReachCell(excelReachResults[getRowLinkExcel(row)])}
                                                        </td>
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

            {dayPreview && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { setDayPreview(null); setDayPreviewReachResults({}); setDayPreviewReachRunning(false); }}>
                    <div
                        className={`bg-white dark:bg-slate-955 rounded-3xl shadow-2xl w-full h-[85vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 ${dayPreview.type === 'sheet' ? 'max-w-6xl lg:max-w-7xl' : 'max-w-4xl'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Eye size={16} className="text-sky-500" />
                                {dayPreview.clientName} &mdash; {(dayPreview.docType || '').replace(/_/g, ' ')} ({dayPreview.dateLabel})
                            </h3>
                            <div className="flex items-center gap-2">
                                {dayPreview.type === 'sheet' && !dayPreview.loading && !dayPreview.error && (
                                    <button
                                        onClick={handleCalculateDayPreviewReach}
                                        disabled={dayPreviewReachRunning}
                                        className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <TrendingUp size={14} />
                                        {dayPreviewReachRunning ? 'Calculating Reach...' : 'Calculate Reach'}
                                    </button>
                                )}
                                {dayPreview.type === 'sheet' && !dayPreview.loading && !dayPreview.error && (
                                    <button
                                        onClick={downloadDayPreviewWithReach}
                                        title="Download an .xlsx with the Reach column included, ready to send to the client"
                                        className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                                    >
                                        <Download size={14} />
                                        Download with Reach
                                    </button>
                                )}
                                <button
                                    onClick={() => { setDayPreview(null); setDayPreviewReachResults({}); setDayPreviewReachRunning(false); }}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden p-4">
                            {dayPreview.loading && (
                                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold uppercase tracking-wide">
                                    Loading preview&hellip;
                                </div>
                            )}

                            {!dayPreview.loading && dayPreview.error && (
                                <div className="flex items-center justify-center h-full text-red-500 text-xs font-bold px-8 text-center">
                                    {dayPreview.error}
                                </div>
                            )}

                            {!dayPreview.loading && !dayPreview.error && dayPreview.type === 'doc' && (
                                <iframe
                                    srcDoc={dayPreview.html}
                                    title="Day preview"
                                    className="w-full h-full border-0 rounded-2xl bg-white"
                                />
                            )}

                            {!dayPreview.loading && !dayPreview.error && dayPreview.type === 'sheet' && (
                                <div className="overflow-auto h-full rounded-2xl border border-slate-100 dark:border-slate-800">
                                    {/* A day's tab has multiple embedded section headers (e.g. "Credit Cards,
                                        Fintechs, Banks & More"), not one clean header row, so this renders as a
                                        plain grid rather than a fixed thead. */}
                                    <table className="w-full text-xs border-collapse">
                                        <tbody>
                                            {dayPreview.rows.map((row, r) => (
                                                <tr key={r} className={`border-b border-slate-100 dark:border-slate-900 ${r === 0 ? 'font-bold bg-slate-50 dark:bg-slate-900' : ''}`}>
                                                    {row.map((cell, c) => (
                                                        <td key={c} className="p-3 text-slate-700 dark:text-slate-300 align-top">
                                                            {cell?.url ? (
                                                                <a
                                                                    href={cell.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sky-600 dark:text-sky-400 underline font-semibold"
                                                                >
                                                                    {cell.text || 'Link'}
                                                                </a>
                                                            ) : (
                                                                String(cell?.text ?? '')
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="p-3 text-center align-top min-w-[90px] w-[90px] bg-amber-500/5 border-l border-amber-500/20">
                                                        {r === 0 ? (
                                                            <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400">Reach</span>
                                                        ) : (
                                                            renderReachCell(dayPreviewReachResults[getRowLinkDayPreview(row)])
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}            {openChoiceDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md animate-fade-in" onClick={() => setOpenChoiceDoc(null)}>
                    <div className="bg-white dark:bg-slate-955 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={14} className="text-purple-500" />
                                Export & Open Options
                            </h4>
                            <button
                                onClick={() => setOpenChoiceDoc(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{openChoiceDoc.fileName}</p>
                            <p className="text-[10px] text-slate-550 font-semibold uppercase">{openChoiceDoc.client} • {openChoiceDoc.type === 'excel' ? 'Spreadsheet Tracker' : 'Word Briefing'}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Option 1: View Standalone Preview */}
                            <button
                                onClick={() => {
                                    handleViewDocumentNewWindow(openChoiceDoc);
                                    setOpenChoiceDoc(null);
                                }}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900/60 hover:bg-purple-500/5 hover:border-purple-500 border border-slate-200/65 dark:border-slate-800/80 rounded-2xl transition-all text-left flex items-center gap-3 cursor-pointer group"
                            >
                                <div className="h-9 w-9 bg-purple-500/10 text-purple-650 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                                    <Eye size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-850 dark:text-white group-hover:text-purple-605 transition-colors">1. View Raw in Standalone Tab</h4>
                                    <p className="text-[10px] text-slate-450 mt-0.5">Open a raw view in a standalone browser tab.</p>
                                </div>
                            </button>

                            {/* Option 2: Open in Existing Google Doc/Sheet */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/65 dark:border-slate-800/80 rounded-2xl space-y-3">
                                <div>
                                    <h5 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                                        <FileSpreadsheet size={14} className="text-amber-550" />
                                        2. Open & Paste into Existing Pinned Link
                                    </h5>
                                    <p className="text-[10px] text-slate-450 mt-0.5">Copies data to clipboard and opens the pinned Google link in next tab.</p>
                                </div>
                                
                                {getEligibleExistingLinks().length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic">No pinned links matching this type are available yet.</p>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <select
                                            value={selectedExistingLinkId}
                                            onChange={(e) => setSelectedExistingLinkId(e.target.value)}
                                            className="w-full h-8 px-2 text-xs rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none"
                                        >
                                            {getEligibleExistingLinks().map(link => (
                                                <option key={link.id} value={link.id}>{link.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={async () => {
                                                await handleOpenGoogleDoc(openChoiceDoc, 'existing');
                                                setOpenChoiceDoc(null);
                                            }}
                                            className="w-full h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                        >
                                            Open Selected & Paste
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Option 3: Create New Named Google Doc/Sheet */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/65 dark:border-slate-800/80 rounded-2xl space-y-3">
                                <div>
                                    <h5 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                                        <Plus size={14} className="text-blue-500" />
                                        3. Create, Name & Paste into New Link
                                    </h5>
                                    <p className="text-[10px] text-slate-450 mt-0.5">Registers new file name in master links, copies content to clipboard, and opens a new template.</p>
                                </div>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={exportNewLinkName}
                                        onChange={(e) => setExportNewLinkName(e.target.value)}
                                        placeholder="Enter new link name..."
                                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                    <button
                                        onClick={async () => {
                                            await handleOpenGoogleDoc(openChoiceDoc, 'new');
                                            setOpenChoiceDoc(null);
                                        }}
                                        className="w-full h-8 bg-blue-550 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                        Create Named Link & Open
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

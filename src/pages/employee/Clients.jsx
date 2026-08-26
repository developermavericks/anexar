import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { Card, CardContent } from '../../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Upload, 
    CheckCircle2, 
    ChevronDown, 
    AlertCircle, 
    Sparkles, 
    Send, 
    FileText, 
    CheckSquare, 
    Trash2, 
    Clock,
    Layers,
    FileSpreadsheet,
    FileCheck,
    Plus,
    X,
    Calendar,
    Mail,
    MessageSquare,
    Target,
    Megaphone,
    BookOpen,
    Edit3,
    User,
    TrendingUp,
    PlusCircle,
    PartyPopper,
    CalendarHeart,
    MapPin,
    Radio
} from 'lucide-react';

import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Normalizes a deliverable name for duplicate comparison — lowercase, strip
// punctuation, collapse whitespace, so "Media Interviews / RBMs" and
// "media interviews & RBMs" are recognized as the same thing.
const normalizeDeliverableName = (str) =>
    (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// Finds an existing goal that looks like the same deliverable as a freshly
// AI-parsed one, so a re-uploaded/overlapping SOW doesn't silently create a
// duplicate goal card. Exact match, or a substring match in either direction
// (guarded by a minimum length so short generic words don't false-positive).
const findDuplicateGoalMatch = (deliverableName, existingGoals) => {
    const normalized = normalizeDeliverableName(deliverableName);
    if (!normalized || normalized.length < 4) return null;

    return existingGoals.find((existing) => {
        const existingNormalized = normalizeDeliverableName(existing.deliverable);
        if (!existingNormalized || existingNormalized.length < 4) return false;
        return (
            existingNormalized === normalized ||
            existingNormalized.includes(normalized) ||
            normalized.includes(existingNormalized)
        );
    }) || null;
};

export default function Clients() {
    const { user } = useAuth();
    const userRole = user?.role?.toLowerCase();
    const emailLower = user?.email?.toLowerCase() || '';
    const isDeveloperSatyam = emailLower.includes('satyam');
    const isPooja = emailLower.includes('pooja');
    const isChetan = emailLower.includes('chetan');
    const isManagerOrCore = userRole === 'core' || userRole === 'manager' || isDeveloperSatyam || isPooja || isChetan || emailLower.includes('ss1084169') || emailLower.includes('google') || emailLower.includes('admin');
    const isCoreUser = isManagerOrCore;
    const [assignedClients, setAssignedClients] = useState(() => {
        try {
            const userEmail = user?.email?.toLowerCase() || '';
            if (userEmail) {
                const saved = localStorage.getItem(`anexar_assigned_clients_${userEmail}`);
                const parsed = saved ? JSON.parse(saved) : [];
                if (parsed && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [];
    });
    const [selectedClient, setSelectedClient] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            if (!user || !user.email) return;

            const emailLower = user.email.toLowerCase();
            // Special exceptions for Pooja, Chetan, and Satyam to see all clients
            const isDeveloperSatyam = emailLower.includes('satyam');
            const isPooja = emailLower.includes('pooja');
            const isChetan = emailLower.includes('chetan');
            const hasWholeAccess = isDeveloperSatyam || isPooja || isChetan;

            const DEFAULT_FALLBACK = ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];

            try {
                // 1. Satyam or Chetan bypass - fetch all active clients from Supabase
                if (hasWholeAccess) {
                    try {
                        const { data, error } = await supabase
                            .from('clients')
                            .select('name')
                            .eq('is_active', true)
                            .order('name', { ascending: true });

                        if (!error && data && data.length > 0) {
                            setAssignedClients(data.map(c => c.name));
                            return;
                        }
                    } catch (e) {
                        console.error("Supabase client fetch exception:", e);
                    }
                    setAssignedClients(DEFAULT_FALLBACK);
                    return;
                }
                const clientNamesSet = new Set();

                // 2a. Fetch user's client assignments fed in Firestore user_clients
                try {
                    const docSnap = await getDoc(doc(db, "user_clients", emailLower));
                    if (docSnap.exists() && Array.isArray(docSnap.data().clients)) {
                        docSnap.data().clients.forEach(c => clientNamesSet.add(c));
                    }
                } catch (fsErr) {
                    console.error("Error reading Firestore user_clients:", fsErr);
                }

                // 2b. Also fetch user's allocated clients from Supabase
                let userId = user.id;
                if (!userId) {
                    try {
                        const { data: userData } = await supabase
                            .from('users')
                            .select('id')
                            .ilike('email', emailLower)
                            .maybeSingle();
                        if (userData) {
                            userId = userData.id;
                        }
                    } catch (err) {
                        console.error("Error looking up user id in Supabase:", err);
                    }
                }

                if (userId) {
                    const [weeklyRes, monthlyRes] = await Promise.all([
                        supabase
                            .from('allocations_weekly')
                            .select('clients(name)')
                            .eq('user_id', userId),
                        supabase
                            .from('allocations_monthly')
                            .select('clients(name)')
                            .eq('user_id', userId)
                    ]);

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
                }

                const clientNames = Array.from(clientNamesSet);
                const sortedClients = clientNames.sort();
                setAssignedClients(sortedClients);
                if (emailLower) {
                    localStorage.setItem(`anexar_assigned_clients_${emailLower}`, JSON.stringify(sortedClients));
                }
            } catch (err) {
                console.error("Error loading assigned clients:", err);
                setAssignedClients([]);
            }
        };

        fetchClients();
    }, [user, user?.id]);

    useEffect(() => {
        if (assignedClients.length > 0 && (!selectedClient || !assignedClients.includes(selectedClient))) {
            setSelectedClient(assignedClients[0]);
        }
    }, [assignedClients, selectedClient]);

    const [clientGoals, setClientGoals] = useState([]);
    const [newGoalDeliverable, setNewGoalDeliverable] = useState('');
    const [newGoalTarget, setNewGoalTarget] = useState('');
    const [newGoalTargetText, setNewGoalTargetText] = useState('');
    const [newGoalPeriod, setNewGoalPeriod] = useState('Monthly');
    const [newGoalCategory, setNewGoalCategory] = useState('Traditional Media');
    const [newGoalOtherCategory, setNewGoalOtherCategory] = useState('');
    const [newGoalDescription, setNewGoalDescription] = useState('');
    const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);

    // AI Goals Ingestion States
    const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
    const [aiSowText, setAiSowText] = useState('');
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiSaving, setAiSaving] = useState(false);
    const [aiParsedGoals, setAiParsedGoals] = useState([]);
    const [selectedAiGoals, setSelectedAiGoals] = useState({}); // Mapping of index -> boolean for inclusion
    const [aiDuplicateMatches, setAiDuplicateMatches] = useState({}); // Mapping of index -> matched existing goal (or undefined)
    
    // UI Expandable history tracking state
    const [expandedHistoryGoalId, setExpandedHistoryGoalId] = useState(null);

    useEffect(() => {
        if (!selectedClient) return;

        const q = query(
            collection(db, "goals"),
            where("client", "==", selectedClient)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            // Sort by createdAt descending in memory
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setClientGoals(list);
        }, (err) => {
            console.error("Error listening to client goals:", err);
        });

        return () => unsubscribe();
    }, [selectedClient]);

    const handleAddClientGoal = async (e) => {
        e.preventDefault();
        if (!isCoreUser) {
            triggerNotification('Only core members can add goals.', 'error');
            return;
        }
        if (!selectedClient || !newGoalDeliverable.trim()) return;

        const targetQty = parseFloat(newGoalTarget) || 0;
        const targetText = newGoalTargetText.trim() || newGoalTarget.toString() || 'Ongoing';
        
        const newGoal = {
            deliverable: newGoalDeliverable.trim(),
            target: targetQty > 0 ? targetQty : 1,
            targetText: targetText,
            achieved: 0,
            progress: 0,
            status: 'Pending',
            period: newGoalPeriod,
            category: newGoalCategory === 'Other' ? newGoalOtherCategory.trim() || 'Other' : newGoalCategory,
            description: newGoalDescription.trim(),
            client: selectedClient,
            createdAt: new Date().toISOString(),
            updatedBy: user?.name || user?.email || 'System',
            updatedAt: new Date().toISOString(),
            history: [
                {
                    user: user?.name || user?.email || 'System',
                    progress: 0,
                    timestamp: new Date().toISOString()
                }
            ]
        };

        try {
            await addDoc(collection(db, "goals"), newGoal);
            sendTeamNotification("goal", newGoalDeliverable.trim());
            setNewGoalDeliverable('');
            setNewGoalTarget('');
            setNewGoalTargetText('');
            setNewGoalPeriod('Monthly');
            setNewGoalCategory('Traditional Media');
            setNewGoalDescription('');
            setIsAddGoalModalOpen(false);
            triggerNotification('New goal created successfully!', 'success');
        } catch (err) {
            console.error("Error creating new goal from team portal:", err);
            triggerNotification('Failed to create goal.', 'error');
        }
    };

    const handleUpdateGoalField = async (docId, goal, field, value) => {
        try {
            const docRef = doc(db, "goals", docId);
            const updatedFields = { [field]: value };
            
            let achievedVal = goal.achieved !== undefined ? parseFloat(goal.achieved) : 0;
            let targetVal = goal.target !== undefined ? parseFloat(goal.target) : 1;
            let progressVal = goal.progress !== undefined ? parseFloat(goal.progress) : 0;

            if (field === 'achieved') achievedVal = parseFloat(value) || 0;
            if (field === 'target') targetVal = parseFloat(value) || 0;
            if (field === 'progress') progressVal = parseFloat(value) || 0;

            if (field === 'achieved' || field === 'target') {
                if (targetVal > 0) {
                    progressVal = Math.min(100, Math.max(0, Math.round((achievedVal / targetVal) * 100)));
                } else {
                    progressVal = 0;
                }
            } else if (field === 'progress') {
                if (targetVal > 0) {
                    achievedVal = Math.round((progressVal / 100) * targetVal);
                }
            }

            if (field === 'achieved' || field === 'target' || field === 'progress') {
                updatedFields.achieved = achievedVal;
                updatedFields.progress = progressVal;
                updatedFields.status = progressVal >= 100 ? 'Completed' : (progressVal >= 50 ? 'On Track' : 'Pending');
                
                updatedFields.updatedBy = user?.name || user?.email || 'System';
                updatedFields.updatedAt = new Date().toISOString();

                const historyEntry = {
                    user: user?.name || user?.email || 'System',
                    oldProgress: goal.progress || 0,
                    progress: progressVal,
                    timestamp: new Date().toISOString()
                };

                const existingHistory = Array.isArray(goal.history) ? goal.history : [];
                updatedFields.history = [historyEntry, ...existingHistory].slice(0, 15);
            }
            
            await updateDoc(docRef, updatedFields);
        } catch (err) {
            console.error("Error updating goal:", err);
            triggerNotification('Failed to update goal.', 'error');
        }
    };

    const handleDeleteGoal = async (docId) => {
        if (!isManagerOrCore) {
            triggerNotification('Only managers or core members can delete goals.', 'error');
            return;
        }
        try {
            await deleteDoc(doc(db, "goals", docId));
            triggerNotification('Goal deleted.', 'info');
        } catch (err) {
            console.error("Error deleting goal:", err);
            triggerNotification('Failed to delete goal.', 'error');
        }
    };

    // AI Ingestion File Handlers
    const handleFileUploadForAi = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (fileExtension === 'docx') {
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    // Pass plain text output directly to the text parser
                    setAiSowText(result.value);
                    triggerNotification("Word document loaded! Click 'Process SOW via AI' to analyze.", "info");
                } catch (err) {
                    console.error("Mammoth error:", err);
                    triggerNotification("Failed to read Word document.", "error");
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    let textResult = "";
                    workbook.SheetNames.forEach(sheetName => {
                        const worksheet = workbook.Sheets[sheetName];
                        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                        textResult += `Sheet: ${sheetName}\n`;
                        rows.forEach(row => {
                            if (row.filter(Boolean).length > 0) {
                                textResult += row.join(" | ") + "\n";
                            }
                        });
                        textResult += "\n";
                    });
                    setAiSowText(textResult);
                    triggerNotification("Excel spreadsheet loaded! Click 'Process SOW via AI' to analyze.", "info");
                } catch (err) {
                    console.error("Excel error:", err);
                    triggerNotification("Failed to read Excel document.", "error");
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === 'txt') {
            reader.onload = (event) => {
                setAiSowText(event.target.result);
                triggerNotification("Text file loaded! Click 'Process SOW via AI' to analyze.", "info");
            };
            reader.readAsText(file);
        } else if (fileExtension === 'pdf') {
            reader.onload = async (event) => {
                try {
                    const typedarray = new Uint8Array(event.target.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let pdfText = '';
                    
                    // Loop through all pages to extract text
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        pdfText += pageText + '\n';
                    }
                    
                    setAiSowText(pdfText);
                    triggerNotification("PDF document loaded! Click 'Process SOW via AI' to analyze.", "info");
                } catch (err) {
                    console.error("PDF error:", err);
                    triggerNotification("Failed to read PDF document.", "error");
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            triggerNotification("Unsupported file format. Please upload docx, xlsx, pdf, or txt.", "error");
        }
    };

    const getParseGoalsApiUrl = () => {
        const envUrl = import.meta.env.VITE_PARSE_GOALS_API_URL;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return envUrl || 'http://localhost:3100/api/parse-goals';
        }
        // Production: route to the deployed Cloud Function
        return envUrl || 'https://us-central1-anexar-9820c.cloudfunctions.net/parseGoals';
    };

    const handleProcessSowViaAi = async () => {
        if (!aiSowText.trim()) {
            triggerNotification("Please enter or upload a Scope of Work document first.", "warning");
            return;
        }

        setAiProcessing(true);
        setAiParsedGoals([]);
        setSelectedAiGoals({});

        try {
            const response = await fetch(getParseGoalsApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: aiSowText })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server error');
            }

            const data = await response.json();
            if (data.goals && Array.isArray(data.goals)) {
                setAiParsedGoals(data.goals);

                // Flag anything that looks like it's already a goal for this client
                // (re-uploaded/overlapping SOW) and default those to unchecked so a
                // repeated upload doesn't silently create duplicate goal cards.
                const initialSelected = {};
                const duplicateMatches = {};
                let duplicateCount = 0;
                data.goals.forEach((goal, idx) => {
                    const match = findDuplicateGoalMatch(goal.deliverable, clientGoals);
                    if (match) {
                        duplicateMatches[idx] = match;
                        initialSelected[idx] = false;
                        duplicateCount++;
                    } else {
                        initialSelected[idx] = true;
                    }
                });
                setSelectedAiGoals(initialSelected);
                setAiDuplicateMatches(duplicateMatches);

                if (duplicateCount > 0) {
                    triggerNotification(`AI parsed ${data.goals.length} deliverables — ${duplicateCount} look like existing goals and were left unchecked.`, "info");
                } else {
                    triggerNotification(`AI successfully parsed ${data.goals.length} deliverables!`, "success");
                }
            } else {
                throw new Error("No deliverables parsed from the text.");
            }
        } catch (err) {
            console.error("AI parsing failed:", err);
            triggerNotification(`AI parsing failed: ${err.message}`, "error");
        } finally {
            setAiProcessing(false);
        }
    };

    const handleSaveAiParsedGoals = async () => {
        const goalsToSave = aiParsedGoals.filter((_, idx) => selectedAiGoals[idx]);
        if (goalsToSave.length === 0) {
            triggerNotification("No goals selected for import.", "warning");
            return;
        }

        setAiSaving(true);
        let savedCount = 0;
        try {
            for (const goal of goalsToSave) {
                const newGoal = {
                    deliverable: goal.deliverable,
                    target: parseFloat(goal.target) || 1,
                    targetText: goal.targetText || goal.target?.toString() || 'Ongoing',
                    achieved: 0,
                    progress: 0,
                    status: 'Pending',
                    period: goal.period || 'Monthly',
                    category: goal.category || 'Other',
                    description: goal.description || '',
                    client: selectedClient,
                    createdAt: new Date().toISOString(),
                    updatedBy: user?.name || user?.email || 'System',
                    updatedAt: new Date().toISOString(),
                    history: [
                        {
                            user: user?.name || user?.email || 'System',
                            progress: 0,
                            timestamp: new Date().toISOString()
                        }
                    ]
                };

                await addDoc(collection(db, "goals"), newGoal);
                savedCount++;
            }

            triggerNotification(`Successfully imported ${savedCount} goals into ${selectedClient}!`, "success");
            sendTeamNotification("imported SOW goals", `${savedCount} goals imported via AI`);
            setIsAiImportModalOpen(false);
            setAiParsedGoals([]);
            setAiSowText('');
            setSelectedAiGoals({});
        } catch (err) {
            console.error("Failed to save imported goals:", err);
            triggerNotification("Failed to save some or all imported goals.", "error");
        } finally {
            setAiSaving(false);
        }
    };

    const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'goals' | 'briefs' | 'meetings'
    const [campaigns, setCampaigns] = useState([]);
    const [briefs, setBriefs] = useState([]);
    const [meetings, setMeetings] = useState([]);

    // Campaign Modal & State
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [campaignTitle, setCampaignTitle] = useState('');
    const [campaignDescription, setCampaignDescription] = useState('');
    const [campaignTargetDate, setCampaignTargetDate] = useState('');
    const [campaignStatus, setCampaignStatus] = useState('Active');

    // Campaign Progress & Log Update Modal State
    const [editingCampaignProgress, setEditingCampaignProgress] = useState(null);
    const [campaignProgressVal, setCampaignProgressVal] = useState(0);
    const [campaignStatusVal, setCampaignStatusVal] = useState('Active');
    const [campaignUpdateNote, setCampaignUpdateNote] = useState('');
    const [expandedCampaignLogId, setExpandedCampaignLogId] = useState(null);

    // Client Events State & Modals
    const [clientEvents, setClientEvents] = useState([]);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventCategory, setEventCategory] = useState('Press Conference');
    const [eventDate, setEventDate] = useState('');
    const [eventVenue, setEventVenue] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventBrief, setEventBrief] = useState('');
    const [eventStatus, setEventStatus] = useState('Upcoming');

    // Event Progress & Log Update Modal State
    const [editingEventProgress, setEditingEventProgress] = useState(null);
    const [eventProgressVal, setEventProgressVal] = useState(0);
    const [eventStatusVal, setEventStatusVal] = useState('Upcoming');
    const [eventUpdateNote, setEventUpdateNote] = useState('');
    const [eventBriefUpdate, setEventBriefUpdate] = useState('');
    const [expandedEventLogId, setExpandedEventLogId] = useState(null);

    // Brief Modal & State
    const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
    const [briefTitle, setBriefTitle] = useState('');
    const [briefContent, setBriefContent] = useState('');

    const sendTeamNotification = async (itemType, itemName) => {
        if (!selectedClient || !clientTeamList || clientTeamList.length === 0) return;
        const creatorName = user?.name || user?.email || 'A manager/core';
        try {
            const promises = clientTeamList
                .filter(member => member.email && member.email.toLowerCase() !== user.email.toLowerCase())
                .map(member => {
                    return addDoc(collection(db, "notifications"), {
                        recipientEmail: member.email.toLowerCase(),
                        message: `${creatorName} added a new ${itemType} ("${itemName}") to ${selectedClient} workspace.`,
                        type: 'client_update',
                        client: selectedClient,
                        read: false,
                        createdAt: new Date().toISOString()
                    });
                });
            await Promise.all(promises);
        } catch (err) {
            console.error("Error sending team notification:", err);
        }
    };

    const handleDeleteCampaign = async (docId, title) => {
        if (!isManagerOrCore) {
            triggerNotification("Only managers or core members can delete campaigns.", "error");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the campaign "${title}"?`)) return;
        try {
            await deleteDoc(doc(db, "campaigns", docId));
            triggerNotification("Campaign deleted successfully!", "info");
        } catch (err) {
            console.error("Error deleting campaign:", err);
            triggerNotification("Failed to delete campaign.", "error");
        }
    };

    const handleDeleteEvent = async (docId, title) => {
        if (!isManagerOrCore) {
            triggerNotification("Only managers or core members can delete events.", "error");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the event "${title}"?`)) return;
        try {
            await deleteDoc(doc(db, "client_events", docId));
            triggerNotification("Event deleted successfully!", "info");
        } catch (err) {
            console.error("Error deleting event:", err);
            triggerNotification("Failed to delete event.", "error");
        }
    };

    const handleDeleteBrief = async (docId, title) => {
        if (!isManagerOrCore) {
            triggerNotification("Only managers or core members can delete briefs.", "error");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the brief "${title}"?`)) return;
        try {
            await deleteDoc(doc(db, "briefs", docId));
            triggerNotification("Brief deleted successfully!", "info");
        } catch (err) {
            console.error("Error deleting brief:", err);
            triggerNotification("Failed to delete brief.", "error");
        }
    };

    const handleDeleteMeeting = async (docId, topic) => {
        if (!isManagerOrCore) {
            triggerNotification("Only managers or core members can delete meeting requests.", "error");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the meeting request "${topic}"?`)) return;
        try {
            await deleteDoc(doc(db, "meetings", docId));
            triggerNotification("Meeting request deleted successfully!", "info");
        } catch (err) {
            console.error("Error deleting meeting:", err);
            triggerNotification("Failed to delete meeting.", "error");
        }
    };

    // Firestore listener for Campaigns
    useEffect(() => {
        if (!selectedClient) {
            setCampaigns([]);
            return;
        }
        const q = query(collection(db, "campaigns"), where("client", "==", selectedClient));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setCampaigns(list);
        }, (err) => {
            console.error("Error listening to campaigns:", err);
        });
        return () => unsubscribe();
    }, [selectedClient]);

    // Firestore listener for Client Events
    useEffect(() => {
        if (!selectedClient) {
            setClientEvents([]);
            return;
        }
        const q = query(collection(db, "client_events"), where("client", "==", selectedClient));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setClientEvents(list);
        }, (err) => {
            console.error("Error listening to client events:", err);
        });
        return () => unsubscribe();
    }, [selectedClient]);

    // Firestore listener for Briefs
    useEffect(() => {
        if (!selectedClient) {
            setBriefs([]);
            return;
        }
        const q = query(collection(db, "briefs"), where("client", "==", selectedClient));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setBriefs(list);
        }, (err) => {
            console.error("Error listening to briefs:", err);
        });
        return () => unsubscribe();
    }, [selectedClient]);

    // Create Event Handler (Core & Manager only)
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!eventTitle.trim() || !selectedClient) return;

        try {
            await addDoc(collection(db, "client_events"), {
                client: selectedClient,
                title: eventTitle,
                category: eventCategory || 'Press Conference',
                eventDate: eventDate,
                venue: eventVenue,
                description: eventDescription,
                brief: eventBrief,
                status: eventStatus || 'Upcoming',
                progress: 0,
                createdBy: user?.name || user?.email || 'Core/Manager',
                creatorEmail: user?.email || '',
                createdAt: new Date().toISOString(),
                lastUpdatedBy: user?.name || user?.email || 'Core/Manager',
                lastUpdatedEmail: user?.email || '',
                lastUpdatedAt: new Date().toISOString(),
                history: [{
                    updatedBy: user?.name || user?.email || 'Core/Manager',
                    userEmail: user?.email || '',
                    oldProgress: 0,
                    newProgress: 0,
                    status: eventStatus || 'Upcoming',
                    note: 'Event created and scheduled',
                    timestamp: new Date().toISOString()
                }]
            });

            triggerNotification("Event created successfully!", "success");
            sendTeamNotification("event", eventTitle.trim());
            setIsEventModalOpen(false);
            setEventTitle('');
            setEventCategory('Press Conference');
            setEventDate('');
            setEventVenue('');
            setEventDescription('');
            setEventBrief('');
            setEventStatus('Upcoming');
        } catch (err) {
            console.error("Error creating event:", err);
            triggerNotification("Failed to create event.", "error");
        }
    };

    // Update Event Progress & Activity Log Handler (Any team member on that client)
    const handleUpdateEventProgress = async (e) => {
        e.preventDefault();
        if (!editingEventProgress) return;

        try {
            const historyEntry = {
                updatedBy: user?.name || user?.email || 'Team Member',
                userEmail: user?.email || '',
                oldProgress: editingEventProgress.progress || 0,
                newProgress: Number(eventProgressVal),
                status: eventStatusVal,
                note: eventUpdateNote || 'Event progress updated',
                briefAddendum: eventBriefUpdate || '',
                timestamp: new Date().toISOString()
            };

            const existingHistory = Array.isArray(editingEventProgress.history) ? editingEventProgress.history : [];
            const updatedHistory = [historyEntry, ...existingHistory].slice(0, 30);

            let updatedBrief = editingEventProgress.brief || '';
            if (eventBriefUpdate.trim()) {
                const authorTag = user?.name || user?.email || 'Team Member';
                const dateTag = new Date().toLocaleDateString();
                updatedBrief = updatedBrief 
                    ? `${updatedBrief}\n\n--- Update by ${authorTag} (${dateTag}) ---\n${eventBriefUpdate}`
                    : eventBriefUpdate;
            }

            await updateDoc(doc(db, "client_events", editingEventProgress.docId), {
                progress: Number(eventProgressVal),
                status: eventStatusVal,
                brief: updatedBrief,
                lastUpdatedBy: user?.name || user?.email || 'Team Member',
                lastUpdatedEmail: user?.email || '',
                lastUpdatedAt: new Date().toISOString(),
                history: updatedHistory
            });

            triggerNotification("Event status, brief & progress updated!", "success");
            setEditingEventProgress(null);
            setEventUpdateNote('');
            setEventBriefUpdate('');
        } catch (err) {
            console.error("Error updating event progress:", err);
            triggerNotification("Failed to update event.", "error");
        }
    };

    // Create Campaign Handler (Core & Manager only)
    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        if (!campaignTitle.trim() || !selectedClient) return;

        try {
            await addDoc(collection(db, "campaigns"), {
                client: selectedClient,
                title: campaignTitle,
                description: campaignDescription,
                targetDate: campaignTargetDate,
                status: campaignStatus || 'Active',
                progress: 0,
                createdBy: user?.name || user?.email || 'Core/Manager',
                creatorEmail: user?.email || '',
                createdAt: new Date().toISOString(),
                lastUpdatedBy: user?.name || user?.email || 'Core/Manager',
                lastUpdatedEmail: user?.email || '',
                lastUpdatedAt: new Date().toISOString(),
                history: [{
                    updatedBy: user?.name || user?.email || 'Core/Manager',
                    userEmail: user?.email || '',
                    oldProgress: 0,
                    newProgress: 0,
                    status: campaignStatus || 'Active',
                    note: 'Campaign launched',
                    timestamp: new Date().toISOString()
                }]
            });

            triggerNotification("Campaign created successfully!", "success");
            sendTeamNotification("campaign", campaignTitle.trim());
            setIsCampaignModalOpen(false);
            setCampaignTitle('');
            setCampaignDescription('');
            setCampaignTargetDate('');
            setCampaignStatus('Active');
        } catch (err) {
            console.error("Error creating campaign:", err);
            triggerNotification("Failed to create campaign.", "error");
        }
    };

    // Update Campaign Progress & Log Handler (Any team member on that client)
    const handleUpdateCampaignProgress = async (e) => {
        e.preventDefault();
        if (!editingCampaignProgress) return;

        try {
            const historyEntry = {
                updatedBy: user?.name || user?.email || 'Team Member',
                userEmail: user?.email || '',
                oldProgress: editingCampaignProgress.progress || 0,
                newProgress: Number(campaignProgressVal),
                status: campaignStatusVal,
                note: campaignUpdateNote || 'Progress update recorded',
                timestamp: new Date().toISOString()
            };

            const existingHistory = Array.isArray(editingCampaignProgress.history) ? editingCampaignProgress.history : [];
            const updatedHistory = [historyEntry, ...existingHistory].slice(0, 25);

            await updateDoc(doc(db, "campaigns", editingCampaignProgress.docId), {
                progress: Number(campaignProgressVal),
                status: campaignStatusVal,
                lastUpdatedBy: user?.name || user?.email || 'Team Member',
                lastUpdatedEmail: user?.email || '',
                lastUpdatedAt: new Date().toISOString(),
                history: updatedHistory
            });

            triggerNotification("Campaign status & progress updated!", "success");
            setEditingCampaignProgress(null);
            setCampaignUpdateNote('');
        } catch (err) {
            console.error("Error updating campaign progress:", err);
            triggerNotification("Failed to update progress.", "error");
        }
    };

    // Create Brief Handler (Anyone on client team)
    const handleCreateBrief = async (e) => {
        e.preventDefault();
        if (!briefTitle.trim() || !briefContent.trim() || !selectedClient) return;

        try {
            await addDoc(collection(db, "briefs"), {
                client: selectedClient,
                title: briefTitle,
                content: briefContent,
                authorName: user?.name || user?.email || 'Team Member',
                authorEmail: user?.email || '',
                createdAt: new Date().toISOString()
            });

            triggerNotification("Client Brief published!", "success");
            sendTeamNotification("brief", briefTitle.trim());
            setIsBriefModalOpen(false);
            setBriefTitle('');
            setBriefContent('');
        } catch (err) {
            console.error("Error publishing brief:", err);
            triggerNotification("Failed to publish brief.", "error");
        }
    };

    useEffect(() => {
        if (!selectedClient) {
            setMeetings([]);
            return;
        }

        const q = query(
            collection(db, "meetings"),
            where("client", "==", selectedClient)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            // Sort in memory by createdAt descending
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setMeetings(list);
        }, (err) => {
            console.error("Error listening to client meetings:", err);
        });

        return () => unsubscribe();
    }, [selectedClient]);

    // Client's Dedicated Team directory (ported from the client portal's "Meet Your
    // Team" tab, scoped by the manager's selectedClient instead of user.clientBrand)
    const [clientTeamList, setClientTeamList] = useState([]);
    const [clientTeamLoading, setClientTeamLoading] = useState(true);
    const [isTeamBookingModalOpen, setIsTeamBookingModalOpen] = useState(false);
    const [selectedTeamMember, setSelectedTeamMember] = useState(null);
    const [teamMeetingDate, setTeamMeetingDate] = useState('');
    const [selectedTeamSlots, setSelectedTeamSlots] = useState([]);
    const [teamMeetingTopic, setTeamMeetingTopic] = useState('');
    const [teamBookingSuccess, setTeamBookingSuccess] = useState(false);

    const [isTeamComposerOpen, setIsTeamComposerOpen] = useState(false);
    const [teamComposerRecipient, setTeamComposerRecipient] = useState(null);
    const [teamComposerMode, setTeamComposerMode] = useState('email'); // 'email' or 'message'
    const [teamEmailSubject, setTeamEmailSubject] = useState('');
    const [teamEmailBody, setTeamEmailBody] = useState('');
    const [teamIsSending, setTeamIsSending] = useState(false);
    const [teamComposerSuccess, setTeamComposerSuccess] = useState(false);
    const [teamIsSentViaEmailJS, setTeamIsSentViaEmailJS] = useState(false);

    const [teamBusySlots, setTeamBusySlots] = useState([]);
    const [teamLoadingAvailability, setTeamLoadingAvailability] = useState(false);
    const [teamMemberCalendarConnected, setTeamMemberCalendarConnected] = useState(true);

    const [teamIsCustomTime, setTeamIsCustomTime] = useState(false);
    const [teamCustomStartTime, setTeamCustomStartTime] = useState('');
    const [teamCustomEndTime, setTeamCustomEndTime] = useState('');

    useEffect(() => {
        const fetchClientTeamMembers = async () => {
            if (!selectedClient) {
                setClientTeamList([]);
                return;
            }
            try {
                setClientTeamLoading(true);
                // 1. Fetch client ID by name from Supabase
                const { data: clientData, error: clientErr } = await supabase
                    .from('clients')
                    .select('id')
                    .ilike('name', selectedClient)
                    .single();

                let userIds = [];

                if (clientData && !clientErr) {
                    // 2. Fetch allocations
                    const [weeklyAlloc, monthlyAlloc] = await Promise.all([
                        supabase
                            .from('allocations_weekly')
                            .select('user_id')
                            .eq('client_id', clientData.id),
                        supabase
                            .from('allocations_monthly')
                            .select('user_id')
                            .eq('client_id', clientData.id)
                    ]);

                    const ids = new Set();
                    if (weeklyAlloc.data) {
                        weeklyAlloc.data.forEach(item => ids.add(item.user_id));
                    }
                    if (monthlyAlloc.data) {
                        monthlyAlloc.data.forEach(item => ids.add(item.user_id));
                    }
                    userIds = Array.from(ids);
                }

                let members = [];

                if (userIds.length > 0) {
                    // 3. Fetch user details
                    const { data: usersData, error: usersErr } = await supabase
                        .from('users')
                        .select('id, name, email, role, picture, title')
                        .in('id', userIds);

                    if (usersData && !usersErr) {
                        members = usersData;
                    }
                }

                // 4. Fallback: allocations_weekly/allocations_monthly are currently
                // unpopulated in Supabase — the real, actively-maintained mapping lives
                // in Firestore's "user_clients" collection (per-employee doc with a
                // `clients` name array), the same source Clients.jsx already uses to
                // restrict each employee's own client dropdown. Do NOT fall back to
                // "all team/manager users" here — that silently hides the fact that no
                // one is actually mapped to this client, and misrepresents every client
                // as sharing the entire company roster.
                if (members.length === 0) {
                    const userClientsSnap = await getDocs(collection(db, "user_clients"));
                    const matchedEmails = [];
                    userClientsSnap.forEach(docSnap => {
                        const data = docSnap.data();
                        const clientsList = Array.isArray(data.clients) ? data.clients : [];
                        if (clientsList.some(c => (c || '').toLowerCase() === selectedClient.toLowerCase())) {
                            matchedEmails.push((data.email || docSnap.id || '').toLowerCase());
                        }
                    });

                    if (matchedEmails.length > 0) {
                        const { data: usersData, error: usersErr } = await supabase
                            .from('users')
                            .select('id, name, email, role, picture, title')
                            .in('email', matchedEmails);

                        members = (usersData && !usersErr) ? [...usersData] : [];

                        // Some Firestore-mapped emails may not have a matching Supabase
                        // users row (case differences, not yet synced) - still show them
                        // using the Firestore record so the directory stays accurate.
                        const foundEmails = new Set(members.map(u => (u.email || '').toLowerCase()));
                        userClientsSnap.forEach(docSnap => {
                            const data = docSnap.data();
                            const email = (data.email || docSnap.id || '').toLowerCase();
                            if (matchedEmails.includes(email) && !foundEmails.has(email)) {
                                members.push({
                                    id: email,
                                    name: data.name || email,
                                    email,
                                    role: (data.role || '').toLowerCase(),
                                    picture: null,
                                    title: null
                                });
                            }
                        });
                    }
                }
                // Filter out Satyam so admin/dev account is not displayed as a client team member
                const filteredMembers = members.filter(m => {
                    const emailLower = (m.email || '').toLowerCase();
                    const nameLower = (m.name || '').toLowerCase();
                    return !emailLower.includes('satyam') && !nameLower.includes('satyam');
                });

                setClientTeamList(filteredMembers);
            } catch (err) {
                console.error("Error loading client team members:", err);
            } finally {
                setClientTeamLoading(false);
            }
        };

        fetchClientTeamMembers();
    }, [selectedClient]);

    const handleBookTeamMeeting = (member) => {
        setSelectedTeamMember(member);
        setTeamBookingSuccess(false);

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setTeamMeetingDate(`${yyyy}-${mm}-${dd}`);
        setSelectedTeamSlots([]);

        setIsTeamBookingModalOpen(true);
    };

    const handleOpenTeamComposer = (member, mode = 'email') => {
        setTeamComposerRecipient(member);
        setTeamComposerMode(mode);
        setTeamEmailSubject('');
        setTeamEmailBody('');
        setTeamComposerSuccess(false);
        setTeamIsSentViaEmailJS(false);
        setIsTeamComposerOpen(true);
    };

    const handleCloseTeamComposer = () => {
        setIsTeamComposerOpen(false);
        setTeamComposerRecipient(null);
        setTeamEmailSubject('');
        setTeamEmailBody('');
        setTeamComposerSuccess(false);
        setTeamIsSentViaEmailJS(false);
    };

    const generateTimeSlots = (startHour = 9, endHour = 18, interval = 15) => {
        const slots = [];
        for (let h = startHour; h <= endHour; h++) {
            for (let m = 0; m < 60; m += interval) {
                if (h === endHour && m > 0) break;
                slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            }
        }
        return slots;
    };

    const teamStandardTimeSlots = generateTimeSlots(9, 18, 15);

    // Google Calendar free/busy availability effect loader - checked via the
    // backend using the team member's own connected calendar (see EmployeeLayout's
    // "Connect Calendar" consent flow), not a public API key against their email.
    useEffect(() => {
        if (!teamMeetingDate || !selectedTeamMember) {
            setTeamBusySlots([]);
            setTeamMemberCalendarConnected(true);
            return;
        }

        const fetchAvailability = async () => {
            setTeamLoadingAvailability(true);
            try {
                const apiBase = 'https://us-central1-anexar-9820c.cloudfunctions.net';
                const response = await fetch(`${apiBase}/getTeamMemberAvailability`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: selectedTeamMember.email,
                        date: teamMeetingDate
                    })
                });

                if (!response.ok) {
                    throw new Error(`Availability check failed: ${response.status}`);
                }

                const data = await response.json();
                setTeamMemberCalendarConnected(!!data.connected);
                setTeamBusySlots(data.busy || []);
            } catch (err) {
                console.error("Error fetching Google Calendar availability:", err);
                setTeamBusySlots([]);
                setTeamMemberCalendarConnected(true); // don't block booking on a network error
            } finally {
                setTeamLoadingAvailability(false);
            }
        };

        fetchAvailability();
    }, [teamMeetingDate, selectedTeamMember]);

    const isTeamSlotBusy = (slotTimeStr) => {
        if (!teamMeetingDate || teamBusySlots.length === 0) return false;

        const slotStart = new Date(`${teamMeetingDate}T${slotTimeStr}:00`);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30-minute duration

        return teamBusySlots.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return slotStart < busyEnd && slotEnd > busyStart;
        });
    };

    const handleCloseTeamBookingModal = () => {
        setIsTeamBookingModalOpen(false);
        setTimeout(() => {
            setSelectedTeamMember(null);
            setTeamMeetingDate('');
            setSelectedTeamSlots([]);
            setTeamMeetingTopic('');
            setTeamBookingSuccess(false);
        }, 300);
    };

    const handleSubmitTeamBooking = async (e) => {
        e.preventDefault();
        if (!selectedTeamMember || !teamMeetingDate) return;
        
        if (teamIsCustomTime && (!teamCustomStartTime || !teamCustomEndTime)) {
            alert("Please provide both start and end times.");
            return;
        } else if (!teamIsCustomTime && selectedTeamSlots.length === 0) {
            alert("Please select at least one time slot.");
            return;
        }

        try {
            const meetingDoc = await addDoc(collection(db, "meetings"), {
                client: selectedClient,
                clientEmail: user?.email || '',
                memberId: selectedTeamMember.id,
                memberName: selectedTeamMember.name,
                memberEmail: selectedTeamMember.email,
                date: teamMeetingDate,
                slots: teamIsCustomTime ? [] : selectedTeamSlots,
                isCustomTime: teamIsCustomTime,
                customStartTime: teamIsCustomTime ? teamCustomStartTime : null,
                customEndTime: teamIsCustomTime ? teamCustomEndTime : null,
                topic: teamMeetingTopic,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            const timeText = teamIsCustomTime ? `${teamCustomStartTime} - ${teamCustomEndTime}` : selectedTeamSlots.join(', ');

            await addDoc(collection(db, "notifications"), {
                message: `A meeting was requested on behalf of ${selectedClient} with you on ${teamMeetingDate}. Time: ${timeText}. Topic: "${teamMeetingTopic}"`,
                createdAt: new Date().toISOString(),
                read: false,
                recipientEmail: selectedTeamMember.email,
                client: selectedClient,
                meetingId: meetingDoc.id,
                type: 'meeting_request',
                meetingDate: teamMeetingDate,
                slots: teamIsCustomTime ? [] : selectedTeamSlots,
                isCustomTime: teamIsCustomTime,
                customStartTime: teamIsCustomTime ? teamCustomStartTime : null,
                customEndTime: teamIsCustomTime ? teamCustomEndTime : null,
                clientEmail: user?.email || '',
                topic: teamMeetingTopic
            });

            // Best-effort real email confirmation via EmailJS - the booking itself
            // (Firestore doc + in-portal notification) already succeeded above, so a
            // failure here should never block or roll back the booking.
            try {
                const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                if (serviceId && templateId && publicKey) {
                    const emailBody = `You have a new meeting request on behalf of ${selectedClient}.\n\nDate: ${teamMeetingDate}\nTime slot(s): ${selectedTeamSlots.join(', ')}\nTopic: ${teamMeetingTopic}\n\nRequested by: ${user?.name || user?.email || 'A Mavericks team member'}\n\nLog in to the team portal to approve or reject this request.`;

                    const emailjsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            service_id: serviceId,
                            template_id: templateId,
                            user_id: publicKey,
                            template_params: {
                                to_email: selectedTeamMember.email,
                                to_name: selectedTeamMember.name,
                                from_name: user?.name || 'Mavericks Team Portal',
                                from_email: user?.email || '',
                                subject: `Meeting Request: ${selectedClient} — ${teamMeetingDate}`,
                                message: emailBody
                            }
                        })
                    });
                    if (!emailjsRes.ok) {
                        const errText = await emailjsRes.text().catch(() => '');
                        console.warn(`EmailJS booking confirmation failed (${emailjsRes.status}): ${errText}`);
                    }
                } else {
                    console.warn('EmailJS keys not configured - skipping booking confirmation email (in-portal notification was still sent).');
                }
            } catch (emailErr) {
                console.warn('EmailJS booking confirmation exception:', emailErr);
            }

            setTeamBookingSuccess(true);
            setTimeout(() => {
                handleCloseTeamBookingModal();
            }, 2000);
        } catch (err) {
            console.error("Error booking team meeting:", err);
            triggerNotification("Booking failed: " + err.message, "error");
        }
    };

    const handleSendTeamEmail = async (e) => {
        e.preventDefault();
        if (!teamComposerRecipient || !teamEmailSubject || !teamEmailBody) return;

        setTeamIsSending(true);
        try {
            await addDoc(collection(db, "emails"), {
                from: user?.email || '',
                fromName: user?.name || '',
                to: teamComposerRecipient.email,
                toName: teamComposerRecipient.name,
                subject: teamEmailSubject,
                body: teamEmailBody,
                sentAt: new Date().toISOString(),
                type: teamComposerMode
            });

            await addDoc(collection(db, "notifications"), {
                message: teamComposerMode === 'email'
                    ? `On behalf of ${selectedClient}, you have a new portal email. Subject: "${teamEmailSubject}"`
                    : `On behalf of ${selectedClient}, you have a new portal message. Subject: "${teamEmailSubject}"`,
                createdAt: new Date().toISOString(),
                read: false,
                recipientEmail: teamComposerRecipient.email,
                client: selectedClient,
                type: teamComposerMode
            });

            if (teamComposerMode === 'email') {
                const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                let emailjsSent = false;

                if (serviceId && templateId && publicKey) {
                    try {
                        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                service_id: serviceId,
                                template_id: templateId,
                                user_id: publicKey,
                                template_params: {
                                    to_email: teamComposerRecipient.email,
                                    to_name: teamComposerRecipient.name,
                                    from_name: user?.name || '',
                                    from_email: user?.email || '',
                                    subject: teamEmailSubject,
                                    message: teamEmailBody
                                }
                            })
                        });

                        if (response.ok) {
                            emailjsSent = true;
                            setTeamIsSentViaEmailJS(true);
                        } else {
                            const errText = await response.text();
                            console.warn(`EmailJS API error (e.g. quota exceeded): ${errText}. Falling back to mailto.`);
                        }
                    } catch (e) {
                        console.error("EmailJS network error. Falling back to mailto:", e);
                    }
                }

                setTeamComposerSuccess(true);
                setTeamIsSending(false);

                if (emailjsSent) {
                    setTimeout(() => {
                        handleCloseTeamComposer();
                    }, 2000);
                } else {
                    const mailtoUrl = `mailto:${teamComposerRecipient.email}?subject=${encodeURIComponent(teamEmailSubject)}&body=${encodeURIComponent(teamEmailBody)}`;
                    setTimeout(() => {
                        window.location.href = mailtoUrl;
                        handleCloseTeamComposer();
                    }, 1200);
                }
            } else {
                setTeamComposerSuccess(true);
                setTeamIsSending(false);

                setTimeout(() => {
                    handleCloseTeamComposer();
                }, 2000);
            }
        } catch (err) {
            console.error("Error logging message or sending notification:", err);
            triggerNotification("Failed to send message. Please try again.", "error");
            setTeamIsSending(false);
        }
    };

    const handleRejectMeeting = async (meeting) => {
        try {
            const meetingId = meeting.docId;
            await updateDoc(doc(db, "meetings", meetingId), {
                status: 'rejected'
            });
            
            // Clean up corresponding notifications if any
            const q = query(collection(db, "notifications"), where("meetingId", "==", meetingId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(async (dSnap) => {
                await deleteDoc(doc(db, "notifications", dSnap.id));
            });

            triggerNotification("Meeting request rejected.", "info");
        } catch (err) {
            console.error("Error rejecting meeting:", err);
            triggerNotification("Failed to reject meeting.", "error");
        }
    };

    const triggerGoogleOAuthPopupAndCreateEvent = (meeting) => {
        const clientId = '1069657020241-305f0ickrks7s8ske612fqfhjo889jbj.apps.googleusercontent.com';
        const scope = "https://www.googleapis.com/auth/calendar.events";
        const redirectUri = `${window.location.origin}/oauth/calendar-callback`; 
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

        // Store current meeting ID in sessionStorage so after OAuth redirect callback, it can automatically approve & sync
        if (meeting?.docId) {
            sessionStorage.setItem('pending_sync_meeting_id', meeting.docId);
        }

        window.location.href = authUrl;
    };

    const executeDirectGoogleCalendarCreation = async (accessToken, meeting) => {
        try {
            triggerNotification("Creating event in your Google Calendar...", "info");
            let startIso, endIso;
            const meetingDate = meeting.date;

            if (meeting.isCustomTime) {
                startIso = `${meetingDate}T${meeting.customStartTime}:00`;
                endIso = `${meetingDate}T${meeting.customEndTime}:00`;
            } else {
                const sortedSlots = [...(meeting.slots || [])].sort();
                const firstSlot = sortedSlots[0] || '09:00';
                const lastSlot = sortedSlots[sortedSlots.length - 1] || '09:30';

                const [h, m] = lastSlot.split(':').map(Number);
                const endDate = new Date(2000, 0, 1, h, m + 15);
                const endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

                startIso = `${meetingDate}T${firstSlot}:00`;
                endIso = `${meetingDate}T${endTimeStr}:00`;
            }

            const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    summary: `Meeting: ${meeting.topic || 'Client Discussion'}`,
                    description: `Scheduled via Anexar Portal.\nTopic: ${meeting.topic || ''}\nRequested By: ${meeting.clientEmail}`,
                    start: { dateTime: startIso, timeZone: userTz },
                    end: { dateTime: endIso, timeZone: userTz },
                    attendees: (meeting.clientEmail && meeting.clientEmail.includes('@')) ? [{ email: meeting.clientEmail }] : [],
                    conferenceData: {
                        createRequest: {
                            requestId: `anexar-${Date.now()}`,
                            conferenceSolutionKey: { type: 'hangoutsMeet' }
                        }
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to create event on Google Calendar");
            }

            await updateDoc(doc(db, "meetings", meeting.docId), { status: 'accepted' });

            triggerNotification("Meeting successfully synced to Google Calendar with Google Meet link!", "success");
        } catch (err) {
            console.error("Direct Google Calendar creation failed:", err);
            triggerNotification("Failed to add meeting to Google Calendar: " + err.message, "error");
        }
    };

    const handleSyncToGoogleCalendar = async (meeting) => {
        try {
            triggerNotification("Syncing meeting to Google Calendar...", "info");

            const baseUrl = 'https://us-central1-anexar-9820c.cloudfunctions.net';
            const url = `${baseUrl}/createCalendarEvent`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingId: meeting.docId,
                    email: meeting.memberEmail || user?.email,
                    approverEmail: user?.email,
                    date: meeting.date,
                    slots: meeting.slots || [],
                    isCustomTime: meeting.isCustomTime || false,
                    customStartTime: meeting.customStartTime || null,
                    customEndTime: meeting.customEndTime || null,
                    topic: meeting.topic,
                    clientEmail: meeting.clientEmail,
                    memberName: meeting.memberName || user?.name,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn("Backend sync requires user authorization, launching popup:", data.error);
                triggerGoogleOAuthPopupAndCreateEvent(meeting);
                return;
            }

            await updateDoc(doc(db, "meetings", meeting.docId), { status: 'accepted' });
            triggerNotification("Meeting successfully synced to Google Calendar!", "success");
        } catch (err) {
            console.warn("Backend sync network error, launching popup:", err);
            triggerGoogleOAuthPopupAndCreateEvent(meeting);
        }
    };

    const handleAcceptAndSyncMeeting = async (meeting) => {
        try {
            const meetingId = meeting.docId;
            
            triggerNotification("Approving meeting...", "info");

            // 1. Update Firestore status to 'accepted' immediately
            await updateDoc(doc(db, "meetings", meetingId), {
                status: 'accepted'
            });

            // 2. Clean up corresponding notifications from bell list
            try {
                const q = query(collection(db, "notifications"), where("meetingId", "==", meetingId));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (dSnap) => {
                    await deleteDoc(doc(db, "notifications", dSnap.id));
                });
            } catch (notifErr) {
                console.warn("Could not clean up notifications:", notifErr);
            }

            // 3. Attempt Google Calendar Sync
            await handleSyncToGoogleCalendar(meeting);
        } catch (err) {
            console.error("Error approving meeting:", err);
            triggerNotification("Failed to approve meeting: " + err.message, "error");
        }
    };

    const [notification, setNotification] = useState(null);

    // Helper to trigger temporary notifications
    const triggerNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto font-sans pb-12 text-slate-900 dark:text-slate-100 animate-fade-in">
            {/* Header banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-purple-600/10 rounded-3xl p-8 border border-amber-500/20 shadow-xl">
                <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-500 rounded-full text-4xs font-extrabold uppercase tracking-widest">
                            Manager Workspace
                        </span>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                            Client Goals & Commitments
                        </h1>
                        <p className="text-sm text-slate-650 dark:text-slate-400 mt-2 font-medium">
                            Create, update, and manage goals and target deliverables requested by client brands in real-time.
                        </p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center shrink-0 w-12 h-12">
                        <Users className="text-amber-500" size={24} />
                    </div>
                </div>
            </div>

            {/* Notification alert */}
            <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 border shadow-md font-medium text-xs ${
                            notification.type === 'success' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                : notification.type === 'error'
                                ? 'bg-rose-550 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400'
                                : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}
                    >
                        {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {assignedClients.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] border border-[#EAE8E4] dark:border-white/10 rounded-[2rem] p-8 text-center text-slate-400 dark:text-slate-500 py-16 flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                    <Users className="mb-4 text-slate-350 dark:text-slate-700" size={48} />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-750 dark:text-slate-355">No Allocated Clients</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-555 max-w-md mx-auto mt-2 font-medium">
                        You are not currently allocated to any client workspaces. Please contact an administrator or manager to assign client accounts to your profile.
                    </p>
                </div>
            ) : (
                <>
                    {/* Client Selection Card */}
                    <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Layers size={18} className="text-amber-500" />
                                Select Client Account
                            </h2>
                            <p className="text-2xs text-slate-450 dark:text-slate-555 mt-0.5 font-medium">
                                Choose which active brand partner goals you wish to display and update.
                            </p>
                        </div>
                        <div className="relative min-w-[240px]">
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-bold text-xs cursor-pointer shadow-sm"
                            >
                                <option value="">-- Choose Client --</option>
                                {assignedClients.map((client) => (
                                    <option key={client} value={client}>{client}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </Card>

                    {/* Tabs / Sub-Navigation */}
                    {selectedClient && (
                        <div className="flex gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('campaigns')}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    activeTab === 'campaigns'
                                        ? 'bg-[#1A1A1A] dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Megaphone size={14} /> Campaigns ({campaigns.length})
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab('goals')}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    activeTab === 'goals'
                                        ? 'bg-[#1A1A1A] dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Target size={14} /> Goals & Commitments
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab('events')}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    activeTab === 'events'
                                        ? 'bg-[#1A1A1A] dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <PartyPopper size={14} /> Client Events ({clientEvents.length})
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab('briefs')}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    activeTab === 'briefs'
                                        ? 'bg-[#1A1A1A] dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <BookOpen size={14} /> Client Briefs ({briefs.length})
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab('meetings')}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    activeTab === 'meetings'
                                        ? 'bg-[#1A1A1A] dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} /> Meeting Requests
                                    {meetings.filter(m => m.status === 'pending').length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-extrabold rounded-full">
                                            {meetings.filter(m => m.status === 'pending').length}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Tab Panels */}
                            {selectedClient ? (
                                activeTab === 'campaigns' ? (
                                    <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                                        {/* Campaigns content */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <Megaphone size={18} className="text-amber-500" />
                                                    {selectedClient} Active Campaigns
                                                </h2>
                                                <p className="text-2xs text-slate-455 dark:text-slate-555 mt-0.5 font-medium">
                                                    Campaign strategy, descriptions, and progress tracked by team members.
                                                </p>
                                            </div>
                                            {isManagerOrCore && (
                                                <button
                                                    onClick={() => setIsCampaignModalOpen(true)}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                                                >
                                                    <PlusCircle size={15} /> Create Campaign
                                                </button>
                                            )}
                                        </div>

                                        {campaigns.length === 0 ? (
                                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold space-y-2">
                                                <Megaphone className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
                                                <p>No active campaigns set for {selectedClient} yet.</p>
                                                {isManagerOrCore ? (
                                                    <p className="text-[11px] text-amber-500 cursor-pointer font-bold hover:underline" onClick={() => setIsCampaignModalOpen(true)}>
                                                        + Click here to launch the first campaign
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-slate-400">Core members or managers assigned to this client can add new campaigns.</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {campaigns.map((camp) => (
                                                    <div key={camp.docId} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-amber-500/30 transition-all">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${
                                                                    camp.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                    camp.status === 'On Hold' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                                    camp.status === 'In Progress' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                }`}>
                                                                    {camp.status || 'Active'}
                                                                </span>
                                                                {camp.targetDate && (
                                                                    <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                                                                        <Clock size={10} /> Target: {camp.targetDate}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                                                                {camp.title}
                                                            </h3>

                                                            <p className="text-xs text-slate-600 dark:text-slate-350 line-clamp-3 leading-relaxed">
                                                                {camp.description || 'No description provided.'}
                                                            </p>
                                                        </div>

                                                        {/* Progress & Attribution */}
                                                        <div className="space-y-3 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                                                            <div>
                                                                <div className="flex justify-between items-center text-[10px] font-extrabold mb-1">
                                                                    <span className="text-slate-500 dark:text-slate-400">Campaign Completion</span>
                                                                    <span className="text-slate-800 dark:text-slate-200">{camp.progress || 0}%</span>
                                                                </div>
                                                                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                                                    <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${camp.progress || 0}%` }}></div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                                                                <div className="flex items-center gap-1 font-medium truncate max-w-[50%]">
                                                                    <User size={11} className="text-slate-400 shrink-0" />
                                                                    <span className="truncate">Updated by <strong className="font-extrabold text-slate-700 dark:text-slate-300">{camp.lastUpdatedBy || camp.createdBy || 'Team'}</strong></span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCampaignProgress(camp);
                                                                            setCampaignProgressVal(camp.progress || 0);
                                                                            setCampaignStatusVal(camp.status || 'Active');
                                                                            setCampaignUpdateNote('');
                                                                        }}
                                                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                                                                    >
                                                                        <Edit3 size={11} /> Update
                                                                    </button>
                                                                    {isManagerOrCore && (
                                                                        <button
                                                                            onClick={() => handleDeleteCampaign(camp.docId, camp.title)}
                                                                            className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
                                                                            title="Delete Campaign"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Expandable Activity & Progress Log */}
                                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                                                <button
                                                                    onClick={() => setExpandedCampaignLogId(expandedCampaignLogId === camp.docId ? null : camp.docId)}
                                                                    className="text-[10px] text-amber-500 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Clock size={11} />
                                                                    {expandedCampaignLogId === camp.docId ? 'Hide Progress Log' : `View Progress Log (${Array.isArray(camp.history) ? camp.history.length : 0})`}
                                                                </button>

                                                                {expandedCampaignLogId === camp.docId && (
                                                                    <div className="mt-2.5 bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-none animate-fade-in">
                                                                        {Array.isArray(camp.history) && camp.history.length > 0 ? (
                                                                            camp.history.map((log, idx) => (
                                                                                <div key={idx} className="bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800 text-[10px] space-y-1">
                                                                                    <div className="flex justify-between items-center text-slate-400">
                                                                                        <span className="font-extrabold text-slate-700 dark:text-slate-300">{log.updatedBy}</span>
                                                                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                                                                        <span>Status: <strong className="text-amber-500 font-extrabold">{log.status}</strong></span>
                                                                                        <span>Progress: <strong>{log.oldProgress || 0}% ➔ {log.newProgress}%</strong></span>
                                                                                    </div>
                                                                                    {log.note && (
                                                                                        <p className="text-slate-600 dark:text-slate-350 font-medium italic pt-0.5 border-t border-slate-100 dark:border-slate-900">
                                                                                            "{log.note}"
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="text-[10px] text-slate-400 italic text-center py-2">No activity history recorded yet.</p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                ) : activeTab === 'events' ? (
                                    <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <PartyPopper size={18} className="text-amber-500" />
                                                    {selectedClient} Client Events & Activations
                                                </h2>
                                                <p className="text-2xs text-slate-455 dark:text-slate-555 mt-0.5 font-medium">
                                                    Manage press conferences, brand launches, media roundtables, and track live event progress.
                                                </p>
                                            </div>
                                            {isManagerOrCore && (
                                                <button
                                                    onClick={() => setIsEventModalOpen(true)}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                                                >
                                                    <PlusCircle size={15} /> Add Client Event
                                                </button>
                                            )}
                                        </div>

                                        {clientEvents.length === 0 ? (
                                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold space-y-2">
                                                <PartyPopper className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
                                                <p>No client events scheduled for {selectedClient} yet.</p>
                                                {isManagerOrCore ? (
                                                    <p className="text-[11px] text-amber-500 cursor-pointer font-bold hover:underline" onClick={() => setIsEventModalOpen(true)}>
                                                        + Click here to schedule the first client event
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-slate-400">Core members or managers assigned to this client can add new events.</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {clientEvents.map((evt) => (
                                                    <div key={evt.docId} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-amber-500/30 transition-all">
                                                        <div className="space-y-2.5">
                                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${
                                                                    evt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                    evt.status === 'Live / On-Going' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse' :
                                                                    evt.status === 'In Progress' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                }`}>
                                                                    {evt.status || 'Upcoming'}
                                                                </span>
                                                                <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                                                                    {evt.category || 'Press Event'}
                                                                </span>
                                                            </div>

                                                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                                                                {evt.title}
                                                            </h3>

                                                            <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                                                {evt.eventDate && (
                                                                    <span className="flex items-center gap-1 font-semibold">
                                                                        <Clock size={11} className="text-amber-500" /> {evt.eventDate}
                                                                    </span>
                                                                )}
                                                                {evt.venue && (
                                                                    <span className="flex items-center gap-1 font-semibold truncate max-w-[200px]">
                                                                        <MapPin size={11} className="text-amber-500 shrink-0" /> {evt.venue}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-xs text-slate-600 dark:text-slate-350 line-clamp-3 leading-relaxed">
                                                                {evt.description || 'No detailed description provided.'}
                                                            </p>

                                                            {/* Event Strategic Brief Box */}
                                                            {evt.brief && (
                                                                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                                                                    <span className="text-[9px] font-extrabold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                        <FileText size={10} /> Event Strategic Brief & Agenda
                                                                    </span>
                                                                    <p className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-snug line-clamp-4 font-medium">
                                                                        {evt.brief}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Progress & Attribution */}
                                                        <div className="space-y-3 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                                                            <div>
                                                                <div className="flex justify-between items-center text-[10px] font-extrabold mb-1">
                                                                    <span className="text-slate-500 dark:text-slate-400">Event Execution Progress</span>
                                                                    <span className="text-slate-800 dark:text-slate-200">{evt.progress || 0}%</span>
                                                                </div>
                                                                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                                                    <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${evt.progress || 0}%` }}></div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                                                                <div className="flex items-center gap-1 font-medium truncate max-w-[50%]">
                                                                    <User size={11} className="text-slate-400 shrink-0" />
                                                                    <span className="truncate">Updated by <strong className="font-extrabold text-slate-700 dark:text-slate-300">{evt.lastUpdatedBy || evt.createdBy || 'Team'}</strong></span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingEventProgress(evt);
                                                                            setEventProgressVal(evt.progress || 0);
                                                                            setEventStatusVal(evt.status || 'Upcoming');
                                                                            setEventUpdateNote('');
                                                                            setEventBriefUpdate('');
                                                                        }}
                                                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                                                                    >
                                                                        <Edit3 size={11} /> Update
                                                                    </button>
                                                                    {isManagerOrCore && (
                                                                        <button
                                                                            onClick={() => handleDeleteEvent(evt.docId, evt.title)}
                                                                            className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
                                                                            title="Delete Event"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Expandable Activity & Event Log */}
                                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                                                <button
                                                                    onClick={() => setExpandedEventLogId(expandedEventLogId === evt.docId ? null : evt.docId)}
                                                                    className="text-[10px] text-amber-500 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Clock size={11} />
                                                                    {expandedEventLogId === evt.docId ? 'Hide Event Log' : `View Event Log (${Array.isArray(evt.history) ? evt.history.length : 0})`}
                                                                </button>

                                                                {expandedEventLogId === evt.docId && (
                                                                    <div className="mt-2.5 bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-none animate-fade-in">
                                                                        {Array.isArray(evt.history) && evt.history.length > 0 ? (
                                                                            evt.history.map((log, idx) => (
                                                                                <div key={idx} className="bg-white dark:bg-slate-955 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800 text-[10px] space-y-1">
                                                                                    <div className="flex justify-between items-center text-slate-400">
                                                                                        <span className="font-extrabold text-slate-700 dark:text-slate-300">{log.updatedBy}</span>
                                                                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                                                                        <span>Status: <strong className="text-amber-500 font-extrabold">{log.status}</strong></span>
                                                                                        <span>Progress: <strong>{log.oldProgress || 0}% ➔ {log.newProgress}%</strong></span>
                                                                                    </div>
                                                                                    {log.note && (
                                                                                        <p className="text-slate-600 dark:text-slate-300 font-medium italic pt-0.5 border-t border-slate-100 dark:border-slate-900">
                                                                                            "{log.note}"
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="text-[10px] text-slate-400 italic text-center py-2">No event activity recorded yet.</p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                ) : activeTab === 'briefs' ? (
                            <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <BookOpen size={18} className="text-amber-500" />
                                            {selectedClient} Strategy & Briefs
                                        </h2>
                                        <p className="text-2xs text-slate-455 dark:text-slate-555 mt-0.5 font-medium">
                                            Strategic guidelines, brand tone, and client instructions shared with all team members.
                                        </p>
                                    </div>
                                    {isManagerOrCore && (
                                        <button
                                            onClick={() => setIsBriefModalOpen(true)}
                                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                                        >
                                            <PlusCircle size={15} /> Write Client Brief
                                        </button>
                                    )}
                                </div>

                                {briefs.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold space-y-2">
                                        <BookOpen className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
                                        <p>No client briefs published for {selectedClient} yet.</p>
                                        {isManagerOrCore ? (
                                            <p className="text-[11px] text-amber-500 cursor-pointer font-bold hover:underline" onClick={() => setIsBriefModalOpen(true)}>
                                                + Click here to write the first brief for team members working on this client
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-slate-400">Core members or managers assigned to this client can add new briefs.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {briefs.map((b) => (
                                            <div key={b.docId} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl space-y-3 hover:border-amber-500/30 transition-all">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                                            {b.title}
                                                        </h3>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                                                            <User size={11} /> Published by <strong className="font-bold text-slate-600 dark:text-slate-300">{b.authorName}</strong> on {new Date(b.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    {isManagerOrCore && (
                                                        <button
                                                            onClick={() => handleDeleteBrief(b.docId, b.title)}
                                                            className="text-rose-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-colors"
                                                            title="Delete Brief"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                                                    {b.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ) : activeTab === 'goals' ? (
                            <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <CheckSquare size={18} className="text-amber-500" />
                                            {selectedClient} Goals & Commitments
                                        </h2>
                                        <p className="text-2xs text-slate-455 dark:text-slate-555 mt-0.5 font-medium mb-3">
                                            Monitor and update metrics for deliverables requested by the client.
                                        </p>
                                        
                                        {clientGoals.length > 0 && (
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 w-fit mt-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Overall Completion</span>
                                                    <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none mt-0.5">
                                                        {Math.round(clientGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / clientGoals.length)}%
                                                    </span>
                                                </div>
                                                <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden ml-2">
                                                    <div 
                                                        className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
                                                        style={{ width: `${Math.round(clientGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / clientGoals.length)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {isCoreUser && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsAiImportModalOpen(true)}
                                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Sparkles size={13} className="text-amber-500 animate-pulse" /> Import SOW via AI
                                            </button>
                                            <button
                                                onClick={() => setIsAddGoalModalOpen(true)}
                                                className="bg-[#1A1A1A] hover:bg-black dark:bg-amber-500 dark:text-[#0B0F19] dark:hover:bg-amber-400 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                            >
                                                <Plus size={14} className="stroke-[2.5px]" /> Add Goal
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {clientGoals.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                                        {isCoreUser ? 'No goals found for this client. Click "Add Goal" or "Import SOW via AI" to set them.' : 'No goals found for this client.'}
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {Array.from(new Set(clientGoals.map(g => g.category || 'Traditional Media'))).map((categoryName) => {
                                            const categoryGoals = clientGoals.filter(g => (g.category || 'Traditional Media') === categoryName);
                                            
                                            return (
                                                <div key={categoryName} className="space-y-4">
                                                    {/* Category Header */}
                                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2 mt-4">
                                                        <div className="w-1.5 h-3 bg-amber-500 rounded-sm"></div>
                                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{categoryName}</h3>
                                                    </div>

                                                    {/* Category Goals List */}
                                                    <div className="space-y-4">
                                                        {categoryGoals.map((goal) => (
                                                            <div key={goal.docId} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-850 p-4 sm:p-5 rounded-2xl hover:shadow-sm transition-all flex flex-col gap-4">
                                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                                    {/* Left side: Info */}
                                                                    <div className="space-y-1.5 flex-1">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-slate-200/60 dark:bg-slate-850 text-slate-600 dark:text-slate-400 rounded-md border border-slate-300/30">
                                                                                {goal.period || 'Monthly'}
                                                                            </span>
                                                                            {goal.targetText && (
                                                                                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/20">
                                                                                    Target: {goal.targetText}
                                                                                </span>
                                                                            )}
                                                                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${
                                                                                goal.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                                goal.status === 'At Risk' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                                                goal.status === 'On Track' ? 'bg-amber-500/10 text-amber-550 border-amber-550/20' :
                                                                                'bg-slate-100 dark:bg-[#1E293B] text-slate-500 border-slate-200'
                                                                            }`}>
                                                                                {goal.status}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{goal.deliverable}</p>
                                                                        {goal.description && (
                                                                            <p className="text-2xs text-slate-455 dark:text-slate-450 leading-relaxed font-medium bg-slate-200/20 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-200/10">
                                                                                {goal.description}
                                                                            </p>
                                                                        )}

                                                                        {/* Progress bar + slider wrapper */}
                                                                        <div className="space-y-2 pt-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                                                    <div 
                                                                                        className={`h-full rounded-full ${
                                                                                            goal.status === 'Completed' ? 'bg-emerald-500' :
                                                                                            goal.status === 'At Risk' ? 'bg-rose-500' :
                                                                                            'bg-amber-500'
                                                                                        }`}
                                                                                        style={{ width: `${goal.progress || 0}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap">{goal.progress || 0}% Progress</span>
                                                                            </div>

                                                                            {/* Collaborative Interactive Slider */}
                                                                            <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/20 p-2 rounded-xl border border-slate-200/10 mt-1">
                                                                                <span className="text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase select-none">Update</span>
                                                                                <input 
                                                                                    type="range" 
                                                                                    min="0" 
                                                                                    max="100" 
                                                                                    value={goal.progress || 0} 
                                                                                    onChange={(e) => handleUpdateGoalField(goal.docId, goal, 'progress', parseInt(e.target.value))}
                                                                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer accent-amber-500" 
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Middle & Right section: Target counts & admin controls */}
                                                                    <div className="flex items-center gap-4 self-end md:self-start">
                                                                        {/* Status dropdown selector */}
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-[9px] font-bold text-slate-455 dark:text-slate-555 uppercase tracking-wider font-semibold">Status</span>
                                                                            <select
                                                                                value={goal.status}
                                                                                onChange={(e) => handleUpdateGoalField(goal.docId, goal, 'status', e.target.value)}
                                                                                className="h-7 px-2 text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer dark:text-white"
                                                                            >
                                                                                <option value="Pending">Pending</option>
                                                                                <option value="On Track">On Track</option>
                                                                                <option value="Completed">Completed</option>
                                                                                <option value="At Risk">At Risk</option>
                                                                            </select>
                                                                        </div>

                                                                        {/* Delete Button */}
                                                                        {isCoreUser && (
                                                                            <button
                                                                                onClick={() => handleDeleteGoal(goal.docId)}
                                                                                className="text-red-500 hover:text-red-655 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors mt-4 self-end"
                                                                                title="Delete Goal"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Expansion Log Audit Trail Block */}
                                                                <div className="border-t border-slate-200/20 pt-2 flex flex-col">
                                                                    <button 
                                                                        onClick={() => setExpandedHistoryGoalId(expandedHistoryGoalId === goal.docId ? null : goal.docId)}
                                                                        className="text-[10px] text-slate-455 dark:text-slate-500 font-bold hover:text-amber-550 flex items-center gap-1.5 self-start transition-all cursor-pointer"
                                                                    >
                                                                        <Clock size={11} className="text-slate-400 dark:text-slate-555" />
                                                                        {goal.updatedBy ? (
                                                                            <span>Last updated by <span className="text-slate-655 dark:text-slate-405 font-extrabold">{goal.updatedBy}</span> ({new Date(goal.updatedAt).toLocaleDateString()})</span>
                                                                        ) : (
                                                                            <span>No history records yet</span>
                                                                        )}
                                                                        <span className="text-amber-500 text-[9px] hover:underline font-extrabold ml-1">
                                                                            {expandedHistoryGoalId === goal.docId ? '• Hide Log' : '• View Log'}
                                                                        </span>
                                                                    </button>

                                                                    {expandedHistoryGoalId === goal.docId && (
                                                                        <div className="mt-3 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 rounded-xl p-3.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 max-h-40 overflow-y-auto scrollbar-none">
                                                                            <span className="text-[10px] font-black uppercase text-slate-555 dark:text-slate-455 block tracking-wider border-b border-slate-200/20 pb-1 mb-2">Goal Update Audit Trail Log</span>
                                                                            {(!goal.history || goal.history.length === 0) ? (
                                                                                <span className="text-3xs text-slate-455 font-medium italic">No updates have been logged for this goal yet.</span>
                                                                            ) : (
                                                                                goal.history.map((entry, hIdx) => (
                                                                                    <div key={hIdx} className="flex justify-between items-center text-[10px] text-slate-655 dark:text-slate-455 py-1 border-b border-slate-200/10 dark:border-slate-800/40 last:border-b-0">
                                                                                        <span className="font-semibold">
                                                                                            <span className="text-amber-500 font-extrabold mr-1">@{entry.user}</span> set progress from {entry.oldProgress !== undefined ? entry.oldProgress : '?'}% to {entry.progress}%
                                                                                        </span>
                                                                                        <span className="text-[9px] text-slate-455">{new Date(entry.timestamp).toLocaleString()}</span>
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
        ) : (
                            <>
                            {/* Client's Dedicated Team directory (ported from the client portal's
                                "Meet Your Team" tab, scoped to the manager's selectedClient) */}
                            <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                <div className="mb-6">
                                    <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Users size={18} className="text-amber-500" />
                                        {selectedClient}'s Dedicated Team
                                    </h2>
                                    <p className="text-2xs text-slate-455 dark:text-slate-555 mt-0.5 font-medium">
                                        The team members allocated to this client — reach out or book time directly.
                                    </p>
                                </div>

                                {clientTeamLoading ? (
                                    <div className="flex flex-col items-center justify-center p-10 text-slate-450 dark:text-slate-500 font-semibold gap-2">
                                        <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                                        <span className="text-xs">Loading team...</span>
                                    </div>
                                ) : clientTeamList.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                                        No team members assigned to this client yet.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {clientTeamList.map((member) => (
                                            <div key={member.id} className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                                                <div className="relative mb-4">
                                                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 p-1 flex items-center justify-center">
                                                        {member.picture ? (
                                                            <img
                                                                src={member.picture}
                                                                alt={member.name}
                                                                referrerPolicy="no-referrer"
                                                                className="w-full h-full rounded-full border-2 border-white object-cover bg-gray-100 dark:bg-slate-800"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full rounded-full border-2 border-white bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-700 dark:text-white">
                                                                {(member.name || 'U').charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                                </div>

                                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-0.5">{member.name}</h3>
                                                <p className="text-amber-500 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                                    {member.title ? `${member.title} (${member.role})` : member.role}
                                                </p>
                                                <p className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 mb-4 truncate w-full px-1" title={member.email}>{member.email}</p>

                                                <div className="w-full pt-4 mt-auto border-t border-slate-150 dark:border-slate-800 flex flex-col gap-2">
                                                    <button
                                                        onClick={() => handleOpenTeamComposer(member, 'email')}
                                                        className="flex items-center justify-center gap-2 w-full py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
                                                    >
                                                        <Mail size={13} /> Send Mail
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenTeamComposer(member, 'message')}
                                                        className="flex items-center justify-center gap-2 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold transition-colors border border-amber-500/20 cursor-pointer"
                                                    >
                                                        <MessageSquare size={13} /> Send Message
                                                    </button>
                                                    <button
                                                        onClick={() => handleBookTeamMeeting(member)}
                                                        className="flex items-center justify-center gap-2 w-full py-2 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm cursor-pointer"
                                                    >
                                                        <Calendar size={13} /> Book Meeting
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Calendar size={18} className="text-amber-500" />
                                            {selectedClient} Meeting Requests
                                        </h2>
                                        <p className="text-2xs text-slate-455 dark:text-slate-555 mt-0.5 font-medium">
                                            Coordinate schedule bookings requested by clients.
                                        </p>
                                    </div>
                                </div>

                                {meetings.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                                        No meeting requests found for this client.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {meetings.map((meeting) => (
                                            <div key={meeting.docId} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                {/* Left Section */}
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-slate-200/60 dark:bg-slate-850 text-slate-655 dark:text-slate-455 rounded-md border border-slate-300/30">
                                                            {meeting.date}
                                                        </span>
                                                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${
                                                            meeting.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            meeting.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                            'bg-amber-500/10 text-amber-550 border-amber-500/20'
                                                        }`}>
                                                            {meeting.status}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                            {meeting.isCustomTime 
                                                                ? `Time: ${meeting.customStartTime} - ${meeting.customEndTime}`
                                                                : `Slots: ${meeting.slots ? meeting.slots.join(', ') : 'N/A'}`}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        Topic: {meeting.topic || 'N/A'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        Requested By: <span className="font-semibold">{meeting.clientEmail}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        Team Representative: <span className="font-semibold">{meeting.memberName}</span> ({meeting.memberEmail})
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2.5">
                                                    {meeting.status === 'pending' && isManagerOrCore && (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                onClick={() => handleAcceptAndSyncMeeting(meeting)}
                                                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                                                            >
                                                                Approve & Sync
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectMeeting(meeting)}
                                                                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}

                                                    {meeting.status === 'accepted' && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-extrabold border border-emerald-500/20 shadow-xs">
                                                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                                            <span>Synced to Google Calendar</span>
                                                        </div>
                                                    )}

                                                    {isManagerOrCore && (
                                                        <button
                                                            onClick={() => handleDeleteMeeting(meeting.docId, meeting.topic)}
                                                            className="text-rose-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-colors"
                                                            title="Delete Meeting Request"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            {/* Team Booking Modal */}
                            {isTeamBookingModalOpen && selectedTeamMember && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseTeamBookingModal}></div>
                                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
                                        <button
                                            onClick={handleCloseTeamBookingModal}
                                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X size={20} />
                                        </button>

                                        {teamBookingSuccess ? (
                                            <div className="text-center py-8 space-y-3">
                                                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                                                    <Calendar size={24} />
                                                </div>
                                                <h3 className="text-md font-bold text-gray-900 dark:text-white">Meeting Scheduled!</h3>
                                                <p className="text-2xs text-slate-450 dark:text-slate-500">A notification has been sent to {selectedTeamMember.name}'s workspace.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-6 text-center">
                                                    <h2 className="text-md font-black text-gray-900 dark:text-white">Schedule Meeting</h2>
                                                    <p className="text-2xs text-slate-450 mt-1">Book time with {selectedTeamMember.name} on behalf of {selectedClient}</p>
                                                </div>

                                                <form onSubmit={handleSubmitTeamBooking} className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Date</label>
                                                        <input
                                                            type="date"
                                                            required
                                                            value={teamMeetingDate}
                                                            onChange={(e) => {
                                                                setTeamMeetingDate(e.target.value);
                                                                setSelectedTeamSlots([]);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                                        />
                                                    </div>

                                                    {teamMeetingDate && (
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                                                                    Meeting Time
                                                                </label>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTeamIsCustomTime(false)}
                                                                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${!teamIsCustomTime ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                                                    >
                                                                        Choose Slots
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setTeamIsCustomTime(true)}
                                                                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${teamIsCustomTime ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                                                    >
                                                                        Custom Time
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {!teamIsCustomTime ? (
                                                                <>
                                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 flex justify-between items-center">
                                                                        <span>Select Time Slots (15 min increments){teamLoadingAvailability ? ' — checking availability...' : ''}</span>
                                                                        {selectedTeamSlots.length > 0 && (
                                                                            <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                                                                                {selectedTeamSlots.length} slot(s) selected
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                    {!teamLoadingAvailability && !teamMemberCalendarConnected && (
                                                                        <p className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mb-2">
                                                                            {selectedTeamMember.name} hasn't connected their Google Calendar yet, so real availability can't be checked — all slots are shown as open.
                                                                        </p>
                                                                    )}
                                                                    <div className="max-h-40 overflow-y-auto pr-1">
                                                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                                                            {teamStandardTimeSlots.map(slot => {
                                                                                const isSelected = selectedTeamSlots.includes(slot);
                                                                                const isBusy = isTeamSlotBusy(slot);
                                                                                return (
                                                                                    <button
                                                                                        key={slot}
                                                                                        type="button"
                                                                                        disabled={isBusy}
                                                                                        onClick={() => {
                                                                                            if (selectedTeamSlots.includes(slot)) {
                                                                                                setSelectedTeamSlots(selectedTeamSlots.filter(s => s !== slot));
                                                                                            } else {
                                                                                                setSelectedTeamSlots([...selectedTeamSlots, slot]);
                                                                                            }
                                                                                        }}
                                                                                        title={isBusy ? 'Busy on their calendar' : ''}
                                                                                        className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                                                                                            isBusy
                                                                                                ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed line-through"
                                                                                                : isSelected
                                                                                                ? "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10 cursor-pointer"
                                                                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 cursor-pointer"
                                                                                        }`}
                                                                                    >
                                                                                        {slot}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex gap-4">
                                                                    <div className="flex-1">
                                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Start Time</label>
                                                                        <input
                                                                            type="time"
                                                                            value={teamCustomStartTime}
                                                                            onChange={(e) => setTeamCustomStartTime(e.target.value)}
                                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">End Time</label>
                                                                        <input
                                                                            type="time"
                                                                            value={teamCustomEndTime}
                                                                            onChange={(e) => setTeamCustomEndTime(e.target.value)}
                                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Topic</label>
                                                        <textarea
                                                            rows={3}
                                                            required
                                                            value={teamMeetingTopic}
                                                            onChange={(e) => setTeamMeetingTopic(e.target.value)}
                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold resize-none"
                                                            placeholder="What would you like to discuss?"
                                                        ></textarea>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={selectedTeamSlots.length === 0}
                                                        className="w-full mt-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-150 dark:disabled:bg-slate-800/80 disabled:text-gray-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                                                    >
                                                        Confirm Booking
                                                    </button>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Team Gmail-Style Composer */}
                            {isTeamComposerOpen && teamComposerRecipient && (
                                <div className="fixed bottom-0 right-4 sm:right-12 z-50 w-full max-w-lg bg-white dark:bg-slate-955 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border border-slate-150 dark:border-slate-800 overflow-hidden">
                                    <div className="bg-[#1A1A1A] dark:bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                                        <span className="text-xs font-bold tracking-wide">
                                            {teamComposerMode === 'email' ? "New Email" : "New Portal Message"}
                                        </span>
                                        <button
                                            onClick={handleCloseTeamComposer}
                                            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {teamComposerSuccess ? (
                                        <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-955 h-64 flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
                                                <Send size={20} />
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                                {teamComposerMode === 'email'
                                                    ? (teamIsSentViaEmailJS ? "Email Sent Successfully!" : "Message Logged!")
                                                    : "Message Sent Successfully!"
                                                }
                                            </h3>
                                            <p className="text-2xs text-slate-450 dark:text-slate-500 font-medium">
                                                {teamComposerMode === 'email'
                                                    ? (teamIsSentViaEmailJS
                                                        ? "Your email has been delivered directly in the background."
                                                        : "Opening your email program to finalize and send...")
                                                    : "Your portal message has been delivered to their workspace."
                                                }
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSendTeamEmail} className="flex flex-col h-[360px] bg-white dark:bg-slate-955">
                                            <div className="flex items-center border-b border-gray-100 dark:border-white/5 px-4 py-2 text-xs font-medium">
                                                <span className="text-gray-500 w-10">To:</span>
                                                <span className="text-gray-900 dark:text-white truncate font-bold">
                                                    {teamComposerRecipient.name} &lt;{teamComposerRecipient.email}&gt;
                                                </span>
                                            </div>

                                            <div className="flex items-center border-b border-gray-100 dark:border-white/5 px-4 py-2.5 text-xs font-medium">
                                                <span className="text-gray-500 w-10">Subject:</span>
                                                <input
                                                    type="text"
                                                    required
                                                    value={teamEmailSubject}
                                                    onChange={(e) => setTeamEmailSubject(e.target.value)}
                                                    className="flex-1 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder-gray-400 font-semibold"
                                                    placeholder="Enter subject line"
                                                />
                                            </div>

                                            <div className="flex-1 p-4">
                                                <textarea
                                                    required
                                                    rows={8}
                                                    value={teamEmailBody}
                                                    onChange={(e) => setTeamEmailBody(e.target.value)}
                                                    className="w-full h-full bg-transparent text-gray-900 dark:text-white text-xs resize-none focus:outline-none placeholder-gray-400 leading-relaxed font-semibold"
                                                    placeholder={teamComposerMode === 'email'
                                                        ? "Write your message here... \n\nClicking 'Send' will log this message in the portal and automatically send it."
                                                        : "Write your message here... \n\nClicking 'Send' will deliver this message to their in-portal notification bell."
                                                    }
                                                ></textarea>
                                            </div>

                                            <div className="border-t border-gray-100 dark:border-white/5 px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                                                <button
                                                    type="submit"
                                                    disabled={teamIsSending}
                                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                                                >
                                                    {teamIsSending ? (
                                                        <>Sending...</>
                                                    ) : (
                                                        <>
                                                            <Send size={12} /> Send Message
                                                        </>
                                                    )}
                                                </button>

                                                {teamComposerMode === 'email' && (
                                                    <a
                                                        href={`mailto:${teamComposerRecipient.email}`}
                                                        className="text-2xs text-gray-400 hover:text-amber-500 transition-colors flex items-center gap-1 font-medium"
                                                        title="Open directly in mail client"
                                                    >
                                                        <Mail size={12} /> Direct Mail
                                                    </a>
                                                )}
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        </>
                    )) : (
                        <Card className="border-none shadow-md bg-[#1A1A1A] dark:bg-slate-950 rounded-3xl p-8 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center justify-center py-20 border border-slate-100 dark:border-slate-900">
                            <Users size={48} className="mb-4 text-slate-350 dark:text-slate-700" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-750 dark:text-slate-355">
                                Select a Client
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-555 max-w-sm mt-2 font-medium">
                                Select a client from the dropdown list above to display and manage goals & commitments.
                            </p>
                        </Card>
                    )}
                </>
            )}

            {/* Create Goal Modal inside Team Portal */}
            {isAddGoalModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddGoalModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 overflow-y-auto max-h-[90vh] scrollbar-none">
                        <button
                            onClick={() => setIsAddGoalModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-md font-black text-gray-900 dark:text-white">Add New Goal for {selectedClient}</h2>
                            <p className="text-2xs text-slate-450 mt-1">Set a deliverable and success target for this account.</p>
                        </div>

                        <form onSubmit={handleAddClientGoal} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Category</label>
                                <select
                                    value={newGoalCategory}
                                    onChange={(e) => setNewGoalCategory(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer text-xs font-semibold"
                                >
                                    <option value="Traditional Media">Traditional Media</option>
                                    <option value="Social Media & Thought Leadership">Social Media & Thought Leadership</option>
                                    <option value="Essentials Series">Essentials Series</option>
                                    <option value="Processes">Processes</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {newGoalCategory === 'Other' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Custom Category Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Influencer Marketing"
                                        value={newGoalOtherCategory}
                                        onChange={(e) => setNewGoalOtherCategory(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Deliverable Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. thought leadership article placement"
                                    value={newGoalDeliverable}
                                    onChange={(e) => setNewGoalDeliverable(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Target Cadence (Text)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 5-6, 1-2 per month, Ongoing"
                                        value={newGoalTargetText}
                                        onChange={(e) => setNewGoalTargetText(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Target (Numeric Calculation)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 6 (or 1 for ongoing)"
                                        value={newGoalTarget}
                                        onChange={(e) => setNewGoalTarget(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Period</label>
                                    <select
                                        value={newGoalPeriod}
                                        onChange={(e) => setNewGoalPeriod(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer text-xs font-semibold"
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Quarterly">Quarterly</option>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="As and when">As and when</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Brief Description & Notes</label>
                                <textarea
                                    placeholder="Add any contextual brief, target media outlets, etc."
                                    value={newGoalDescription}
                                    onChange={(e) => setNewGoalDescription(e.target.value)}
                                    rows="3"
                                    className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                            >
                                <CheckSquare size={14} /> Create Goal
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* AI SOW Ingestion Modal */}
            {isAiImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md animate-fade-in">
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-850 p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        <button
                            onClick={() => {
                                setIsAiImportModalOpen(false);
                                setAiParsedGoals([]);
                                setAiSowText('');
                            }}
                            className="absolute top-6 right-6 text-gray-405 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-4">
                            <h2 className="text-md font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="text-amber-500 animate-pulse" size={18} />
                                Import Client Scope of Work via AI
                            </h2>
                            <p className="text-2xs text-slate-455 mt-0.5">Upload a .docx/.xlsx scope document or paste retainer text to auto-generate goals.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-5 pr-2 scrollbar-none">
                            {/* Input Panel */}
                            {aiParsedGoals.length === 0 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* File Drag and Drop Box */}
                                        <div className="bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all relative">
                                            <Upload className="text-slate-400 dark:text-slate-600 mb-2" size={32} />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Upload Scope Document</span>
                                            <span className="text-3xs text-slate-450 mt-1">Supports Word (.docx), Excel (.xlsx), PDF (.pdf), or Text (.txt)</span>
                                            <input 
                                                type="file" 
                                                accept=".docx,.xlsx,.xls,.pdf,.txt" 
                                                onChange={handleFileUploadForAi}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            />
                                        </div>

                                        {/* Paste Text Prompt Area */}
                                        <div className="flex flex-col">
                                            <label className="text-xs font-bold text-slate-550 dark:text-slate-400 mb-1.5">Or Paste Raw SOW Text</label>
                                            <textarea
                                                placeholder="Example: Traditional Media Services: Interviews/RBMs (5-6) email interviews focused on Industrial47's thesis..."
                                                value={aiSowText}
                                                onChange={(e) => setAiSowText(e.target.value)}
                                                rows="5"
                                                className="w-full flex-1 bg-slate-50 dark:bg-slate-905 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-all text-xs font-medium"
                                            />
                                        </div>
                                    </div>

                                    {aiSowText.trim() && (
                                        <div className="flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/20 px-4 py-3 rounded-2xl border border-slate-200/10">
                                            <span className="text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
                                                Document Content Loaded ({aiSowText.length} characters)
                                            </span>
                                            <button
                                                onClick={handleProcessSowViaAi}
                                                disabled={aiProcessing}
                                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-50"
                                            >
                                                {aiProcessing ? (
                                                    <>
                                                        <Clock size={13} className="animate-spin" /> Processing SOW...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles size={13} /> Process SOW via AI
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Loader state */}
                            {aiProcessing && aiParsedGoals.length === 0 && (
                                <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="relative w-12 h-12">
                                        <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                                        <Sparkles className="absolute inset-0 m-auto text-amber-500 animate-pulse" size={16} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-black uppercase text-slate-655 dark:text-slate-355 tracking-wider">AI Goal Extraction Active</h3>
                                        <p className="text-[10px] text-slate-455">Claude is structuring the deliverables list, targets, frequencies and categories...</p>
                                    </div>
                                </div>
                            )}

                            {/* Parse Results Preview Panel */}
                            {aiParsedGoals.length > 0 && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/10">
                                        <div>
                                            <h3 className="text-xs font-black uppercase text-slate-655 dark:text-slate-355 tracking-wider">Parsed SOW deliverables</h3>
                                            <p className="text-3xs text-slate-455 mt-0.5">Check the deliverables you wish to import to {selectedClient}.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const allVal = Object.values(selectedAiGoals).every(v => !v);
                                                    const next = {};
                                                    aiParsedGoals.forEach((_, i) => {
                                                        next[i] = allVal;
                                                    });
                                                    setSelectedAiGoals(next);
                                                }}
                                                className="px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 rounded-lg cursor-pointer border border-slate-200/20"
                                            >
                                                Toggle All
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAiParsedGoals([]);
                                                    setSelectedAiGoals({});
                                                    setAiDuplicateMatches({});
                                                }}
                                                className="px-3 py-1.5 text-[10px] font-bold text-red-500 bg-red-500/10 rounded-lg cursor-pointer border border-red-500/10 hover:bg-red-500/20"
                                            >
                                                Start Over
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview Table list */}
                                    <div className="border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-850">
                                        {aiParsedGoals.map((goal, idx) => {
                                            const duplicateMatch = aiDuplicateMatches[idx];
                                            return (
                                            <div key={idx} className={`p-4 flex items-start gap-3.5 hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors ${duplicateMatch ? 'bg-amber-500/5' : 'bg-slate-50 dark:bg-slate-905'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedAiGoals[idx]}
                                                    onChange={() => setSelectedAiGoals(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer mt-0.5"
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2 py-0.5 text-[8px] font-extrabold uppercase bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200/20">
                                                            {goal.category}
                                                        </span>
                                                        <span className="px-2 py-0.5 text-[8px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/10">
                                                            Target: {goal.targetText} ({goal.period})
                                                        </span>
                                                        {duplicateMatch && (
                                                            <span className="px-2 py-0.5 text-[8px] font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/20 flex items-center gap-1">
                                                                <AlertCircle size={10} /> Possible Duplicate
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{goal.deliverable}</p>
                                                    {goal.description && (
                                                        <p className="text-[10px] text-slate-455 leading-relaxed font-medium">
                                                            {goal.description}
                                                        </p>
                                                    )}
                                                    {duplicateMatch && (
                                                        <p className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
                                                            Matches existing goal: "{duplicateMatch.deliverable}" — left unchecked. Tick the box above if you want to import it anyway.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action buttons */}
                        {aiParsedGoals.length > 0 && (
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-850 shrink-0">
                                <button
                                    onClick={() => {
                                        setIsAiImportModalOpen(false);
                                        setAiParsedGoals([]);
                                        setAiSowText('');
                                    }}
                                    disabled={aiSaving}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-55 shadow-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAiParsedGoals}
                                    disabled={aiSaving}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {aiSaving ? (
                                        <>
                                            <Clock size={14} className="animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <FileCheck size={14} />
                                            Import {aiParsedGoals.filter((_, i) => selectedAiGoals[i]).length} Goals
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Campaign Modal (Core / Manager) */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl space-y-4">
                        <button
                            onClick={() => setIsCampaignModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <h2 className="text-md font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Megaphone className="text-amber-500" size={18} />
                                Create New Campaign
                            </h2>
                            <p className="text-2xs text-slate-450 mt-0.5 font-medium">Launch a strategic campaign for {selectedClient}.</p>
                        </div>

                        <form onSubmit={handleCreateCampaign} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Campaign Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Q3 Brand Awareness Drive"
                                    value={campaignTitle}
                                    onChange={(e) => setCampaignTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Campaign Description</label>
                                <textarea
                                    rows="3"
                                    placeholder="Detailed strategy, key messages, target deliverables, or scope..."
                                    value={campaignDescription}
                                    onChange={(e) => setCampaignDescription(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Target Date</label>
                                    <input
                                        type="date"
                                        value={campaignTargetDate}
                                        onChange={(e) => setCampaignTargetDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Initial Status</label>
                                    <select
                                        value={campaignStatus}
                                        onChange={(e) => setCampaignStatus(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                            >
                                <PlusCircle size={14} /> Publish Campaign
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Campaign Progress & Event Note Modal (Team Members) */}
            {editingCampaignProgress && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl space-y-4">
                        <button
                            onClick={() => setEditingCampaignProgress(null)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <h2 className="text-md font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="text-amber-500" size={18} />
                                Update Campaign Status & Activity
                            </h2>
                            <p className="text-2xs text-slate-455 mt-0.5 font-medium">{editingCampaignProgress.title}</p>
                        </div>

                        <form onSubmit={handleUpdateCampaignProgress} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Campaign Status</label>
                                <select
                                    value={campaignStatusVal}
                                    onChange={(e) => setCampaignStatusVal(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                >
                                    <option value="Active">Active</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span>Campaign Completion (%)</span>
                                    <span className="text-amber-500 font-extrabold">{campaignProgressVal}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={campaignProgressVal}
                                    onChange={(e) => setCampaignProgressVal(e.target.value)}
                                    className="w-full accent-amber-500 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">What's Happening / Event Log Update</label>
                                <textarea
                                    rows="2"
                                    placeholder="e.g. Press release distribution started. Tier-1 media outreach in progress..."
                                    value={campaignUpdateNote}
                                    onChange={(e) => setCampaignUpdateNote(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                            </div>

                            <p className="text-[10px] text-slate-400 italic">
                                Logged by: <strong className="font-bold">{user?.name || user?.email}</strong>. This update will be recorded in the activity log visible to the team.
                            </p>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                            >
                                <CheckSquare size={14} /> Record Progress & Log Update
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Write Client Brief Modal (Team Members) */}
            {isBriefModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-lg shadow-2xl space-y-4">
                        <button
                            onClick={() => setIsBriefModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <h2 className="text-md font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <BookOpen className="text-amber-500" size={18} />
                                Publish Client Brief
                            </h2>
                            <p className="text-2xs text-slate-455 mt-0.5 font-medium">Share strategic notes, guidelines, or tone of voice for {selectedClient}.</p>
                        </div>

                        <form onSubmit={handleCreateBrief} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Brief Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Q3 PR Guidelines & Key Message Framework"
                                    value={briefTitle}
                                    onChange={(e) => setBriefTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Brief Content / Strategy Notes</label>
                                <textarea
                                    rows="6"
                                    required
                                    placeholder="Write strategic guidelines, background, target audience, brand dos and don'ts, or client requests..."
                                    value={briefContent}
                                    onChange={(e) => setBriefContent(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                            >
                                <PlusCircle size={14} /> Publish Brief to Team
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Create Client Event Modal (Core / Manager) */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-none">
                        <button
                            onClick={() => setIsEventModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <h2 className="text-md font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <PartyPopper className="text-amber-500" size={18} />
                                Schedule New Client Event
                            </h2>
                            <p className="text-2xs text-slate-450 mt-0.5 font-medium">Add a press conference, launch event, or activation for {selectedClient}.</p>
                        </div>

                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Event Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Annual Media Conclave & Product Launch 2026"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Event Category</label>
                                    <select
                                        value={eventCategory}
                                        onChange={(e) => setEventCategory(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="Press Conference">Press Conference</option>
                                        <option value="Product Launch">Product Launch</option>
                                        <option value="Media Roundtable">Media Roundtable</option>
                                        <option value="Exhibition / Expo">Exhibition / Expo</option>
                                        <option value="Brand Activation">Brand Activation</option>
                                        <option value="Crisis Briefing">Crisis Briefing</option>
                                        <option value="Other">Other Event</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Initial Status</label>
                                    <select
                                        value={eventStatus}
                                        onChange={(e) => setEventStatus(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Live / On-Going">Live / On-Going</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Date & Time</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 25 Aug 2026, 11:00 AM IST"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Venue / Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Taj Mahal Hotel, New Delhi & Virtual"
                                        value={eventVenue}
                                        onChange={(e) => setEventVenue(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Event Overview & Description</label>
                                <textarea
                                    rows="3"
                                    placeholder="Key objectives, expected media turnout, spokesperson details, or event scope..."
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Strategic Brief & Agenda Guidelines</label>
                                <textarea
                                    rows="3"
                                    placeholder="Detailed agenda, key talking points, press release embargo rules, or spokesperson bios..."
                                    value={eventBrief}
                                    onChange={(e) => setEventBrief(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                            >
                                <PlusCircle size={14} /> Schedule & Publish Event
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Event Progress & Log Modal (Team Members) */}
            {editingEventProgress && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-fade-in">
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-none">
                        <button
                            onClick={() => setEditingEventProgress(null)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div>
                            <h2 className="text-md font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="text-amber-500" size={18} />
                                Update Event Status & Brief Log
                            </h2>
                            <p className="text-2xs text-slate-455 mt-0.5 font-medium">{editingEventProgress.title}</p>
                        </div>

                        <form onSubmit={handleUpdateEventProgress} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Event Execution Status</label>
                                <select
                                    value={eventStatusVal}
                                    onChange={(e) => setEventStatusVal(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                >
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Live / On-Going">Live / On-Going (Event in session)</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Post-Event Review">Post-Event Review</option>
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span>Event Execution Completion (%)</span>
                                    <span className="text-amber-500 font-extrabold">{eventProgressVal}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={eventProgressVal}
                                    onChange={(e) => setEventProgressVal(e.target.value)}
                                    className="w-full accent-amber-500 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">What Happened / Live Event Activity Update</label>
                                <textarea
                                    rows="3"
                                    placeholder="e.g. Keynote address completed by MD. 16 tier-1 publications attended in person. 4 TV interviews booked."
                                    value={eventUpdateNote}
                                    onChange={(e) => setEventUpdateNote(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Addendum to Strategic Brief / Agenda (Optional)</label>
                                <textarea
                                    rows="3"
                                    placeholder="Add new guidelines, revised spokesperson timings, or post-event coverage notes to the brief..."
                                    value={eventBriefUpdate}
                                    onChange={(e) => setEventBriefUpdate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-500 leading-relaxed"
                                />
                            </div>

                            <p className="text-[10px] text-slate-400 italic">
                                Logged by: <strong className="font-bold">{user?.name || user?.email}</strong>. This update will be recorded in the live event activity log visible to the team.
                            </p>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                            >
                                <CheckSquare size={14} /> Save Event Status & Activity Update
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

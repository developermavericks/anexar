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
    Calendar
} from 'lucide-react';

export default function Clients() {
    const { user } = useAuth();
    const isCoreUser = user?.role?.toLowerCase() === 'core';
    const [assignedClients, setAssignedClients] = useState(() => {
        try {
            const saved = localStorage.getItem('anexar_assigned_clients');
            const parsed = saved ? JSON.parse(saved) : [];
            if (parsed && parsed.length > 0) return parsed;
        } catch (e) {}
        return ['FUJIFILM', 'Google', 'Spotify', 'Plum', 'Nike', 'Udaiti', 'Scapia', 'Musashi-D'];
    });
    const [selectedClient, setSelectedClient] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
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
                            setAssignedClients(data.map(c => c.name));
                            return;
                        }
                    } catch (e) {
                        console.error("Supabase client fetch exception:", e);
                    }
                    setAssignedClients(DEFAULT_FALLBACK);
                    return;
                }

                // 2. Otherwise try loading user clients from Firestore
                const docRef = doc(db, "user_clients", emailLower);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists() && docSnap.data().clients) {
                    const clientNames = docSnap.data().clients;
                    if (clientNames.length > 0) {
                        setAssignedClients(clientNames);
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
                        setAssignedClients(clientNames);
                        return;
                    }
                }

                setAssignedClients(DEFAULT_FALLBACK);
            } catch (err) {
                console.error("Error fetching user clients in Clients tab:", err);
                setAssignedClients(DEFAULT_FALLBACK);
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
    const [newGoalPeriod, setNewGoalPeriod] = useState('Monthly');
    const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);

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
        if (!selectedClient || !newGoalDeliverable.trim() || !newGoalTarget) return;

        const targetQty = parseFloat(newGoalTarget) || 0;
        const newGoal = {
            deliverable: newGoalDeliverable.trim(),
            target: targetQty,
            achieved: 0,
            progress: 0,
            status: 'Pending',
            period: newGoalPeriod,
            client: selectedClient,
            createdAt: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "goals"), newGoal);
            setNewGoalDeliverable('');
            setNewGoalTarget('');
            setNewGoalPeriod('Monthly');
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
            
            if (field === 'achieved' || field === 'target') {
                const targetVal = field === 'target' ? parseFloat(value) : (parseFloat(goal.target) || 0);
                const achievedVal = field === 'achieved' ? parseFloat(value) : (parseFloat(goal.achieved) || 0);
                
                if (targetVal > 0) {
                    const newProgress = Math.min(100, Math.max(0, Math.round((achievedVal / targetVal) * 100)));
                    updatedFields.progress = newProgress;
                    updatedFields.status = newProgress >= 100 ? 'Completed' : (newProgress >= 50 ? 'On Track' : 'Pending');
                }
            }
            
            await updateDoc(docRef, updatedFields);
        } catch (err) {
            console.error("Error updating goal:", err);
            triggerNotification('Failed to update goal.', 'error');
        }
    };

    const handleDeleteGoal = async (docId) => {
        try {
            await deleteDoc(doc(db, "goals", docId));
            triggerNotification('Goal deleted.', 'info');
        } catch (err) {
            console.error("Error deleting goal:", err);
            triggerNotification('Failed to delete goal.', 'error');
        }
    };

    const [activeTab, setActiveTab] = useState('goals'); // 'goals' or 'meetings'
    const [meetings, setMeetings] = useState([]);

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

    const handleAcceptMeetingDirect = async (meeting) => {
        try {
            const meetingId = meeting.docId;
            await updateDoc(doc(db, "meetings", meetingId), {
                status: 'accepted'
            });

            // Clean up corresponding notifications if any
            const q = query(collection(db, "notifications"), where("meetingId", "==", meetingId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(async (dSnap) => {
                await deleteDoc(doc(db, "notifications", dSnap.id));
            });

            triggerNotification("Meeting approved directly.", "success");
        } catch (err) {
            console.error("Error accepting meeting directly:", err);
            triggerNotification("Failed to approve meeting.", "error");
        }
    };

    const handleAcceptMeetingCalendar = async (meeting) => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            alert("Google Calendar Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID in your .env file.");
            return;
        }

        const scope = "https://www.googleapis.com/auth/calendar.events";
        const redirectUri = window.location.origin; 
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

        const width = 500, height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(authUrl, "google_login", `width=${width},height=${height},left=${left},top=${top}`);

        if (!popup) {
            alert("Please allow popups to connect to your Google Calendar.");
            return;
        }

        const checkPopupInterval = setInterval(() => {
            if (!popup || popup.closed) {
                clearInterval(checkPopupInterval);
                return;
            }

            try {
                const popupUrl = popup.location.href;
                if (popupUrl.includes("access_token=")) {
                    const hash = popup.location.hash;
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get("access_token");

                    popup.close();
                    clearInterval(checkPopupInterval);

                    executeCalendarBookingForMeeting(accessToken, meeting);
                }
            } catch (err) {
                // Cross-origin errors expected
            }
        }, 500);
    };

    const executeCalendarBookingForMeeting = async (accessToken, meeting) => {
        try {
            const meetingDate = meeting.date;
            const slots = meeting.slots || [];
            if (slots.length === 0) throw new Error("No slots specified in request.");

            const sortedSlots = [...slots].sort();
            const firstSlot = sortedSlots[0];
            const lastSlot = sortedSlots[sortedSlots.length - 1];

            const startDateTime = new Date(`${meetingDate}T${firstSlot}:00`);
            const lastSlotDate = new Date(`${meetingDate}T${lastSlot}:00`);
            const endDateTime = new Date(lastSlotDate.getTime() + 30 * 60 * 1000);

            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    summary: `Meeting: ${meeting.topic || 'Portal Discussion'}`,
                    description: `Scheduled via Anexar Client Portal.\n\nTopic: ${meeting.topic}\nClient Name: ${meeting.client}`,
                    start: {
                        dateTime: startDateTime.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: endDateTime.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    attendees: [
                        { email: user.email },
                        { email: meeting.clientEmail || '' }
                    ],
                    conferenceData: {
                        createRequest: {
                            requestId: `anexar-${Date.now()}`,
                            conferenceSolutionKey: {
                                type: 'hangoutsMeet'
                            }
                        }
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Failed to save event to Google Calendar");
            }

            const meetingId = meeting.docId;
            await updateDoc(doc(db, "meetings", meetingId), {
                status: 'accepted'
            });

            // Clean up corresponding notifications if any
            const q = query(collection(db, "notifications"), where("meetingId", "==", meetingId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(async (dSnap) => {
                await deleteDoc(doc(db, "notifications", dSnap.id));
            });

            triggerNotification("Meeting scheduled and synced to Google Calendar!", "success");
        } catch (err) {
            console.error("Error booking meeting calendar event:", err);
            triggerNotification("Failed to schedule: " + err.message, "error");
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
                        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <button
                                onClick={() => setActiveTab('goals')}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'goals'
                                        ? 'bg-[#1A1A1A] dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <CheckSquare size={14} /> Goals & Commitments
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('meetings')}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'meetings'
                                        ? 'bg-[#1A1A1A] dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} /> Meeting Requests
                                    {meetings.filter(m => m.status === 'pending').length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 bg-rose-555 text-white text-[9px] font-extrabold rounded-full">
                                            {meetings.filter(m => m.status === 'pending').length}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Goals & Commitments control panel */}
                    {selectedClient ? (
                        activeTab === 'goals' ? (
                            <Card className="border-none shadow-md bg-white dark:bg-slate-955 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <CheckSquare size={18} className="text-amber-500" />
                                            {selectedClient} Goals & Commitments
                                        </h2>
                                        <p className="text-2xs text-slate-455 dark:text-slate-555 mt-0.5 font-medium">
                                            Monitor and update metrics for deliverables requested by the client.
                                        </p>
                                    </div>
                                    {isCoreUser && (
                                        <button
                                            onClick={() => setIsAddGoalModalOpen(true)}
                                            className="bg-[#1A1A1A] hover:bg-black dark:bg-amber-500 dark:text-[#0B0F19] dark:hover:bg-amber-400 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <Plus size={14} className="stroke-[2.5px]" /> Add Goal
                                        </button>
                                    )}
                                </div>

                                {clientGoals.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                                        {isCoreUser ? 'No goals found for this client. Click "Add Goal" to set one.' : 'No goals found for this client.'}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {clientGoals.map((goal) => (
                                            <div key={goal.docId} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                {/* Left section: Info */}
                                                <div className="space-y-1.5 md:max-w-md flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-slate-200/60 dark:bg-slate-850 text-slate-655 dark:text-slate-455 rounded-md border border-slate-300/30">
                                                            {goal.period || 'Monthly'}
                                                        </span>
                                                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${
                                                            goal.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            goal.status === 'At Risk' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                            goal.status === 'On Track' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                            'bg-slate-100 dark:bg-[#1E293B] text-slate-500 border-slate-200'
                                                        }`}>
                                                            {goal.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{goal.deliverable}</p>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    goal.status === 'Completed' ? 'bg-emerald-500' :
                                                                    goal.status === 'At Risk' ? 'bg-rose-500' :
                                                                    'bg-amber-550'
                                                                }`}
                                                                style={{ width: `${goal.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{goal.progress || 0}% Progress</span>
                                                    </div>
                                                </div>

                                                {/* Middle section: Qty controls */}
                                                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                                    {/* Achieved counter */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-slate-455 uppercase">Achieved</span>
                                                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                                                            <button
                                                                onClick={() => handleUpdateGoalField(goal.docId, goal, 'achieved', Math.max(0, (parseFloat(goal.achieved) || 0) - 1))}
                                                                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-455 rounded-lg text-xs font-black transition-colors cursor-pointer border border-slate-200/20"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={goal.achieved}
                                                                onChange={(e) => handleUpdateGoalField(goal.docId, goal, 'achieved', parseFloat(e.target.value) || 0)}
                                                                className="w-10 text-center text-xs font-bold bg-transparent border-none focus:outline-none dark:text-white"
                                                            />
                                                            <button
                                                                onClick={() => handleUpdateGoalField(goal.docId, goal, 'achieved', (parseFloat(goal.achieved) || 0) + 1)}
                                                                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-455 rounded-lg text-xs font-black transition-colors cursor-pointer border border-slate-200/20"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Target input */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-slate-455 uppercase">Target</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={goal.target}
                                                            onChange={(e) => handleUpdateGoalField(goal.docId, goal, 'target', parseFloat(e.target.value) || 0)}
                                                            className="w-16 h-9 px-2 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:border-amber-500 dark:text-white"
                                                        />
                                                    </div>

                                                    {/* Status dropdown */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-slate-455 uppercase">Status</span>
                                                        <select
                                                            value={goal.status}
                                                            onChange={(e) => handleUpdateGoalField(goal.docId, goal, 'status', e.target.value)}
                                                            className="h-9 px-3 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer dark:text-white"
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="On Track">On Track</option>
                                                            <option value="Completed">Completed</option>
                                                            <option value="At Risk">At Risk</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Right section: Delete */}
                                                <div className="flex md:flex-col justify-end items-center shrink-0 border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
                                                    <button
                                                        onClick={() => handleDeleteGoal(goal.docId)}
                                                        className="text-red-500 hover:text-red-655 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors"
                                                        title="Delete Goal"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ) : (
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
                                                            Slots: {meeting.slots ? meeting.slots.join(', ') : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        Topic: {meeting.topic || 'N/A'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        Client: <span className="font-semibold">{meeting.clientEmail}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        Team Representative: <span className="font-semibold">{meeting.memberName}</span> ({meeting.memberEmail})
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                {meeting.status === 'pending' && (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            onClick={() => handleAcceptMeetingCalendar(meeting)}
                                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                                                        >
                                                            Sync Calendar
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptMeetingDirect(meeting)}
                                                            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                                                        >
                                                            Approve Direct
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectMeeting(meeting)}
                                                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider shadow-sm"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        )
                    ) : (
                        <Card className="border-none shadow-md bg-white dark:bg-slate-950 rounded-3xl p-8 text-center text-slate-400 dark:text-slate-600 flex flex-col items-center justify-center py-20 border border-slate-100 dark:border-slate-900">
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
                    <div className="relative bg-white dark:bg-slate-955 rounded-3xl border border-slate-200 dark:border-slate-850 p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
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
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Deliverable Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Secure 5 Tier-1 Placements"
                                    value={newGoalDeliverable}
                                    onChange={(e) => setNewGoalDeliverable(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Target Count</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="e.g. 5"
                                        value={newGoalTarget}
                                        onChange={(e) => setNewGoalTarget(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Period</label>
                                    <select
                                        value={newGoalPeriod}
                                        onChange={(e) => setNewGoalPeriod(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer text-xs font-semibold"
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Quarterly">Quarterly</option>
                                        <option value="Annual">Annual</option>
                                    </select>
                                </div>
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
        </div>
    );
}

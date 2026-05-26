import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Briefcase,
    CheckSquare,
    Clock,
    Users,
    LogOut,
    Calendar,
    Bell,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    FileText,
    Sparkles,
    Send,
    Activity,
    ChevronRight,
    Info,
    X,
    ShieldAlert,
    Radio,
    UserPlus,
    MessageSquare
} from 'lucide-react';

export default function EmployeeDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // ----------------------------------------------------
    // PERSISTENT STATE WITH REALISTIC DEFAULTS
    // ----------------------------------------------------
    
    // Tasks State
    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('anexar_employee_tasks');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            { id: 1, title: 'Verify Google OAuth Redirection', status: 'Completed', priority: 'High', due: 'Today' },
            { id: 2, title: 'Build Client Portal Sync Engine', status: 'Completed', priority: 'Medium', due: 'Yesterday' },
            { id: 3, title: 'Setup Vercel Deployment Scripts', status: 'Pending', priority: 'High', due: 'Tomorrow' },
            { id: 4, title: 'Design Employee Workspace Shell', status: 'In Progress', priority: 'Low', due: 'In 3 days' }
        ];
    });

    // Time Logs State
    const [logs, setLogs] = useState(() => {
        const saved = localStorage.getItem('anexar_employee_logs');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            { id: '1', date: 'Mon', client: 'Acura Corporate', category: 'Press Outreach', hours: 4, notes: 'Drafted corporate PR guidelines and scheduled pitch releases' },
            { id: '2', date: 'Tue', client: 'RedBull Racing', category: 'Media Strategy', hours: 6.5, notes: 'Prepared racing team strategy deck and coordinated sponsor statements' },
            { id: '3', date: 'Wed', client: 'Spotify', category: 'Thought Leadership', hours: 5, notes: 'Ghostwrote VP tech editorial for Wired magazine' },
            { id: '4', date: 'Thu', client: 'Vercel', category: 'Narrative Building', hours: 7, notes: 'Created landing page copy and ran messaging review meetings' },
            { id: '5', date: 'Fri', client: 'Nike', category: 'Event Sync', hours: 8, notes: 'Managed launch logistics and synced with regional news outlets' }
        ];
    });

    // Scratchpad notes
    const [quickNote, setQuickNote] = useState(() => {
        return localStorage.getItem('anexar_quick_notes') || '';
    });

    // Form inputs for logging hours
    const [selectedClient, setSelectedClient] = useState('RedBull Racing');
    const [selectedCategory, setSelectedCategory] = useState('Press Outreach');
    const [logHours, setLogHours] = useState(4);
    const [logNotes, setLogNotes] = useState('');
    const [logDay, setLogDay] = useState('Mon');

    // Form inputs for adding tasks
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [newTaskDue, setNewTaskDue] = useState('Today');

    // UI interactive states
    const [taskFilter, setTaskFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, text: 'Acura Corporate PR package approved by lead strategist.', read: false, time: '10m ago' },
        { id: 2, text: 'Spotify CEO thought leadership article scheduled for Forbes.', read: false, time: '2h ago' },
        { id: 3, text: 'Weekly client coordination sync in 30 minutes.', read: false, time: '30m ago' }
    ]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // ----------------------------------------------------
    // PERSISTENCE EFFECTS
    // ----------------------------------------------------
    useEffect(() => {
        localStorage.setItem('anexar_employee_tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('anexar_employee_logs', JSON.stringify(logs));
    }, [logs]);

    useEffect(() => {
        localStorage.setItem('anexar_quick_notes', quickNote);
    }, [quickNote]);

    // Live clock update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ----------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Hours Logging Handler
    const handleAddLog = (e) => {
        e.preventDefault();
        if (logHours <= 0) return;

        const newLog = {
            id: Math.random().toString(36).substring(2, 9),
            date: logDay,
            client: selectedClient,
            category: selectedCategory,
            hours: parseFloat(logHours),
            notes: logNotes || 'Routine support and strategic deliverables execution.'
        };

        setLogs([newLog, ...logs]);
        setLogNotes('');
        
        // Add a push notification for success
        const notificationText = `Logged ${logHours}h for ${selectedClient} under ${selectedCategory}!`;
        setNotifications([
            { id: Date.now(), text: notificationText, read: false, time: 'Just now' },
            ...notifications
        ]);
    };

    const handleDeleteLog = (id) => {
        setLogs(logs.filter(log => log.id !== id));
    };

    // Task Checklist Handlers
    const handleToggleTask = (id) => {
        setTasks(tasks.map(task => {
            if (task.id === id) {
                const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
                return { ...task, status: nextStatus };
            }
            return task;
        }));
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const newTask = {
            id: Date.now(),
            title: newTaskTitle,
            status: 'Pending',
            priority: newTaskPriority,
            due: newTaskDue
        };

        setTasks([...tasks, newTask]);
        setNewTaskTitle('');
        setNewTaskDue('Today');
    };

    const handleDeleteTask = (id) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    // Notifications read state
    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const clearNotification = (id) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    // ----------------------------------------------------
    // METRICS CALCULATIONS
    // ----------------------------------------------------
    const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
    const targetHours = 40;
    const hoursPercentage = Math.min((totalHours / targetHours) * 100, 100).toFixed(0);
    
    const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
    const totalTasksCount = tasks.length;
    const taskCompletionRate = totalTasksCount > 0 
        ? ((completedTasksCount / totalTasksCount) * 100).toFixed(0) 
        : 0;

    // Dynamic client and onboarding states
    const [assignedClients, setAssignedClients] = useState(() => {
        const saved = localStorage.getItem('anexar_assigned_clients');
        return saved ? JSON.parse(saved) : ['RedBull Racing', 'Spotify', 'Vercel', 'Acura Corporate', 'Nike'];
    });

    useEffect(() => {
        localStorage.setItem('anexar_assigned_clients', JSON.stringify(assignedClients));
    }, [assignedClients]);

    // Client Updates State
    const [clientUpdates, setClientUpdates] = useState(() => {
        const saved = localStorage.getItem('anexar_client_updates');
        return saved ? JSON.parse(saved) : [
            { id: 1, client: 'RedBull Racing', update: 'Media briefing prepared for Monaco Grand Prix.', type: 'General', time: '1h ago' },
            { id: 2, client: 'Spotify', update: 'CEO editorial draft submitted to Wired magazine editors.', type: 'Press Release', time: '3h ago' },
            { id: 3, client: 'Acura Corporate', update: 'Social sentiment dipped by 4.2% following minor recall note.', type: 'Alert', time: '5h ago' },
            { id: 4, client: 'Vercel', update: 'Vite integration pitch deck signed off by product lead.', type: 'General', time: 'Yesterday' }
        ];
    });

    useEffect(() => {
        localStorage.setItem('anexar_client_updates', JSON.stringify(clientUpdates));
    }, [clientUpdates]);

    // Crisis Predictor simulated states
    const [simulatedCrisis, setSimulatedCrisis] = useState(false);
    
    // Form Input State
    const [newClientName, setNewClientName] = useState('');
    const [newClientCategory, setNewClientCategory] = useState('Technology');

    const handleAddClient = (e) => {
        e.preventDefault();
        if (!newClientName.trim()) return;
        
        const cleanName = newClientName.trim();
        if (assignedClients.includes(cleanName)) return;

        setAssignedClients([...assignedClients, cleanName]);
        
        // Add dynamic client update as well
        const newUpdate = {
            id: Date.now(),
            client: cleanName,
            update: `Brand new client partner successfully onboarded under ${newClientCategory} division.`,
            type: 'General',
            time: 'Just now'
        };
        setClientUpdates([newUpdate, ...clientUpdates]);
        setNewClientName('');
    };

    const handleRemoveClient = (clientName) => {
        setAssignedClients(assignedClients.filter(c => c !== clientName));
    };

    // ----------------------------------------------------
    // CHART DATA FORMATTING
    // ----------------------------------------------------
    // 1. Group hours by Day of Week (Mon - Sun)
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const barChartData = daysOrder.map(day => {
        const dayHours = logs
            .filter(log => log.date === day)
            .reduce((sum, log) => sum + log.hours, 0);
        return { name: day, Hours: parseFloat(dayHours.toFixed(1)) };
    });

    // 2. Group hours by Client for Pie Chart
    const clientHoursMap = {};
    logs.forEach(log => {
        clientHoursMap[log.client] = (clientHoursMap[log.client] || 0) + log.hours;
    });
    const pieChartData = Object.keys(clientHoursMap).map(client => ({
        name: client,
        value: parseFloat(clientHoursMap[client].toFixed(1))
    }));

    // Color palette matching "The Anexar" design tokens
    const COLORS = ['#D6A73F', '#1C1C1C', '#6B7280', '#D32F2F', '#10B981', '#3B82F6', '#8B5CF6'];

    // ----------------------------------------------------
    // CHECKLIST FILTERING
    // ----------------------------------------------------
    const filteredTasks = tasks.filter(task => {
        const matchesStatus = 
            taskFilter === 'All' ? true :
            taskFilter === 'Completed' ? task.status === 'Completed' :
            task.status !== 'Completed';
            
        const matchesPriority = 
            priorityFilter === 'All' ? true :
            task.priority === priorityFilter;

        return matchesStatus && matchesPriority;
    });

    return (
        <div className="min-h-screen bg-brand-beige/35 relative overflow-hidden pb-16 font-sans">
            {/* Background Decor */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-amber/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-gray/5 rounded-full blur-[140px] pointer-events-none" />

            {/* Header / Navbar */}
            <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-brand-border/40 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Branding */}
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white shadow-soft flex items-center justify-center p-2.5 border border-brand-border/20 hover:rotate-6 transition-all duration-300">
                            <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="35" cy="25" r="5" fill="#E62222" />
                                <circle cx="50" cy="25" r="5" fill="#E62222" />
                                <circle cx="65" cy="25" r="5" fill="#E62222" />
                                <path d="M 25,60 C 25,35 40,35 40,55 C 40,35 50,35 50,55 C 50,35 60,35 60,55 C 60,35 75,35 75,60 C 75,75 60,70 60,55 C 60,70 50,70 50,55 C 50,70 40,70 40,55 C 40,70 25,75 25,60 Z"
                                    fill="none"
                                    stroke="#000000"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-xl text-brand-charcoal block leading-none">The Anexar</span>
                            <span className="text-2xs text-brand-amber font-bold tracking-wider uppercase">Strategic Workspace</span>
                        </div>
                    </div>

                    {/* Time & Interactive Actions */}
                    <div className="flex items-center gap-4">
                        {/* Interactive Clock */}
                        <div className="hidden lg:flex flex-col items-end mr-2 bg-brand-border/10 px-4.5 py-1.5 rounded-full border border-brand-border/25">
                            <span className="text-2xs text-brand-gray font-bold tracking-wider leading-none uppercase">Live Operations Time</span>
                            <span className="text-sm font-bold text-brand-charcoal mt-1">
                                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>

                        {/* Notifications Toggle */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`relative p-2.5 rounded-xl border border-brand-border/30 bg-white transition-all hover:bg-brand-border/10 cursor-pointer ${
                                    showNotifications ? 'bg-brand-amber/15 text-brand-amber border-brand-amber/35' : 'text-brand-gray'
                                }`}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-amber text-brand-charcoal text-3xs font-extrabold flex items-center justify-center border-2 border-white animate-pulse">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown Panel */}
                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-80 bg-white rounded-3xl border border-brand-border/45 shadow-[0_15px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden"
                                    >
                                        <div className="px-5 py-4 border-b border-brand-border/25 bg-brand-beige/10 flex items-center justify-between">
                                            <h4 className="font-bold text-brand-charcoal text-sm">Notifications</h4>
                                            <button 
                                                onClick={markAllRead}
                                                className="text-3xs text-brand-amber font-extrabold tracking-wider uppercase hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto divide-y divide-brand-border/10">
                                            {notifications.length === 0 ? (
                                                <div className="px-5 py-8 text-center text-brand-gray/80 text-xs">
                                                    No new notifications
                                                </div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div key={n.id} className={`p-4 hover:bg-brand-beige/10 transition-colors flex gap-2.5 items-start ${!n.read ? 'bg-brand-amber/5' : ''}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-amber mt-1.5 shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="text-xs text-brand-charcoal leading-relaxed">{n.text}</p>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-3xs text-brand-gray font-medium">{n.time}</span>
                                                                <button 
                                                                    onClick={() => clearNotification(n.id)}
                                                                    className="text-brand-gray hover:text-brand-charcoal text-3xs font-medium"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-8 w-[1px] bg-brand-border/50 hidden sm:inline" />

                        {/* Profile Info Dropdown */}
                        <div className="flex items-center gap-2.5">
                            {user?.picture ? (
                                <img src={user.picture} alt="Avatar" className="w-9 h-9 rounded-full border border-brand-border/40 shadow-soft" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-brand-charcoal text-white text-xs flex items-center justify-center font-bold border border-brand-charcoal/20">
                                    {user?.name?.charAt(0) || 'M'}
                                </div>
                            )}
                            <div className="hidden sm:flex flex-col text-left">
                                <span className="text-xs font-bold text-brand-charcoal leading-none">{user?.name || 'Anexar Core'}</span>
                                <span className="text-3xs text-brand-amber font-extrabold mt-0.5 uppercase tracking-wider">Associate Strategist</span>
                            </div>
                        </div>

                        {/* Sign Out Button */}
                        <Button 
                            variant="pill" 
                            size="sm" 
                            onClick={handleLogout} 
                            className="flex items-center gap-1.5 text-brand-charcoal border-brand-charcoal/15 bg-white py-2 px-3 text-xs"
                        >
                            <LogOut size={14} className="stroke-[2.5px]" />
                            <span className="hidden md:inline">Sign Out</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
                
                {/* Unified Operations Welcome Banner */}
                <div className="bg-gradient-to-r from-brand-charcoal to-brand-gray text-white rounded-[32px] p-8 md:p-10 relative overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.12)]">
                    {/* Background visual shapes */}
                    <div className="absolute right-[-2%] top-[-20%] opacity-15 pointer-events-none transform rotate-12">
                        <Briefcase size={250} />
                    </div>
                    <div className="absolute right-[15%] bottom-[-40%] w-64 h-64 bg-brand-amber/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-2xl flex flex-col items-start">
                        <span className="px-3.5 py-1.5 bg-brand-amber text-brand-charcoal rounded-full text-3xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                            <Sparkles size={11} className="fill-brand-charcoal" />
                            Anexar PR Hub Enabled
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold mt-5 leading-tight tracking-tight">
                            Hi, <span className="text-brand-amber">{user?.name || 'Strategist'}</span>! 👋
                        </h2>
                        <p className="text-white/80 mt-3 text-sm md:text-base leading-relaxed">
                            Monitor performance indexes, document client deliverables, allocate campaign hours, and drive strategic communication growth for our premium brand partners.
                        </p>
                    </div>
                </div>

                {/* DYNAMIC KPI CARDS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Metric 1: Logged Hours */}
                    <Card className="border-none shadow-soft hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-3xs text-brand-gray font-bold uppercase tracking-wider">Time Logged (Week)</p>
                                    <h3 className="text-3xl font-extrabold text-brand-charcoal mt-1.5 leading-none">
                                        {totalHours}h <span className="text-xs font-semibold text-brand-gray">/ 40h target</span>
                                    </h3>
                                    
                                    <div className="w-full bg-brand-beige rounded-full h-2 mt-4.5 overflow-hidden">
                                        <div 
                                            className="bg-brand-amber h-full rounded-full transition-all duration-1000" 
                                            style={{ width: `${hoursPercentage}%` }}
                                        />
                                    </div>
                                    <p className="text-3xs text-brand-gray mt-2.5 font-bold tracking-wide flex items-center gap-1">
                                        {totalHours >= targetHours ? (
                                            <span className="text-emerald-600 flex items-center gap-0.5">
                                                <CheckCircle2 size={10} className="fill-emerald-50" /> Weekly Target Completed!
                                            </span>
                                        ) : (
                                            `Progressing — ${hoursPercentage}% to goal`
                                        )}
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-brand-amber/10 text-brand-amber shrink-0 shadow-sm">
                                    <Clock size={20} className="stroke-[2.5px]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metric 2: Completed Checklist */}
                    <Card className="border-none shadow-soft hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-3xs text-brand-gray font-bold uppercase tracking-wider">Integrations Tracker</p>
                                    <h3 className="text-3xl font-extrabold text-brand-charcoal mt-1.5 leading-none">
                                        {completedTasksCount} <span className="text-xs font-semibold text-brand-gray">/ {totalTasksCount} completed</span>
                                    </h3>

                                    <div className="w-full bg-brand-beige rounded-full h-2 mt-4.5 overflow-hidden">
                                        <div 
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                                            style={{ width: `${taskCompletionRate}%` }}
                                        />
                                    </div>
                                    <p className="text-3xs text-emerald-600 mt-2.5 font-bold tracking-wide flex items-center gap-1">
                                        <CheckSquare size={10} /> Checklist Efficiency: {taskCompletionRate}%
                                    </p>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0 shadow-sm">
                                    <CheckSquare size={20} className="stroke-[2.5px]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metric 3: Active Client Partners */}
                    <Card className="border-none shadow-soft hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-3xs text-brand-gray font-bold uppercase tracking-wider">Assigned Clients</p>
                                    <h3 className="text-3xl font-extrabold text-brand-charcoal mt-1.5 leading-none">
                                        {assignedClients.length} <span className="text-xs font-semibold text-brand-gray">Active Brands</span>
                                    </h3>
                                    <p className="text-3xs text-brand-gray mt-5 font-bold tracking-wide">
                                        Premium PR & Communications contracts
                                    </p>
                                    <div className="flex items-center gap-1 mt-2.5">
                                        <span className="text-2xs font-extrabold text-brand-amber">Top client:</span>
                                        <span className="text-2xs text-brand-charcoal font-semibold bg-brand-amber/15 px-2 py-0.5 rounded-md">RedBull Racing</span>
                                    </div>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 shrink-0 shadow-sm">
                                    <Users size={20} className="stroke-[2.5px]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metric 4: Synergetic Efficiency */}
                    <Card className="border-none shadow-soft hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-3xs text-brand-gray font-bold uppercase tracking-wider">Synergy Score</p>
                                    <h3 className="text-3xl font-extrabold text-brand-charcoal mt-1.5 leading-none">
                                        98.4%
                                    </h3>
                                    <p className="text-3xs text-emerald-600 mt-5 font-bold tracking-wide flex items-center gap-1">
                                        <Activity size={10} /> +2.1% performance threshold index
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2.5">
                                        <span className="text-3xs font-extrabold text-white bg-emerald-500 rounded px-1.5 py-0.5 uppercase tracking-wider">Optimal</span>
                                        <span className="text-3xs text-brand-gray font-semibold">Exceeding strategy targets</span>
                                    </div>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 shrink-0 shadow-sm">
                                    <Activity size={20} className="stroke-[2.5px]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* BRAND INTELLIGENCE & TEAM SYNERGY */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Panel 1: Crisis Sentinel / Predictor */}
                    <Card className="border-none shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
                        <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/20">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className={`${simulatedCrisis ? 'text-rose-600 animate-bounce' : 'text-emerald-500'}`} size={20} />
                                        <h3 className="font-extrabold text-md text-brand-charcoal dark:text-white">Crisis Predictor</h3>
                                    </div>
                                    <span className={`text-4xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        simulatedCrisis ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}>
                                        {simulatedCrisis ? 'Active Threat' : 'Stable'}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-xs text-brand-gray dark:text-gray-400 font-medium">
                                        Real-time sentiment analyzer monitors digital press mentions, social forums, and news indexing.
                                    </p>

                                    {simulatedCrisis ? (
                                        <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl space-y-3 animate-pulse">
                                            <div className="flex items-center gap-2 text-rose-600">
                                                <Radio size={14} className="animate-ping" />
                                                <span className="text-2xs font-extrabold uppercase tracking-wide">High Risk Brand Anomaly</span>
                                            </div>
                                            <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                                                Spotify social index dipped by 18% in the past 2 hours due to licensing debates. Strategic statement highly advised.
                                            </p>
                                            <div className="pt-1">
                                                <a href="mailto:crisis-response@anexar.com?subject=Emergency Call: Spotify Sentiment Anomaly" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-3xs transition-all">
                                                    <span>Call Response Team</span>
                                                    <Send size={10} />
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <CheckCircle2 size={14} />
                                                <span className="text-2xs font-extrabold uppercase tracking-wide">All Brands Clear</span>
                                            </div>
                                            <p className="text-xs text-emerald-700 font-semibold leading-relaxed">
                                                Sentiment is positive (+4.2% average). No crisis predicted across active portfolios.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Crisis Simulator Toggle */}
                            <div className="pt-4 border-t border-brand-border/10 flex items-center justify-between">
                                <span className="text-3xs font-extrabold uppercase tracking-wider text-brand-gray">Test Crisis Response</span>
                                <button
                                    onClick={() => setSimulatedCrisis(!simulatedCrisis)}
                                    className={`px-3 py-1.5 rounded-xl text-3xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                        simulatedCrisis 
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' 
                                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                                    }`}
                                >
                                    {simulatedCrisis ? 'Resolve Simulator' : 'Trigger Crisis'}
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Panel 2: Client Activity Feed & Onboarding option */}
                    <Card className="border-none shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex flex-col justify-between">
                        <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/20">
                                    <div className="flex items-center gap-2">
                                        <Activity className="text-brand-amber animate-pulse" size={20} />
                                        <h3 className="font-extrabold text-md text-brand-charcoal dark:text-white">Active Client Feeds</h3>
                                    </div>
                                    <span className="text-4xs font-extrabold px-2 py-0.5 bg-brand-amber/15 text-brand-amber rounded-full uppercase tracking-wider">
                                        Updates Feed
                                    </span>
                                </div>

                                <div className="space-y-3.5 max-h-40 overflow-y-auto pr-1">
                                    {clientUpdates.map(update => (
                                        <div key={update.id} className="flex gap-2.5 items-start text-xs border-b border-brand-border/10 pb-2.5 last:border-b-0 last:pb-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber mt-1.5 shrink-0" />
                                            <div>
                                                <p className="text-brand-charcoal dark:text-white font-semibold leading-tight">
                                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{update.client}</span>: {update.update}
                                                </p>
                                                <span className="text-4xs text-brand-gray mt-1 block font-medium">{update.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Onboarding Client Form */}
                            <form onSubmit={handleAddClient} className="pt-4 border-t border-brand-border/10 space-y-2">
                                <span className="text-3xs font-extrabold uppercase tracking-wider text-brand-gray block">Onboard New Client Partner</span>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter brand name..."
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        required
                                        className="flex-1 h-9 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:outline-none focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal"
                                    />
                                    <button
                                        type="submit"
                                        className="h-9 px-3.5 bg-brand-charcoal hover:bg-black text-white rounded-xl font-bold flex items-center justify-center transition-all shrink-0 cursor-pointer text-xs"
                                        title="Add Client Partner"
                                    >
                                        <UserPlus size={15} />
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Panel 3: Strategist Synergy Team */}
                    <Card className="border-none shadow-soft bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex flex-col justify-between">
                        <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/20">
                                    <div className="flex items-center gap-2">
                                        <Users className="text-brand-amber" size={20} />
                                        <h3 className="font-extrabold text-md text-brand-charcoal dark:text-white">Synergy Team</h3>
                                    </div>
                                    <span className="text-4xs font-extrabold px-2 py-0.5 bg-brand-amber/15 text-brand-amber rounded-full uppercase tracking-wider">
                                        Active Now
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-xs text-brand-gray dark:text-gray-400 font-medium">
                                        Your co-strategists working together across your assigned portfolios.
                                    </p>

                                    <div className="grid grid-cols-1 gap-3.5">
                                        {[
                                            { name: 'Marcus Sterling', role: 'Head of Brand Strategy', status: 'Active', avatar: 'MS' },
                                            { name: 'Clara Oswald', role: 'Chief Media Liaison', status: 'In Meeting', avatar: 'CO' },
                                            { name: 'Arjun Mehta', role: 'Crisis Response Lead', status: 'Active', avatar: 'AM' }
                                        ].map(member => (
                                            <div key={member.name} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-charcoal to-brand-amber flex items-center justify-center text-white font-bold text-3xs shrink-0 shadow-sm">
                                                        {member.avatar}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-brand-charcoal dark:text-white truncate">{member.name}</h4>
                                                        <p className="text-4xs text-brand-gray truncate">{member.role}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                        member.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                                    }`} />
                                                    <span className="text-4xs font-extrabold tracking-wide text-brand-gray">{member.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Slack Ping */}
                            <div className="pt-4 border-t border-brand-border/10">
                                <a
                                    href="https://slack.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-brand-charcoal dark:text-white font-bold border border-brand-border/30 hover:bg-brand-border/10 transition-all text-xs"
                                >
                                    <MessageSquare size={13} />
                                    <span>Sync on Strategy Channel</span>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* OPERATIONS SHELL CORE WORKSPACE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* INTERACTIVE COLUMN 1: TIME LOGGER */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-none shadow-soft bg-white">
                            <CardContent className="p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-border/25">
                                    <div className="flex items-center gap-2.5">
                                        <Clock className="text-brand-amber" size={22} className="stroke-[2.5px]" />
                                        <h3 className="font-extrabold text-lg text-brand-charcoal">Weekly Time Allocation Logger</h3>
                                    </div>
                                    <span className="text-3xs font-extrabold px-3 py-1 bg-brand-amber/10 text-brand-amber rounded-full uppercase tracking-wider">
                                        Simulated DB Interface
                                    </span>
                                </div>

                                <form onSubmit={handleAddLog} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Client Selection */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-2xs font-extrabold text-brand-charcoal uppercase tracking-wider">Select Brand Partner</label>
                                        <select 
                                            value={selectedClient} 
                                            onChange={(e) => setSelectedClient(e.target.value)}
                                            className="h-11 px-4 text-sm font-semibold rounded-xl border border-brand-border/40 focus:outline-none focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal"
                                        >
                                            {assignedClients.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Day of Week */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-2xs font-extrabold text-brand-charcoal uppercase tracking-wider">Day of Activity</label>
                                        <select 
                                            value={logDay} 
                                            onChange={(e) => setLogDay(e.target.value)}
                                            className="h-11 px-4 text-sm font-semibold rounded-xl border border-brand-border/40 focus:outline-none focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal"
                                        >
                                            {daysOrder.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Category */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-2xs font-extrabold text-brand-charcoal uppercase tracking-wider">Campaign Segment</label>
                                        <select 
                                            value={selectedCategory} 
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="h-11 px-4 text-sm font-semibold rounded-xl border border-brand-border/40 focus:outline-none focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal"
                                        >
                                            <option value="Press Outreach">Press Outreach</option>
                                            <option value="Media Strategy">Media Strategy</option>
                                            <option value="Thought Leadership">Thought Leadership</option>
                                            <option value="Narrative Building">Narrative Building</option>
                                            <option value="Event Sync">Event Sync</option>
                                        </select>
                                    </div>

                                    {/* Hours allocation */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-2xs font-extrabold text-brand-charcoal uppercase tracking-wider">Hours Logged</label>
                                            <span className="text-sm font-extrabold text-brand-amber bg-brand-amber/10 px-2 py-0.5 rounded-md">{logHours} hrs</span>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <button 
                                                type="button" 
                                                onClick={() => setLogHours(prev => Math.max(0.5, prev - 0.5))} 
                                                className="w-10 h-11 bg-brand-border/10 border border-brand-border/40 rounded-xl hover:bg-brand-border/20 font-bold transition-all text-brand-charcoal cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <input 
                                                type="range" 
                                                min="0.5" 
                                                max="12" 
                                                step="0.5" 
                                                value={logHours} 
                                                onChange={(e) => setLogHours(parseFloat(e.target.value))}
                                                className="flex-1 accent-brand-amber cursor-pointer h-1.5 bg-brand-border/30 rounded-lg appearance-none"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setLogHours(prev => Math.min(12, prev + 0.5))} 
                                                className="w-10 h-11 bg-brand-border/10 border border-brand-border/40 rounded-xl hover:bg-brand-border/20 font-bold transition-all text-brand-charcoal cursor-pointer"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Work description */}
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <label className="text-2xs font-extrabold text-brand-charcoal uppercase tracking-wider">Actionable Deliverables Notes</label>
                                        <textarea 
                                            placeholder="Write brief strategic notes detailing deliverables generated during this window..."
                                            value={logNotes}
                                            onChange={(e) => setLogNotes(e.target.value)}
                                            rows={2}
                                            className="p-4 text-sm font-semibold rounded-xl border border-brand-border/40 focus:outline-none focus:ring-2 focus:ring-brand-amber resize-none font-sans text-brand-charcoal placeholder-brand-gray/60"
                                        />
                                    </div>

                                    <div className="md:col-span-2 pt-2">
                                        <Button type="submit" className="w-full cursor-pointer flex justify-center gap-2">
                                            <Plus size={16} className="stroke-[3px]" /> Allocate Campaign Session Hours
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* WORK HISTORY TRANSACTION LOG */}
                        <Card className="border-none shadow-soft bg-white">
                            <CardContent className="p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-border/25">
                                    <div className="flex items-center gap-2.5">
                                        <FileText className="text-brand-amber" size={22} />
                                        <h3 className="font-extrabold text-lg text-brand-charcoal">Recent Time Allocation Registry</h3>
                                    </div>
                                    <span className="text-3xs text-brand-gray font-bold uppercase tracking-wider">
                                        {logs.length} sessions listed
                                    </span>
                                </div>

                                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                                    <AnimatePresence>
                                        {logs.length === 0 ? (
                                            <div className="p-8 text-center text-brand-gray font-medium text-sm bg-brand-beige/10 rounded-2xl border border-dashed border-brand-border">
                                                No time sessions logged for this period. Use the form above to declare allocations.
                                            </div>
                                        ) : (
                                            logs.map((log) => (
                                                <motion.div 
                                                    key={log.id} 
                                                    initial={{ opacity: 0, x: -10 }} 
                                                    animate={{ opacity: 1, x: 0 }} 
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="p-4 rounded-2xl border border-brand-border/30 bg-white hover:border-brand-amber/25 transition-all shadow-sm flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="w-11 h-11 bg-brand-charcoal text-white rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm border border-brand-charcoal/20">
                                                            <span className="text-3xs font-extrabold uppercase leading-none text-brand-amber">{log.date}</span>
                                                            <span className="text-sm font-extrabold leading-none mt-1">{log.hours}h</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-extrabold text-sm text-brand-charcoal">{log.client}</span>
                                                                <span className="text-4xs font-bold px-2 py-0.5 bg-brand-amber/15 text-brand-amber rounded-full uppercase tracking-widest">
                                                                    {log.category}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-brand-gray mt-1 truncate max-w-sm md:max-w-md font-medium" title={log.notes}>
                                                                {log.notes}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => handleDeleteLog(log.id)}
                                                        className="p-2 text-brand-gray hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                                        title="Delete allocation entry"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* INTERACTIVE COLUMN 2: CHECKLIST & PERSISTENT NOTES */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* TASK CHECKLIST BOARD */}
                        <Card className="border-none shadow-soft h-full">
                            <CardContent className="p-6 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-border/25">
                                        <div className="flex items-center gap-2">
                                            <CheckSquare className="text-brand-amber" size={20} className="stroke-[2.5px]" />
                                            <h3 className="font-extrabold text-md text-brand-charcoal">Strategic Checklist</h3>
                                        </div>
                                        <span className="text-3xs text-brand-amber font-extrabold px-2.5 py-0.5 bg-brand-amber/15 rounded-full uppercase tracking-wider">
                                            Live Tracker
                                        </span>
                                    </div>

                                    {/* Task Filter Tabs */}
                                    <div className="flex gap-1.5 p-1 bg-brand-border/10 rounded-xl border border-brand-border/20 mb-4">
                                        {['All', 'Active', 'Completed'].map((filter) => (
                                            <button
                                                key={filter}
                                                type="button"
                                                onClick={() => setTaskFilter(filter)}
                                                className={`flex-1 py-1 text-3xs font-extrabold rounded-lg transition-all cursor-pointer ${
                                                    taskFilter === filter
                                                        ? 'bg-brand-charcoal text-white shadow-sm'
                                                        : 'text-brand-gray hover:text-brand-charcoal'
                                                }`}
                                            >
                                                {filter}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Priority Filters */}
                                    <div className="flex items-center justify-between mb-4.5 px-1">
                                        <span className="text-3xs text-brand-gray font-extrabold uppercase tracking-wide">Priority Range</span>
                                        <select 
                                            value={priorityFilter} 
                                            onChange={(e) => setPriorityFilter(e.target.value)}
                                            className="text-3xs font-extrabold bg-transparent text-brand-amber border-none focus:outline-none focus:ring-0 cursor-pointer"
                                        >
                                            <option value="All">All Priorities</option>
                                            <option value="High">High Only</option>
                                            <option value="Medium">Medium Only</option>
                                            <option value="Low">Low Only</option>
                                        </select>
                                    </div>

                                    {/* Tasks Checklist mapping */}
                                    <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                                        {filteredTasks.length === 0 ? (
                                            <div className="p-6 text-center text-brand-gray text-xs font-semibold bg-brand-beige/10 rounded-xl border border-dashed border-brand-border">
                                                No checklist tasks match these filters.
                                            </div>
                                        ) : (
                                            filteredTasks.map((task) => (
                                                <div 
                                                    key={task.id} 
                                                    className="p-3.5 rounded-xl border border-brand-border/25 bg-white hover:border-brand-amber/20 transition-all flex items-center justify-between gap-3 shadow-3xs"
                                                >
                                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={task.status === 'Completed'} 
                                                            onChange={() => handleToggleTask(task.id)}
                                                            className="w-4 h-4 rounded mt-0.5 border-brand-border text-brand-amber focus:ring-brand-amber accent-brand-amber cursor-pointer shrink-0" 
                                                        />
                                                        <div className="min-w-0">
                                                            <span className={`text-xs font-bold text-brand-charcoal block ${task.status === 'Completed' ? 'line-through text-brand-gray/70' : ''}`}>
                                                                {task.title}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-4xs font-extrabold px-1.5 py-0.5 rounded-md ${
                                                                    task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                    task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                                                    'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                    {task.priority} Priority
                                                                </span>
                                                                <span className="text-4xs text-brand-gray/80 font-bold flex items-center gap-0.5">
                                                                    Due {task.due}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="text-brand-gray hover:text-red-500 p-1 rounded-md shrink-0 cursor-pointer"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* QUICK TASK ADD FORM */}
                                <form onSubmit={handleAddTask} className="mt-6 pt-5 border-t border-brand-border/25 space-y-3">
                                    <div className="flex flex-col gap-1">
                                        <input 
                                            type="text" 
                                            placeholder="Write new actionable task..."
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            required
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:outline-none focus:ring-2 focus:ring-brand-amber text-brand-charcoal placeholder-brand-gray/60 bg-white"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={newTaskPriority}
                                            onChange={(e) => setNewTaskPriority(e.target.value)}
                                            className="flex-1 h-9 px-2 text-2xs font-extrabold rounded-lg border border-brand-border/40 focus:outline-none bg-white text-brand-charcoal"
                                        >
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </select>
                                        <select
                                            value={newTaskDue}
                                            onChange={(e) => setNewTaskDue(e.target.value)}
                                            className="flex-1 h-9 px-2 text-2xs font-extrabold rounded-lg border border-brand-border/40 focus:outline-none bg-white text-brand-charcoal"
                                        >
                                            <option value="Today">Today</option>
                                            <option value="Tomorrow">Tomorrow</option>
                                            <option value="In 2 days">In 2 days</option>
                                            <option value="Next Week">Next Week</option>
                                        </select>
                                        <button 
                                            type="submit" 
                                            className="h-9 px-3 bg-brand-charcoal hover:bg-black text-white rounded-lg font-bold flex items-center justify-center transition-all shrink-0 cursor-pointer"
                                        >
                                            <Plus size={15} className="stroke-[3px]" />
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* ANEXAR CORE SCRATCH PAD */}
                        <Card className="border-none shadow-soft bg-brand-charcoal text-white h-full relative overflow-hidden">
                            <CardContent className="p-6 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center gap-2.5 text-brand-amber mb-4">
                                        <Sparkles size={18} className="fill-brand-amber" />
                                        <h3 className="font-extrabold text-md uppercase tracking-wider">Operations Scratchpad</h3>
                                    </div>
                                    <p className="text-2xs text-white/70 leading-relaxed mb-4 font-medium">
                                        Keep private strategist ideas, press pitch angles, and core bullet points. Automatically auto-saves to local cache as you type!
                                    </p>
                                    <textarea
                                        rows={4}
                                        placeholder="Brainstorm here... e.g. Acura release hook: 'Leading engineering toward sustainable elegance.'"
                                        value={quickNote}
                                        onChange={(e) => setQuickNote(e.target.value)}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-amber text-white placeholder-white/40 resize-none font-sans leading-relaxed"
                                    />
                                </div>
                                <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-2xs text-white/60 font-bold uppercase tracking-wider">
                                    <span>Cloud cache synchronized</span>
                                    <span className="text-brand-amber">Anexar LLP</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* PREMIUM REAL-TIME RECHARTS VISUALS */}
                <Card className="border-none shadow-soft">
                    <CardContent className="p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-brand-border/25 gap-3">
                            <div>
                                <h3 className="font-extrabold text-lg text-brand-charcoal">Real-Time Time Allocation Analytics</h3>
                                <p className="text-xs text-brand-gray font-medium mt-1">
                                    Live graphics representing time distribution trends across partners and weekdays.
                                </p>
                            </div>
                            <span className="text-3xs font-extrabold px-3 py-1 bg-brand-charcoal text-white rounded-full uppercase tracking-wider self-start sm:self-auto">
                                Active Deliverables Insights
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[320px]">
                            {/* Chart 1: Daily allocation */}
                            <div className="flex flex-col">
                                <h4 className="text-xs font-extrabold text-brand-charcoal uppercase tracking-wider mb-5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-brand-amber rounded-sm" />
                                    Operational Hours Logged Daily
                                </h4>
                                <div className="flex-1 w-full h-[260px] min-h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEA" vertical={false} />
                                            <XAxis dataKey="name" stroke="#6B7280" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#6B7280" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                cursor={{ fill: '#EAE8E4', opacity: 0.3 }}
                                                contentStyle={{ backgroundColor: '#1C1C1C', border: 'none', borderRadius: '12px', color: '#fff' }}
                                                labelStyle={{ fontWeight: 800, color: '#D6A73F', textTransform: 'uppercase', fontSize: '10px' }}
                                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}
                                            />
                                            <Bar dataKey="Hours" fill="#D6A73F" radius={[6, 6, 0, 0]} maxBarSize={32}>
                                                {barChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.Hours >= 8 ? '#1C1C1C' : '#D6A73F'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Chart 2: Client distribution */}
                            <div className="flex flex-col">
                                <h4 className="text-xs font-extrabold text-brand-charcoal uppercase tracking-wider mb-5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-3 bg-brand-charcoal rounded-sm" />
                                    Time Allocation Share by Brand Partner
                                </h4>
                                {pieChartData.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-xs font-semibold text-brand-gray bg-brand-beige/10 rounded-2xl border border-dashed border-brand-border">
                                        No metrics to analyze yet. Log hours above to build visualization.
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
                                        <div className="w-[180px] h-[180px] shrink-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieChartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={75}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {pieChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1C1C1C', border: 'none', borderRadius: '12px', color: '#fff' }}
                                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        
                                        {/* Legend Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 max-w-[200px] flex-1">
                                            {pieChartData.map((entry, index) => {
                                                const totalVal = pieChartData.reduce((s, e) => s + e.value, 0);
                                                const percentage = ((entry.value / totalVal) * 100).toFixed(0);
                                                return (
                                                    <div key={entry.name} className="flex items-center gap-2">
                                                        <span 
                                                            className="w-3 h-3 rounded-full shrink-0 shadow-3xs" 
                                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                        />
                                                        <span className="text-2xs font-extrabold text-brand-charcoal truncate" title={entry.name}>
                                                            {entry.name}: <span className="text-brand-amber">{percentage}%</span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

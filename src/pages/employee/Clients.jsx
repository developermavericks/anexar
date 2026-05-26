import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    Search,
    Mail,
    Phone,
    Building2,
    DollarSign,
    Award,
    Sparkles,
    Plus,
    Trash2,
    User,
    Globe,
    Calendar,
    ChevronRight,
    Copy,
    Check,
    Briefcase,
    Shield,
    X,
    Edit2
} from 'lucide-react';

export default function Clients() {
    // ----------------------------------------------------
    // PREPOPULATED REALISTIC CLIENT DETAILS
    // ----------------------------------------------------
    const [clients, setClients] = useState(() => {
        const saved = localStorage.getItem('anexar_employee_client_details');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            {
                id: 1,
                name: 'RedBull Racing',
                category: 'Sports & Lifestyle',
                tier: 'Tier 1 Enterprise',
                budget: '$150,000 / mo',
                status: 'Active',
                focus: 'Global Brand Strategy & Press Relations',
                contactName: 'Christian Horner',
                contactEmail: 'horner@redbullracing.com',
                contactPhone: '+44 1908 279700',
                website: 'www.redbullracing.com',
                contractStart: 'Jan 2025',
                nextReview: 'Jun 2026'
            },
            {
                id: 2,
                name: 'Spotify',
                category: 'Entertainment & Tech',
                tier: 'Tier 1 Enterprise',
                budget: '$120,000 / mo',
                status: 'Active',
                focus: 'Executive Thought Leadership & Product PR',
                contactName: 'Daniel Ek',
                contactEmail: 'daniel.ek@spotify.com',
                contactPhone: '+46 8 562 789 00',
                website: 'www.spotify.com',
                contractStart: 'Mar 2025',
                nextReview: 'Sep 2026'
            },
            {
                id: 3,
                name: 'Vercel',
                category: 'Developer Platforms',
                tier: 'Tier 2 Strategic',
                budget: '$85,000 / mo',
                status: 'Active',
                focus: 'Next.js 15 Launch & Developer Relations Support',
                contactName: 'Guillermo Rauch',
                contactEmail: 'rauch@vercel.com',
                contactPhone: '+1 415 889 0211',
                website: 'vercel.com',
                contractStart: 'Feb 2025',
                nextReview: 'Aug 2026'
            },
            {
                id: 4,
                name: 'Acura Corporate',
                category: 'Automotive',
                tier: 'Tier 1 Enterprise',
                budget: '$200,000 / mo',
                status: 'Under Review',
                focus: 'Electric Vehicles Campaign & Narrative Building',
                contactName: 'Jon Ikeda',
                contactEmail: 'jon_ikeda@acura.honda.com',
                contactPhone: '+1 310 783 2000',
                website: 'acura.com',
                contractStart: 'Jul 2024',
                nextReview: 'Jul 2026'
            },
            {
                id: 5,
                name: 'Nike',
                category: 'Retail & Sportswear',
                tier: 'Tier 2 Strategic',
                budget: '$95,000 / mo',
                status: 'Active',
                focus: 'Olympic Athletes Press Alignments',
                contactName: 'John Donahoe',
                contactEmail: 'j.donahoe@nike.com',
                contactPhone: '+1 503 671 6453',
                website: 'nike.com',
                contractStart: 'Oct 2024',
                nextReview: 'Nov 2026'
            }
        ];
    });

    // ----------------------------------------------------
    // STATE VARIABLES
    // ----------------------------------------------------
    const [selectedClientId, setSelectedClientId] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [copiedField, setCopiedField] = useState(null);

    // Modal forms states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Form Inputs State
    const [formData, setFormData] = useState({
        name: '',
        category: 'Technology',
        tier: 'Tier 2 Strategic',
        budget: '',
        status: 'Active',
        focus: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        website: '',
        contractStart: '',
        nextReview: ''
    });

    // ----------------------------------------------------
    // EFFECTS & STORAGE
    // ----------------------------------------------------
    useEffect(() => {
        localStorage.setItem('anexar_employee_client_details', JSON.stringify(clients));
    }, [clients]);

    // ----------------------------------------------------
    // ACTIONS & HANDLERS
    // ----------------------------------------------------
    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const handleOpenAddModal = () => {
        setFormData({
            name: '',
            category: 'Technology',
            tier: 'Tier 2 Strategic',
            budget: '$50,000 / mo',
            status: 'Active',
            focus: '',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            website: '',
            contractStart: 'May 2026',
            nextReview: 'Dec 2026'
        });
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (client) => {
        setFormData({ ...client });
        setIsEditModalOpen(true);
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        const newClient = {
            id: Date.now(),
            ...formData
        };
        const updated = [...clients, newClient];
        setClients(updated);
        setSelectedClientId(newClient.id);
        setIsAddModalOpen(false);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const updated = clients.map(c => c.id === formData.id ? { ...formData } : c);
        setClients(updated);
        setIsEditModalOpen(false);
    };

    const handleDeleteClient = (id, e) => {
        e.stopPropagation();
        const remaining = clients.filter(c => c.id !== id);
        setClients(remaining);
        if (selectedClientId === id && remaining.length > 0) {
            setSelectedClientId(remaining[0].id);
        }
    };

    const activeClient = clients.find(c => c.id === selectedClientId) || clients[0] || null;

    // Filtered Client Listing
    const filteredClients = clients.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             c.contactName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' ? true : c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-8 max-w-6xl mx-auto font-sans pb-8">
            
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border/20 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="text-brand-amber stroke-[2.5px]" size={24} />
                        Client Accounts Directory
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Precise tracking database of portfolio metrics, campaign focus segments, and contract details.
                    </p>
                </div>
                <Button 
                    onClick={handleOpenAddModal}
                    className="cursor-pointer text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                >
                    <Plus size={15} className="stroke-[3px]" /> Onboard New Client
                </Button>
            </div>

            {/* TWO COLUMN COMPACT DASHBOARD DIRECTORY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMN 1: LEFT SIDEBAR DIRECTORY LISTING */}
                <div className="lg:col-span-1 space-y-5">
                    {/* Search & Filter Controls */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#EAE8E4] dark:border-slate-800 space-y-3.5 shadow-3xs">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by brand or contact..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 text-xs font-semibold rounded-xl border border-[#EAE8E4] dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber bg-[#FDFBF7] dark:bg-slate-800 text-brand-charcoal dark:text-white"
                            />
                        </div>
                        <div className="flex gap-1.5 p-0.5 bg-[#FDFBF7] dark:bg-slate-800 border border-[#EAE8E4] dark:border-slate-800 rounded-xl">
                            {['All', 'Active', 'Under Review'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`flex-1 py-1.5 text-3xs font-extrabold rounded-lg transition-all cursor-pointer ${
                                        statusFilter === status
                                            ? 'bg-brand-charcoal dark:bg-amber-500 text-white dark:text-[#0B0F19] shadow-sm'
                                            : 'text-gray-500 hover:text-brand-charcoal dark:text-gray-400'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Client Cards List */}
                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                        {filteredClients.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 border border-dashed rounded-2xl">
                                No clients match your search criteria.
                            </div>
                        ) : (
                            filteredClients.map((client) => (
                                <div
                                    key={client.id}
                                    onClick={() => setSelectedClientId(client.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-3xs flex items-center justify-between gap-3 ${
                                        selectedClientId === client.id
                                            ? 'bg-brand-charcoal border-brand-charcoal text-white dark:bg-amber-500/10 dark:border-amber-500/30'
                                            : 'bg-white border-[#EAE8E4] hover:border-brand-amber/30 dark:bg-slate-900 dark:border-slate-800 text-brand-charcoal dark:text-white'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <h4 className="font-extrabold text-sm truncate">{client.name}</h4>
                                        <p className={`text-4xs font-bold uppercase tracking-wider mt-0.5 ${
                                            selectedClientId === client.id ? 'text-brand-amber' : 'text-brand-gray'
                                        }`}>
                                            {client.category}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            client.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`} />
                                        <ChevronRight size={14} className="text-gray-400" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* COLUMN 2: ACTIVE CLIENT DETAIL PANEL */}
                <div className="lg:col-span-2">
                    {activeClient ? (
                        <Card className="border-none shadow-soft bg-white dark:bg-slate-900 relative overflow-hidden">
                            <CardContent className="p-6 md:p-8 space-y-8">
                                
                                {/* Header: Client Brand & Tier badges */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE8E4] dark:border-slate-800 pb-5 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-amber/10 text-brand-amber flex items-center justify-center font-extrabold text-lg">
                                            {activeClient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-brand-charcoal dark:text-white leading-tight">
                                                {activeClient.name}
                                            </h2>
                                            <p className="text-xs text-brand-gray font-medium mt-0.5">
                                                {activeClient.category} division partner
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action tags */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-1 bg-brand-charcoal dark:bg-slate-800 text-white rounded-full text-4xs font-extrabold uppercase tracking-wider">
                                            {activeClient.tier}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-full text-4xs font-extrabold uppercase tracking-wider ${
                                            activeClient.status === 'Active' 
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                                                : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                        }`}>
                                            {activeClient.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Precise Specs Metrics Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#FDFBF7] dark:bg-slate-800/40 p-4.5 rounded-2xl border border-[#EAE8E4] dark:border-slate-800/70">
                                    <div className="space-y-1">
                                        <span className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray block">Monthly Campaign Budget</span>
                                        <div className="flex items-center gap-1 text-sm font-extrabold text-brand-charcoal dark:text-white">
                                            <DollarSign size={14} className="text-brand-amber" />
                                            <span>{activeClient.budget}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray block">Contract Initiated</span>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal dark:text-white">
                                            <Calendar size={13} className="text-brand-amber" />
                                            <span>{activeClient.contractStart}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray block">Scheduled Audit</span>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal dark:text-white">
                                            <Shield size={13} className="text-brand-amber" />
                                            <span>{activeClient.nextReview}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Core Campaign Deliverables Focus Segment */}
                                <div className="space-y-2">
                                    <h4 className="text-3xs font-extrabold uppercase tracking-wider text-brand-gray flex items-center gap-1">
                                        <Briefcase size={12} />
                                        Core Strategic Directive & Focus
                                    </h4>
                                    <p className="text-xs font-semibold text-brand-charcoal dark:text-slate-300 bg-[#FDFBF7] dark:bg-slate-800/25 p-4 rounded-xl border border-brand-border/40 dark:border-slate-800 leading-relaxed">
                                        {activeClient.focus}
                                    </p>
                                </div>

                                {/* Precise Contact Person Details (Direct Outreach Cards) */}
                                <div className="space-y-3.5">
                                    <h4 className="text-3xs font-extrabold uppercase tracking-wider text-brand-gray flex items-center gap-1">
                                        <User size={12} />
                                        Primary Decision Maker & Contact
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        
                                        {/* Contact Name & phone */}
                                        <div className="p-4 rounded-xl border border-[#EAE8E4] dark:border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <span className="text-4xs text-brand-gray font-extrabold uppercase tracking-wider">Representative</span>
                                                <h5 className="font-bold text-sm text-brand-charcoal dark:text-white mt-0.5">{activeClient.contactName}</h5>
                                            </div>
                                            <div className="flex items-center justify-between text-xs font-bold text-brand-charcoal dark:text-white pt-2 border-t border-[#EAE8E4]/60 dark:border-slate-800/60 mt-2">
                                                <span className="flex items-center gap-1 text-4xs truncate">{activeClient.contactPhone}</span>
                                                <button 
                                                    onClick={() => copyToClipboard(activeClient.contactPhone, 'phone')}
                                                    className="text-brand-gray hover:text-brand-amber transition-colors cursor-pointer p-1"
                                                >
                                                    {copiedField === 'phone' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Contact Email & Web */}
                                        <div className="p-4 rounded-xl border border-[#EAE8E4] dark:border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <span className="text-4xs text-brand-gray font-extrabold uppercase tracking-wider">Corporate Hub</span>
                                                <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 truncate mt-0.5">{activeClient.website}</h5>
                                            </div>
                                            <div className="flex items-center justify-between text-xs font-bold text-brand-charcoal dark:text-white pt-2 border-t border-[#EAE8E4]/60 dark:border-slate-800/60 mt-2">
                                                <span className="flex items-center gap-1 text-4xs truncate">{activeClient.contactEmail}</span>
                                                <button 
                                                    onClick={() => copyToClipboard(activeClient.contactEmail, 'email')}
                                                    className="text-brand-gray hover:text-brand-amber transition-colors cursor-pointer p-1"
                                                >
                                                    {copiedField === 'email' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Footer Action Alignments */}
                                <div className="pt-5 border-t border-[#EAE8E4] dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleOpenEditModal(activeClient)}
                                            className="cursor-pointer text-xs font-bold border-brand-charcoal/15 text-brand-charcoal flex items-center gap-1.5"
                                        >
                                            <Edit2 size={13} /> Edit Account
                                        </Button>
                                        <button 
                                            onClick={(e) => handleDeleteClient(activeClient.id, e)}
                                            className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-3xs"
                                        >
                                            <Trash2 size={13} /> Offboard
                                        </button>
                                    </div>
                                    
                                    <a
                                        href={`mailto:${activeClient.contactEmail}?subject=Strategic Update: Anexar Campaign Sync`}
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-charcoal hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-sm"
                                    >
                                        <Mail size={13} />
                                        <span>Draft Outreach</span>
                                    </a>
                                </div>

                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-16 text-center text-gray-400 text-sm bg-white dark:bg-slate-900 border border-dashed rounded-2xl shadow-3xs">
                            No active client partners to showcase. Onboard one using the button above.
                        </div>
                    )}
                </div>

            </div>

            {/* ----------------------------------------------------
                MODAL: ONBOARD NEW CLIENT
            ---------------------------------------------------- */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-brand-border/40 max-w-xl w-full overflow-hidden shadow-2xl"
                        >
                            <div className="px-6 py-4 bg-[#FDFBF7] dark:bg-slate-800/50 border-b border-brand-border/25 flex justify-between items-center">
                                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">Onboard New Client Partner</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-brand-charcoal"><X size={18} /></button>
                            </div>

                            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Brand Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required 
                                            placeholder="e.g. Amazon Prime"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Category Segment</label>
                                        <input 
                                            type="text" 
                                            value={formData.category} 
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            required 
                                            placeholder="e.g. Media Tech"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Strategy Tier</label>
                                        <select 
                                            value={formData.tier} 
                                            onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        >
                                            <option value="Tier 1 Enterprise">Tier 1 Enterprise</option>
                                            <option value="Tier 2 Strategic">Tier 2 Strategic</option>
                                            <option value="Tier 3 Standard">Tier 3 Standard</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Monthly Budget</label>
                                        <input 
                                            type="text" 
                                            value={formData.budget} 
                                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                            placeholder="e.g. $75,000 / mo"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Core Campaign Focus</label>
                                    <textarea 
                                        value={formData.focus} 
                                        onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
                                        placeholder="Outline strategic PR goals, editorial schedules, and target channels..."
                                        rows={2.5}
                                        className="p-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EAE8E4]/60">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Contact Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.contactName} 
                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                            placeholder="e.g. John Doe"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Contact Email</label>
                                        <input 
                                            type="email" 
                                            value={formData.contactEmail} 
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            placeholder="e.g. john@brand.com"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Contact Phone</label>
                                        <input 
                                            type="text" 
                                            value={formData.contactPhone} 
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                            placeholder="e.g. +1 (555) 123-4567"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Website</label>
                                        <input 
                                            type="text" 
                                            value={formData.website} 
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="e.g. brand.com"
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-brand-border/20">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="h-10 px-4 border border-[#EAE8E4] dark:border-slate-700 hover:bg-[#FDFBF7] text-xs font-bold rounded-xl text-brand-charcoal dark:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <Button type="submit" className="h-10 px-5 text-xs font-bold">
                                        Onboard Account
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ----------------------------------------------------
                MODAL: EDIT CLIENT DETAILS
            ---------------------------------------------------- */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-brand-border/40 max-w-xl w-full overflow-hidden shadow-2xl"
                        >
                            <div className="px-6 py-4 bg-[#FDFBF7] dark:bg-slate-800/50 border-b border-brand-border/25 flex justify-between items-center">
                                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white uppercase tracking-wider">Edit Account Details</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-brand-charcoal"><X size={18} /></button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Brand Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required 
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Category Segment</label>
                                        <input 
                                            type="text" 
                                            value={formData.category} 
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            required 
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Strategy Tier</label>
                                        <select 
                                            value={formData.tier} 
                                            onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        >
                                            <option value="Tier 1 Enterprise">Tier 1 Enterprise</option>
                                            <option value="Tier 2 Strategic">Tier 2 Strategic</option>
                                            <option value="Tier 3 Standard">Tier 3 Standard</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Monthly Budget</label>
                                        <input 
                                            type="text" 
                                            value={formData.budget} 
                                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Core Campaign Focus</label>
                                    <textarea 
                                        value={formData.focus} 
                                        onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
                                        rows={2.5}
                                        className="p-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EAE8E4]/60">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Contact Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.contactName} 
                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Contact Email</label>
                                        <input 
                                            type="email" 
                                            value={formData.contactEmail} 
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Contact Phone</label>
                                        <input 
                                            type="text" 
                                            value={formData.contactPhone} 
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-4xs font-extrabold uppercase tracking-wider text-brand-gray">Website</label>
                                        <input 
                                            type="text" 
                                            value={formData.website} 
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            className="h-10 px-3 text-xs font-semibold rounded-xl border border-brand-border/40 focus:ring-2 focus:ring-brand-amber bg-white text-brand-charcoal dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-brand-border/20">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="h-10 px-4 border border-[#EAE8E4] dark:border-slate-700 hover:bg-[#FDFBF7] text-xs font-bold rounded-xl text-brand-charcoal dark:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <Button type="submit" className="h-10 px-5 text-xs font-bold">
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

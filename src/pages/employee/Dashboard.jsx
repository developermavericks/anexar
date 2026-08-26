import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { db } from '../../lib/firebaseClient';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/Card';
import { Users, Newspaper } from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();
    const [assignedClients, setAssignedClients] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [updates, setUpdates] = useState([]);
    const [loadingUpdates, setLoadingUpdates] = useState(true);

    // Fetch this employee's real assigned clients: Supabase allocations/core_owner
    // first, falling back to the actively-maintained Firestore user_clients mapping
    // (same source Clients.jsx uses) so this always reflects real assignments.
    useEffect(() => {
        const fetchClients = async () => {
            if (!user || !user.email) {
                setLoadingClients(false);
                return;
            }

            const emailLower = user.email.toLowerCase();
            const userRole = user.role?.toLowerCase();
            let clientNames = [];

            try {
                const isWholeAccess = emailLower.includes('satyam') || emailLower.includes('chetan') || emailLower.includes('pooja') || userRole === 'core' || userRole === 'manager';
                if (isWholeAccess) {
                    const { data } = await supabase
                        .from('clients')
                        .select('name')
                        .eq('is_active', true)
                        .order('name', { ascending: true });
                    if (data && data.length > 0) clientNames = data.map(c => c.name);
                } else if (user.id) {
                    const [weeklyRes, monthlyRes] = await Promise.all([
                        supabase.from('allocations_weekly').select('clients(name)').eq('user_id', user.id),
                        supabase.from('allocations_monthly').select('clients(name)').eq('user_id', user.id)
                    ]);

                    const set = new Set();
                    weeklyRes.data?.forEach(item => { if (item.clients?.name) set.add(item.clients.name); });
                    monthlyRes.data?.forEach(item => { if (item.clients?.name) set.add(item.clients.name); });
                    clientNames = Array.from(set);

                    if (clientNames.length === 0) {
                        const docSnap = await getDoc(doc(db, 'user_clients', emailLower));
                        const fsClients = docSnap.exists() ? docSnap.data().clients : null;
                        if (Array.isArray(fsClients)) clientNames = fsClients;
                    }
                }
            } catch (err) {
                console.error('Error fetching assigned clients:', err);
            }

            setAssignedClients(clientNames.slice().sort());
            setLoadingClients(false);
        };

        fetchClients();
    }, [user]);

    // Fetch real client activity (coverage/report uploads) logged in Upload Coverage.
    useEffect(() => {
        const fetchUpdates = async () => {
            try {
                const q = query(collection(db, 'client_updates'), orderBy('createdAt', 'desc'), limit(100));
                const snap = await getDocs(q);
                setUpdates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error('Error fetching client updates:', err);
            } finally {
                setLoadingUpdates(false);
            }
        };

        fetchUpdates();
    }, []);

    const relevantUpdates = assignedClients.length > 0
        ? updates.filter(u => assignedClients.includes(u.client)).slice(0, 8)
        : [];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Here's what's happening with your clients.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card className="border-none shadow-soft">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-3xs text-brand-gray font-bold uppercase tracking-wider">Assigned Clients</p>
                                <h3 className="text-3xl font-extrabold text-brand-charcoal dark:text-white mt-1.5 leading-none">
                                    {loadingClients ? '—' : assignedClients.length} <span className="text-xs font-semibold text-brand-gray">Active Brands</span>
                                </h3>
                                {assignedClients.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2.5">
                                        <span className="text-2xs font-extrabold text-brand-amber">Top client:</span>
                                        <span className="text-2xs text-brand-charcoal font-semibold bg-brand-amber/15 px-2 py-0.5 rounded-md">{assignedClients[0]}</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 shrink-0 shadow-sm">
                                <Users size={20} className="stroke-[2.5px]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-soft">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-3xs text-brand-gray font-bold uppercase tracking-wider">Recent Updates</p>
                                <h3 className="text-3xl font-extrabold text-brand-charcoal dark:text-white mt-1.5 leading-none">
                                    {loadingUpdates ? '—' : relevantUpdates.length}
                                </h3>
                                <p className="text-3xs text-brand-gray mt-2.5 font-bold tracking-wide">
                                    Across your assigned clients
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0 shadow-sm">
                                <Newspaper size={20} className="stroke-[2.5px]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-soft">
                <CardContent className="p-6">
                    <h3 className="text-sm font-bold text-brand-charcoal dark:text-white mb-4">Your Clients</h3>
                    {loadingClients ? (
                        <p className="text-xs text-brand-gray">Loading...</p>
                    ) : assignedClients.length === 0 ? (
                        <p className="text-xs text-brand-gray">No clients assigned yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {assignedClients.map(c => (
                                <span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-brand-beige/60 dark:bg-slate-800 text-brand-charcoal dark:text-gray-200">
                                    {c}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-soft">
                <CardContent className="p-6">
                    <h3 className="text-sm font-bold text-brand-charcoal dark:text-white mb-4">Recent Client Updates</h3>
                    {loadingUpdates ? (
                        <p className="text-xs text-brand-gray">Loading...</p>
                    ) : relevantUpdates.length === 0 ? (
                        <p className="text-xs text-brand-gray">No recent updates logged for your clients yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {relevantUpdates.map(u => (
                                <div key={u.id} className="flex items-start gap-3 pb-3 border-b border-brand-border/15 last:border-0 last:pb-0">
                                    <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-brand-amber/15 text-brand-amber shrink-0">
                                        {u.client}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-xs text-brand-charcoal dark:text-gray-200">{u.update}</p>
                                        <p className="text-3xs text-brand-gray mt-1">{u.timestamp}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { recommendedTopics } from '../../mock/clientData';
import { Lightbulb, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { db } from '../../lib/firebaseClient';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const ThoughtLeadership = () => {
    const { user } = useUser();
    const [topics, setTopics] = useState([]);

    const clientName = user?.clientBrand || '';

    useEffect(() => {
        const q = query(
            collection(db, "thought_leadership"),
            where("client", "==", clientName),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ docId: docSnap.id, ...docSnap.data() });
            });
            setTopics(list);
        }, (err) => {
            console.error("Error subscribing to thought leadership ideas:", err);
            setTopics([]);
        });
        return () => unsubscribe();
    }, [clientName]);

    const handleAction = async (docId, action) => {
        const topic = topics.find(t => t.docId === docId);
        if (!topic) return;

        const capitalizedStatus = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase(); // 'Approved' or 'Rejected'

        try {
            // Real doc: update status in Firestore
            await updateDoc(doc(db, "thought_leadership", docId), {
                status: capitalizedStatus
            });

            // Create notification for employee
            await addDoc(collection(db, "notifications"), {
                email: user?.email || '',
                title: `Pitch ${capitalizedStatus}`,
                description: `${clientName} has ${action} topic: "${topic.title}"`,
                read: false,
                createdAt: new Date().toISOString()
            });

            alert(`Topic proposal successfully ${action}!`);
        } catch (err) {
            console.error("Error actioning thought leadership topic:", err);
            alert("Failed to update status.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thought Leadership</h1>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Review and approve suggested speaking topics and content themes.</p>
            </div>

            {topics.length === 0 ? (
                <div className="p-16 text-center text-gray-500 bg-white dark:bg-[#111827] border border-dashed border-[#EAE8E4] dark:border-white/10 rounded-3xl shadow-lg">
                    <Lightbulb className="mx-auto text-amber-500/40 mb-3 animate-pulse" size={40} />
                    <p className="text-sm font-bold">No Pitch Proposals Available</p>
                    <p className="text-xs text-gray-400 mt-1">Your dedicated strategist team hasn't published any speaking topic proposals yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {topics.map(topic => (
                        <div
                            key={topic.docId || topic.id}
                            className={`bg-white dark:bg-[#111827] p-6 rounded-3xl border transition-all shadow-[0_10px_30px_rgba(0,0,0,0.05)] ${topic.status?.toLowerCase() === 'approved'
                                ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                                : topic.status?.toLowerCase() === 'rejected'
                                    ? 'border-rose-500/50 opacity-75'
                                    : 'border-[#EAE8E4] dark:border-white/10 hover:border-gray-300 hover:-translate-y-1'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-50 dark:bg-[#1F2937] rounded-lg">
                                    <Lightbulb size={24} className={
                                        topic.status?.toLowerCase() === 'approved' ? 'text-emerald-400' :
                                            topic.status?.toLowerCase() === 'rejected' ? 'text-rose-400' : 'text-amber-500 dark:text-amber-400'
                                    } />
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Match Score</span>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">{topic.matchScore || topic.relevanceScore}%</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 line-clamp-2 min-h-[56px]">
                                {topic.title}
                            </h3>

                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mb-6">
                                <Calendar size={16} />
                                <span>Pitch Deadline: <span className="text-gray-800 dark:text-gray-200">{new Date(topic.deadline).toLocaleDateString()}</span></span>
                            </div>

                            {(!topic.status || topic.status.toLowerCase() === 'pending') ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAction(topic.docId || topic.id, 'approved')}
                                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 dark:bg-emerald-500/90 hover:bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 border border-emerald-500/30 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <CheckCircle size={18} /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleAction(topic.docId || topic.id, 'rejected')}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gray-50 dark:bg-[#1F2937] hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-gray-500 dark:text-gray-400 dark:text-gray-500 border border-gray-200 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                </div>
                            ) : (
                                <div className={`py-2 text-center rounded-lg font-medium text-sm border ${topic.status.toLowerCase() === 'approved'
                                    ? 'bg-emerald-500 dark:bg-emerald-500/90 text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                    {topic.status}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThoughtLeadership;

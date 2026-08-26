import React, { useState, useEffect } from 'react';
import { Mail, Calendar as CalendarIcon, X, Send, MessageSquare } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import { db } from '../../lib/firebaseClient';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const MeetTeam = () => {
    const { user } = useUser();
    const [teamList, setTeamList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [meetingDate, setMeetingDate] = useState('');
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [meetingTopic, setMeetingTopic] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // Gmail-style email composer states
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [composerRecipient, setComposerRecipient] = useState(null);
    const [composerMode, setComposerMode] = useState('email'); // 'email' or 'message'
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [composerSuccess, setComposerSuccess] = useState(false);
    const [isSentViaEmailJS, setIsSentViaEmailJS] = useState(false);

    // Google Calendar availability check states
    const [busySlots, setBusySlots] = useState([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    // Custom time range states
    const [isCustomTime, setIsCustomTime] = useState(false);
    const [customStartTime, setCustomStartTime] = useState('');
    const [customEndTime, setCustomEndTime] = useState('');
    // Developer Test bypass logic consistent with other components
    const clientName = user?.clientBrand || '';

    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (!clientName) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // 1. Fetch client ID by name from Supabase
                const { data: clientData, error: clientErr } = await supabase
                    .from('clients')
                    .select('id')
                    .ilike('name', clientName)
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
                    // 3. Fetch users details
                    const { data: usersData, error: usersErr } = await supabase
                        .from('users')
                        .select('id, name, email, role, picture, title')
                        .in('id', userIds);

                    if (usersData && !usersErr) {
                        members = usersData;
                    }
                }

                // 4. Fallback: If no allocations, load from Firestore's "user_clients"
                if (members.length === 0) {
                    const userClientsSnap = await getDocs(collection(db, "user_clients"));
                    const matchedEmails = [];
                    userClientsSnap.forEach(docSnap => {
                        const data = docSnap.data();
                        const clientsList = Array.isArray(data.clients) ? data.clients : [];
                        if (clientsList.some(c => (c || '').toLowerCase() === clientName.toLowerCase())) {
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
                                    name: data.name || email.split('@')[0],
                                    email: email,
                                    role: 'team',
                                    title: 'Account Representative'
                                });
                            }
                        });
                    }
                }

                const filteredMembers = members.filter(m => {
                    const emailLower = (m.email || '').toLowerCase();
                    const nameLower = (m.name || '').toLowerCase();
                    return !emailLower.includes('satyam') && !nameLower.includes('satyam');
                });

                setTeamList(filteredMembers);
            } catch (err) {
                console.error("Error loading team members:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamMembers();
    }, [clientName]);

    const handleBookMeeting = (member) => {
        setSelectedMember(member);
        setBookingSuccess(false);

        // Pre-fill date with today's local date (YYYY-MM-DD format)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setMeetingDate(`${yyyy}-${mm}-${dd}`);
        setSelectedSlots([]); // Clear selected slots

        setIsModalOpen(true);
    };

    const handleOpenComposer = (member, mode = 'email') => {
        setComposerRecipient(member);
        setComposerMode(mode);
        setEmailSubject('');
        setEmailBody('');
        setComposerSuccess(false);
        setIsSentViaEmailJS(false);
        setIsComposerOpen(true);
    };

    const handleCloseComposer = () => {
        setIsComposerOpen(false);
        setComposerRecipient(null);
        setEmailSubject('');
        setEmailBody('');
        setComposerSuccess(false);
        setIsSentViaEmailJS(false);
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

    const standardTimeSlots = generateTimeSlots(9, 18, 15);

    // Google Calendar free/busy availability effect loader
    useEffect(() => {
        if (!meetingDate || !selectedMember) {
            setBusySlots([]);
            return;
        }

        const fetchAvailability = async () => {
            const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
            if (!apiKey) {
                console.warn("VITE_GOOGLE_API_KEY is not defined. Skipping Google Calendar Free/Busy check.");
                return;
            }

            setLoadingAvailability(true);
            try {
                // Get local date boundaries converted to ISO strings
                const start = new Date(meetingDate + "T00:00:00");
                const end = new Date(meetingDate + "T23:59:59");

                const response = await fetch(`https://www.googleapis.com/calendar/v3/freeBusy?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        timeMin: start.toISOString(),
                        timeMax: end.toISOString(),
                        items: [{ id: selectedMember.email }]
                    })
                });

                if (!response.ok) {
                    throw new Error(`Google Calendar API error: ${response.status}`);
                }

                const data = await response.json();
                const calendarData = data.calendars?.[selectedMember.email];
                if (calendarData?.busy) {
                    setBusySlots(calendarData.busy);
                    console.log(`Busy slots for ${selectedMember.email}:`, calendarData.busy);
                } else {
                    setBusySlots([]);
                }
            } catch (err) {
                console.error("Error fetching Google Calendar availability:", err);
                setBusySlots([]);
            } finally {
                setLoadingAvailability(false);
            }
        };

        fetchAvailability();
    }, [meetingDate, selectedMember]);

    const isSlotBusy = (slotTimeStr) => {
        if (!meetingDate || busySlots.length === 0) return false;
        
        const slotStart = new Date(`${meetingDate}T${slotTimeStr}:00`);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30-minute duration

        return busySlots.some(busy => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return slotStart < busyEnd && slotEnd > busyStart;
        });
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedMember(null);
            setMeetingDate('');
            setSelectedSlots([]);
            setMeetingTopic('');
            setBookingSuccess(false);
        }, 300);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMember || !meetingDate) return;
        
        if (isCustomTime && (!customStartTime || !customEndTime)) {
            alert("Please provide both start and end times.");
            return;
        } else if (!isCustomTime && selectedSlots.length === 0) {
            alert("Please select at least one time slot.");
            return;
        }

        try {
            // Save meeting schedule to Firestore with status 'pending'
            const meetingDoc = await addDoc(collection(db, "meetings"), {
                client: clientName,
                clientEmail: user?.email || '',
                memberId: selectedMember.id,
                memberName: selectedMember.name,
                memberEmail: selectedMember.email,
                date: meetingDate,
                slots: isCustomTime ? [] : selectedSlots,
                isCustomTime: isCustomTime,
                customStartTime: isCustomTime ? customStartTime : null,
                customEndTime: isCustomTime ? customEndTime : null,
                topic: meetingTopic,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            const timeText = isCustomTime ? `${customStartTime} - ${customEndTime}` : selectedSlots.join(', ');

            // Send notification to the member's notification bell list in Firestore
            await addDoc(collection(db, "notifications"), {
                message: `Client ${clientName} requested a meeting with you on ${meetingDate}. Time: ${timeText}. Topic: "${meetingTopic}"`,
                createdAt: new Date().toISOString(),
                read: false,
                recipientEmail: selectedMember.email,
                client: clientName,
                meetingId: meetingDoc.id,
                type: 'meeting_request',
                meetingDate: meetingDate,
                slots: isCustomTime ? [] : selectedSlots,
                isCustomTime: isCustomTime,
                customStartTime: isCustomTime ? customStartTime : null,
                customEndTime: isCustomTime ? customEndTime : null,
                clientEmail: user?.email || '',

                topic: meetingTopic
            });

            setBookingSuccess(true);
            setTimeout(() => {
                handleCloseModal();
            }, 2000);
        } catch (err) {
            console.error("Error booking meeting silently:", err);
            alert("Booking failed: " + err.message);
        }
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!composerRecipient || !emailSubject || !emailBody) return;

        setIsSending(true);
        try {
            // 1. Log to Firestore emails collection
            await addDoc(collection(db, "emails"), {
                from: user.email,
                fromName: user.name,
                to: composerRecipient.email,
                toName: composerRecipient.name,
                subject: emailSubject,
                body: emailBody,
                sentAt: new Date().toISOString(),
                type: composerMode // 'email' or 'message'
            });

            // 2. Trigger notification inside portal
            await addDoc(collection(db, "notifications"), {
                message: composerMode === 'email'
                    ? `Client ${clientName} sent you a portal email. Subject: "${emailSubject}"`
                    : `Client ${clientName} sent you a portal message. Subject: "${emailSubject}"`,
                createdAt: new Date().toISOString(),
                read: false,
                recipientEmail: composerRecipient.email,
                client: clientName,
                type: composerMode
            });

            if (composerMode === 'email') {
                // Send email using EmailJS API if keys are defined in .env
                const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                console.log("EmailJS Keys loaded:", { serviceId, templateId, publicKey });

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
                                    to_email: composerRecipient.email,
                                    to_name: composerRecipient.name,
                                    from_name: user.name,
                                    from_email: user.email,
                                    subject: emailSubject,
                                    message: emailBody
                                }
                            })
                        });

                        console.log("EmailJS response status:", response.status);

                        if (response.ok) {
                            emailjsSent = true;
                            setIsSentViaEmailJS(true);
                        } else {
                            const errText = await response.text();
                            console.warn(`EmailJS API error (e.g. quota exceeded): ${errText}. Falling back to mailto.`);
                        }
                    } catch (e) {
                        console.error("EmailJS network error. Falling back to mailto:", e);
                    }
                }

                setComposerSuccess(true);
                setIsSending(false);

                if (emailjsSent) {
                    // Successfully sent in background, just auto close modal
                    setTimeout(() => {
                        handleCloseComposer();
                    }, 2000);
                } else {
                    // Fallback to mailto link if EmailJS credentials are not present or if delivery failed
                    const mailtoUrl = `mailto:${composerRecipient.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                    
                    // Set a tiny timeout to open mailto and close the modal
                    setTimeout(() => {
                        window.location.href = mailtoUrl;
                        handleCloseComposer();
                    }, 1200);
                }
            } else {
                // If it is a purely Portal Message, just show success directly (no email triggers)
                setComposerSuccess(true);
                setIsSending(false);

                setTimeout(() => {
                    handleCloseComposer();
                }, 2000);
            }

        } catch (err) {
            console.error("Error logging message or sending notification:", err);
            alert("Failed to send message. Please try again.");
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meet Your Team</h1>
                <p className="text-gray-500 dark:text-gray-400">The dedicated professionals managing your account.</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-450 dark:text-slate-500 font-semibold gap-2">
                    <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                    <span className="text-xs">Loading team profile...</span>
                </div>
            ) : teamList.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-white/10 text-slate-400 text-xs font-semibold">
                    No team members assigned currently.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {teamList.map((member) => (
                        <div key={member.id} className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-[#EAE8E4] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 p-1 flex items-center justify-center">
                                    {member.picture ? (
                                        <img
                                            src={member.picture}
                                            alt={member.name}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full rounded-full border-2 border-white object-cover bg-gray-100 dark:bg-[#374151]"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full border-2 border-white bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-700 dark:text-white">
                                            {(member.name || 'U').charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 dark:bg-emerald-500/90 border-2 border-white rounded-full"></div>
                            </div>

                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-0.5">{member.name}</h3>
                            <p className="text-amber-500 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                                {member.title ? `${member.title} (${member.role})` : member.role}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 mb-4 truncate w-full px-1" title={member.email}>{member.email}</p>

                            <div className="w-full pt-4 mt-auto border-t border-[#EAE8E4] dark:border-white/10 flex flex-col gap-2">
                                <button
                                    onClick={() => handleOpenComposer(member, 'email')}
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 dark:bg-[#1F2937] hover:bg-gray-100 dark:hover:bg-[#374151] text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors border border-gray-200 dark:border-slate-850 cursor-pointer"
                                >
                                    <Mail size={14} /> Send Mail
                                </button>
                                <button
                                    onClick={() => handleOpenComposer(member, 'message')}
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold transition-colors border border-amber-500/20 cursor-pointer"
                                >
                                    <MessageSquare size={14} /> Send Message
                                </button>
                                <button
                                    onClick={() => handleBookMeeting(member)}
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-[#1A1A1A] dark:bg-amber-500 dark:text-[#0B0F19] hover:bg-black dark:hover:bg-amber-400 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                                >
                                    <CalendarIcon size={14} /> Book Meeting
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Booking Modal */}
            {isModalOpen && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="relative bg-white dark:bg-[#111827] rounded-3xl border border-[#EAE8E4] dark:border-[#1E293B] p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {bookingSuccess ? (
                            <div className="text-center py-8 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                                    <CalendarIcon size={24} />
                                </div>
                                <h3 className="text-md font-bold text-gray-900 dark:text-white">Meeting Scheduled!</h3>
                                <p className="text-2xs text-slate-450 dark:text-slate-500">A notification has been sent to {selectedMember.name}'s workspace.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 text-center">
                                    <h2 className="text-md font-black text-gray-900 dark:text-white">Schedule Meeting</h2>
                                    <p className="text-2xs text-slate-450 mt-1">Book time with {selectedMember.name}</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={meetingDate}
                                            onChange={(e) => {
                                                setMeetingDate(e.target.value);
                                                setSelectedSlots([]); // Reset selected slots
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                        />
                                    </div>
                                    
                                    {meetingDate && (
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    Meeting Time
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCustomTime(false)}
                                                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${!isCustomTime ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                                    >
                                                        Choose Slots
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCustomTime(true)}
                                                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${isCustomTime ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                                    >
                                                        Custom Time
                                                    </button>
                                                </div>
                                            </div>

                                            {!isCustomTime ? (
                                                <>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 flex justify-between items-center">
                                                        <span>Select Time Slots (15 min increments)</span>
                                                        {selectedSlots.length > 0 && (
                                                            <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                                                                {selectedSlots.length} slot(s) selected
                                                            </span>
                                                        )}
                                                    </label>
                                                    <div className="max-h-40 overflow-y-auto pr-1">
                                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                                            {standardTimeSlots.map(slot => {
                                                                const isSelected = selectedSlots.includes(slot);
                                                                return (
                                                                    <button
                                                                        key={slot}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (selectedSlots.includes(slot)) {
                                                                                setSelectedSlots(selectedSlots.filter(s => s !== slot));
                                                                            } else {
                                                                                setSelectedSlots([...selectedSlots, slot]);
                                                                            }
                                                                        }}
                                                                        className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                                                            isSelected
                                                                            ? "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10"
                                                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500"
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
                                                            value={customStartTime}
                                                            onChange={(e) => setCustomStartTime(e.target.value)}
                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">End Time</label>
                                                        <input
                                                            type="time"
                                                            value={customEndTime}
                                                            onChange={(e) => setCustomEndTime(e.target.value)}
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
                                            value={meetingTopic}
                                            onChange={(e) => setMeetingTopic(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 transition-all text-xs font-semibold resize-none"
                                            placeholder="What would you like to discuss?"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={selectedSlots.length === 0}
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

            {/* Gmail-Style Email Composer */}
            {isComposerOpen && composerRecipient && (
                <div className="fixed bottom-0 right-4 sm:right-12 z-50 w-full max-w-lg bg-white dark:bg-[#111827] rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border border-[#EAE8E4] dark:border-white/10 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                    {/* Header */}
                    <div className="bg-[#1A1A1A] dark:bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wide">
                            {composerMode === 'email' ? "New Email" : "New Portal Message"}
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleCloseComposer}
                                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Composer Body */}
                    {composerSuccess ? (
                        <div className="p-8 text-center space-y-3 bg-[#FDFBF7] dark:bg-[#111827] h-64 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
                                <Send size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                {composerMode === 'email' 
                                    ? (isSentViaEmailJS ? "Email Sent Successfully!" : "Message Logged!")
                                    : "Message Sent Successfully!"
                                }
                            </h3>
                            <p className="text-2xs text-slate-450 dark:text-slate-500 font-medium">
                                {composerMode === 'email' 
                                    ? (isSentViaEmailJS 
                                        ? "Your email has been delivered directly in the background." 
                                        : "Opening your email program to finalize and send...")
                                    : "Your portal message has been delivered to their workspace."
                                }
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSendEmail} className="flex flex-col h-[360px] bg-white dark:bg-[#111827]">
                            {/* To Field */}
                            <div className="flex items-center border-b border-gray-100 dark:border-white/5 px-4 py-2 text-xs font-medium">
                                <span className="text-gray-500 w-10">To:</span>
                                <span className="text-gray-900 dark:text-white truncate font-bold">
                                    {composerRecipient.name} &lt;{composerRecipient.email}&gt;
                                </span>
                            </div>

                            {/* Subject Field */}
                            <div className="flex items-center border-b border-gray-100 dark:border-white/5 px-4 py-2.5 text-xs font-medium">
                                <span className="text-gray-500 w-10">Subject:</span>
                                <input
                                    type="text"
                                    required
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="flex-1 bg-transparent text-gray-900 dark:text-white focus:outline-none placeholder-gray-400 font-semibold"
                                    placeholder="Enter subject line"
                                />
                            </div>

                             {/* Body Textarea */}
                            <div className="flex-1 p-4">
                                <textarea
                                    required
                                    rows={8}
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    className="w-full h-full bg-transparent text-gray-900 dark:text-white text-xs resize-none focus:outline-none placeholder-gray-400 leading-relaxed font-semibold"
                                    placeholder={composerMode === 'email'
                                        ? "Write your message here... \n\nClicking 'Send' will log this message in the portal and automatically send it."
                                        : "Write your message here... \n\nClicking 'Send' will deliver this message to their in-portal notification bell."
                                    }
                                ></textarea>
                            </div>

                            {/* Footer / Send controls */}
                            <div className="border-t border-gray-100 dark:border-white/5 px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                                >
                                    {isSending ? (
                                        <>Sending...</>
                                    ) : (
                                        <>
                                            <Send size={12} /> Send Message
                                        </>
                                    )}
                                </button>
                                
                                {composerMode === 'email' && (
                                    <a
                                        href={`mailto:${composerRecipient.email}`}
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
        </div>
    );
};

export default MeetTeam;

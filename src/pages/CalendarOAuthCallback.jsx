import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function CalendarOAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState('working'); // 'working' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const run = async () => {
            const code = searchParams.get('code');
            const oauthError = searchParams.get('error');

            if (oauthError) {
                setStatus('error');
                setErrorMessage(oauthError === 'access_denied' ? 'You declined calendar access.' : oauthError);
                return;
            }

            if (!code || !user?.email) {
                setStatus('error');
                setErrorMessage('Missing authorization code or user session.');
                return;
            }

            try {
                const redirectUri = `${window.location.origin}/oauth/calendar-callback`;
                const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'https://us-central1-anexar-9820c.cloudfunctions.net'
                    : 'https://us-central1-anexar-9820c.cloudfunctions.net';

                const res = await fetch(`${apiBase}/exchangeGoogleAuthCode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, email: user.email, redirectUri })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to connect calendar');
                }

                setStatus('success');
                setTimeout(() => navigate('/team/clients'), 1500);
            } catch (err) {
                setStatus('error');
                setErrorMessage(err.message || 'Something went wrong connecting your calendar.');
            }
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19] p-6">
            <div className="max-w-sm w-full text-center space-y-4 bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-150 dark:border-slate-850 shadow-lg">
                {status === 'working' && (
                    <>
                        <Loader2 className="mx-auto animate-spin text-amber-500" size={40} />
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white">Connecting your calendar…</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Please wait, this only takes a second.</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white">Calendar connected!</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Redirecting you back to the portal…</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <AlertCircle className="mx-auto text-rose-500" size={40} />
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white">Couldn't connect calendar</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{errorMessage}</p>
                        <button
                            onClick={() => navigate('/team')}
                            className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                            Back to Portal
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

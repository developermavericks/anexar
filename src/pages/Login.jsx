/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { ArrowLeft } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [searchParams] = useSearchParams();
    const urlRole = searchParams.get('role');

    // 'Team' corresponds to Anexar internally
    const [role, setRole] = useState('Team');

    // Sync tab with URL parameter changes (force 'Team' since Client-side is disabled)
    useEffect(() => {
        setRole('Team');
    }, [urlRole]);

    const { login, oauthLogin, loginWithGoogle, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Rule 1: Only @themavericksindia.com allowed for Team
        if (role === 'Team' && !email.toLowerCase().endsWith('@themavericksindia.com')) {
            setError("Access Restricted: Only @themavericksindia.com accounts are allowed to log in as Mavericks.");
            return;
        }

        // Rule 2: If client tries with @themavericksindia.com, redirect to Mavericks
        if (role === 'Client' && email.toLowerCase().endsWith('@themavericksindia.com')) {
            setError("Strategic Redirect: @themavericksindia.com accounts must log in as Mavericks. Switched view to Maverick Sign-In.");
            setRole('Team');
            return;
        }

        try {
            const loggedInUser = login(email, password);
            
            // Check for role mismatch
            if (role === 'Client' && (loggedInUser.role === 'Employee' || loggedInUser.role === 'Team')) {
                setError("This email is registered under Mavericks. Please click 'Sign In as Mavericks' and try again.");
                logout();
                return;
            }
            if (role === 'Team' && loggedInUser.role === 'Client') {
                setError("This email is registered under Client. Please click 'Sign In as Client' and try again.");
                logout();
                return;
            }

            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-brand-beige/30">
            {/* Floating Back Arrow Button */}
            <Link
                to="/"
                className="absolute top-6 left-6 z-50 flex items-center gap-2 text-xs font-bold text-brand-charcoal hover:text-brand-amber transition-all duration-300 bg-white/85 backdrop-blur-md border border-brand-border/25 px-4.5 py-3 rounded-full shadow-soft hover:-translate-x-1"
            >
                <ArrowLeft size={14} className="stroke-[3px]" />
                Back to Home
            </Link>

            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-amber/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-gray/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10"
            >
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block mb-3">
                        <div className="w-16 h-16 rounded-xl bg-white shadow-md flex items-center justify-center p-2 mx-auto border border-brand-border/20">
                            <img src="/anexar_collapsed.png" alt="Logo" className="w-full h-full object-contain rounded" />
                        </div>
                    </Link>
                    <Link to="/" className="block">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-charcoal to-brand-gray">
                            The <span className="text-brand-amber">Mavericks Platform</span>
                        </h1>
                    </Link>
                    <p className="text-brand-gray mt-2">
                        Sign In as Mavericks to continue
                    </p>
                </div>

                <Card className="shadow-lg border border-brand-border/30">
                    <CardContent className="pt-6">
                        {/* Custom Role Selector tabs (Client option commented out) */}
                        {/* 
                        <div className="mb-6">
                            <div className="flex p-1 bg-brand-border/10 rounded-2xl border border-brand-border/20">
                                <button
                                    type="button"
                                    onClick={() => setRole('Client')}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-350 cursor-pointer ${
                                        role === 'Client'
                                            ? 'bg-brand-charcoal text-white shadow-md'
                                            : 'text-brand-gray hover:text-brand-charcoal'
                                    }`}
                                >
                                    Sign In as Client
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('Team')}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-350 cursor-pointer ${
                                        role === 'Team'
                                            ? 'bg-brand-charcoal text-white shadow-md'
                                            : 'text-brand-gray hover:text-brand-charcoal'
                                    }`}
                                >
                                    Sign In as Mavericks
                                </button>
                            </div>
                        </div>
                        */}

                        {error && (
                            <div className="p-3.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 leading-relaxed mb-6">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col items-center justify-center py-6 space-y-5">
                            <p className="text-sm font-semibold text-brand-gray text-center max-w-xs leading-relaxed">
                                Access is restricted. Please sign in using your official **@themavericksindia.com** Google Workspace account:
                            </p>
                            
                            <div className="pt-2 flex justify-center scale-105">
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        try {
                                            const decoded = jwtDecode(credentialResponse.credential);
                                            console.log("User Info:", decoded);
                                            const userEmail = decoded.email || '';

                                            // Rule 1: Only @themavericksindia.com allowed for Team
                                            if (role === 'Team' && !userEmail.toLowerCase().endsWith('@themavericksindia.com')) {
                                                setError("Access Restricted: Only @themavericksindia.com accounts are allowed to log in as Mavericks.");
                                                return;
                                            }

                                            // Rule 2: If client tries with @themavericksindia.com, redirect to Mavericks
                                            if (role === 'Client' && userEmail.toLowerCase().endsWith('@themavericksindia.com')) {
                                                setRole('Team');
                                                setError("Strategic Redirect: @themavericksindia.com accounts must log in as Mavericks. Switched view to Maverick Sign-In.");
                                                const loggedInUser = await loginWithGoogle({ 
                                                    ...decoded, 
                                                    role: 'Team', 
                                                    idToken: credentialResponse.credential 
                                                });
                                                navigate('/dashboard');
                                                return;
                                            }

                                            const loggedInUser = await loginWithGoogle({ 
                                                ...decoded, 
                                                role, 
                                                idToken: credentialResponse.credential 
                                            });
                                            navigate('/dashboard');
                                        } catch (err) {
                                            setError(err.message || "Failed to log in with Google");
                                        }
                                    }}
                                    onError={() => {
                                        console.log("Google Login Failed");
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

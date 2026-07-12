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

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const [searchParams] = useSearchParams();
    const urlRole = searchParams.get('role');

    // 'Team' corresponds to Anexar internally
    const [role, setRole] = useState(urlRole === 'anexar' ? 'Team' : 'Client');

    // Sync tab with URL parameter changes
    useEffect(() => {
        if (urlRole === 'anexar') {
            setRole('Team');
        } else if (urlRole === 'client') {
            setRole('Client');
        }
    }, [urlRole]);

    const { register, oauthLogin, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Rule 1: Only @themavericksindia.com allowed for Team
        if (role === 'Team' && !email.toLowerCase().endsWith('@themavericksindia.com')) {
            setError("Access Restricted: Only @themavericksindia.com accounts are allowed to sign up as Mavericks.");
            return;
        }

        // Rule 2: If client tries with @themavericksindia.com, redirect to Mavericks
        if (role === 'Client' && email.toLowerCase().endsWith('@themavericksindia.com')) {
            setError("Strategic Redirect: @themavericksindia.com accounts must register as Mavericks. Switched view to Maverick Sign-Up.");
            setRole('Team');
            return;
        }

        try {
            const newUser = register(name, email, password, role);
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
                        Create your {role === 'Team' ? 'Mavericks' : 'Client'} account to get started
                    </p>
                </div>

                <Card className="shadow-lg border border-brand-border/30">
                    <CardContent className="pt-6">
                        {/* Custom Role Selector tabs */}
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
                                    Sign Up as Client
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
                                    Sign Up as Mavericks
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 leading-relaxed">
                                    {error}
                                </div>
                            )}

                            <Input
                                label="Full Name"
                                placeholder={role === 'Team' ? "Your Name (Mavericks Staff)" : "Company Name"}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                placeholder={role === 'Team' ? "strategist@mavericks.com" : "client@company.com"}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <Input
                                label="Confirm Password"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />

                            <div className="pt-4">
                                <Button type="submit" className="w-full cursor-pointer" size="lg">
                                    Sign Up as {role === 'Team' ? 'Mavericks' : 'Client'}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-brand-border/50"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-3 bg-white text-brand-gray font-semibold uppercase tracking-wider">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-5 flex justify-center">
                                <GoogleLogin
                                    onSuccess={async (credentialResponse) => {
                                        try {
                                            const decoded = jwtDecode(credentialResponse.credential);
                                            console.log("User Info:", decoded);
                                            const userEmail = decoded.email || '';

                                            // Rule 1: Only @themavericksindia.com allowed for Team
                                            if (role === 'Team' && !userEmail.toLowerCase().endsWith('@themavericksindia.com')) {
                                                setError("Access Restricted: Only @themavericksindia.com accounts are allowed to sign up as Mavericks.");
                                                return;
                                            }

                                            // Rule 2: If client tries with @themavericksindia.com, redirect to Mavericks
                                            if (role === 'Client' && userEmail.toLowerCase().endsWith('@themavericksindia.com')) {
                                                setRole('Team');
                                                setError("Strategic Redirect: @themavericksindia.com accounts must register as Mavericks. Switched view to Maverick Sign-Up.");
                                                const loggedInUser = await loginWithGoogle({ ...decoded, role: 'Team' });
                                                navigate('/dashboard');
                                                return;
                                            }

                                            const loggedInUser = await loginWithGoogle({ ...decoded, role });
                                            navigate('/dashboard');
                                        } catch (err) {
                                            setError(err.message || "Failed to sign up with Google");
                                        }
                                    }}
                                    onError={() => {
                                        console.log("Google Login Failed");
                                    }}
                                />
                            </div>
                        </div>

                        <div className="mt-8 text-center text-xs text-brand-gray font-medium">
                            Already have an account?{' '}
                            <Link
                                to={role === 'Team' ? "/login?role=anexar" : "/login?role=client"}
                                className="text-brand-amber font-bold hover:underline"
                            >
                                Sign In as {role === 'Team' ? 'Mavericks' : 'Client'}
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

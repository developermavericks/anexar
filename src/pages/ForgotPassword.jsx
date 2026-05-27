import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1); // 1: Email verification, 2: New Password input
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { resetPassword } = useAuth();
    const navigate = useNavigate();

    // Mock generated verification code
    const mockCode = "998822";

    const handleSendCode = (e) => {
        e.preventDefault();
        setError('');
        
        try {
            // Check if the account actually exists in localStorage
            const storedUsers = JSON.parse(localStorage.getItem('anexar_users_db') || '[]');
            const userExists = storedUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());

            if (!userExists) {
                setError(`No registered account found for ${email}. Please sign up.`);
                return;
            }

            // Successfully matched account, transition to verification code step
            setStep(2);
        } catch (err) {
            setError("Something went wrong. Please try again.");
        }
    };

    const handleVerifyAndReset = (e) => {
        e.preventDefault();
        setError('');

        if (code !== mockCode) {
            setError(`Invalid verification code. (Hint: Please use mock code: ${mockCode})`);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        try {
            resetPassword(email, newPassword);
            setSuccessMessage("Password reset successfully! Redirecting you to login...");
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-brand-beige/30">
            {/* Floating Back Arrow Button */}
            <Link
                to="/login"
                className="absolute top-6 left-6 z-50 flex items-center gap-2 text-xs font-bold text-brand-charcoal hover:text-brand-amber transition-all duration-300 bg-white/85 backdrop-blur-md border border-brand-border/25 px-4.5 py-3 rounded-full shadow-soft hover:-translate-x-1"
            >
                <ArrowLeft size={14} className="stroke-[3px]" />
                Back to Login
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
                    </Link>
                    <Link to="/" className="block">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-charcoal to-brand-gray">
                            The <span className="text-brand-amber">Mavericks Platform</span>
                        </h1>
                    </Link>
                    <p className="text-brand-gray mt-2">
                        Recover your account credentials securely
                    </p>
                </div>

                <Card className="shadow-lg border border-brand-border/30">
                    <CardContent className="pt-6">
                        
                        <div className="mb-6 flex items-center gap-2 pb-4 border-b border-brand-border/15">
                            <div className="p-2 bg-brand-amber/10 rounded-lg text-brand-amber">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-brand-charcoal">Password Recovery</h3>
                                <p className="text-[10px] text-brand-gray font-semibold uppercase tracking-wider mt-0.5">Secure Credentials Portal</p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3.5 mb-4 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 leading-relaxed">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3.5 mb-4 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-xl border border-emerald-100 leading-relaxed flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-500 animate-bounce" />
                                {successMessage}
                            </div>
                        )}

                        {step === 1 ? (
                            <form onSubmit={handleSendCode} className="space-y-4">
                                <p className="text-xs text-brand-gray font-semibold leading-relaxed">
                                    Enter your registered email address below. We will simulate sending a secure verification code to verify your identity.
                                </p>

                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="Enter your registered email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />

                                <div className="pt-2">
                                    <Button type="submit" className="w-full cursor-pointer" size="lg">
                                        Send Verification Code
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyAndReset} className="space-y-4">
                                <div className="bg-brand-amber/5 border border-brand-amber/20 rounded-xl p-4 space-y-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-amber flex items-center gap-1">
                                        <Sparkles size={10} />
                                        Simulated Mail Broadcast
                                    </span>
                                    <p className="text-xs text-brand-charcoal font-semibold leading-relaxed">
                                        A secure reset verification code has been dispatched.
                                    </p>
                                    <p className="text-xs font-extrabold text-brand-charcoal">
                                        Please enter the code: <span className="text-brand-amber bg-white border border-brand-border/20 px-2 py-0.5 rounded font-mono text-sm shadow-inner">{mockCode}</span>
                                    </p>
                                </div>

                                <Input
                                    label="Verification Code"
                                    type="text"
                                    placeholder="Enter code (998822)"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                />

                                <Input
                                    label="New Password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />

                                <Input
                                    label="Confirm New Password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />

                                <div className="pt-2">
                                    <Button type="submit" className="w-full cursor-pointer" size="lg">
                                        Verify & Reset Password
                                    </Button>
                                </div>
                            </form>
                        )}

                        <div className="mt-6 text-center text-xs text-brand-gray font-semibold border-t border-brand-border/10 pt-4">
                            Back to{' '}
                            <Link to="/login" className="text-brand-amber font-bold hover:underline">
                                Sign In
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

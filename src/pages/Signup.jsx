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

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const [searchParams] = useSearchParams();
    const urlRole = searchParams.get('role');

    // 'Employee' corresponds to Mavericks internally
    const [role, setRole] = useState(urlRole === 'mavericks' ? 'Employee' : 'Client');

    // Sync tab with URL parameter changes
    useEffect(() => {
        if (urlRole === 'mavericks') {
            setRole('Employee');
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

        try {
            const newUser = register(name, email, password, role);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-brand-beige/30">
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
                        Create your {role === 'Employee' ? 'Mavericks' : 'Client'} account to get started
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
                                    onClick={() => setRole('Employee')}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-350 cursor-pointer ${
                                        role === 'Employee'
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
                                placeholder={role === 'Employee' ? "Your Name (Staff / Core)" : "Company Name"}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                placeholder={role === 'Employee' ? "employee@themavericks.com" : "client@company.com"}
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
                                    Sign Up as {role === 'Employee' ? 'Mavericks' : 'Client'}
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
                                    onSuccess={(credentialResponse) => {
                                        const decoded = jwtDecode(credentialResponse.credential);
                                        console.log("User Info:", decoded);
                                        const loggedInUser = loginWithGoogle({ ...decoded, role });
                                        navigate('/dashboard');
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
                                to={role === 'Employee' ? "/login?role=mavericks" : "/login?role=client"}
                                className="text-brand-amber font-bold hover:underline"
                            >
                                Sign In as {role === 'Employee' ? 'Mavericks' : 'Client'}
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

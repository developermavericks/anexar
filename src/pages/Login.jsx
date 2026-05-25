/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const { login, oauthLogin, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        try {
            const loggedInUser = login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleSignIn = () => {
        const loggedInUser = oauthLogin('google');
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
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
                                {/* Three red dots */}
                                <circle cx="35" cy="25" r="5" fill="#E62222" />
                                <circle cx="50" cy="25" r="5" fill="#E62222" />
                                <circle cx="65" cy="25" r="5" fill="#E62222" />

                                {/* Black curvy M shape */}
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
                            The <span className="text-brand-amber">Mavericks Dashboard</span>
                        </h1>
                    </Link>
                    <p className="text-brand-gray mt-2">Welcome back. Please sign in to continue.</p>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}

                            <Input
                                label="Email"
                                type="email"
                                placeholder="john@example.com"
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

                            <div className="flex items-center justify-between py-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-brand-border text-brand-amber focus:ring-brand-amber form-checkbox" />
                                    <span className="text-sm text-brand-gray">Remember me</span>
                                </label>
                                <a href="#" className="text-sm text-brand-amber font-medium hover:underline">
                                    Forgot password?
                                </a>
                            </div>

                            <Button type="submit" className="w-full" size="lg">
                                Sign In
                            </Button>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-brand-border/50"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-brand-gray">OR</span>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-center">
                                <GoogleLogin
                                    onSuccess={(credentialResponse) => {
                                        const decoded = jwtDecode(credentialResponse.credential);
                                        console.log("User Info:", decoded);
                                        const loggedInUser = loginWithGoogle(decoded);
                                        navigate('/dashboard');
                                    }}
                                    onError={() => {
                                        console.log("Google Login Failed");
                                    }}
                                />
                            </div>

                            <div className="mt-8 text-center text-sm text-brand-gray">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-brand-amber font-medium hover:underline">
                                    Sign Up
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

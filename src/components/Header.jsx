import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { ChevronDown } from 'lucide-react';

export default function Header() {
    const [showSignIn, setShowSignIn] = useState(false);
    const [showSignUp, setShowSignUp] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-brand-beige/80 backdrop-blur-md border-b border-brand-border/30">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex-1 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white shrink-0 shadow-sm flex items-center justify-center p-1">
                        <img src="/anexar_collapsed.png" alt="Logo" className="w-full h-full object-contain rounded" />
                    </div>
                    <Link to="/" className="font-bold text-xl tracking-tight text-brand-charcoal">
                        The Anexar Dashboard
                    </Link>
                </div>

                {/* Center: Navigation - Centered & Highlighted */}
                <nav className="hidden md:flex flex-1 items-center justify-center gap-6">
                    <a href="#platform" className="px-5 py-2 rounded-full font-semibold text-brand-charcoal bg-brand-amber/10 hover:bg-brand-amber hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-amber/30 transition-all duration-300 ease-out">
                        Platform
                    </a>
                    <a href="#solutions" className="px-5 py-2 rounded-full font-semibold text-brand-charcoal bg-brand-amber/10 hover:bg-brand-amber hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-amber/30 transition-all duration-300 ease-out">
                        Solutions
                    </a>
                    <a href="#company" className="px-5 py-2 rounded-full font-semibold text-brand-charcoal bg-brand-amber/10 hover:bg-brand-amber hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-amber/30 transition-all duration-300 ease-out">
                        Company
                    </a>
                </nav>

                {/* Right: Auth Actions */}
                <div className="flex-1 flex items-center justify-end gap-6 relative">
                    {/* Sign In Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowSignIn(true)}
                        onMouseLeave={() => setShowSignIn(false)}
                    >
                        <button className="flex items-center gap-1 text-sm font-semibold text-brand-charcoal hover:text-brand-amber transition-colors py-2 cursor-pointer">
                            Sign In
                            <ChevronDown size={14} className={`transform transition-transform duration-200 ${showSignIn ? 'rotate-180 text-brand-amber' : ''}`} />
                        </button>
                        {showSignIn && (
                            <div className="absolute right-0 mt-0.5 w-48 bg-white/95 backdrop-blur-md border border-brand-border/30 rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-1">
                                <Link to="/login?role=client" className="px-3.5 py-2 text-xs font-semibold text-brand-charcoal hover:bg-brand-beige/50 hover:text-brand-amber rounded-lg transition-colors">
                                    Sign In as Client
                                </Link>
                                <Link to="/login?role=anexar" className="px-3.5 py-2 text-xs font-semibold text-brand-charcoal hover:bg-brand-beige/50 hover:text-brand-amber rounded-lg transition-colors">
                                    Sign In as Mavericks
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Sign Up Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowSignUp(true)}
                        onMouseLeave={() => setShowSignUp(false)}
                    >
                        <button className="flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-charcoal hover:bg-brand-amber px-5 py-2.5 rounded-full shadow-soft transition-all duration-300 cursor-pointer">
                            Sign Up
                            <ChevronDown size={14} className={`transform transition-transform duration-200 ${showSignUp ? 'rotate-180' : ''}`} />
                        </button>
                        {showSignUp && (
                            <div className="absolute right-0 mt-0.5 w-48 bg-white/95 backdrop-blur-md border border-brand-border/30 rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-1">
                                <Link to="/signup?role=client" className="px-3.5 py-2 text-xs font-semibold text-brand-charcoal hover:bg-brand-beige/50 hover:text-brand-amber rounded-lg transition-colors">
                                    Sign Up as Client
                                </Link>
                                <Link to="/signup?role=anexar" className="px-3.5 py-2 text-xs font-semibold text-brand-charcoal hover:bg-brand-beige/50 hover:text-brand-amber rounded-lg transition-colors">
                                    Sign Up as Mavericks
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </header>
    );
}

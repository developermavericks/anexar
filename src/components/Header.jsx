import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-brand-beige/80 backdrop-blur-md border-b border-brand-border/30">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex-1 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white shrink-0 shadow-sm flex items-center justify-center p-1">
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
                    <Link to="/" className="font-bold text-xl tracking-tight text-brand-charcoal">
                        The Mavericks Dashboard
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
                <div className="flex-1 flex items-center justify-end gap-4">
                    <Link to="/login" className="text-sm font-medium text-brand-charcoal hover:text-brand-amber transition-colors">
                        Sign In
                    </Link>
                    <Link to="/signup">
                        <Button variant="primary" size="sm">
                            Sign Up
                        </Button>
                    </Link>
                </div>

            </div>
        </header>
    );
}

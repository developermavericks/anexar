/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import Header from '../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
    BarChart3,
    Target,
    Users,
    TrendingUp,
    Megaphone,
    Clock
} from 'lucide-react';

export default function Landing() {
    return (
        <div className="min-h-screen">
            <Header />

            <main className="pt-20">
                {/* HERO SECTION */}
                <section className="relative overflow-hidden px-6 py-24 md:py-32 lg:py-40 flex flex-col items-center justify-center text-center mt-[-80px] pt-[calc(80px+6rem)] min-h-[90vh]">
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop")' }}
                    />
                    {/* Light Overlay for readability */}
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />

                    {/* Abstract Blurred Background */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-amber/20 rounded-full blur-[120px] pointer-events-none z-0" />

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="relative z-10 max-w-4xl mx-auto"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-brand-charcoal mb-6">
                            The <span className="text-brand-amber">Mavericks</span> Dashboard
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-800 font-medium mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
                            The Mavericks Dashboard is a centralized operational command center that integrates real-time media intelligence, campaign management, performance tracking, and collaborative execution workflows.
                        </p>

                        <div className="bg-white/50 backdrop-blur-sm border border-brand-border/50 radius-pill p-6 max-w-2xl mx-auto mb-10 shadow-soft">
                            <p className="text-lg font-medium italic text-brand-charcoal">
                                "Where the Mavericks Core Team transforms intelligence into measurable market dominance."
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <Link to="/login">
                                <Button size="lg" className="h-14 px-12 text-lg shadow-lg shadow-brand-amber/20 hover:shadow-brand-amber/30 transition-all duration-300">
                                    Join Platform
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </section>

                {/* ABOUT PLATFORM SECTION */}
                <section id="platform" className="relative px-6 py-24 bg-white">
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
                        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2070&auto=format&fit=crop")' }}
                    />

                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl font-bold text-brand-charcoal mb-6">
                            Strategic Intelligence. Structured Execution.
                        </h2>
                        <p className="text-lg text-gray-800 font-medium leading-relaxed mb-6">
                            The Mavericks Dashboard is a centralized operational command center that integrates real-time media intelligence, campaign management, performance tracking, and collaborative execution workflows.
                        </p>
                        <p className="text-lg text-gray-800 font-medium leading-relaxed">
                            Built for precision and transparency, it enables seamless coordination between clients and our internal core team — ensuring every initiative is measurable and strategically aligned.
                        </p>
                    </div>
                </section>

                {/* SOLUTIONS SECTION */}
                <section id="solutions" className="relative px-6 py-24 bg-brand-beige">
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-fixed bg-no-repeat opacity-10"
                        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop")' }}
                    />

                    <div className="relative z-10 max-w-7xl mx-auto">
                        <h2 className="text-4xl font-bold text-brand-charcoal mb-12 text-center">
                            Our Solutions
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Card 1 */}
                            <Card className="bg-gradient-to-b from-white to-white/80 border-none transition-transform hover:-translate-y-2 duration-300 shadow-soft">
                                <CardHeader>
                                    <div className="w-12 h-12 radius-small bg-brand-amber/10 flex items-center justify-center mb-4 text-brand-amber">
                                        <BarChart3 strokeWidth={1.5} size={24} />
                                    </div>
                                    <CardTitle>Media & Market Intelligence</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 text-brand-gray">
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />News Analysis Engine</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Sector & Competitor Tracking</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Journalist Mapping</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Influencer Identification</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Crisis Prediction System</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Card 2 */}
                            <Card className="bg-gradient-to-b from-white to-white/80 border-none transition-transform hover:-translate-y-2 duration-300 shadow-soft">
                                <CardHeader>
                                    <div className="w-12 h-12 radius-small bg-brand-amber/10 flex items-center justify-center mb-4 text-brand-amber">
                                        <Target strokeWidth={1.5} size={24} />
                                    </div>
                                    <CardTitle>Campaign Strategy & Planning</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 text-brand-gray">
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Thought Leadership Planner</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Client Goal Mapping</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Target Audience Planning</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Cost Estimation Tools</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Press Release Impact Tracking</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Card 3 */}
                            <Card className="bg-gradient-to-b from-white to-white/80 border-none transition-transform hover:-translate-y-2 duration-300 shadow-soft">
                                <CardHeader>
                                    <div className="w-12 h-12 radius-small bg-brand-amber/10 flex items-center justify-center mb-4 text-brand-amber">
                                        <Users strokeWidth={1.5} size={24} />
                                    </div>
                                    <CardTitle>Client & Operations Management</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 text-brand-gray">
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Client Request Tracker</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Budget Tracking</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Time Allocation Monitoring</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Core Team Collaboration</li>
                                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-amber" />Automated Event & Award Alerts</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* COMPANY SECTION */}
                <section id="company" className="relative px-6 py-24 text-white text-center">
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop")' }}
                    />
                    {/* Dark Overlay for readability against white text */}
                    <div className="absolute inset-0 bg-brand-charcoal/80 backdrop-blur-[2px]" />

                    <div className="relative z-10 max-w-4xl mx-auto">
                        <h2 className="text-4xl font-bold mb-6">About The Mavericks Communication LLP</h2>
                        <p className="text-lg text-brand-border/80 leading-relaxed mb-6">
                            The Mavericks Communication LLP is a strategic communications and intelligence-driven firm committed to delivering structured growth and measurable visibility for brands and organizations.
                        </p>
                        <p className="text-lg text-brand-border/80 leading-relaxed">
                            Our core team combines analytical precision, media expertise, and strategic execution to ensure every client achieves sustainable market leadership.
                        </p>
                    </div>
                </section>

            </main>
        </div>
    );
}

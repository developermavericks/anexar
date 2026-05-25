import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    TrendingUp,
    Target,
    Users,
    Calendar,
    CheckCircle2,
    Clock,
    ArrowRight
} from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();

    const isClient = user?.role === 'Client';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 h-full auto-rows-min">

            {/* KPI Cards Row (Span full width) */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-brand-gray mb-1">
                                {isClient ? 'Active Campaigns' : 'Projects Assigned'}
                            </p>
                            <h4 className="text-3xl font-bold text-brand-charcoal">
                                {isClient ? '12' : '24'}
                            </h4>
                        </div>
                        <div className="w-12 h-12 radius-small bg-brand-amber/10 flex items-center justify-center text-brand-amber">
                            <Target size={24} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-brand-gray mb-1">Media Reach</p>
                            <h4 className="text-3xl font-bold text-brand-charcoal">2.4M</h4>
                        </div>
                        <div className="w-12 h-12 radius-small bg-brand-amber/10 flex items-center justify-center text-brand-amber">
                            <TrendingUp size={24} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-brand-gray mb-1">
                                {isClient ? 'Press Mentions' : 'Client Requests'}
                            </p>
                            <h4 className="text-3xl font-bold text-brand-charcoal">
                                {isClient ? '145' : '8'}
                            </h4>
                        </div>
                        <div className="w-12 h-12 radius-small bg-brand-amber/10 flex items-center justify-center text-brand-amber">
                            <Users size={24} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-brand-charcoal text-white border-none">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-brand-beige/80 mb-1">
                                {isClient ? 'Next Strategic Review' : 'Upcoming Deadline'}
                            </p>
                            <h4 className="text-lg font-bold">Oct 24, 2024</h4>
                        </div>
                        <div className="w-12 h-12 radius-small bg-white/10 flex items-center justify-center text-brand-amber">
                            <Calendar size={24} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area: Activity & Tasks */}
            <div className="col-span-1 md:col-span-2 space-y-6">

                {/* Progress / Chart Widget Placeholder */}
                <Card className="min-h-[300px] flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>{isClient ? 'Campaign Performance overview' : 'Weekly Time Tracking'}</CardTitle>
                        <Button variant="outline" size="sm">View Detailed Report</Button>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center relative">
                        <div className="absolute inset-x-6 inset-y-6 border-b border-l border-brand-border/40 flex items-end">
                            {/* Mock Bar Chart */}
                            <div className="w-full h-full flex items-end justify-between px-4 pb-0 pt-8 gap-2">
                                {[40, 70, 45, 90, 65, 80, 55].map((height, i) => (
                                    <div key={i} className="w-full bg-brand-amber/20 rounded-t-lg relative group transition-all hover:bg-brand-amber/40" style={{ height: `${height}%` }}>
                                        <div className="absolute top-0 left-0 w-full bg-brand-amber/60 rounded-t-lg transition-all duration-500 hover:bg-brand-amber" style={{ height: '4px' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Task List / Onboarding */}
                <Card className="bg-brand-charcoal text-white border-none overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-white">
                            {isClient ? 'Onboarding Tasks' : 'Current Priority Tasks'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Task Item */}
                        <div className="flex items-center justify-between p-4 radius-small bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <CheckCircle2 className="text-brand-amber" size={20} />
                                <div>
                                    <p className="font-medium">{isClient ? 'Complete Brand Identity Form' : 'Review Q3 strategy brief for Acme Corp'}</p>
                                    <p className="text-xs text-brand-beige/60 mt-1">Due Today • 2 hours ago</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-white hover:text-brand-amber hover:bg-white/5">
                                <ArrowRight size={16} />
                            </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 radius-small bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-5 h-5 rounded-full border-2 border-brand-border/30 flex items-center justify-center"></div>
                                <div>
                                    <p className="font-medium text-white/70">{isClient ? 'Approve Q4 Media Plan' : 'Draft Press Release for TechLaunch'}</p>
                                    <p className="text-xs text-brand-beige/60 mt-1">Due Tomorrow</p>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* Right Sidebar Widget */}
            <div className="col-span-1 space-y-6">

                {/* Profile Card */}
                <Card className="text-center">
                    <CardContent className="pt-8 pb-8 flex flex-col items-center">
                        <div className="w-24 h-24 radius-small bg-brand-amber/20 text-brand-amber flex items-center justify-center font-bold text-4xl mb-4 relative">
                            {user?.name.charAt(0)}
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white translate-x-1/4 translate-y-1/4" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-charcoal">{user?.name}</h3>
                        <p className="text-sm font-medium text-brand-gray mb-6">{user?.role} Account</p>

                        <div className="w-full flex gap-2">
                            <Button variant="outline" className="flex-1">Edit Profile</Button>
                            <Button variant="outline" className="flex-1">Settings</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Time Tracker / Secondary Widget */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-brand-border/50 before:to-transparent pt-2">

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 radius-small border border-brand-border/50 bg-white text-brand-amber shadow-soft shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                    <Clock size={16} />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-4 md:group-even:pl-4">
                                    <div className="text-sm font-bold text-brand-charcoal mb-1">Media List Updated</div>
                                    <div className="text-xs text-brand-gray">15 mins ago</div>
                                </div>
                            </div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 radius-small border border-brand-border/50 bg-white text-brand-gray shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                    <Users size={16} />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-4 md:group-even:pl-4">
                                    <div className="text-sm font-bold text-brand-charcoal mb-1">New Client Request</div>
                                    <div className="text-xs text-brand-gray">2 hours ago</div>
                                </div>
                            </div>

                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

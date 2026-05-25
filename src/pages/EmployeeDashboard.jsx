import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import {
    Briefcase,
    CheckSquare,
    Clock,
    Users,
    LogOut,
    Construction,
    TrendingUp,
    Calendar,
    Bell
} from 'lucide-react';

export default function EmployeeDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Simulated tasks for the employee
    const tasks = [
        { id: 1, title: 'Verify Google OAuth Redirection', status: 'In Progress', priority: 'High', due: 'Today' },
        { id: 2, title: 'Build Client Portal Sync Engine', status: 'Completed', priority: 'Medium', due: 'Yesterday' },
        { id: 3, title: 'Setup Vercel Deployment Scripts', status: 'Pending', priority: 'High', due: 'Tomorrow' },
        { id: 4, title: 'Design Employee Workspace Shell', status: 'In Progress', priority: 'Low', due: 'In 3 days' }
    ];

    return (
        <div className="min-h-screen bg-brand-beige/50 relative overflow-hidden pb-12">
            {/* Background glowing bubbles */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-amber/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-gray/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-brand-border/30 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center p-2 border border-brand-border/20">
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
                        <div>
                            <span className="font-bold text-lg text-brand-charcoal block leading-none">The Mavericks</span>
                            <span className="text-xs text-brand-amber font-semibold tracking-wider uppercase">Employee Portal</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-brand-gray hover:text-brand-charcoal transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-amber" />
                        </button>
                        <div className="h-8 w-[1px] bg-brand-border/50" />
                        <div className="flex items-center gap-2">
                            {user?.picture ? (
                                <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full border border-brand-border/50" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-brand-charcoal text-white text-xs flex items-center justify-center font-bold">
                                    {user?.name?.charAt(0) || 'E'}
                                </div>
                            )}
                            <span className="text-sm font-medium text-brand-charcoal hidden sm:inline">{user?.name || 'Employee'}</span>
                        </div>
                        <Button variant="pill" size="sm" onClick={handleLogout} className="flex items-center gap-1.5 text-brand-charcoal border-brand-charcoal/20">
                            <LogOut size={16} />
                            <span className="hidden md:inline">Sign Out</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-8">
                {/* Integration Notice Alert */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 bg-brand-amber/10 border border-brand-amber/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm"
                >
                    <div className="p-3 bg-brand-amber/20 rounded-xl text-brand-amber shrink-0">
                        <Construction size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-charcoal text-base">Development Workspace & Integration Sandbox</h4>
                        <p className="text-sm text-brand-gray mt-0.5">
                            The full Employee Portal features are currently under development by another team member. For now, this Sandbox provides a preview workspace. Once the portal is complete, Client, Employee, and Admin will be unified.
                        </p>
                    </div>
                </motion.div>

                {/* Welcome Hero Banner */}
                <div className="bg-gradient-to-r from-brand-charcoal to-brand-gray text-white rounded-3xl p-6 md:p-10 mb-8 relative overflow-hidden shadow-lg">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
                        <Briefcase size={200} />
                    </div>
                    <div className="relative z-10 max-w-xl">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-brand-amber">
                            Signed in as Employee
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold mt-4 leading-tight">
                            Welcome back, <span className="text-brand-amber">{user?.name || 'Maverick'}</span>!
                        </h2>
                        <p className="text-white/80 mt-2 text-sm md:text-base">
                            Track your campaign tasks, monitor time allocations, and prepare your workspaces for full integration.
                        </p>
                    </div>
                </div>

                {/* Dashboard Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { title: 'My Tasks', value: '4 Active', icon: CheckSquare, desc: '2 high priority due soon', color: 'text-brand-amber bg-brand-amber/10' },
                        { title: 'Logged Hours', value: '38.5 hrs', icon: Clock, desc: 'This week allocation', color: 'text-blue-600 bg-blue-50' },
                        { title: 'Clients Managed', value: '8 Active', icon: Users, desc: 'Strategic partners', color: 'text-green-600 bg-green-50' },
                        { title: 'Performance Index', value: '98.2%', icon: TrendingUp, desc: 'Exceeding standards', color: 'text-indigo-600 bg-indigo-50' }
                    ].map((stat, idx) => (
                        <Card key={idx} className="border-none shadow-soft">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-brand-gray font-medium">{stat.title}</p>
                                        <h3 className="text-2xl font-bold text-brand-charcoal mt-1">{stat.value}</h3>
                                        <p className="text-xs text-brand-gray/80 mt-1">{stat.desc}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl shrink-0 ${stat.color}`}>
                                        <stat.icon size={20} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Workspace Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left & Middle Column: Interactive Tasks */}
                    <div className="lg:col-span-2">
                        <Card className="border-none shadow-soft h-full">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <CheckSquare className="text-brand-amber" size={20} />
                                        <h3 className="font-bold text-lg text-brand-charcoal">My Integration Checklist</h3>
                                    </div>
                                    <span className="text-xs text-brand-amber font-semibold">4 Tasks Registered</span>
                                </div>

                                <div className="space-y-4">
                                    {tasks.map((task) => (
                                        <div key={task.id} className="p-4 rounded-xl border border-brand-border/30 bg-white hover:border-brand-amber/30 transition-all flex items-center justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <input type="checkbox" defaultChecked={task.status === 'Completed'} className="w-4 h-4 rounded mt-1 border-brand-border text-brand-amber focus:ring-brand-amber" />
                                                <div>
                                                    <span className={`text-sm font-semibold text-brand-charcoal block ${task.status === 'Completed' ? 'line-through text-brand-gray' : ''}`}>
                                                        {task.title}
                                                    </span>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                                                            task.priority === 'High' ? 'bg-red-50 text-red-600' :
                                                            task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {task.priority} Priority
                                                        </span>
                                                        <span className="text-2xs text-brand-gray flex items-center gap-1">
                                                            <Calendar size={12} /> Due {task.due}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-2xs font-semibold px-2 py-1 rounded-lg ${
                                                task.status === 'Completed' ? 'bg-green-50 text-green-600' :
                                                task.status === 'In Progress' ? 'bg-brand-amber/10 text-brand-amber' :
                                                'bg-brand-border/30 text-brand-gray'
                                            }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Platform Integration Notes */}
                    <div className="lg:col-span-1">
                        <Card className="border-none shadow-soft bg-brand-charcoal text-white h-full relative overflow-hidden">
                            <CardContent className="p-6 flex flex-col justify-between h-full">
                                <div>
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 text-brand-amber">
                                        <Construction size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Unification Strategy</h3>
                                    <p className="text-sm text-white/70 leading-relaxed mb-4">
                                        Once your colleague completes the main Employee Portal repository, we will seamlessly merge it:
                                    </p>
                                    <ul className="space-y-3 text-sm text-white/80">
                                        <li className="flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber mt-1.5 shrink-0" />
                                            <span><strong>Role Router:</strong> Unified landing page automatically forwarding users matching `Employee` or `Client` roles.</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber mt-1.5 shrink-0" />
                                            <span><strong>Shared Storage:</strong> Shared auth state using browser local storage to guarantee frictionless session switching.</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber mt-1.5 shrink-0" />
                                            <span><strong>Single Domain Vercel Deploy:</strong> One target deployment resolving to unified client/employee/admin paths.</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                    <span className="text-2xs text-brand-amber font-semibold tracking-wide uppercase block">Mavericks Operations LLP</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

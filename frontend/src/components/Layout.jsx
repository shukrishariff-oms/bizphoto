import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomeIcon, CalendarIcon, VideoCameraIcon, ArrowLeftOnRectangleIcon, BanknotesIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: HomeIcon },
        { name: 'Events', path: '/events', icon: CalendarIcon },
        { name: 'Cameras', path: '/cameras', icon: VideoCameraIcon },
        { name: 'Finance', path: '/finance', icon: BanknotesIcon },
        { name: 'Clients', path: '/clients', icon: UserGroupIcon },
        { name: 'Invoices', path: '/invoices', icon: DocumentTextIcon },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-transparent">
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'rgba(35, 61, 76, 0.9)',
                        color: '#fff',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(253, 128, 46, 0.2)',
                    },
                }}
            />

            {/* Glass Sidebar */}
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-72 flex flex-col m-4 rounded-2xl bg-charcoal/40 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
                <div className="h-24 flex items-center px-8 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pumpkin to-red-500 flex items-center justify-center shadow-lg shadow-pumpkin/20">
                            <span className="text-white font-bold text-xl">B</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">BizPhoto</h1>
                            <p className="text-xs text-slate-400">Pro Management</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={cn(
                                    "relative flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 group overflow-hidden",
                                    isActive
                                        ? "text-white shadow-lg shadow-pumpkin/10"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-pumpkin/20 to-red-500/20 border border-white/5 rounded-xl"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon className={cn("relative z-10 mr-3 h-5 w-5 transition-colors", isActive ? "text-pumpkin" : "text-slate-500 group-hover:text-pumpkin")} />
                                <span className="relative z-10">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors group"
                    >
                        <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-slate-500 group-hover:text-red-400 transition-colors" />
                        Sign Out
                    </button>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-4 pl-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="h-full rounded-2xl bg-charcoal/30 backdrop-blur-md border border-white/5 overflow-y-auto overflow-x-hidden relative shadow-2xl"
                >
                    {/* Gradient Orb for atmosphere */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-pumpkin/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-oceanBlue/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative max-w-7xl mx-auto px-8 py-10">
                        <Outlet />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Layout;

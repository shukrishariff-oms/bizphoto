import { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading('Authenticating...');
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/auth/token', formData);
            localStorage.setItem('token', response.data.access_token);

            toast.dismiss(loadingToast);
            toast.success('Welcome back.');
            navigate('/');
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error('Access Denied: Invalid credentials');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden bg-slate-950">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pumpkin/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-oceanBlue/10 blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-8 bg-charcoal/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl"
            >
                <div className="text-center mb-10">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-pumpkin to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pumpkin/30 mb-6">
                        <span className="text-3xl font-bold text-white">B</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">BizPhoto</h3>
                    <p className="text-slate-400 mt-2">Professional Business Management</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-pumpkin uppercase tracking-wider pl-1">Username</label>
                        <input
                            type="text"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pumpkin/50 focus:border-pumpkin/50 transition-all font-medium"
                            placeholder="Enter your Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-pumpkin uppercase tracking-wider pl-1">Password</label>
                        <input
                            type="password"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pumpkin/50 focus:border-pumpkin/50 transition-all font-medium"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button className="w-full mt-2 bg-gradient-to-r from-pumpkin to-red-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-pumpkin/25 active:scale-[0.98] transition-all duration-200">
                        Sign In to Dashboard
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-sm text-slate-400">
                            New here? <Link to="/register" className="text-pumpkin font-bold hover:text-white transition-colors">Create your workspace</Link>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;

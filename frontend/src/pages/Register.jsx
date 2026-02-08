import { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        const loadingToast = toast.loading('Creating account...');
        try {
            await api.post('/auth/register', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: 'photographer' // Default role
            });

            toast.dismiss(loadingToast);
            toast.success('Account created! Please login.');
            navigate('/login');
        } catch (err) {
            toast.dismiss(loadingToast);
            const msg = err.response?.data?.detail || 'Registration failed';
            toast.error(msg);
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
                <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold text-white tracking-tight">Join BizPhoto 🚀</h3>
                    <p className="text-slate-400 mt-2">Start managing your photography business</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-pumpkin uppercase tracking-wider pl-1">Username</label>
                        <input
                            type="text"
                            name="username"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pumpkin/50 focus:border-pumpkin/50 transition-all font-medium"
                            placeholder="johndoe"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-pumpkin uppercase tracking-wider pl-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pumpkin/50 focus:border-pumpkin/50 transition-all font-medium"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-pumpkin uppercase tracking-wider pl-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pumpkin/50 focus:border-pumpkin/50 transition-all font-medium"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-pumpkin uppercase tracking-wider pl-1">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pumpkin/50 focus:border-pumpkin/50 transition-all font-medium"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button className="w-full mt-4 bg-gradient-to-r from-pumpkin to-red-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-pumpkin/25 active:scale-[0.98] transition-all duration-200">
                        Create Account
                    </button>

                    <div className="text-center mt-4">
                        <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                            Already have an account? <span className="text-pumpkin font-bold">Sign In</span>
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Register;

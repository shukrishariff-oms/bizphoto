import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { PlusIcon, CameraIcon, PencilIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const Gear = () => {
    const [activeTab, setActiveTab] = useState('cameras');
    const [items, setItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});

    // Fetch Data based on active tab
    const fetchItems = async () => {
        try {
            const endpoint = activeTab === 'cameras' ? '/dashboard/cameras' : '/lenses/';
            const res = await api.get(endpoint);
            setItems(res.data);
        } catch (err) {
            toast.error(`Failed to load ${activeTab}`);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [activeTab]);

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (activeTab === 'cameras') {
            setFormData(item ? {
                model_name: item.model_name,
                serial_number: item.serial_number || '',
                initial_shutter_count: 0,
                current_shutter_count: item.current_shutter_count,
                purchase_price: item.purchase_price || 0,
                max_shutter_life: item.max_shutter_life || 150000
            } : {
                model_name: '',
                serial_number: '',
                initial_shutter_count: 0,
                current_shutter_count: 0,
                purchase_price: '',
                max_shutter_life: 150000
            });
        } else {
            // Lenses
            setFormData(item ? {
                model_name: item.model_name,
                serial_number: item.serial_number || '',
                purchase_price: item.purchase_price || 0,
                purchase_date: item.purchase_date || ''
            } : {
                model_name: '',
                serial_number: '',
                purchase_price: '',
                purchase_date: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            const endpoint = activeTab === 'cameras' ? `/cameras/${id}` : `/lenses/${id}`;
            await api.delete(endpoint);
            toast.success("Item deleted successfully");
            fetchItems();
        } catch (err) {
            toast.error("Failed to delete item");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = activeTab === 'cameras' ? '/cameras' : '/lenses';

            // Format Payload
            let payload = { ...formData };
            if (payload.purchase_price) payload.purchase_price = parseFloat(payload.purchase_price);

            if (activeTab === 'cameras') {
                payload.current_shutter_count = parseInt(payload.current_shutter_count);
                payload.max_shutter_life = parseInt(payload.max_shutter_life);
                if (!editingItem) payload.initial_shutter_count = parseInt(payload.initial_shutter_count);
            }

            if (editingItem) {
                await api.put(`${endpoint}/${editingItem.id}`, payload);
                toast.success("Updated successfully");
            } else {
                await api.post(`${endpoint}/`, payload);
                toast.success("Registered successfully");
            }
            setIsModalOpen(false);
            setEditingItem(null);
            fetchItems();
        } catch (err) {
            toast.error("Operation failed");
        }
    };

    const CameraCard = ({ cam, index }) => {
        const rated = cam.max_shutter_life || 150000;
        const pct = Math.min(Math.round((cam.current_shutter_count / rated) * 100), 100);

        let health = { color: 'text-emerald-400', bar: 'bg-emerald-500', label: 'Good', bg: 'bg-emerald-500/10' };
        if (pct > 90) health = { color: 'text-rose-400', bar: 'bg-rose-500', label: 'Critical', bg: 'bg-rose-500/10' };
        else if (pct > 75) health = { color: 'text-amber-400', bar: 'bg-amber-500', label: 'Warning', bg: 'bg-amber-500/10' };

        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl group hover:border-white/20 transition-all relative"
            >
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleOpenModal(cam)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cam.id)} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>

                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/20 transition-all">
                            <CameraIcon className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300" />
                        </div>
                        <span className={cn("text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider", health.color, health.bg)}>
                            {health.label}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{cam.model_name}</h3>
                    <div className="flex justify-between items-center text-sm text-slate-500 mb-6 font-mono">
                        <span>SN: {cam.serial_number}</span>
                        {cam.purchase_price > 0 && <span>RM {cam.purchase_price.toLocaleString()}</span>}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Shutter Count</span>
                        <span className="font-bold text-white font-mono">{cam.current_shutter_count.toLocaleString()} / {rated.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1 }}
                            className={cn("h-full rounded-full shadow-[0_0_8px_currentColor]", health.bar)}
                        ></motion.div>
                    </div>
                    <p className="text-xs text-slate-500 text-right">{pct}% of rated life</p>
                </div>
            </motion.div>
        );
    };

    const LensCard = ({ lens }) => {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl group hover:border-white/20 transition-all relative"
            >
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleOpenModal(lens)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(lens.id)} className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>

                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-amber-500/20 group-hover:border-amber-500/20 transition-all">
                            <SparklesIcon className="w-6 h-6 text-amber-400 group-hover:text-amber-300" />
                        </div>
                        <div className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider text-slate-400 bg-white/5">
                            Lens
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{lens.model_name}</h3>
                    <div className="flex justify-between items-center text-sm text-slate-500 mb-2 font-mono">
                        <span>SN: {lens.serial_number || 'N/A'}</span>
                    </div>
                    <div className="text-sm text-slate-400">
                        Purchased: {lens.purchase_date || 'N/A'}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-sm text-slate-500">Value</span>
                    <span className="font-bold text-white font-mono">
                        {lens.purchase_price > 0 ? `RM ${lens.purchase_price.toLocaleString()}` : '-'}
                    </span>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Gear</h1>
                    <p className="text-slate-400 mt-1">Manage cameras and lenses</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl border border-white/5">
                    {['cameras', 'lenses'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                activeTab === tab
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 font-medium"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add {activeTab === 'cameras' ? 'Camera' : 'Lens'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {items.map((item, index) => (
                        activeTab === 'cameras'
                            ? <CameraCard key={item.id} cam={item} index={index} />
                            : <LensCard key={item.id} lens={item} />
                    ))}
                </AnimatePresence>
            </div>

            {items.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    <p>No {activeTab} found. Add your first one!</p>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                closeModal={() => setIsModalOpen(false)}
                title={editingItem ? `Edit ${activeTab === 'cameras' ? 'Camera' : 'Lens'}` : `Add New ${activeTab === 'cameras' ? 'Camera' : 'Lens'}`}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Model Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            placeholder={activeTab === 'cameras' ? "e.g. Sony A7IV" : "e.g. Sony 24-70mm GM II"}
                            value={formData.model_name || ''}
                            onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Serial Number</label>
                        <input
                            type="text"
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            placeholder="e.g. S1234567"
                            value={formData.serial_number || ''}
                            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Purchase Price (RM)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                placeholder="0.00"
                                value={formData.purchase_price || ''}
                                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                            />
                        </div>
                        {activeTab === 'cameras' ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Max Shutter Life</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    placeholder="150000"
                                    value={formData.max_shutter_life || ''}
                                    onChange={(e) => setFormData({ ...formData, max_shutter_life: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Purchase Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all scheme-dark"
                                    value={formData.purchase_date || ''}
                                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                />
                            </div>
                        )}

                    </div>

                    {activeTab === 'cameras' && (
                        editingItem ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Current Shutter Count</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    placeholder="0"
                                    value={formData.current_shutter_count || ''}
                                    onChange={(e) => setFormData({ ...formData, current_shutter_count: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1.5">Initial Shutter Count</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    placeholder="0"
                                    value={formData.initial_shutter_count || ''}
                                    onChange={(e) => setFormData({ ...formData, initial_shutter_count: e.target.value })}
                                />
                            </div>
                        )
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            {editingItem ? "Update" : "Register"}
                        </button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Gear;

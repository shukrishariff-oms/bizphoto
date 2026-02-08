import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { PlusIcon, CameraIcon, PencilIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

const Cameras = () => {
    const [cameras, setCameras] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState(null);
    const [formData, setFormData] = useState({
        model_name: '',
        serial_number: '',
        initial_shutter_count: 0,
        current_shutter_count: 0
    });

    const fetchCameras = async () => {
        try {
            const res = await api.get('/dashboard/cameras');
            setCameras(res.data);
        } catch (err) {
            toast.error("Failed to load cameras");
        }
    };

    useEffect(() => {
        fetchCameras();
    }, []);

    const handleOpenModal = (camera = null) => {
        if (camera) {
            setEditingCamera(camera);
            setFormData({
                model_name: camera.model_name,
                serial_number: camera.serial_number || '',
                initial_shutter_count: 0, // Not used for update
                current_shutter_count: camera.current_shutter_count,
                purchase_price: camera.purchase_price || 0,
                max_shutter_life: camera.max_shutter_life || 150000
            });
        } else {
            setEditingCamera(null);
            setFormData({
                model_name: '',
                serial_number: '',
                initial_shutter_count: 0,
                current_shutter_count: 0,
                purchase_price: '',
                max_shutter_life: 150000
            });
        }
        setIsModalOpen(true);
    };

    const handleRegisterCamera = async (e) => {
        e.preventDefault();
        try {
            if (editingCamera) {
                await api.put(`/cameras/${editingCamera.id}`, {
                    model_name: formData.model_name,
                    serial_number: formData.serial_number,
                    current_shutter_count: parseInt(formData.current_shutter_count),
                    purchase_price: parseFloat(formData.purchase_price),
                    max_shutter_life: parseInt(formData.max_shutter_life)
                });
                toast.success("Camera updated successfully");
            } else {
                await api.post('/cameras/', {
                    model_name: formData.model_name,
                    serial_number: formData.serial_number,
                    initial_shutter_count: parseInt(formData.initial_shutter_count),
                    purchase_price: parseFloat(formData.purchase_price),
                    max_shutter_life: parseInt(formData.max_shutter_life)
                });
                toast.success("Camera registered successfully");
            }
            setIsModalOpen(false);
            setEditingCamera(null);
            fetchCameras();
        } catch (err) {
            toast.error(editingCamera ? "Failed to update camera" : "Failed to register camera");
        }
    };

    const getHealthStatus = (current, max) => {
        const rated = max || 150000;
        const pct = (current / rated) * 100;
        if (pct > 90) return { color: 'text-rose-400', bar: 'bg-rose-500', label: 'Critical', bg: 'bg-rose-500/10' };
        if (pct > 75) return { color: 'text-amber-400', bar: 'bg-amber-500', label: 'Warning', bg: 'bg-amber-500/10' };
        return { color: 'text-emerald-400', bar: 'bg-emerald-500', label: 'Good', bg: 'bg-emerald-500/10' };
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
        >
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Camera Gear</h1>
                    <p className="text-slate-400 mt-1">Monitor your equipment health</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 font-medium"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Camera
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cameras.map((cam, index) => {
                    const health = getHealthStatus(cam.current_shutter_count, cam.max_shutter_life);
                    const rated = cam.max_shutter_life || 150000;
                    const pct = Math.min(Math.round((cam.current_shutter_count / rated) * 100), 100);

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            key={cam.id}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl group hover:border-white/20 transition-all relative"
                        >
                            <button
                                onClick={() => handleOpenModal(cam)}
                                className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
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
                                    <span className="font-bold text-white font-mono">{cam.current_shutter_count.toLocaleString()} / {(cam.max_shutter_life || 150000).toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1, delay: 0.2 }}
                                        className={cn("h-full rounded-full shadow-[0_0_8px_currentColor]", health.bar)}
                                    ></motion.div>
                                </div>
                                <p className="text-xs text-slate-500 text-right">{pct}% of rated life</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} title={editingCamera ? "Edit Camera" : "Register New Camera"}>
                <form onSubmit={handleRegisterCamera} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Model Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            placeholder="e.g. Sony A7IV"
                            value={formData.model_name}
                            onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Serial Number</label>
                        <input
                            type="text"
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            placeholder="e.g. S1234567"
                            value={formData.serial_number}
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
                                value={formData.purchase_price}
                                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Max Shutter Life</label>
                            <input
                                type="number"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                placeholder="150000"
                                value={formData.max_shutter_life}
                                onChange={(e) => setFormData({ ...formData, max_shutter_life: e.target.value })}
                            />
                        </div>
                    </div>

                    {editingCamera ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Current Shutter Count</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                placeholder="0"
                                value={formData.current_shutter_count}
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
                                value={formData.initial_shutter_count}
                                onChange={(e) => setFormData({ ...formData, initial_shutter_count: e.target.value })}
                            />
                        </div>
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
                            {editingCamera ? "Update Camera" : "Register"}
                        </button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Cameras;

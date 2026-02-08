import { useState, useEffect } from 'react';
import api from '../api/axios';
import { PlusIcon, PencilSquareIcon, TrashIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    });

    const fetchClients = async () => {
        try {
            const res = await api.get('/clients/');
            setClients(res.data);
        } catch (err) {
            toast.error("Failed to load clients");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                email: client.email || '',
                phone: client.phone || '',
                notes: client.notes || ''
            });
        } else {
            setEditingClient(null);
            setFormData({ name: '', email: '', phone: '', notes: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await api.put(`/clients/${editingClient.id}`, formData);
                toast.success("Client updated");
            } else {
                await api.post('/clients/', formData);
                toast.success("Client registered");
            }
            setIsModalOpen(false);
            fetchClients();
        } catch (err) {
            toast.error(editingClient ? "Failed to update client" : "Failed to register client");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await api.delete(`/clients/${id}`);
            toast.success("Client deleted");
            fetchClients();
        } catch (err) {
            toast.error("Failed to delete client");
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="text-center text-slate-400 mt-20">Loading clients...</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <UserGroupIcon className="w-8 h-8 text-pumpkin" />
                        Clients
                    </h1>
                    <p className="text-slate-400 mt-1">Manage your customer database.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-pumpkin hover:bg-pumpkin/90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-pumpkin/20"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Client
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search clients..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-pumpkin/50 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={client.id}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {client.name.charAt(0)}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenModal(client)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(client.id)}
                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-lg"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">{client.name}</h3>
                        <div className="space-y-1 text-sm text-slate-400">
                            {client.email && <p>{client.email}</p>}
                            {client.phone && <p>{client.phone}</p>}
                        </div>

                        {client.notes && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-xs text-slate-500 italic">"{client.notes}"</p>
                            </div>
                        )}
                    </motion.div>
                ))}

                {filteredClients.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                        No clients found.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingClient ? 'Edit Client' : 'New Client'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pumpkin/50"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pumpkin/50"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pumpkin/50"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                                <textarea
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pumpkin/50 min-h-[100px]"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-pumpkin hover:bg-pumpkin/90 text-white rounded-xl transition-colors font-medium shadow-lg shadow-pumpkin/20"
                                >
                                    {editingClient ? 'Update Client' : 'Add Client'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Clients;

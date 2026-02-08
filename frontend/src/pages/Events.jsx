import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Modal from '../components/Modal';
import { PlusIcon, CalendarIcon, EllipsisHorizontalIcon, ListBulletIcon, Squares2X2Icon, CalendarDaysIcon, LinkIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarView from '../components/CalendarView';

const Events = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'board' | 'calendar'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const handleEventClick = (id) => {
        navigate(`/events/${id}`);
    };

    const [formData, setFormData] = useState({
        name: '',
        event_date: '',
        description: ''
    });

    const COLUMNS = [
        { id: 'planned', title: 'Planned', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { id: 'shooting', title: 'Shooting', color: 'bg-pumpkin/10 text-pumpkin border-pumpkin/20' },
        { id: 'editing', title: 'Editing', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { id: 'completed', title: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
    ];

    const fetchEvents = async () => {
        try {
            const res = await api.get('/events/');
            setEvents(res.data);
        } catch (err) {
            console.error(err);
            toast.error(`Error: ${err.message}`);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/events/', {
                ...formData,
                base_price: 0
            });
            toast.success("Event created successfully");
            setIsModalOpen(false);
            setFormData({ name: '', event_date: '', description: '' });
            fetchEvents();
        } catch (err) {
            toast.error("Failed to create event");
        }
    };

    const handleCopyLink = (eventId) => {
        const url = `${window.location.origin}/p/${eventId}`;
        navigator.clipboard.writeText(url);
        toast.success("Client link copied!");
        setCopiedId(eventId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDragStart = (e, eventId) => {
        e.dataTransfer.setData('eventId', eventId);
    };

    const handleDrop = async (e, status) => {
        const eventId = e.dataTransfer.getData('eventId');
        if (!eventId) return;

        // Optimistic UI Update
        const updatedEvents = events.map(ev =>
            ev.id === eventId ? { ...ev, status } : ev
        );
        setEvents(updatedEvents);

        try {
            await api.patch(`/events/${eventId}/status`, { status });
            toast.success(`Moved to ${status}`);
        } catch (err) {
            toast.error("Failed to update status");
            fetchEvents(); // Revert on error
        }
    };

    const handleDeleteEvent = async (e, eventId) => {
        e.stopPropagation(); // Prevent navigation
        if (!window.confirm("Are you sure you want to delete this event?")) return;

        try {
            await api.delete(`/events/${eventId}`);
            toast.success("Event deleted");
            setEvents(events.filter(ev => ev.id !== eventId));
        } catch (err) {
            toast.error("Failed to delete event");
        }
    };

    const statusStyles = {
        'planned': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'shooting': 'bg-pumpkin/10 text-pumpkin border-pumpkin/20',
        'editing': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'cancelled': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Events</h1>
                    <p className="text-slate-400 mt-1">Manage your photography assignments</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Switcher */}
                    <div className="bg-white/5 p-1 rounded-xl flex border border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'list' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"
                            )}
                            title="List View"
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'board' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"
                            )}
                            title="Board View"
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'calendar' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"
                            )}
                            title="Calendar View"
                        >
                            <CalendarDaysIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 font-medium"
                    >
                        <PlusIcon className="w-5 h-5" />
                        New Event
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'list' && (
                // Glass List
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                    <ul className="divide-y divide-white/5">
                        {events.map((event, index) => (
                            <motion.li
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={event.id}
                                className="hover:bg-white/5 transition-colors group"
                            >
                                <div className="px-8 py-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <h3
                                                onClick={() => handleEventClick(event.id)}
                                                className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer"
                                            >
                                                {event.name}
                                            </h3>
                                            <span className={cn("px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border", statusStyles[event.status] || 'bg-slate-800 text-slate-400 border-slate-700')}>
                                                {event.status}
                                            </span>
                                        </div>
                                        {/* Cost Model: Sales Based */}
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="flex gap-8 text-sm text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                                                {event.event_date}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200">
                                            <button
                                                onClick={() => handleCopyLink(event.id)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10 flex items-center gap-1"
                                                title="Copy Client Link"
                                            >
                                                {copiedId === event.id ? <CheckIcon className="w-5 h-5 text-emerald-400" /> : <LinkIcon className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteEvent(e, event.id)}
                                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/10"
                                                title="Delete Event"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.li>
                        ))}
                        {events.length === 0 && (
                            <div className="p-12 text-center text-slate-500">
                                No events found. Click "New Event" to start.
                            </div>
                        )}
                    </ul>
                </div>
            )}

            {viewMode === 'board' && (
                // Kanban Board
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-4">
                    {COLUMNS.map(col => (
                        <div
                            key={col.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col h-[600px]"
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <span className="font-bold text-white tracking-wide">{col.title}</span>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full border", col.color)}>
                                    {events.filter(e => e.status === col.id).length}
                                </span>
                            </div>

                            {/* Column Body */}
                            <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                {events.filter(e => e.status === col.id).map(event => (
                                    <motion.div
                                        key={event.id}
                                        layoutId={event.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, event.id)}
                                        onClick={() => handleEventClick(event.id)}
                                        className="bg-slate-800/50 hover:bg-slate-800 border border-white/5 p-4 rounded-xl cursor-pointer shadow-lg hover:shadow-indigo-500/10 transition-all group"
                                    >
                                        <h4 className="font-bold text-white text-sm mb-1">{event.name}</h4>
                                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{event.description || 'No description'}</p>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="flex items-center text-slate-500">
                                                <CalendarIcon className="w-3 h-3 mr-1" />
                                                {event.event_date}
                                            </span>
                                            <span className="font-mono text-indigo-300 font-bold text-xs opacity-50">Sales Based</span>
                                        </div>
                                        <button
                                            onClick={() => handleCopyLink(event.id)}
                                            className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-white bg-slate-700/50 hover:bg-indigo-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Copy Client Link"
                                        >
                                            {copiedId === event.id ? <CheckIcon className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteEvent(e, event.id)}
                                            className="absolute top-2 right-8 p-1.5 text-slate-500 hover:text-rose-400 bg-slate-700/50 hover:bg-rose-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete Event"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'calendar' && (
                <CalendarView events={events} />
            )}

            <Modal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} title="Create New Event">
                <form onSubmit={handleCreateEvent} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Event Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            placeholder="Wedding Shoot, Corporate Event..."
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                                value={formData.event_date}
                                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
                        <textarea
                            rows={3}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                            placeholder="Additional details..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
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
                            Create Event
                        </button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Events;

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

const CalendarView = ({ events }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startDate = startOfWeek(startOfMonth(currentDate));
    const endDate = endOfWeek(endOfMonth(currentDate));

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const getEventsForDay = (day) => {
        return events.filter(event => isSameDay(new Date(event.event_date), day));
    };

    const statusColors = {
        'planned': 'bg-blue-500',
        'shooting': 'bg-pumpkin',
        'editing': 'bg-purple-500',
        'completed': 'bg-emerald-500',
        'cancelled': 'bg-rose-500'
    };

    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-2xl font-bold text-white">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-slate-400 hover:text-white px-3 py-1 rounded-md hover:bg-white/5 transition-colors">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-white/5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="py-3 text-center text-sm font-medium text-slate-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-[120px]">
                {calendarDays.map((day, dayIdx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "border-b border-r border-white/5 p-2 transition-colors hover:bg-white/[0.02]",
                                !isCurrentMonth && "bg-black/20 text-slate-600",
                                isCurrentMonth && "text-slate-300",
                                dayIdx % 7 === 6 && "border-r-0" // Remove right border for last col
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn(
                                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                                    isToday(day) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : ""
                                )}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                {dayEvents.map((event) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={event.id}
                                        className={cn(
                                            "text-xs px-2 py-1 rounded-md border border-white/5 truncate font-medium flex items-center gap-1",
                                            "bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                        )}
                                        title={event.name}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColors[event.status] || 'bg-slate-500')} />
                                        <span className="truncate">{event.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;

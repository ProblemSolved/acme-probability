import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Parse initial date
    const initialDate = value ? new Date(value) : new Date();
    const [viewDate, setViewDate] = useState(initialDate); // For navigating months

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const days = daysInMonth(year, month);
        const startDay = startDayOfMonth(year, month);
        
        const daysArr = [];
        // Empty slots for start day
        for (let i = 0; i < startDay; i++) {
            daysArr.push(<div key={`empty-${i}`} className="h-8"></div>);
        }

        for (let d = 1; d <= days; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = value === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            daysArr.push(
                <button
                    key={d}
                    onClick={() => {
                        onChange(dateStr);
                        setIsOpen(false);
                    }}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors mx-auto
                        ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'}
                        ${isToday && !isSelected ? 'text-blue-600 border border-blue-200 bg-blue-50 font-bold' : ''}
                    `}
                >
                    {d}
                </button>
            );
        }
        return daysArr;
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    return (
        <div className="w-full" ref={containerRef}>
            {label && <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full bg-white border rounded-md px-3 py-2.5 text-left text-sm font-medium flex justify-between items-center transition-all shadow-sm
                        ${isOpen ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                    `}
                >
                    <span className={`truncate ${value ? 'text-slate-900' : 'text-slate-500'}`}>
                        {value ? new Date(value).toLocaleDateString(undefined, {dateStyle: 'medium'}) : 'Select date'}
                    </span>
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 w-72 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold text-slate-800">
                                {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <span key={d} className="text-[10px] text-slate-400 font-bold uppercase">{d}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendarDays()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
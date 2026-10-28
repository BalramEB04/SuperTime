import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaveCalendarGridProps {
  leaves: any[];
}

export const LeaveCalendarGrid: React.FC<LeaveCalendarGridProps> = ({ leaves }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getLeavesForDate = (day: number) => {
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);

    return leaves.filter(leave => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return targetDate >= start && targetDate <= end;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white p-2">
      <div className="flex items-center justify-between mb-4 px-2">
        <h4 className="text-base font-bold text-slate-800 tracking-tight">{monthNames[month]} {year}</h4>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={nextMonth} className="p-1.5 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1.5 flex-1 auto-rows-fr">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider py-1">{d}</div>
        ))}
        
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="p-2 border border-transparent"></div>
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayLeaves = getLeavesForDate(day);
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
          
          return (
            <div key={day} className={`min-h-[80px] p-1.5 border rounded-xl ${isToday ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-100' : 'border-slate-100 bg-slate-50/30'} flex flex-col gap-1 overflow-hidden hover:border-slate-300 transition-colors group cursor-default shadow-sm`}>
              <div className={`text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-slate-500'} group-hover:text-slate-800 transition-colors px-1`}>{day}</div>
              <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                {dayLeaves.map((leave, idx) => (
                  <div key={idx} className="text-[10px] px-1.5 py-1 rounded-md bg-white border border-blue-100 text-blue-800 truncate font-semibold shadow-sm" title={`${leave.user?.first_name} ${leave.user?.last_name} - ${leave.leave_duration_type?.replace('_', ' ')}`}>
                    {leave.user?.first_name} {leave.user?.last_name?.[0]}.
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

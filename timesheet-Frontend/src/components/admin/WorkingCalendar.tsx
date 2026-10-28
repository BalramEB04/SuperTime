import React, { useState } from 'react';
import { WorkingCalendarConfig } from '../../types';
import {
  CalendarDays,
  Clock,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
  Briefcase,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

interface WorkingCalendarProps {
  config: WorkingCalendarConfig;
  onUpdateConfig: (newConfig: WorkingCalendarConfig) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const WorkingCalendar: React.FC<WorkingCalendarProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
}) => {
  const [fullDayHours, setFullDayHours] = useState(config.fullDayHours);
  const [halfDayHours, setHalfDayHours] = useState(config.halfDayHours);
  const [timesheetLockHours, setTimesheetLockHours] = useState(config.timesheetLockHours ?? 24);
  const [workingDays, setWorkingDays] = useState(config.workingDays);
  const [timeZone, setTimeZone] = useState(config.timeZone);

  const handleToggleDay = (dayKey: keyof WorkingCalendarConfig['workingDays']) => {
    setWorkingDays((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (fullDayHours <= 0 || halfDayHours <= 0) {
      onShowToast('Validation Error', 'Working hours must be greater than zero.', 'error');
      return;
    }

    

    const updatedConfig: WorkingCalendarConfig = {
      fullDayHours,
      halfDayHours,
      partialDayMinHours: config.partialDayMinHours || 1.0,
      partialDayMaxHours: config.partialDayMaxHours || 7.5,
      workingDays,
      timeZone,
      timesheetLockHours: Number(timesheetLockHours) || 24,
    };

    onUpdateConfig(updatedConfig);
    onShowToast(
      'Working Calendar Saved',
      'Updated standard working hours and weekly work days.',
      'success'
    );
  };

  const daysList: Array<{ key: keyof WorkingCalendarConfig['workingDays']; label: string }> = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  const activeDaysCount = Object.values(workingDays).filter(Boolean).length;
  const totalWeeklyTargetHours = activeDaysCount * fullDayHours;

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-sky-600" />
            <span>Organization Working Calendar &amp; Timesheet Validation Rules</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Define standard organization working days, full-day/half-day targets, and partial day limits. These settings drive automatic timesheet validation system-wide.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Hours Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Working Hours Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-5 text-xs">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Standard Daily Hours Rules</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] block">
                  Full-Day Standard Hours
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="16"
                    placeholder="0"
                    value={fullDayHours === 0 ? '' : fullDayHours}
                    onChange={(e) => setFullDayHours(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-blue-600 font-black text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <span className="font-extrabold text-slate-500 shrink-0">hrs/day</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Standard expected billable + non-billable quota for a full workday.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] block">
                  Half-Day Standard Hours
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    placeholder="0"
                    value={halfDayHours === 0 ? '' : halfDayHours}
                    onChange={(e) => setHalfDayHours(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-blue-600 font-black text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <span className="font-extrabold text-slate-500 shrink-0">hrs/day</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Threshold for half-day leave deductions and timesheet submissions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] block flex items-center justify-between">
                  <span>Timesheet Lock Window</span>
                  <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[9px]">Universal Lock</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="720"
                    placeholder="24"
                    value={timesheetLockHours === 0 ? '' : timesheetLockHours}
                    onChange={(e) => setTimesheetLockHours(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-blue-600 font-black text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <span className="font-extrabold text-slate-500 shrink-0">hours</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Cutoff window after which past timesheets cannot be logged (e.g. 24h = today & yesterday only).
                </p>
              </div>

              

              
            </div>
          </div>

          {/* Weekly Days Selection */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Weekly Working Days Schedule</span>
              </h3>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {activeDaysCount} Days / Week Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {daysList.map((d) => {
                const isWork = workingDays[d.key];
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleToggleDay(d.key)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isWork
                        ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-black shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 font-semibold hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="text-xs block font-bold">{d.label}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isWork ? `${fullDayHours} hrs work` : 'Weekend Off'}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isWork
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Business Rules & Summary Widget */}
        <div className="space-y-6">
          {/* Target Weekly Summary Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
                Standard Weekly Capacity
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary-subtle border border-primary-subtle-border flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
            </div>

            <div>
              <div className="text-3xl font-black text-slate-900 tracking-tight font-heading">
                {totalWeeklyTargetHours}.0 hrs
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Calculated from {activeDaysCount} active working days × {fullDayHours} hrs/day target.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-2 font-medium">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Standard Full Day:</span>
                <span className="font-bold text-slate-900 font-heading">{fullDayHours} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Standard Half Day:</span>
                <span className="font-bold text-slate-900 font-heading">{halfDayHours} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Timezone Reference:</span>
                <span className="font-bold text-slate-900 font-heading">IST (UTC+05:30)</span>
              </div>
            </div>
          </div>

          {/* Business Rules Explanation Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Timesheet Business Rules</span>
            </h3>

            <ul className="space-y-2.5 text-slate-600 leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span>Working calendar settings apply globally to all employees across the organization.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span>Timesheet submissions on non-working days (e.g. Saturdays/Sundays) require a pre-approved Weekend Work Request.</span>
              </li>
              
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span>Project Managers and Account Managers monitor compliance against these standard weekly hours.</span>
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
};

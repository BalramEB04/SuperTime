import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Sun,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useMarkLeaveFromTimesheetMutation,
  useGetLeaveTypesQuery,
  MarkLeavePayload,
} from '../../store/api/dataApi';

interface MarkLeaveModalProps {
  /** The currently selected date in YYYY-MM-DD format (pre-fills the form). */
  selectedDate: string;
  onClose: () => void;
  onSuccess: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

type MainLeaveMode = 'full_day' | 'custom';
type CustomSubType = 'half_day' | 'partial_day';
type HalfPeriod = 'first' | 'second';

export const MarkLeaveModal: React.FC<MarkLeaveModalProps> = ({
  selectedDate,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [mainMode, setMainMode] = useState<MainLeaveMode>('full_day');
  const [customSubType, setCustomSubType] = useState<CustomSubType>('half_day');
  const [halfPeriod, setHalfPeriod] = useState<HalfPeriod>('first');
  const [partialStart, setPartialStart] = useState('09:00');
  const [partialEnd, setPartialEnd] = useState('11:00');

  // Local ISO date for today (YYYY-MM-DD); strictly restrict leaves to today onwards
  const today = new Date().toLocaleDateString('en-CA');
  const initialDate = selectedDate && selectedDate >= today ? selectedDate : today;

  // Full Day dates
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);

  // Custom date
  const [singleDate, setSingleDate] = useState(initialDate);

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [reason, setReason] = useState('Marked from timesheet');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Bounds: minDate is strictly today to prevent marking leaves for previous dates
  const currentYear = new Date().getFullYear();
  const minDate = today;
  const maxDate = `${currentYear}-12-31`;

  // Fetch Admin-configured Leave Types
  const { data: leaveTypes = [], isLoading: loadingTypes } = useGetLeaveTypesQuery();
  const activeLeaveTypes = leaveTypes.filter((lt) => lt.status === 'active');

  // Helper to distinguish custom (half/partial) leaves from full day leaves
  const isCustomLeave = (lt: { name?: string; code?: string }) => {
    const name = (lt.name || '').toLowerCase();
    const code = (lt.code || '').toLowerCase();
    return (
      name.includes('partial') ||
      name.includes('half') ||
      code.includes('partial') ||
      code.includes('half') ||
      code === 'pd' ||
      code === 'hd'
    );
  };

  const isHalfDayLeave = (lt: { name?: string; code?: string }) => {
    const name = (lt.name || '').toLowerCase();
    const code = (lt.code || '').toLowerCase();
    return name.includes('half') || code.includes('half') || code === 'hd';
  };

  const isPartialDayLeave = (lt: { name?: string; code?: string }) => {
    const name = (lt.name || '').toLowerCase();
    const code = (lt.code || '').toLowerCase();
    return name.includes('partial') || code.includes('partial') || code === 'pd';
  };

  // Full Day Leave Types: only non-custom leave types
  const fullDayLeaveTypes = activeLeaveTypes.filter((lt) => !isCustomLeave(lt));

  // Custom Leave Types configured by Admin
  const halfDayLeaveType = activeLeaveTypes.find((lt) => isHalfDayLeave(lt));
  const partialDayLeaveType = activeLeaveTypes.find((lt) => isPartialDayLeave(lt));

  // Sync selected leaveTypeId based on active mode
  useEffect(() => {
    if (mainMode === 'full_day') {
      if (fullDayLeaveTypes.length > 0) {
        const isCurrentValid = fullDayLeaveTypes.some((lt) => String(lt.id) === String(leaveTypeId));
        if (!isCurrentValid) {
          setLeaveTypeId(String(fullDayLeaveTypes[0].id));
        }
      } else {
        setLeaveTypeId('');
      }
    } else {
      // Custom mode: auto-bind to the matching Admin-configured type
      if (customSubType === 'half_day') {
        setLeaveTypeId(halfDayLeaveType ? String(halfDayLeaveType.id) : '');
      } else {
        setLeaveTypeId(partialDayLeaveType ? String(partialDayLeaveType.id) : '');
      }
    }
  }, [mainMode, customSubType, fullDayLeaveTypes, halfDayLeaveType, partialDayLeaveType]);

  const [markLeave, { isLoading: isSaving }] = useMarkLeaveFromTimesheetMutation();

  const getFullDayCount = (): number => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = e.getTime() - s.getTime();
    if (diff < 0) return 0;
    return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getPartialDuration = (): number => {
    const [sh, sm] = partialStart.split(':').map(Number);
    const [eh, em] = partialEnd.split(':').map(Number);
    return (eh * 60 + em - sh * 60 - sm) / 60;
  };

  const formatTime12h = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const suffix = h < 12 ? 'AM' : 'PM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const validateAndBuild = (): MarkLeavePayload | null => {
    setValidationError(null);

    if (mainMode === 'full_day') {
      if (!leaveTypeId) {
        setValidationError('Please select a Full Day leave type configured by admin.');
        return null;
      }
      if (!startDate || !endDate) {
        setValidationError('Please select both Start Date and End Date.');
        return null;
      }
      if (startDate < today) {
        setValidationError('Leaves cannot be marked for previous dates. Please select today or a future date.');
        return null;
      }
      if (startDate > endDate) {
        setValidationError('End Date cannot be earlier than Start Date.');
        return null;
      }

      const sYear = new Date(startDate).getFullYear();
      const eYear = new Date(endDate).getFullYear();
      if (sYear !== currentYear || eYear !== currentYear) {
        setValidationError(`Leaves can only be marked for the current calendar year (${currentYear}). Requests for previous or future years are not allowed.`);
        return null;
      }

      const isMulti = startDate !== endDate;
      const payload: MarkLeavePayload = {
        leave_duration_type: isMulti ? 'multiple_days' : 'full_day',
        leave_type_id: Number(leaveTypeId),
        reason: reason.trim() || 'Marked from timesheet',
      };

      if (isMulti) {
        payload.start_date = startDate;
        payload.end_date = endDate;
      } else {
        payload.leave_date = startDate;
      }

      return payload;
    }

    // Custom Mode
    if (customSubType === 'partial_day') {
      const [sh, sm] = partialStart.split(':').map(Number);
      const [eh, em] = partialEnd.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      if (endMins <= startMins) {
        setValidationError('End time must be after start time.');
        return null;
      }
      const dur = (endMins - startMins) / 60;
      if (dur > 2) {
        setValidationError(`Maximum partial leave duration is 2 hours. You selected ${dur.toFixed(1)}h.`);
        return null;
      }
    }

    if (singleDate < today) {
      setValidationError('Leaves cannot be marked for previous dates. Please select today or a future date.');
      return null;
    }

    const selYear = new Date(singleDate).getFullYear();
    if (selYear !== currentYear) {
      setValidationError(`Leaves can only be marked for the current calendar year (${currentYear}). Requests for previous or future years are not allowed.`);
      return null;
    }

    const payload: MarkLeavePayload = {
      leave_duration_type: customSubType,
      leave_date: singleDate,
      reason: reason.trim() || 'Marked from timesheet',
    };

    if (leaveTypeId) {
      payload.leave_type_id = Number(leaveTypeId);
    }

    if (customSubType === 'half_day') {
      payload.half_day_period = halfPeriod;
    } else if (customSubType === 'partial_day') {
      payload.partial_start_time = partialStart;
      payload.partial_end_time = partialEnd;
    }

    return payload;
  };

  const handleSave = async () => {
    const payload = validateAndBuild();
    if (!payload) return;

    try {
      await markLeave(payload).unwrap();
      const typeLabel = activeLeaveTypes.find((lt) => String(lt.id) === String(leaveTypeId))?.name || (customSubType === 'half_day' ? 'Half Day Leave' : 'Partial Day Leave');
      const modeLabel =
        mainMode === 'full_day'
          ? startDate === endDate
            ? `Full Day (${startDate})`
            : `Full Day (${startDate} to ${endDate})`
          : customSubType === 'half_day'
            ? `Half Day (${halfPeriod === 'first' ? '1st Half' : '2nd Half'}, ${singleDate})`
            : `Partial Day (${singleDate})`;

      onShowToast(
        'Leave Marked',
        `${typeLabel} - ${modeLabel} marked successfully.`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.data?.detail || 'Failed to mark leave. Please try again.';
      setValidationError(msg);
    }
  };

  const daysCount = getFullDayCount();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-[26px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 via-orange-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/25">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950 leading-tight">Mark My Leave</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Record your absence {mainMode === 'full_day' ? `(${startDate}${startDate !== endDate ? ` to ${endDate}` : ''})` : `for ${singleDate}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Step 1: Two Primary Options (Full Day vs Custom) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Leave Duration Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Full Day */}
              <button
                type="button"
                onClick={() => setMainMode('full_day')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${mainMode === 'full_day'
                  ? 'border-rose-500 bg-rose-50/60 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className={`w-4 h-4 ${mainMode === 'full_day' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-black">Full Day</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Full Day leaves with Start & End Date.
                </p>
              </button>

              {/* Option 2: Custom */}
              <button
                type="button"
                onClick={() => setMainMode('custom')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${mainMode === 'custom'
                  ? 'border-rose-500 bg-rose-50/60 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className={`w-4 h-4 ${mainMode === 'custom' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-black">Custom</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Half Day or Partial Day absence.
                </p>
              </button>
            </div>
          </div>

          {/* FULL DAY VIEW */}
          {mainMode === 'full_day' && (
            <>
              {/* Date Picker: Start Date & End Date */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Leave Dates (Start & End Date)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Start Date</span>
                    <input
                      type="date"
                      min={minDate}
                      max={maxDate}
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate < e.target.value) setEndDate(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={maxDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                    />
                  </div>
                </div>
                {daysCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs font-bold text-rose-800 flex items-center justify-between">
                    <span>Selected Duration:</span>
                    <span className="bg-rose-600 text-white px-2 py-0.5 rounded-md text-[11px]">
                      {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                )}
              </div>

              {/* Full Day Leave Types */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Day Leave Type
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Configured by Admin</span>
                </div>
                {loadingTypes ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    Loading leave types...
                  </div>
                ) : fullDayLeaveTypes.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    No Full Day leave types configured by admin.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fullDayLeaveTypes.map((lt) => (
                      <button
                        key={lt.id}
                        type="button"
                        onClick={() => setLeaveTypeId(String(lt.id))}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${String(leaveTypeId) === String(lt.id)
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-1 ring-rose-400 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50 font-medium'
                          }`}
                      >
                        <div className="text-xs flex items-center justify-between">
                          <span className="truncate">{lt.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${lt.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {lt.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        {lt.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                            {lt.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* CUSTOM VIEW */}
          {mainMode === 'custom' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Step: Select Custom Leave Type (Half Day vs Partial Day) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Custom Leave Type
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Configured by Admin</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomSubType('half_day')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${customSubType === 'half_day'
                      ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{halfDayLeaveType?.name || 'Half Day'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                        {halfDayLeaveType?.isPaid ? 'Paid' : '4h'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">First or Second half (4h timesheet).</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomSubType('partial_day')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${customSubType === 'partial_day'
                      ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{partialDayLeaveType?.name || 'Partial Day'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-amber-100 text-amber-800 uppercase">
                        PAID

                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Specific time window (Max 2 hours).</p>
                  </button>
                </div>
              </div>

              {/* Leave Date for Custom */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Leave Date
                </label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              {/* Half Day Specific Configuration */}
              {customSubType === 'half_day' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Select Half Period
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['first', 'second'] as HalfPeriod[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHalfPeriod(p)}
                        className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${halfPeriod === p
                          ? 'border-rose-500 bg-white text-rose-700 ring-2 ring-rose-200 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        {p === 'first' ? '🌅 First Half' : '🌇 Second Half'}
                        <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                          {p === 'first' ? '9:00 AM – 1:00 PM' : '1:00 PM – 6:00 PM'}
                        </p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    You can log timesheet hours for the remaining half of the day.
                  </p>
                </div>
              )}

              {/* Partial Day Specific Configuration */}
              {customSubType === 'partial_day' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Absence Time Window (Max 2 Hours)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500">From</span>
                      <input
                        type="time"
                        value={partialStart}
                        onChange={(e) => setPartialStart(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-rose-400 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500">To</span>
                      <input
                        type="time"
                        value={partialEnd}
                        onChange={(e) => setPartialEnd(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-rose-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  {(() => {
                    const dur = getPartialDuration();
                    const isOver = dur > 2;
                    const isZeroOrNeg = dur <= 0;
                    return !isZeroOrNeg ? (
                      <div
                        className={`p-2 rounded-lg border flex items-center gap-2 text-[11px] font-semibold ${isOver
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {isOver
                          ? `⚠️ ${dur.toFixed(1)}h exceeds the 2-hour maximum.`
                          : `Selected: ${dur.toFixed(1)}h (${formatTime12h(partialStart)} to ${formatTime12h(partialEnd)})`}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Doctor appointment, personal work..."
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-400 focus:outline-none"
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 animate-in fade-in duration-100">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-semibold">{validationError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (mainMode === 'full_day' && !leaveTypeId)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-500/20 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : 'Save Leave'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

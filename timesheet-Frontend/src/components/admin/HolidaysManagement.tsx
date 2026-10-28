import { Pagination } from '../common/Pagination';
import React, { useState, useEffect } from 'react';
import { HolidayItem } from '../../types';
import {
  CalendarCheck,
  Plus,
  Calendar as CalendarIcon,
  List,
  Edit2,
  Trash2,
  X,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';

interface HolidaysManagementProps {
  holidays: HolidayItem[];
  onAddHoliday: (holiday: Omit<HolidayItem, 'id'>) => void;
  onUpdateHoliday: (updated: HolidayItem) => void;
  onDeleteHoliday: (holidayId: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const HolidaysManagement: React.FC<HolidaysManagementProps> = ({
  holidays,
  onAddHoliday,
  onUpdateHoliday,
  onDeleteHoliday,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'National' | 'Global' | 'Regional' | 'Observance' | 'Other'>('National');
  const [description, setDescription] = useState('');
  const [is_mandatory, setis_mandatory] = useState(true);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'National' | 'Global' | 'Regional' | 'Observance' | 'Other'>('National');
  const [editis_mandatory, setEditis_mandatory] = useState(true);
  const [editDescription, setEditDescription] = useState('');


  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterType]);

  const filteredHolidays = (holidays || []).filter((h) => {
    if (filterType !== 'all' && h.type !== filterType) return false;
    if (
      searchQuery &&
      !h.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !h.date.includes(searchQuery)
    ) {
      return false;
    }
    return true;
  });

  const paginatedHolidays = filteredHolidays.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) {
      onShowToast('Validation Error', 'Please enter holiday name and date.', 'error');
      return;
    }

    const dateObj = new Date(date);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    onAddHoliday({
      name,
      date,
      month: months[dateObj.getMonth()],
      day: String(dateObj.getDate()).padStart(2, '0'),
      dayOfWeek: days[dateObj.getDay()],
      type,
      description,
      is_mandatory,
    });

    onShowToast('Holiday Added', `Added "${name}" to organization holiday calendar`, 'success');
    setShowAddModal(false);
    setName('');
    setDescription('');
  };

  const handleOpenEdit = (h: HolidayItem) => {
    setEditingHoliday(h);
    setEditName(h.name);
    setEditDate(h.date);
    setEditType(h.type);
    setEditDescription(h.description || '');
    setEditis_mandatory(h.is_mandatory);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;

    const dateObj = new Date(editDate);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    onUpdateHoliday({
      ...editingHoliday,
      name: editName,
      date: editDate,
      month: months[dateObj.getMonth()],
      day: String(dateObj.getDate()).padStart(2, '0'),
      dayOfWeek: days[dateObj.getDay()],
      type: editType,
      description: editDescription,
      is_mandatory: editis_mandatory,
    });

    onShowToast('Holiday Updated', `Updated details for ${editName}`, 'success');
    setEditingHoliday(null);
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-sky-600" />
            <span>Holiday Management &amp; Working Calendar Exclusions</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure organization-wide public, national, and regional holidays. Timesheet entries cannot be submitted on mandatory holidays without weekend/holiday overtime approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="p-1 bg-slate-100 border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* List or Calendar View */}
      {viewMode === 'list' ? (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 text-xs">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search holiday name or date..."
                className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="all">All Holiday Types</option>
                <option value="National">National</option>
                <option value="Global">Global</option>
                <option value="Regional">Regional</option>
                <option value="Observance">Observance</option>
                <option value="Other">Other</option>
              </select>

              <span className="text-slate-500 font-bold text-xs whitespace-nowrap">
                Total: {filteredHolidays.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50 font-extrabold">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Holiday Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Mandatory</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No holidays found.
                    </td>
                  </tr>
                ) : (
                  paginatedHolidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center text-center shrink-0">
                          <span className="text-[9px] font-black uppercase text-blue-600 leading-none">
                            {holiday.month}
                          </span>
                          <span className="text-sm font-black text-blue-900 leading-none mt-0.5">
                            {holiday.day}
                          </span>
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{holiday.date}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{holiday.dayOfWeek}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-extrabold text-slate-900 text-sm">{holiday.name}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          holiday.type === 'National'
                            ? 'bg-emerald-100 text-emerald-800'
                            : holiday.type === 'Global'
                            ? 'bg-blue-100 text-blue-800'
                            : holiday.type === 'Regional'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {holiday.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          holiday.is_mandatory
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {holiday.is_mandatory ? 'Mandatory Off' : 'Optional'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium max-w-xs truncate">
                      {holiday.description || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(holiday)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete holiday "${holiday.name}"?`)) {
                              onDeleteHoliday(holiday.id);
                              onShowToast('Deleted', `Removed ${holiday.name}`, 'info');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors border border-rose-200"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar Grid View */
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Highlighted Corporate Holiday Calendar</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Highlighted in blue badge for company holidays
            </p>
          </div>

          {filteredHolidays.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              No holidays found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedHolidays.map((holiday) => (
              <div
                key={holiday.id}
                className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-xs space-y-3 relative group hover:border-blue-400 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center text-center shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                      {holiday.month}
                    </span>
                    <span className="text-base font-black leading-none mt-0.5">
                      {holiday.day}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      holiday.type === 'National'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {holiday.type}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{holiday.name}</h4>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{holiday.dayOfWeek}, {holiday.date}</p>
                </div>

                <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                  {holiday.description || 'Corporate Holiday'}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-rose-600 font-bold">
                    {holiday.is_mandatory ? 'Mandatory Off' : 'Optional'}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(holiday)}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* ADD HOLIDAY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleAddSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">Add Holiday Entry</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Holiday Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Independence Day"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Category
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="National">National</option>
                    <option value="Global">Global</option>
                    <option value="Regional">Regional</option>
                    <option value="Observance">Observance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief context about this holiday..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={is_mandatory}
                  onChange={(e) => setis_mandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_mandatory" className="font-bold text-slate-800 text-xs">
                  Mandatory Organization Holiday (Restricted Timesheets)
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
              >
                Add Holiday
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT HOLIDAY MODAL */}
      {editingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">Edit Holiday Entry</h3>
              <button
                type="button"
                onClick={() => setEditingHoliday(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Holiday Title
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Category
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="National">National</option>
                    <option value="Global">Global</option>
                    <option value="Regional">Regional</option>
                    <option value="Observance">Observance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editis_mandatory"
                  checked={editis_mandatory}
                  onChange={(e) => setEditis_mandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editis_mandatory" className="font-bold text-slate-800 text-xs">
                  Mandatory Organization Holiday
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingHoliday(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

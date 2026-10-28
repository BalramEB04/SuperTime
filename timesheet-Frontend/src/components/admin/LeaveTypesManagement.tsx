import React, { useState } from 'react';
import { LeaveTypeConfig } from '../../types';
import {
  CalendarX,
  Plus,
  Edit2,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface LeaveTypesManagementProps {
  leaveTypes: LeaveTypeConfig[];
  onAddLeaveType: (type: Omit<LeaveTypeConfig, 'id'>) => void;
  onUpdateLeaveType: (updated: LeaveTypeConfig) => void;
  onToggleLeaveTypeStatus: (typeId: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const LeaveTypesManagement: React.FC<LeaveTypesManagementProps> = ({
  leaveTypes,
  onAddLeaveType,
  onUpdateLeaveType,
  onToggleLeaveTypeStatus,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeConfig | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [allocatedHours, setAllocatedHours] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editAllocatedHours, setEditAllocatedHours] = useState<number | undefined>(undefined);
  const [editDescription, setEditDescription] = useState('');

  const filteredTypes = (leaveTypes || []).filter(
    (lt) =>
      (lt.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lt.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lt.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      onShowToast('Validation Error', 'Please enter Leave Name and Code.', 'error');
      return;
    }

    onAddLeaveType({
      name,
      code: code.toUpperCase(),
      daysPerYear: 0,
      allocatedHours,
      isPaid: true,
      status: 'active',
      description,
      requiresDocument: false,
    });

    onShowToast('Leave Type Created', `Added "${name} (${code.toUpperCase()})" to policies`, 'success');
    setShowAddModal(false);
    setName('');
    setCode('');
    setDescription('');
    setAllocatedHours(undefined);
  };

  const handleOpenEdit = (lt: LeaveTypeConfig) => {
    setEditingType(lt);
    setEditName(lt.name);
    setEditCode(lt.code);
    setEditAllocatedHours(lt.allocatedHours);
    setEditDescription(lt.description);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    onUpdateLeaveType({
      ...editingType,
      name: editName,
      code: editCode.toUpperCase(),
      allocatedHours: editAllocatedHours,
      description: editDescription,
    });

    onShowToast('Leave Type Updated', `Updated policy details for ${editName}`, 'success');
    setEditingType(null);
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarX className="w-6 h-6 text-sky-600" />
            <span>Leave Type Management &amp; Entitlement Rules</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure leave categories. In accordance with policy, leave types can be activated or deactivated, but not deleted.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Leave Type</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 text-xs">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leave type name or code..."
              className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            />
          </div>

          <div className="text-xs text-slate-500 font-bold">
            Configured Leave Policies: {leaveTypes.length}
          </div>
        </div>

        {/* Leave Types Grid/List */}
        {filteredTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
              <CalendarX className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-black text-slate-700 mb-1">
              {searchQuery ? 'No matching leave types found' : 'No Leave Types Configured'}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-xs">
              {searchQuery
                ? `No leave types match "${searchQuery}". Try a different search term.`
                : 'Get started by creating your first leave policy. Leave types define the categories employees can request.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Leave Type</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTypes.map((lt) => (
              <div
                key={lt.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                  lt.status === 'active'
                    ? 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
                    : 'bg-slate-50/80 border-slate-200 opacity-75'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black">
                        {lt.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                          lt.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {lt.status}
                      </span>
                    </div>

                    {lt.allocatedHours ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lt.allocatedHours} hrs
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">{lt.name}</h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {lt.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEdit(lt)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3 text-blue-600" />
                    <span>Edit Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextStatus = lt.status === 'active' ? 'inactive' : 'active';
                      onUpdateLeaveType({ ...lt, status: nextStatus });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      lt.status === 'active'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {lt.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE LEAVE TYPE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleAddSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">Create New Leave Policy</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Leave Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sabbatical Leave"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SAB"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Allocated Hrs
                </label>
                <input
                  type="number"
                  value={allocatedHours || ''}
                  onChange={(e) => setAllocatedHours(parseInt(e.target.value) || undefined)}
                  placeholder="e.g. 48 (Optional)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain eligibility, rollover terms, and notice period..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
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
                Save Leave Type
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT LEAVE TYPE MODAL */}
      {editingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">Edit Leave Policy Details</h3>
              <button
                type="button"
                onClick={() => setEditingType(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Leave Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                    Code
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Allocated Hrs
                </label>
                <input
                  type="number"
                  value={editAllocatedHours || ''}
                  onChange={(e) => setEditAllocatedHours(parseInt(e.target.value) || undefined)}
                  placeholder="e.g. 48 (Optional)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingType(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
              >
                Save Policy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

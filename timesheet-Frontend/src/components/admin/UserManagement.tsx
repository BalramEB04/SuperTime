import { Pagination } from '../common/Pagination';
import { getErrorMessage } from '../../utils/errorHandler';
import React, { useState, useEffect, useCallback } from 'react';
import { useGetUpcomingLeavesQuery } from '../../store/api/dataApi';
import {
  fetchUsersApi,
  createUserApi,
  updateUserApi,
  toggleUserStatusApi,
  fetchRolesApi,
  fetchDepartmentsApi,
  createDepartmentApi,
  deleteDepartmentApi,
  BackendUser,
  BackendRole,
  BackendDepartment,
} from '../../utils/api';
import {
  UserCog,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  X,
  UserCheck,
  UserX,
  Edit,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Hash,
  Building2,
  Trash2,
  Settings,
} from 'lucide-react';

interface UserManagementProps {
  currentUser?: { id: string } | null;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

// Map backend role name → frontend display label and colour
function roleLabel(roleName: string): string {
  const r = roleName.toLowerCase();
  if (r.includes('admin')) return 'Admin';
  if (r.includes('project')) return 'Project Manager';
  if (r.includes('account')) return 'Account Manager';
  return 'Employee';
}

function roleBadgeClass(roleName: string): string {
  const r = roleName.toLowerCase();
  if (r.includes('admin')) return 'bg-slate-900 text-white border border-slate-900 shadow-2xs';
  if (r.includes('project')) return 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs';
  if (r.includes('account')) return 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs';
  return 'bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs';
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs';
  if (s === 'inactive') return 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs';
  if (s === 'pending') return 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs';
  return 'bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs';
}

function departmentBadgeClass(deptName: string): string {
  return 'bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs';
}

// ---------------------------------------------------------------------------
// Default form values
// ---------------------------------------------------------------------------
const defaultCreate = {
  first_name: '',
  last_name: '',
  email: '',
  role_id: 0,
  department_id: '' as number | '',
  joining_date: '',
  status: 'Pending',
  ctc: undefined as number | undefined,
};

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onShowToast }) => {
  const currentUserId = currentUser ? Number(currentUser.id) : null;
  const { data: upcomingLeaves = [] } = useGetUpcomingLeavesQuery();

  // ── Server state ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<BackendDepartment[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filters / Pagination ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [showRoleMatrixModal, setShowRoleMatrixModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showManageDeptModal, setShowManageDeptModal] = useState(false);

  // ── Department forms ──────────────────────────────────────────────────────
  const [newDeptForm, setNewDeptForm] = useState({ name: '', code: '', description: '' });
  const [newDeptLoading, setNewDeptLoading] = useState(false);
  const [deptActionTarget, setDeptActionTarget] = useState<'create' | 'edit' | null>(null);

  // ── Add-user form ─────────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({ ...defaultCreate });
  const [createLoading, setCreateLoading] = useState(false);

  // ── Edit-user form ────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    employee_id: string;
    role_id: number;
    department_id: number | '';
    joining_date: string;
    status: string;
    ctc?: number;
  } | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // ── Status-toggle loading set ─────────────────────────────────────────────
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // ── Fetch departments ────────────────────────────────────────────────────
  const loadDepartments = useCallback(async () => {
    setDeptLoading(true);
    try {
      const data = await fetchDepartmentsApi(false);
      setDepartments(data);
    } catch (e: any) {
      console.error('Failed to load departments:', e);
    } finally {
      setDeptLoading(false);
    }
  }, []);

  // ── Fetch users ───────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page: currentPage, limit: itemsPerPage };
      if (selectedRoleId !== '') params.role_id = selectedRoleId;
      if (selectedStatus) params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const resp = await fetchUsersApi(params);
      
      // Filter by department on frontend if selected
      let filteredItems = resp.items;
      if (selectedDeptId !== '') {
        filteredItems = filteredItems.filter(u => u.department_id === selectedDeptId || u.department?.id === selectedDeptId);
      }
      
      setUsers(filteredItems);
      setTotal(selectedDeptId !== '' ? filteredItems.length : resp.total);
      setTotalPages(resp.total_pages || Math.ceil(resp.total / itemsPerPage) || 1);
    } catch (e: any) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedRoleId, selectedDeptId, selectedStatus, searchQuery]);

  // ── Fetch roles (with retry support) ─────────────────────────────────────
  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const data = await fetchRolesApi();
      setRoles(data);
    } catch (e: any) {
      const msg = e.message || 'Failed to load roles';
      setRolesError(msg);
      onShowToast('Roles Load Failed', getErrorMessage(e, 'Failed to load system roles.'), 'error');
    } finally {
      setRolesLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadRoles();
    loadDepartments();
  }, [loadRoles, loadDepartments]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRoleId, selectedDeptId, selectedStatus]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenAdd = async () => {
    let resolvedRoles = roles;
    if (resolvedRoles.length === 0) {
      setRolesLoading(true);
      setRolesError(null);
      try {
        const data = await fetchRolesApi();
        setRoles(data);
        resolvedRoles = data;
      } catch (e: any) {
        const msg = e.message || 'Failed to load roles';
        setRolesError(msg);
        onShowToast('Roles Load Failed', msg + ' — cannot open form without roles.', 'error');
        setRolesLoading(false);
        return;
      } finally {
        setRolesLoading(false);
      }
    }
    setCreateForm({
      ...defaultCreate,
      role_id: resolvedRoles[resolvedRoles.length - 1]?.id ?? 0,
      department_id: departments.length > 0 ? departments[0].id : '',
    });
    setShowAddModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.first_name || !createForm.last_name || !createForm.email) {
      onShowToast('Missing Fields', 'Please complete all required fields.', 'error');
      return;
    }
    if (!createForm.role_id) {
      onShowToast('Validation Error', 'Please select a system role.', 'error');
      return;
    }
    setCreateLoading(true);
    try {
      await createUserApi({
        email: createForm.email,
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        role_id: createForm.role_id,
        department_id: createForm.department_id ? Number(createForm.department_id) : null,
        joining_date: createForm.joining_date || null,
        status: createForm.status,
        ctc: createForm.ctc,
      });
      onShowToast('Employee Created', `Account for ${createForm.first_name} ${createForm.last_name} created.`, 'success');
      setShowAddModal(false);
      setCreateForm({ ...defaultCreate });
      loadUsers();
      loadDepartments();
    } catch (e: any) {
      onShowToast('Create Failed', getErrorMessage(e, 'Failed to create user.'), 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (user: BackendUser) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      employee_id: user.employee_id,
      role_id: user.role_id,
      department_id: user.department_id || user.department?.id || '',
      joining_date: user.joining_date ? user.joining_date.split('T')[0] : '',
      status: user.status,
      ctc: user.ctc,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editForm) return;
    setEditLoading(true);
    try {
      await updateUserApi(editingUser.id, {
        email: editForm.email,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        employee_id: editForm.employee_id,
        role_id: editForm.role_id,
        department_id: editForm.department_id ? Number(editForm.department_id) : null,
        joining_date: editForm.joining_date || null,
        status: editForm.status,
        ctc: editForm.ctc,
      });
      onShowToast('User Updated', `Updated ${editForm.first_name} ${editForm.last_name}.`, 'success');
      setEditingUser(null);
      setEditForm(null);
      loadUsers();
      loadDepartments();
    } catch (e: any) {
      onShowToast('Update Failed', getErrorMessage(e, 'Failed to update user.'), 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (user: BackendUser) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    setTogglingIds((prev) => new Set(prev).add(user.id));
    try {
      await toggleUserStatusApi(user.id, newStatus);
      onShowToast(
        newStatus === 'Active' ? 'Account Activated' : 'Account Deactivated',
        `${user.first_name} ${user.last_name} is now ${newStatus}.`,
        'info'
      );
      loadUsers();
    } catch (e: any) {
      onShowToast('Status Update Failed', getErrorMessage(e, 'Failed to update status.'), 'error');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  // ── Quick Department Creation Handler ──────────────────────────────────
  const handleCreateDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptForm.name.trim()) {
      onShowToast('Validation Error', 'Department name is required.', 'error');
      return;
    }
    setNewDeptLoading(true);
    try {
      const created = await createDepartmentApi({
        name: newDeptForm.name.trim(),
        code: newDeptForm.code?.trim() || undefined,
        description: newDeptForm.description?.trim() || undefined,
      });
      onShowToast('Department Created', `Department "${created.name}" created successfully.`, 'success');
      setNewDeptForm({ name: '', code: '', description: '' });
      setShowAddDeptModal(false);
      await loadDepartments();

      // Automatically select newly created department in the open form
      if (deptActionTarget === 'create') {
        setCreateForm((prev) => ({ ...prev, department_id: created.id }));
      } else if (deptActionTarget === 'edit' && editForm) {
        setEditForm((prev) => ({ ...prev, department_id: created.id }));
      }
    } catch (e: any) {
      onShowToast('Creation Failed', getErrorMessage(e, 'Failed to create department.'), 'error');
    } finally {
      setNewDeptLoading(false);
      setDeptActionTarget(null);
    }
  };

  const handleDeleteDepartment = async (deptId: number, deptName: string) => {
    if (!window.confirm(`Are you sure you want to delete the department "${deptName}"?`)) return;
    try {
      await deleteDepartmentApi(deptId);
      onShowToast('Department Deleted', `Department "${deptName}" was removed.`, 'success');
      await loadDepartments();
      loadUsers();
    } catch (e: any) {
      onShowToast('Cannot Delete', getErrorMessage(e, 'Failed to delete department. Make sure no employees are assigned.'), 'error');
    }
  };

  // ── Active upcoming leaves count ──────────────────────────────────────────
  const activeLeavesCount = upcomingLeaves.filter(
    (l: any) => l.status === 'Approved' || l.status === 'Pending'
  ).length;

  const inputCls =
    'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'text-[11px] font-bold text-slate-700 tracking-wide';

  return (
    <div className="space-y-6 relative">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="p-5 bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <UserCog className="w-6 h-6 text-sky-600" />
              <span>User &amp; Department Management</span>
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
              {total} Total Users
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
              {departments.length} Departments
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage system access, assign employees to configured departments, manage roles, and review account statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowManageDeptModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Manage Departments</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRoleMatrixModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Role Matrix</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or employee ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Department filter */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value === '' ? '' : Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.employee_count ?? 0})
              </option>
            ))}
          </select>

          {/* Role filter */}
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value === '' ? '' : Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {roleLabel(r.name)}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => { loadUsers(); loadDepartments(); }}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── USERS TABLE ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Employee ID</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Joining Date</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-slate-400 mt-2 font-medium">Loading users…</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No users matching the selected filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-extrabold text-xs shrink-0 shadow-2xs">
                          {user.first_name?.[0]?.toUpperCase() ?? '?'}
                          {user.last_name?.[0]?.toUpperCase() ?? ''}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg font-semibold">
                        <Hash className="w-3 h-3 text-slate-400" />
                        {user.employee_id}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(
                          user.role?.name ?? ''
                        )}`}
                      >
                        {roleLabel(user.role?.name ?? '')}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-3">
                      {user.department?.name ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold border ${departmentBadgeClass(
                            user.department.name
                          )}`}
                        >
                          <Building2 className="w-2.5 h-2.5 opacity-70" />
                          {user.department.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )}
                    </td>

                    {/* Joining Date */}
                    <td className="py-3.5 px-3 text-slate-500 font-medium">
                      {user.joining_date
                        ? new Date(user.joining_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(
                          user.status
                        )}`}
                      >
                        {user.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Status toggle button */}
                        {currentUserId !== user.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            disabled={togglingIds.has(user.id)}
                            className="p-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                            title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          >
                            {togglingIds.has(user.id) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                            ) : user.status === 'Active' ? (
                              <UserX className="w-3.5 h-3.5 text-rose-600" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>
                        )}

                        {/* Edit User */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-primary-subtle text-slate-700 hover:text-primary transition-all cursor-pointer shadow-2xs"
                          title="Edit User"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* ── EDIT USER MODAL ─────────────────────────────────────────────── */}
      {editingUser && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Edit User — {editingUser.first_name} {editingUser.last_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setEditingUser(null); setEditForm(null); }}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>First Name *</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Last Name *</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Email Address *</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Employee ID *</label>
                  <input
                    type="text"
                    value={editForm.employee_id}
                    onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Department Field with Inline Add */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Department</label>
                    <button
                      type="button"
                      onClick={() => { setDeptActionTarget('edit'); setShowAddDeptModal(true); }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Dept
                    </button>
                  </div>
                  <select
                    value={editForm.department_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value === '' ? '' : Number(e.target.value) })}
                    className={inputCls}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>CTC (Annual in ₹)</label>
                  <input
                    type="number"
                    value={editForm.ctc !== undefined ? editForm.ctc : ''}
                    onChange={(e) => setEditForm({ ...editForm, ctc: e.target.value ? Number(e.target.value) : undefined })}
                    className={inputCls}
                    placeholder="E.g., 500000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>System Role</label>
                  {rolesLoading ? (
                    <div className={`${inputCls} flex items-center gap-2 text-slate-400`}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading roles…</span>
                    </div>
                  ) : rolesError ? (
                    <div className={`${inputCls} flex items-center gap-2 text-rose-600`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="flex-1 truncate">{rolesError}</span>
                      <button type="button" onClick={loadRoles} className="underline font-bold shrink-0">Retry</button>
                    </div>
                  ) : (
                  <select
                    value={editForm.role_id}
                    onChange={(e) => setEditForm({ ...editForm, role_id: Number(e.target.value) })}
                    className={inputCls}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {roleLabel(r.name)}
                      </option>
                    ))}
                  </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Joining Date</label>
                  <input
                    type="date"
                    value={editForm.joining_date}
                    onChange={(e) => setEditForm({ ...editForm, joining_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditingUser(null); setEditForm(null); }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-70"
              >
                {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ADD USER MODAL ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Add New Employee</h3>
              </div>
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
                  <label className={labelCls}>First Name *</label>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    placeholder="e.g. Vikram"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Last Name *</label>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    placeholder="e.g. Sharma"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Email Address *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="e.g. vikram@supersourcing.com"
                    className={inputCls}
                    required
                  />
                </div>
                {/* Department Selection with Inline Add */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Department</label>
                    <button
                      type="button"
                      onClick={() => { setDeptActionTarget('create'); setShowAddDeptModal(true); }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Dept
                    </button>
                  </div>
                  <select
                    value={createForm.department_id || ''}
                    onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value === '' ? '' : Number(e.target.value) })}
                    className={inputCls}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>CTC (Annual in ₹)</label>
                  <input
                    type="number"
                    value={createForm.ctc !== undefined ? createForm.ctc : ''}
                    onChange={(e) => setCreateForm({ ...createForm, ctc: e.target.value ? Number(e.target.value) : undefined })}
                    className={inputCls}
                    placeholder="E.g., 500000"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <div className="text-[10px] text-slate-500 pb-2">
                    Employee ID is auto-generated (e.g. EMP-1)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>System Role *</label>
                  {rolesLoading ? (
                    <div className={`${inputCls} flex items-center gap-2 text-slate-400`}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading roles…</span>
                    </div>
                  ) : rolesError ? (
                    <div className={`${inputCls} flex items-center gap-2 text-rose-600`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="flex-1 truncate">{rolesError}</span>
                      <button type="button" onClick={loadRoles} className="underline font-bold shrink-0">Retry</button>
                    </div>
                  ) : (
                  <select
                    value={createForm.role_id}
                    onChange={(e) => setCreateForm({ ...createForm, role_id: Number(e.target.value) })}
                    className={inputCls}
                    required
                  >
                    <option value={0} disabled>
                      Select Role
                    </option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {roleLabel(r.name)}
                      </option>
                    ))}
                  </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={labelCls}>Joining Date</label>
                  <input
                    type="date"
                    value={createForm.joining_date}
                    onChange={(e) => setCreateForm({ ...createForm, joining_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
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
                disabled={createLoading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-70"
              >
                {createLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MANAGE DEPARTMENTS MODAL ────────────────────────────────────── */}
      {showManageDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Manage Departments</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddDeptModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Dept</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManageDeptModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {departments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-medium">
                  No departments created yet. Click "+ New Dept" to create one.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Department Name</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Employees</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {d.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {d.code || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                          {d.description || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {d.employee_count ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteDepartment(d.id, d.name)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete Department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageDeptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ADD DEPARTMENT MODAL (NESTED ON TOP) ────────────────── */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateDepartmentSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Add New Department</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDeptModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Department Name *</label>
                <input
                  type="text"
                  value={newDeptForm.name}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
                  placeholder="e.g. Design, Development, QA, HR"
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Department Code (Optional)</label>
                <input
                  type="text"
                  value={newDeptForm.code}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, code: e.target.value })}
                  placeholder="e.g. DES, DEV, QA, HR"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Description (Optional)</label>
                <textarea
                  value={newDeptForm.description}
                  onChange={(e) => setNewDeptForm({ ...newDeptForm, description: e.target.value })}
                  placeholder="Brief summary of department responsibilities..."
                  className={`${inputCls} h-20 resize-none`}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDeptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newDeptLoading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-70"
              >
                {newDeptLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Department
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ROLE PERMISSIONS MATRIX (READ-ONLY) ─────────────────────────── */}
      {showRoleMatrixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Predefined System Role Permissions (Read-Only)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleMatrixModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Module / Capability</th>
                    <th className="py-2.5 px-3 text-rose-700">Admin</th>
                    <th className="py-2.5 px-3 text-amber-700">Project Manager</th>
                    <th className="py-2.5 px-3 text-purple-700">Account Manager</th>
                    <th className="py-2.5 px-3 text-blue-700">Employee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['User & Role Management', 'Full Control', 'View Team', 'View Team', 'None'],
                    ['Department Configuration', 'Full Control', 'View Only', 'View Only', 'View Only'],
                    ['Project Management', 'Full Control', 'Assigned Projects', 'Assigned Projects', 'Assigned Only'],
                    ['Timesheet Approvals', 'Override All', 'Project Resources', 'Client Projects', 'Self Only'],
                    ['Leave Approvals', 'All Employees', 'Reporting Members', 'Reporting Members', 'Self Request'],
                    ['System Settings & Holidays', 'Full Control', 'View Only', 'View Only', 'View Only'],
                    ['Reports & Analytics', 'Full Org', 'Project Level', 'Client Level', 'Personal Only'],
                  ].map(([mod, adm, pm, am, emp], idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-medium">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{mod}</td>
                      <td className="py-2.5 px-3 text-rose-700">{adm}</td>
                      <td className="py-2.5 px-3 text-amber-700">{pm}</td>
                      <td className="py-2.5 px-3 text-purple-700">{am}</td>
                      <td className="py-2.5 px-3 text-blue-700">{emp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoleMatrixModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

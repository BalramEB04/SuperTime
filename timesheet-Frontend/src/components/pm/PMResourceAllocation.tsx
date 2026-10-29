import { Pagination } from '../common/Pagination';
import React, { useState, useEffect } from 'react';
import { Project, User, ProjectTool, MasterTool } from '../../types';
import { formatINR } from '../../utils/formatters';
import { useGetUpcomingLeavesQuery, useGetToolsQuery, useBatchAssignUsersToProjectsMutation } from '../../store/api/dataApi';
import {
  Users,
  Wrench,
  Check,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Sparkles,
  DollarSign,
  Calendar,
  X,
  Layers2,
} from 'lucide-react';

interface PMResourceAllocationProps {
  currentUser: User;
  projects: Project[];
  allUsers: User[];
  onAssignUserToProject: (projectId: string, userId: string) => void;
  onRemoveUserFromProject: (projectId: string, userId: string) => void;
  onAddToolToMilestone: (milestoneId: string, toolData: { toolId: number; monthlyCost: number; seats: number; allocationDate: string; deallocationDate?: string }) => void;
  onUpdateToolInProject?: (allocationId: string | number, toolData: { monthlyCost?: number; seats?: number; allocationDate?: string; deallocationDate?: string; allocationBasis?: string }) => void;
  onRemoveToolFromProject: (projectId: string, toolId: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PMResourceAllocation: React.FC<PMResourceAllocationProps> = React.memo(({
  currentUser,
  projects = [],
  allUsers = [],
  onAssignUserToProject,
  onRemoveUserFromProject,
  onAddToolToMilestone,
  onUpdateToolInProject,
  onRemoveToolFromProject,
  onShowToast,
}) => {
  const { data: upcomingLeaves = [] } = useGetUpcomingLeavesQuery();
  const [empPage, setEmpPage] = useState(1);
  const [empPerPage, setEmpPerPage] = useState(10);
  const [toolPage, setToolPage] = useState(1);
  const [toolPerPage, setToolPerPage] = useState(10);
  const { data: masterTools = [] } = useGetToolsQuery();
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'tools'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [toolStatusFilter, setToolStatusFilter] = useState<'all' | 'active' | 'deallocated'>('active');

  // Modal states for allocation
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkSelectedProjectIds, setBulkSelectedProjectIds] = useState<string[]>([]);
  const [bulkSelectedUserIds, setBulkSelectedUserIds] = useState<string[]>([]);
  const [bulkProjectSearch, setBulkProjectSearch] = useState('');
  const [bulkEmployeeSearch, setBulkEmployeeSearch] = useState('');
  const [bulkDepartmentFilter, setBulkDepartmentFilter] = useState('all');
  const [bulkRole, setBulkRole] = useState('Developer');

  const [batchAssignUsers, { isLoading: isBatchAssigning }] = useBatchAssignUsersToProjectsMutation();
  const [showToolModal, setShowToolModal] = useState(false);
  const [showEditToolModal, setShowEditToolModal] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<any | null>(null);

  // Form states for Tool Edit
  const [editMonthlyCost, setEditMonthlyCost] = useState<number>(0);
  const [editSeats, setEditSeats] = useState<number>(1);
  const [editAllocationDate, setEditAllocationDate] = useState<string>('');
  const [editDeallocationDate, setEditDeallocationDate] = useState<string>('');
  const [editAllocationBasis, setEditAllocationBasis] = useState<string>('working_day');

  const handleOpenEditModal = (row: any) => {
    setEditingAllocation(row);
    setEditMonthlyCost(row.monthlyCost || 0);
    setEditSeats(row.seats || 1);
    setEditAllocationDate(row.allocationDate || new Date().toISOString().split('T')[0]);
    setEditDeallocationDate(row.deallocationDate || '');
    setEditAllocationBasis(row.allocationBasis || 'working_day');
    setShowEditToolModal(true);
  };

  const handleEditToolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllocation) return;

    if (!editDeallocationDate) {
      onShowToast('Validation Error', 'End Date (Deallocation Date) is required.', 'error');
      return;
    }

    if (editAllocationDate && editDeallocationDate && editDeallocationDate < editAllocationDate) {
      onShowToast('Invalid Dates', 'End Date cannot be earlier than Start Date.', 'error');
      return;
    }

    if (onUpdateToolInProject) {
      onUpdateToolInProject(editingAllocation.allocationId || editingAllocation.toolId, {
        monthlyCost: Number(editMonthlyCost) || 0,
        seats: Number(editSeats) || 1,
        allocationDate: editAllocationDate,
        deallocationDate: editDeallocationDate,
        allocationBasis: editAllocationBasis,
      });
    }

    setShowEditToolModal(false);
    setEditingAllocation(null);
  };


  // Form states for Tool Allocation (Select from Master Tools configured by Admin)
  const [toolProjectId, setToolProjectId] = useState<string>('');
  const [selectedMasterToolId, setSelectedMasterToolId] = useState<string>('');
  const [toolMonthlyCost, setToolMonthlyCost] = useState<number>(0);
  const [toolSeats, setToolSeats] = useState<number>(1);
  const [toolAllocationDate, setToolAllocationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toolDeallocationDate, setToolDeallocationDate] = useState<string>('');

  // PM's projects (only active projects)
  const pmProjects = React.useMemo(() => {
    return (projects || []).filter((p) => {
      if (p.isActive === false || p.is_active === false) return false;
      if (currentUser?.role === 'admin') return true;
      if (p.project_manager_id && currentUser?.id && String(p.project_manager_id) === String(currentUser.id)) return true;
      if (p.pmName && currentUser?.name && p.pmName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
      return false;
    });
  }, [projects, currentUser]);

  // Handle bulk assign team submission
  const handleConfirmBulkAssign = async () => {
    if (bulkSelectedProjectIds.length === 0 || bulkSelectedUserIds.length === 0) {
      onShowToast('Selection Required', 'Please select at least one project and at least one employee.', 'error');
      return;
    }

    try {
      const res = await batchAssignUsers({
        project_ids: bulkSelectedProjectIds.map(Number),
        user_ids: bulkSelectedUserIds.map(Number),
        role: bulkRole || 'Developer',
      }).unwrap();

      const data = res?.data || res;
      onShowToast(
        'Bulk Allocation Succeeded',
        `Assigned ${data.assigned_count || 0} resource(s) (${data.reactivated_count || 0} reactivated, ${data.skipped_count || 0} already active).`,
        'success'
      );
      setShowBulkAssignModal(false);
      setBulkSelectedProjectIds([]);
      setBulkSelectedUserIds([]);
      setBulkProjectSearch('');
      setBulkEmployeeSearch('');
    } catch (err: any) {
      console.error('Batch assign failed:', err);
      onShowToast('Bulk Allocation Failed', err?.data?.message || err?.message || 'Could not complete batch assignment.', 'error');
    }
  };



  // Handle remove employee submission
  const handleRemoveUser = (projectId: string, userId: string, userName: string, projectName: string) => {
    onRemoveUserFromProject(projectId, userId);
    onShowToast('Employee Removed', `Removed ${userName} from ${projectName}.`, 'info');
  };

  // Handle add tool submission
  const handleConfirmAddTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolProjectId || !selectedMasterToolId) {
      onShowToast('Validation Error', 'Please select both a project and a tool from the catalog.', 'error');
      return;
    }

    const targetProject = pmProjects.find((p) => (p.milestones || []).some(m => String(m.id) === String(toolProjectId)));
    const targetMilestone = targetProject?.milestones?.find(m => String(m.id) === String(toolProjectId));
    const selectedMasterTool = masterTools.find((t) => String(t.id) === String(selectedMasterToolId));

    if (targetProject && targetMilestone && selectedMasterTool) {
      // Check if tool already allocated to this milestone
      const isAlreadyAllocated = (targetProject.tools || []).some(
        (t) => String(t.id) === String(selectedMasterTool.id) && String(((t as any).milestone_id || t.milestoneId) || t.milestoneId) === String(targetMilestone.id) && t.status !== 'Inactive' && t.status !== 'deallocated'
      );
      if (isAlreadyAllocated) {
        onShowToast('Already Allocated', `${selectedMasterTool.name} is already allocated to ${targetMilestone.name}.`, 'error');
        return;
      }

      onAddToolToMilestone(toolProjectId, {
        toolId: Number(selectedMasterTool.id),
        monthlyCost: Number(toolMonthlyCost) || 0,
        seats: Number(toolSeats) || 1,
        allocationDate: toolAllocationDate,
        deallocationDate: toolDeallocationDate || undefined,
      });

      setShowToolModal(false);
      setToolProjectId('');
      setSelectedMasterToolId('');
      setToolMonthlyCost(0);
      setToolSeats(1);
      setToolDeallocationDate('');
    }
  };

  // Handle remove tool submission
  const handleRemoveTool = (projectId: string, allocationIdOrToolId: string, toolName: string, projectName: string) => {
    onRemoveToolFromProject(projectId, allocationIdOrToolId);
    onShowToast('Tool Deallocated', `Deallocated ${toolName} from ${projectName}.`, 'info');
  };

  // Build employee rows
  const employeeAllocations = React.useMemo(() => {
    const list: Array<{
      projectId: string;
      projectName: string;
      projectCode: string;
      userId: string;
      userName: string;
      userEmail: string;
      userRole: string;
      userAvatar: string;
      userTitle: string;
      userDept: string;
      leaveStatus?: string;
    }> = [];

    pmProjects.forEach((proj) => {
      (proj.assignedUserIds || []).forEach((uId) => {
        const userObj = allUsers.find((u) => u.id === uId);
        if (userObj) {
          const userLeave = upcomingLeaves.find((l) => String(l.userId) === String(userObj.id));
          list.push({
            projectId: proj.id,
            projectName: proj.name,
            projectCode: proj.code,
            userId: userObj.id,
            userName: userObj.name,
            userEmail: userObj.email,
            userRole: userObj.role,
            userAvatar: userObj.avatar,
            userTitle: userObj.title,
            userDept: userObj.department,
            leaveStatus: userLeave ? `On Leave: ${userLeave.startDate} to ${userLeave.endDate}` : undefined,
          });
        }
      });
    });

    return list;
  }, [pmProjects, allUsers, upcomingLeaves]);

  // Build tool rows
  const toolAllocations = React.useMemo(() => {
    const list: Array<{
      projectId: string;
      projectName: string;
      projectCode: string;
      toolId: string;
      allocationId?: string;
      toolName: string;
      category: string;
      monthlyCost: number;
      seats: number;
      allocationDate?: string;
      deallocationDate?: string;
      status?: string;
    }> = [];

    pmProjects.forEach((proj) => {
      (proj.tools || []).forEach((t) => {
        list.push({
          projectId: proj.id,
          projectName: proj.name,
          projectCode: proj.code,
          toolId: t.id,
          allocationId: t.allocationId,
          toolName: t.name,
          category: t.category,
          monthlyCost: t.monthlyCost || 0,
          seats: t.seats || 1,
          allocationDate: t.allocationDate,
          deallocationDate: t.deallocationDate,
          status: t.status,
        });
      });
    });

    return list;
  }, [pmProjects]);

  // Filters
  useEffect(() => { setEmpPage(1); setToolPage(1); }, [searchTerm, selectedProjectFilter, toolStatusFilter]);

  const activeToolsCount = React.useMemo(() => {
    return toolAllocations.filter((t) => t.status?.toLowerCase() !== 'deallocated' && t.status?.toLowerCase() !== 'inactive').length;
  }, [toolAllocations]);

  const deallocatedToolsCount = React.useMemo(() => {
    return toolAllocations.filter((t) => t.status?.toLowerCase() === 'deallocated' || t.status?.toLowerCase() === 'inactive').length;
  }, [toolAllocations]);

  const filteredEmployees = employeeAllocations.filter((row) => {
    const matchesProject = selectedProjectFilter === 'all' || row.projectId === selectedProjectFilter;
    const matchesSearch =
      row.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.userDept.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProject && matchesSearch;
  });

  const filteredTools = toolAllocations.filter((row) => {
    const matchesProject = selectedProjectFilter === 'all' || row.projectId === selectedProjectFilter;
    const matchesSearch =
      row.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isDeallocated = row.status?.toLowerCase() === 'deallocated' || row.status?.toLowerCase() === 'inactive';
    const matchesStatus =
      toolStatusFilter === 'all' ||
      (toolStatusFilter === 'active' && !isDeallocated) ||
      (toolStatusFilter === 'deallocated' && isDeallocated);

    return matchesProject && matchesSearch && matchesStatus;
  });

  const paginatedEmployees = filteredEmployees.slice((empPage - 1) * empPerPage, empPage * empPerPage);
  const paginatedTools = filteredTools.slice((toolPage - 1) * toolPerPage, toolPage * toolPerPage);

  const activeMasterTools = masterTools.filter((t) => t.status !== 'Inactive');
  const selectedToolObj = masterTools.find((t) => String(t.id) === String(selectedMasterToolId));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>Project Resource Allocation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Assign team engineers &amp; allocate software tools configured in the master catalog.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowBulkAssignModal(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs flex items-center gap-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Users className="w-4 h-4" />
            <span>Bulk Allocate Team</span>
          </button>
          <button
            onClick={() => setShowToolModal(true)}
            className="px-3.5 py-2 bg-primary-subtle hover:bg-primary/20 border border-primary/30 text-primary font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Allocate Tool</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Toggle sub-tab */}
        <div className="flex p-1 rounded-2xl bg-slate-100 border border-slate-200 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSubTab === 'employees'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Users className="w-4 h-4" />
            <span>Assigned Team ({employeeAllocations.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tools')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSubTab === 'tools'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Allocated Tools ({toolAllocations.length})</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {activeSubTab === 'tools' && (
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setToolStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  toolStatusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeToolsCount})
              </button>
              <button
                type="button"
                onClick={() => setToolStatusFilter('deallocated')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  toolStatusFilter === 'deallocated'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deallocated ({deallocatedToolsCount})
              </button>
              <button
                type="button"
                onClick={() => setToolStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  toolStatusFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({toolAllocations.length})
              </button>
            </div>
          )}

          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-48">
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Projects</option>
              {pmProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: EMPLOYEES LIST */}
      {activeSubTab === 'employees' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Designation & Dept</th>
                  <th className="py-3 px-4">Assigned Project</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No team members assigned matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((row) => (
                    <tr key={`${row.projectId}-${row.userId}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={row.userAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'}
                            alt={row.userName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900">{row.userName}</p>
                            <p className="text-[10px] text-slate-400">{row.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{row.userTitle}</span>
                        <p className="text-[10px] text-slate-400 font-medium">{row.userDept}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {row.projectCode}
                          </span>
                          <span className="font-bold text-slate-800">{row.projectName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {row.leaveStatus ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1 w-max">
                            <AlertCircle className="w-3 h-3" />
                            <span>{row.leaveStatus}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active / Available</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRemoveUser(row.projectId, row.userId, row.userName, row.projectName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove from project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={empPage}
            totalItems={filteredEmployees.length}
            itemsPerPage={empPerPage}
            onPageChange={setEmpPage}
            onItemsPerPageChange={(val) => {
              setEmpPerPage(val);
              setEmpPage(1);
            }}
          />
        </div>
      )}

      {/* SUB-TAB 2: TOOLS ALLOCATED LIST */}
      {activeSubTab === 'tools' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tool / Software</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Allocated Project</th>
                  <th className="py-3 px-4">Seats (Qty)</th>
                  <th className="py-3 px-4">Monthly Rate</th>
                  <th className="py-3 px-4">Total Cost/mo</th>
                  <th className="py-3 px-4">Allocation Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTools.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No software tools allocated matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedTools.map((row) => (
                    <tr key={`${row.projectId}-${row.toolId}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                            {row.category ? row.category[0] : 'T'}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{row.toolName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {row.projectCode}
                          </span>
                          <span className="font-bold text-slate-800">{row.projectName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {row.seats || 1} {row.seats === 1 ? 'Seat' : 'Seats'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        ${row.monthlyCost}/mo
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ${row.monthlyCost || 0}/mo
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <span>{row.allocationDate || 'Immediate'}</span>
                        {row.deallocationDate && (
                          <span className="text-slate-400"> → {row.deallocationDate}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.status?.toLowerCase() === 'deallocated' || row.status?.toLowerCase() === 'inactive' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 w-max">
                            <AlertCircle className="w-3 h-3" />
                            <span>Deallocated</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Tool Allocation"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTool(row.projectId, row.allocationId || row.toolId, row.toolName, row.projectName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Deallocate tool"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={toolPage}
            totalItems={filteredTools.length}
            itemsPerPage={toolPerPage}
            onPageChange={setToolPage}
            onItemsPerPageChange={(val) => {
              setToolPerPage(val);
              setToolPage(1);
            }}
          />
        </div>
      )}

      {/* MODAL: BULK RESOURCE ALLOCATION (MULTI-PROJECT & MULTI-EMPLOYEE) */}
      {showBulkAssignModal && (() => {
        const filteredProjects = pmProjects.filter((p) => {
          if (!bulkProjectSearch.trim()) return true;
          const q = bulkProjectSearch.toLowerCase();
          return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)) || (p.client && p.client.toLowerCase().includes(q));
        });

        const allEmployees = allUsers.filter((u) => u.role === 'employee' && (!u.status || u.status.toLowerCase() === 'active'));
        const departmentList = Array.from(new Set(allEmployees.map((u) => u.department).filter(Boolean)));

        const filteredEmployees = allEmployees.filter((u) => {
          const matchesDept = bulkDepartmentFilter === 'all' || u.department === bulkDepartmentFilter;
          if (!matchesDept) return false;
          if (!bulkEmployeeSearch.trim()) return true;
          const q = bulkEmployeeSearch.toLowerCase();
          return (
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.title && u.title.toLowerCase().includes(q)) ||
            (u.department && u.department.toLowerCase().includes(q))
          );
        });

        const totalAssignments = bulkSelectedProjectIds.length * bulkSelectedUserIds.length;

        const toggleSelectAllProjects = () => {
          if (bulkSelectedProjectIds.length === filteredProjects.length) {
            setBulkSelectedProjectIds([]);
          } else {
            setBulkSelectedProjectIds(filteredProjects.map((p) => p.id));
          }
        };

        const toggleSelectAllEmployees = () => {
          if (bulkSelectedUserIds.length === filteredEmployees.length) {
            setBulkSelectedUserIds([]);
          } else {
            setBulkSelectedUserIds(filteredEmployees.map((u) => u.id));
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs font-sans">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="space-y-0.5">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>Bulk Resource Allocation</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign multiple team members across one or multiple managed projects in a single operation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body: Two Columns */}
              <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                {/* Column 1: Projects Selection */}
                <div className="space-y-3 flex flex-col border border-slate-200 rounded-xl p-3 bg-slate-50/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-sky-600" />
                        <span>1. Select Target Projects</span>
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {bulkSelectedProjectIds.length} of {pmProjects.length} selected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleSelectAllProjects}
                      className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer"
                    >
                      {bulkSelectedProjectIds.length === filteredProjects.length && filteredProjects.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  {/* Search projects */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search project name, code..."
                      value={bulkProjectSearch}
                      onChange={(e) => setBulkProjectSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  {/* Project List */}
                  <div className="flex-1 max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {filteredProjects.length === 0 ? (
                      <p className="text-center py-6 text-slate-400 text-xs">No projects match search</p>
                    ) : (
                      filteredProjects.map((p) => {
                        const isSelected = bulkSelectedProjectIds.includes(p.id);
                        const assignedCount = (p.assignedUserIds || []).length;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isSelected) {
                                setBulkSelectedProjectIds(bulkSelectedProjectIds.filter((id) => id !== p.id));
                              } else {
                                setBulkSelectedProjectIds([...bulkSelectedProjectIds, p.id]);
                              }
                            }}
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-400 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent onClick
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                              />
                              <div className="truncate">
                                <p className={`font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  Code: {p.code || 'N/A'} {p.client ? `• ${p.client}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0 border border-slate-200">
                              {assignedCount} assigned
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Column 2: Team Members Selection */}
                <div className="space-y-3 flex flex-col border border-slate-200 rounded-xl p-3 bg-slate-50/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>2. Select Team Members</span>
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {bulkSelectedUserIds.length} of {allEmployees.length} selected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleSelectAllEmployees}
                      className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                    >
                      {bulkSelectedUserIds.length === filteredEmployees.length && filteredEmployees.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  {/* Filters: Search & Department */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search name, email..."
                        value={bulkEmployeeSearch}
                        onChange={(e) => setBulkEmployeeSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <select
                      value={bulkDepartmentFilter}
                      onChange={(e) => setBulkDepartmentFilter(e.target.value)}
                      className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="all">All Departments</option>
                      {departmentList.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Employee List */}
                  <div className="flex-1 max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {filteredEmployees.length === 0 ? (
                      <p className="text-center py-6 text-slate-400 text-xs">No employees match filter</p>
                    ) : (
                      filteredEmployees.map((u) => {
                        const isSelected = bulkSelectedUserIds.includes(u.id);
                        const currentAssignmentsCount = pmProjects.filter((p) =>
                          (p.assignedUserIds || []).map(String).includes(String(u.id))
                        ).length;

                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              if (isSelected) {
                                setBulkSelectedUserIds(bulkSelectedUserIds.filter((id) => id !== u.id));
                              } else {
                                setBulkSelectedUserIds([...bulkSelectedUserIds, u.id]);
                              }
                            }}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-400 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent onClick
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer shrink-0"
                              />
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  u.name.charAt(0)
                                )}
                              </div>
                              <div className="truncate">
                                <p className={`font-bold truncate ${isSelected ? 'text-emerald-950' : 'text-slate-900'}`}>
                                  {u.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {u.title || 'Engineer'} • {u.department || 'Delivery'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                              {currentAssignmentsCount} proj
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Role selection */}
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Assignment Role:</span>
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-800"
                  >
                    <option value="Developer">Developer</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Tech Lead">Tech Lead</option>
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="Designer">UI/UX Designer</option>
                    <option value="DevOps Engineer">DevOps Engineer</option>
                    <option value="Business Analyst">Business Analyst</option>
                  </select>
                </div>

                <div className="text-right">
                  <span className="font-bold text-indigo-950">
                    {bulkSelectedUserIds.length} employee{bulkSelectedUserIds.length !== 1 ? 's' : ''} &times; {bulkSelectedProjectIds.length} project{bulkSelectedProjectIds.length !== 1 ? 's' : ''} =
                  </span>{' '}
                  <span className="font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                    {totalAssignments} total assignments
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {totalAssignments > 0
                    ? `Ready to execute batch allocation of ${totalAssignments} project assignments.`
                    : 'Select at least one project and one employee to proceed.'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkAssignModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={totalAssignments === 0 || isBatchAssigning}
                    onClick={handleConfirmBulkAssign}
                    className={`px-5 py-2 rounded-xl font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-sm ${
                      totalAssignments === 0 || isBatchAssigning
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary-hover text-primary-foreground'
                    }`}
                  >
                    {isBatchAssigning ? (
                      <span>Assigning...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm Bulk Allocation ({totalAssignments})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: ALLOCATE TOOL (FROM ADMIN-CONFIGURED MASTER TOOLS) */}
      {showToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmAddTool}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 text-xs font-sans"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                <span>Allocate Tool from Master Catalog</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowToolModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Milestone Select */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Target Milestone *</label>
                <select
                  required
                  value={toolProjectId}
                  onChange={(e) => setToolProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium cursor-pointer"
                >
                  <option value="">-- Select Milestone --</option>
                  {pmProjects.map((p) => (
                    <optgroup key={p.id} label={`${p.name} (${p.code})`}>
                      {p.milestones?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Master Tool Select */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Select Tool (Configured by Admin) *
                </label>
                {activeMasterTools.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
                    No tools currently configured by Admin. Please contact Admin to add tools to the master catalog.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedMasterToolId}
                    onChange={(e) => setSelectedMasterToolId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="">-- Select Tool from Catalog --</option>
                    {activeMasterTools.map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name} ({tool.category})
                      </option>
                    ))}
                  </select>
                )}
                {selectedToolObj && (
                  <p className="text-[11px] text-indigo-600 font-bold mt-1">
                    Category: {selectedToolObj.category}
                  </p>
                )}
              </div>

              {/* Cost & Seats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Monthly Cost ($/mo) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="e.g. 50"
                    value={toolMonthlyCost === 0 ? '' : toolMonthlyCost}
                    onChange={(e) => setToolMonthlyCost(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Seats to be Allotted *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={toolSeats}
                    onChange={(e) => setToolSeats(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              {/* Real-time total calculation box */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <span className="text-indigo-900 font-bold text-xs">Total Monthly Allocation:</span>
                <span className="text-emerald-700 font-black text-sm">
                  ${(Number(toolMonthlyCost) || 0).toFixed(2)}/mo
                </span>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={toolAllocationDate}
                    onChange={(e) => setToolAllocationDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={toolAllocationDate}
                    value={toolDeallocationDate}
                    onChange={(e) => setToolDeallocationDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowToolModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={activeMasterTools.length === 0}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                Allocate Tool
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT TOOL ALLOCATION MODAL */}
      {showEditToolModal && editingAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleEditToolSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                <span>Edit Tool Allocation</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditToolModal(false);
                  setEditingAllocation(null);
                }}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tool & Project</span>
                <p className="font-extrabold text-slate-900 text-sm">{editingAllocation.toolName}</p>
                <p className="text-xs text-slate-500 font-medium">Project: {editingAllocation.projectName} ({editingAllocation.projectCode})</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Monthly Plan Cost ($/mo) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editMonthlyCost === 0 ? '' : editMonthlyCost}
                    onChange={(e) => setEditMonthlyCost(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Seats / Capacity (Qty) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editSeats}
                    onChange={(e) => setEditSeats(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Allocation Basis
                </label>
                <select
                  value={editAllocationBasis}
                  onChange={(e) => setEditAllocationBasis(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold cursor-pointer"
                >
                  <option value="working_day">Working Day (Default)</option>
                  <option value="calendar_day">Calendar Day</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly Flat</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editAllocationDate}
                    onChange={(e) => setEditAllocationDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 cursor-pointer font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={editAllocationDate}
                    value={editDeallocationDate}
                    onChange={(e) => setEditDeallocationDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 cursor-pointer font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditToolModal(false);
                  setEditingAllocation(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});
PMResourceAllocation.displayName = 'PMResourceAllocation';

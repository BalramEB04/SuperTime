import { Pagination } from '../common/Pagination';
import React, { useState } from 'react';
import { MasterTool } from '../../types';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  Sparkles,
  Cloud,
  Code,
  Palette,
  Bot,
  Shield,
  Briefcase,
} from 'lucide-react';
import {
  useGetToolsQuery,
  useCreateToolMutation,
  useUpdateToolMutation,
  useDeleteToolMutation,
} from '../../store/api/dataApi';

interface ToolsManagementProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

const TOOL_CATEGORIES = [
  'AI',
  'Cloud',
  'Dev',
  'Design',
  'SaaS',
  'Testing',
  'Security',
  'Productivity',
  'Other',
];

export const ToolsManagement: React.FC<ToolsManagementProps> = ({ onShowToast }) => {
  const { data: tools = [], isLoading, refetch } = useGetToolsQuery();
  const [createTool, { isLoading: isCreating }] = useCreateToolMutation();
  const [updateTool, { isLoading: isUpdating }] = useUpdateToolMutation();
  const [deleteTool, { isLoading: isDeleting }] = useDeleteToolMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTool, setEditingTool] = useState<MasterTool | null>(null);
  const [deletingToolId, setDeletingToolId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form State
  const [toolName, setToolName] = useState('');
  const [toolCategory, setToolCategory] = useState(TOOL_CATEGORIES[0]);
  const [toolStatus, setToolStatus] = useState<'Active' | 'Inactive'>('Active');

  const openAddModal = () => {
    setToolName('');
    setToolCategory(TOOL_CATEGORIES[0]);
    setToolStatus('Active');
    setShowAddModal(true);
  };

  const openEditModal = (tool: MasterTool) => {
    setEditingTool(tool);
    setToolName(tool.name);
    setToolCategory(tool.category || TOOL_CATEGORIES[0]);
    setToolStatus(tool.status === 'Inactive' ? 'Inactive' : 'Active');
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) {
      onShowToast('Validation Error', 'Tool name is required.', 'error');
      return;
    }

    try {
      await createTool({
        name: toolName.trim(),
        category: toolCategory,
        status: toolStatus,
      }).unwrap();
      onShowToast('Tool Added', `${toolName.trim()} has been added to master catalog.`, 'success');
      setShowAddModal(false);
      refetch();
    } catch (err: any) {
      onShowToast('Failed to Add Tool', err?.data?.detail || err?.data?.message || 'Error occurred', 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;
    if (!toolName.trim()) {
      onShowToast('Validation Error', 'Tool name is required.', 'error');
      return;
    }

    try {
      await updateTool({
        id: editingTool.id,
        name: toolName.trim(),
        category: toolCategory,
        status: toolStatus,
      }).unwrap();
      onShowToast('Tool Updated', `${toolName.trim()} updated successfully.`, 'success');
      setEditingTool(null);
      refetch();
    } catch (err: any) {
      onShowToast('Failed to Update Tool', err?.data?.detail || err?.data?.message || 'Error occurred', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingToolId) return;
    try {
      await deleteTool(deletingToolId).unwrap();
      onShowToast('Tool Deleted', 'Tool removed from catalog.', 'info');
      setDeletingToolId(null);
      refetch();
    } catch (err: any) {
      onShowToast('Failed to Delete', err?.data?.detail || err?.data?.message || 'Error occurred', 'error');
    }
  };

  // Filter tools
  React.useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory]);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const paginatedTools = filteredTools.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AI':
        return <Bot className="w-4 h-4 text-purple-600" />;
      case 'Cloud':
        return <Cloud className="w-4 h-4 text-sky-600" />;
      case 'Dev':
        return <Code className="w-4 h-4 text-blue-600" />;
      case 'Design':
        return <Palette className="w-4 h-4 text-pink-600" />;
      case 'Security':
        return <Shield className="w-4 h-4 text-emerald-600" />;
      default:
        return <Wrench className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-sky-600" />
            <span>Master Tool Catalog</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure software licenses, cloud tools, and services available for project managers to allocate.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Tool</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tool name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({tools.length})
          </button>
          {TOOL_CATEGORIES.map((cat) => {
            const count = tools.filter((t) => t.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Tool Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Loading tool catalog...
                  </td>
                </tr>
              ) : filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                    No tools found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          {getCategoryIcon(tool.category)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{tool.name}</p>
                          <p className="text-[10px] text-slate-400">ID: #{tool.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {tool.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          tool.status === 'Inactive'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                      >
                        {tool.status === 'Inactive' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        <span>{tool.status || 'Active'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(tool)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Tool"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingToolId(tool.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Tool"
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
          currentPage={currentPage}
          totalItems={filteredTools.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* ADD NEW TOOL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Add Tool to Master Catalog</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tool / Software Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OpenAI API, Figma Enterprise, AWS Cloud"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={toolCategory}
                  onChange={(e) => setToolCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-semibold cursor-pointer"
                >
                  {TOOL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={toolStatus}
                  onChange={(e) => setToolStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-semibold cursor-pointer"
                >
                  <option value="Active">Active (Available for PMs to allocate)</option>
                  <option value="Inactive">Inactive (Disabled)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  {isCreating ? 'Adding...' : 'Add Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TOOL MODAL */}
      {editingTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <span>Edit Tool</span>
              </h3>
              <button
                onClick={() => setEditingTool(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tool / Software Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={toolCategory}
                  onChange={(e) => setToolCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-semibold cursor-pointer"
                >
                  {TOOL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={toolStatus}
                  onChange={(e) => setToolStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-900 font-semibold cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTool(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingToolId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">Delete Tool from Catalog?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this tool? Project managers will no longer be able to select it for new allocations.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingToolId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

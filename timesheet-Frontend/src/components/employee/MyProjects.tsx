import { Pagination } from '../common/Pagination';
import React, { useState } from 'react';
import { User, Project, Milestone } from '../../types';
import {
  FolderKanban,
  Users,
  Calendar,
  Clock,
  ExternalLink,
  X,
  Layers,
  Wrench,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Paperclip,
  File,
  Download,
  Flag,
  Target,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface MyProjectsProps {
  currentUser: User;
  projects: Project[];
  allUsers: User[];
}

const projectAccent = [
  {
    icon: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25',
    bar: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600',
    soft: 'bg-gradient-to-br from-blue-50/70 to-indigo-50/40',
    codeBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    border: 'hover:border-indigo-300 hover:shadow-[0_12px_32px_rgba(99,102,241,0.15)]',
  },
  {
    icon: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25',
    bar: 'bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500',
    soft: 'bg-gradient-to-br from-purple-50/70 to-pink-50/40',
    codeBg: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    border: 'hover:border-purple-300 hover:shadow-[0_12px_32px_rgba(168,85,247,0.15)]',
  },
  {
    icon: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25',
    bar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
    soft: 'bg-gradient-to-br from-amber-50/70 to-orange-50/40',
    codeBg: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    border: 'hover:border-amber-300 hover:shadow-[0_12px_32px_rgba(245,158,11,0.15)]',
  },
  {
    icon: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25',
    bar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    soft: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40',
    codeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    border: 'hover:border-emerald-300 hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)]',
  },
];

export const MyProjects: React.FC<MyProjectsProps> = ({
  currentUser,
  projects = [],
  allUsers = [],
}) => {
  const [selectedProjectModal, setSelectedProjectModal] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const myProjects = (projects || []).filter((p) => p.assignedUserIds?.includes(currentUser.id));
  const paginatedProjects = myProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getMilestoneStatusBadge = (status?: string) => {
    const s = (status || 'planned').toLowerCase().trim();
    if (s === 'achieved' || s === 'completed') {
      return {
        label: 'Achieved',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
        dot: 'bg-emerald-500',
      };
    }
    if (s === 'in_progress') {
      return {
        label: 'In Progress',
        className: 'bg-blue-50 text-blue-700 border-blue-200/60',
        dot: 'bg-blue-500',
      };
    }
    return {
      label: 'Planned',
      className: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500',
    };
  };

  const getMilestoneProgress = (m: Milestone) => {
    if (m.status === 'achieved' || (m as any).status === 'completed') {
      return 100;
    }
    if (m.completion_percentage && m.completion_percentage > 0) {
      return Math.round(m.completion_percentage);
    }
    if (m.status === 'in_progress') {
      return 35; // Default 35% for In Progress milestones
    }
    return 0;
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* Page Header (No Hero Banner) */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Assigned Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your sprint projects, milestones &amp; deliverables, allocated tools, and PM contacts.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>{myProjects.length} Active Assignments</span>
        </span>
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedProjects.map((project, index) => {
          const accent = projectAccent[index % projectAccent.length];
          const milestones = project.milestones || [];
          const achievedCount = milestones.filter(
            (m) => m.status === 'achieved' || (m as any).status === 'completed'
          ).length;

          // Calculate average milestone progress taking in-progress as 35% default
          const totalProgress = milestones.length > 0
            ? Math.round(
                milestones.reduce((acc, m) => acc + getMilestoneProgress(m), 0) / milestones.length
              )
            : 0;

          const overallProgress = project.completion_percentage && project.completion_percentage > 0
            ? Math.round(project.completion_percentage)
            : totalProgress;

          return (
            <div
              key={project.id}
              className={`p-5 rounded-[22px] bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-[0_10px_35px_rgba(30,50,90,0.055)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between space-y-4 group ${accent.border}`}
            >
              {/* Accent colored top bar */}
              <div className={`absolute inset-x-0 top-0 h-1.5 ${accent.bar}`} />

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${accent.codeBg}`}>
                    {project.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black capitalize border border-emerald-200/60 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700">
                    {project.status || 'Active'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${accent.icon}`}>
                    <FolderKanban className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-slate-950 truncate group-hover:text-indigo-600 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold truncate">Client: {project.client || 'Internal'}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {project.description || 'Sprint deliverables and milestone objectives.'}
                </p>

                {/* Milestones Preview Bar */}
                {milestones.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Milestones</span>
                      </span>
                      <span className="text-indigo-600 font-black text-[10px]">
                        {achievedCount}/{milestones.length} Completed ({overallProgress}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 transition-all duration-500 shadow-xs"
                        style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between items-center text-slate-500 text-[11px] font-bold">
                  <span>Logged Hours</span>
                  <span className="text-indigo-700 font-black text-xs">
                    {project.loggedHours || 0} hrs
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span>PM: {project.pmName || 'Unassigned'}</span>
                  </div>
                  {(project.documents || []).length > 0 ? (
                    <span className="flex items-center gap-1 text-slate-500 font-semibold">
                      <Paperclip className="w-3 h-3 text-indigo-600" />
                      {(project.documents || []).length} Docs
                    </span>
                  ) : (
                    <span className="text-slate-500">Ends {project.endDate || '-'}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProjectModal(project)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 hover:bg-indigo-100/70 text-indigo-700 text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-indigo-200/60 cursor-pointer shadow-2xs active:scale-95"
                >
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span>View Details, Milestones &amp; Tools</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {myProjects.length > itemsPerPage && (
        <div className="mt-4 flex justify-end">
          <Pagination
            currentPage={currentPage}
            totalItems={myProjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newVal) => {
              setItemsPerPage(newVal);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* PROJECT DETAILS, MILESTONES, TOOLS & DOCUMENTS MODAL */}
      {selectedProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedProjectModal.code}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedProjectModal.name}
                </h3>
                <p className="text-xs text-slate-500">Client: {selectedProjectModal.client}</p>
              </div>
              <button
                onClick={() => setSelectedProjectModal(null)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-1">
                  Project Description & Objective
                </h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50/40 p-3 rounded-xl border border-slate-200">
                  {selectedProjectModal.description || 'No description provided.'}
                </p>
              </div>

              {/* PROJECT MILESTONES & DELIVERABLES */}
              <div>
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Project Milestones & Deliverables ({(selectedProjectModal.milestones || []).length})</span>
                  </span>
                  {(selectedProjectModal.milestones || []).length > 0 && (
                    <span className="text-indigo-600 font-semibold lowercase tracking-normal">
                      {(selectedProjectModal.milestones || []).filter((m) => m.status === 'achieved').length} achieved
                    </span>
                  )}
                </h4>
                {(selectedProjectModal.milestones || []).length > 0 ? (
                  <div className="space-y-2.5">
                    {(selectedProjectModal.milestones || []).map((m, idx) => {
                      const badge = getMilestoneStatusBadge(m.status);
                      const completion = getMilestoneProgress(m);

                      return (
                        <div
                          key={m.id || idx}
                          className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-indigo-200 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <h5 className="font-bold text-slate-800 text-xs truncate">
                                  {m.name}
                                </h5>
                              </div>
                              {m.description && (
                                <p className="text-[11px] text-slate-500 pl-7 leading-relaxed">
                                  {m.description}
                                </p>
                              )}
                            </div>

                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </div>

                          {/* Progress & Target Dates */}
                          <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>
                                Target: <strong className="text-slate-700">{m.expected_completion_date || 'TBD'}</strong>
                              </span>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2">
                              <span>Progress: <strong className="text-slate-700">{completion}%</strong></span>
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    m.status === 'achieved' ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50/40 border border-slate-200 text-slate-400 text-xs italic">
                    No milestones defined for this project yet.
                  </div>
                )}
              </div>

              {/* Supporting Documents */}
              <div>
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Supporting Documents ({(selectedProjectModal.documents || []).length})</span>
                </h4>
                {(selectedProjectModal.documents || []).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(selectedProjectModal.documents || []).map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-300/60 flex items-center justify-between gap-2 hover:border-blue-400 transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <File className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate group-hover:text-blue-600 transition-colors" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {formatFileSize(doc.fileSize)}
                              {doc.uploadedAt && ` • ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <a
                          href={doc.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.fileName}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shrink-0 cursor-pointer shadow-2xs"
                          title="Download document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50/40 border border-slate-200 text-slate-400 text-xs italic">
                    No supporting documents uploaded for this project.
                  </div>
                )}
              </div>

              {/* Tools Allocated */}
              <div>
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-2">
                  Software Licenses & Cloud Tools Allocated ({selectedProjectModal.tools.length})
                </h4>
                {selectedProjectModal.tools.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedProjectModal.tools.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-300/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                            {t.category ? t.category[0] : 'T'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{t.name}</p>
                            <p className="text-[10px] text-slate-500">{t.category}</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-600">${t.monthlyCost}/mo</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50/40 border border-slate-200 text-slate-400 text-xs italic">
                    No software tools allocated to this project.
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div>
                <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-2">
                  Assigned Team Members
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allUsers
                    .filter((u) => (selectedProjectModal.assignedUserIds || []).includes(u.id))
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300"
                      >
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-slate-800 text-[11px]">{u.name}</p>
                          <p className="text-[9px] text-slate-500">{u.title}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedProjectModal(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

// ── Pagination constant ───────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ── Zod schema ────────────────────────────────────────────────────────────────
const ProjectSchema = z
  .object({
    projectName:        z.string().min(1, 'Project name is required'),
    clientName:         z.string().min(1, 'Client name is required'),
    clientPhone:        z
      .string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile number (10-15 digits)'),
    location:           z.string().min(1, 'Location is required'),
    area:               z.string().min(1, 'Area is required'),
    budget:             z.string().min(1, 'Budget is required'),
    startDate:          z.string().min(1, 'Start date is required'),
    endDate:            z.string().min(1, 'End date is required'),
    projectDescription: z.string().optional(),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

// ── Small helpers ─────────────────────────────────────────────────────────────
const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  ) : null;

const inputCls = (hasError) =>
  `w-full border rounded-lg py-2 px-3 bg-[#020B1A] text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
    hasError
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-700 focus:ring-[#AED500]'
  }`;

const formatCost = (val) => {
  if (val === undefined || val === null || val === '') return '-';
  const num = Number(val);
  return isNaN(num) ? val : `₹${num.toLocaleString('en-IN')}`;
};



// ── Main Component ────────────────────────────────────────────────────────────
const AdminProjects = () => {
  const toast = useToast();

  const [projects, setProjects]               = useState([]);
  const [isFormOpen, setIsFormOpen]           = useState(false);
  const [editingProject, setEditingProject]   = useState(null);
  const [serverError, setServerError]         = useState('');
  const [deleteTarget, setDeleteTarget]       = useState(null); // { id, projectName }
  const [currentPage, setCurrentPage]         = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      projectName: '', clientName: '', clientPhone: '',
      location: '', area: '', budget: '',
      startDate: '', endDate: '', projectDescription: '',
    },
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const generateProjectId = (clientName, clientPhone, location) => {
    const cName = (clientName || '').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cPhone = (clientPhone || '').slice(-4);
    const loc = (location || '').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `HIT${cName}${cPhone}${loc}`;
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    const d1 = new Date(start), d2 = new Date(end);
    if (isNaN(d1) || isNaN(d2)) return '';
    const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} Day${days !== 1 ? 's' : ''}` : '0 Days';
  };

  const formatDateToInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d) ? '' : d.toISOString().split('T')[0];
  };

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchProjects = async (silent = false, activeRef = { current: true }) => {
    try {
      const res = await api.get('/projects');
      if (!activeRef.current) return;
      const data = res.data;
      const mapped = data.map((p) => {
        let computedStatus = 'In Progress';
        if (p.endDate) {
          const end = new Date(p.endDate);
          const start = new Date(p.startDate);
          if (!isNaN(end) && end.getTime() !== start.getTime() && end < new Date()) {
            computedStatus = 'Completed';
          }
        }
        return {
          id: p._id,
          projectId: p.projectRefId,
          projectName: p.projectName,
          clientName: p.clientName,
          clientPhone: p.clientMobile,
          location: p.location,
          area: p.area,
          cost: p.budget,
          startDate: formatDateToInput(p.startDate),
          endDate: p.endDate ? formatDateToInput(p.endDate) : '',
          duration: calculateDuration(p.startDate, p.endDate),
          status: computedStatus,
          projectDescription: p.projectDescription || '',
        };
      });
      setProjects(mapped);
      if (!silent && mapped.length > 0) {
        toast.info(`${mapped.length} project${mapped.length !== 1 ? 's' : ''} loaded`);
      }
    } catch (err) {
      if (!activeRef.current) return;
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch projects');
    }
  };

  useEffect(() => {
    const activeRef = { current: true };
    fetchProjects(false, activeRef);
    return () => {
      activeRef.current = false;
    };
  }, []);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages  = Math.ceil(projects.length / PAGE_SIZE);
  const paginated   = projects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // scroll table back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 whenever projects list changes
  useEffect(() => { setCurrentPage(1); }, [projects.length]);

  // ── Add / Edit handlers ───────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingProject(null);
    setServerError('');
    reset({
      projectName: '', clientName: '', clientPhone: '',
      location: '', area: '', budget: '',
      startDate: '', endDate: '', projectDescription: '',
    });
    setIsFormOpen(true);
  };

  const handleEdit = (project) => {
    setEditingProject(project.id);
    setServerError('');
    reset({
      projectName:        project.projectName  || '',
      clientName:         project.clientName   || '',
      clientPhone:        project.clientPhone  || '',
      location:           project.location     || '',
      area:               project.area         || '',
      budget:             String(project.cost  || ''),
      startDate:          project.startDate    || '',
      endDate:            project.endDate      || '',
      projectDescription: project.projectDescription || '',
    });
    setIsFormOpen(true);
  };

  // ── Delete (with confirm modal) ───────────────────────────────────────────
  const handleDeleteClick = (project) => {
    setDeleteTarget(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      toast.success(`Project "${deleteTarget.projectName}" deleted`);
      setDeleteTarget(null);
      await fetchProjects(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete project');
      setDeleteTarget(null);
    }
  };

  // ── Submit (create / update) ─────────────────────────────────────────────
  const onSubmit = async (data) => {
    setServerError('');
    const projectRefId = generateProjectId(data.clientName, data.clientPhone, data.location);
    const body = {
      projectName:        data.projectName,
      projectRefId,
      clientName:         data.clientName,
      clientMobile:       data.clientPhone,
      location:           data.location,
      area:               data.area,
      budget:             data.budget,
      startDate:          data.startDate,
      endDate:            data.endDate,
      projectDescription: data.projectDescription || '',
    };

    try {
      if (editingProject) {
        await api.patch(`/projects/${editingProject}`, body);
        toast.success(`Project "${data.projectName}" updated successfully`);
      } else {
        await api.post('/projects', body);
        toast.success(`Project "${data.projectName}" created successfully`);
      }
      setIsFormOpen(false);
      await fetchProjects(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setServerError(msg);
      toast.error(msg);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-gray-400 mt-1">Manage and view your project details.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2 px-4 sm:py-2.5 sm:px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer text-sm sm:text-base w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Project
        </button>
      </header>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete Project?"
          entityName="Project"
          label={deleteTarget.projectName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Form Modal ─────────────────────────────────────────────────────── */}
      {isFormOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingProject ? 'Edit Project' : 'New Project'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 font-sans text-left">
              {/* Server-side error */}
              {serverError && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg text-sm text-left">
                  {serverError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Project Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Project Name *</label>
                  <input {...register('projectName')} className={inputCls(errors.projectName)} placeholder="e.g. Villa Renovation" />
                  <FieldError message={errors.projectName?.message} />
                </div>

                {/* Client Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Client Name *</label>
                  <input {...register('clientName')} className={inputCls(errors.clientName)} placeholder="Full name" />
                  <FieldError message={errors.clientName?.message} />
                </div>

                {/* Client Phone */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Client Phone *</label>
                  <input {...register('clientPhone')} className={inputCls(errors.clientPhone)} placeholder="+91XXXXXXXXXX" />
                  <FieldError message={errors.clientPhone?.message} />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Location *</label>
                  <input {...register('location')} className={inputCls(errors.location)} placeholder="City / Area" />
                  <FieldError message={errors.location?.message} />
                </div>

                {/* Area */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Area (in sft) *</label>
                  <input {...register('area')} className={inputCls(errors.area)} placeholder="e.g. 1200 sft" />
                  <FieldError message={errors.area?.message} />
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Project Cost *</label>
                  <input {...register('budget')} className={inputCls(errors.budget)} placeholder="e.g. 500000" />
                  <FieldError message={errors.budget?.message} />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Start Date *</label>
                  <input type="date" {...register('startDate')} className={inputCls(errors.startDate)} style={{ colorScheme: 'dark' }} />
                  <FieldError message={errors.startDate?.message} />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">End Date *</label>
                  <input type="date" {...register('endDate')} className={inputCls(errors.endDate)} style={{ colorScheme: 'dark' }} />
                  <FieldError message={errors.endDate?.message} />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">
                    Description <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input {...register('projectDescription')} className={inputCls(false)} placeholder="Short description…" />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 sm:pt-6 flex flex-col-reverse sm:flex-row gap-3 mt-4 sm:mt-6 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-full sm:flex-1 bg-transparent border border-gray-700 text-gray-300 font-semibold py-2 sm:py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 bg-[#AED500] hover:bg-[#9cc000] disabled:opacity-60 text-[#020B1A] font-bold py-2 sm:py-2.5 px-4 rounded-lg shadow-md transition-colors cursor-pointer text-sm sm:text-base"
                >
                  {isSubmitting ? 'Saving…' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Projects List / Table ─────────────────────────────────────────── */}
      <div className="mt-6">
        {/* Desktop View (lg and above) */}
        <div className="hidden lg:block bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#020B1A] border-b border-gray-800">
                  <th className="py-3.5 px-3 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center w-10">S.No</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Project ID</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Project Name</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Client Name</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Client Phone</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Location</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Area (sft)</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider text-right">Project Cost</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Start Date</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">End Date</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Duration</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {paginated.length > 0 ? (
                  paginated.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-gray-500 text-xs text-center font-medium">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-4 text-[#AED500] font-bold">{p.projectId}</td>
                      <td className="py-3 px-4 text-white font-medium">{p.projectName}</td>
                      <td className="py-3 px-4 text-gray-300">{p.clientName}</td>
                      <td className="py-3 px-4 text-gray-300">{p.clientPhone}</td>
                      <td className="py-3 px-4 text-gray-300">{p.location}</td>
                      <td className="py-3 px-4 text-gray-300">{p.area}</td>
                      <td className="py-3 px-4 text-white font-semibold text-right">{formatCost(p.cost)}</td>
                      <td className="py-3 px-4 text-gray-300">{p.startDate}</td>
                      <td className="py-3 px-4 text-gray-300">{p.endDate || '-'}</td>
                      <td className="py-3 px-4 text-gray-300">{p.duration || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          p.status === 'Completed'   ? 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/50' :
                          p.status === 'In Progress' ? 'bg-[#FFFF00]/20 text-[#FFFF00] border border-[#FFFF00]/50' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/50'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13" className="py-12 text-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      No projects found. Click <span className="text-[#AED500] font-medium">+ Add New Project</span> to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={projects.length}
            pageSize={PAGE_SIZE}
            itemName="projects"
          />
        </div>

        {/* Mobile View (under lg) */}
        <div className="block lg:hidden">
          <div className="space-y-4">
            {paginated.length > 0 ? (
              paginated.map((p, idx) => (
                <div key={p.id} className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md hover:border-gray-700 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        #{(currentPage - 1) * PAGE_SIZE + idx + 1} • <span className="text-[#AED500] font-bold">{p.projectId}</span>
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">{p.projectName}</h4>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${
                      p.status === 'Completed'   ? 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/50' :
                      p.status === 'In Progress' ? 'bg-[#FFFF00]/20 text-[#FFFF00] border border-[#FFFF00]/50' :
                      'bg-gray-500/20 text-gray-400 border-gray-500/50'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-gray-800/60 py-3">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Client</span>
                      <span className="text-white font-medium">{p.clientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Phone</span>
                      <span className="text-white font-medium">{p.clientPhone}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Location</span>
                      <span className="text-white font-medium">{p.location}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Area</span>
                      <span className="text-white font-medium">{p.area}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Project Cost</span>
                      <span className="text-white font-semibold">{formatCost(p.cost)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Duration</span>
                      <span className="text-white font-medium">{p.duration || '-'}</span>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Start Date</span>
                        <span className="text-white font-medium">{p.startDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">End Date</span>
                        <span className="text-white font-medium">{p.endDate || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleEdit(p)}
                      className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(p)}
                      className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl py-12 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                No projects found. Click <span className="text-[#AED500] font-medium">+ Add New Project</span> to get started.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl mt-4 overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={projects.length}
                pageSize={PAGE_SIZE}
                itemName="projects"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProjects;

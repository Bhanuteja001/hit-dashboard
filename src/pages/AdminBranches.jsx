import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const BranchSchema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  branchAddress: z.string().min(1, 'Branch address is required'),
  branchPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile or phone number (10-15 digits)'),
});

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
  `w-full border rounded-lg py-1.5 sm:py-2 px-2.5 sm:px-3 bg-[#020B1A] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
    hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-[#AED500]'
  }`;

const AdminBranches = () => {
  const toast = useToast();
  const [branches, setBranches] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(BranchSchema),
    defaultValues: { branchName: '', branchAddress: '', branchPhone: '' },
  });

  const fetchBranches = async () => {
    try {
      setFetchError('');
      const res = await api.get('/stores');
      const mapped = res.data.map(store => ({
        id: store._id,
        branchName: store.name,
        branchAddress: store.address,
        branchPhone: store.phone || ''
      }));
      setBranches(mapped);
    } catch (err) {
      console.error(err);
      setFetchError(err.response?.data?.message || err.message || 'Failed to load branches');
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleAdd = () => {
    setEditingBranch(null);
    setServerError('');
    reset({ branchName: '', branchAddress: '', branchPhone: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch.id);
    setServerError('');
    reset({
      branchName: branch.branchName || '',
      branchAddress: branch.branchAddress || '',
      branchPhone: branch.branchPhone || '',
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (branch) => {
    setDeleteTarget(branch);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/stores/${deleteTarget.id}`);
      toast.success(`Branch "${deleteTarget.branchName}" deleted successfully`);
      setDeleteTarget(null);
      fetchBranches();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete branch');
      setDeleteTarget(null);
    }
  };

  const onSubmit = async (data) => {
    setServerError('');
    const body = {
      name: data.branchName,
      address: data.branchAddress,
      phone: data.branchPhone
    };
    try {
      if (editingBranch) {
        await api.patch(`/stores/${editingBranch}`, body);
        toast.success(`Branch "${data.branchName}" updated successfully`);
      } else {
        await api.post('/stores', body);
        toast.success(`Branch "${data.branchName}" created successfully`);
      }
      setIsFormOpen(false);
      fetchBranches();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save branch';
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Branches</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage and view your branch details.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer text-xs sm:text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Branch
        </button>
      </header>

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 animate-fade-in">
          {fetchError}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-left animate-fade-in"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white">{editingBranch ? 'Edit Branch' : 'New Branch'}</h3>
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 font-sans">
              {serverError && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm">
                  {serverError}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Branch Name *</label>
                <input {...register('branchName')} className={inputCls(errors.branchName)} placeholder="e.g. Hyderabad Central" />
                <FieldError message={errors.branchName?.message} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Branch Address *</label>
                <textarea {...register('branchAddress')} rows="3" className={inputCls(errors.branchAddress)} placeholder="Plot 45, Jubilee Hills, Hyderabad"></textarea>
                <FieldError message={errors.branchAddress?.message} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Phone / Mobile *</label>
                <input {...register('branchPhone')} className={inputCls(errors.branchPhone)} placeholder="e.g. +91XXXXXXXXXX" />
                <FieldError message={errors.branchPhone?.message} />
              </div>

              <div className="pt-4 sm:pt-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 mt-4 sm:mt-6 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-full sm:flex-1 bg-transparent border border-gray-700 text-gray-300 font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 bg-[#AED500] hover:bg-[#9cc000] disabled:opacity-60 text-[#020B1A] font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg shadow-md transition-colors cursor-pointer text-xs sm:text-sm"
                >
                  {isSubmitting ? 'Saving…' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete Branch?"
          entityName="Branch"
          label={deleteTarget.branchName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Branches Layout Container */}
      <div className="mt-6">
        {/* Desktop View (lg and above) */}
        <div className="hidden lg:block bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#020B1A] border-b border-gray-800">
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider w-16">S.No</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Branch Name</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Branch Address</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Phone / Mobile</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {branches.length > 0 ? (
                  branches.map((b, index) => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 text-gray-400 font-medium">{index + 1}</td>
                      <td className="py-4 px-6 text-gray-100 font-semibold">{b.branchName}</td>
                      <td className="py-4 px-6 text-gray-300">{b.branchAddress}</td>
                      <td className="py-4 px-6 text-gray-300">{b.branchPhone || '-'}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(b)}
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(b)}
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
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      No branches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View (under lg) */}
        <div className="block lg:hidden space-y-4">
          {branches.length > 0 ? (
            branches.map((b, index) => (
              <div key={b.id} className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md hover:border-gray-700 transition-all animate-fade-in">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      #{index + 1}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">{b.branchName}</h4>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs border-t border-gray-800/60 pt-3">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Phone / Mobile</span>
                    <span className="text-white font-medium">{b.branchPhone || '-'}</span>
                  </div>
                </div>
                <div className="border-t border-gray-800/60 pt-3">
                  <span className="text-gray-400 text-[10px] sm:text-xs block mb-1">Branch Address</span>
                  <p className="text-gray-300 text-xs sm:text-sm font-medium leading-relaxed bg-[#020B1A] p-2.5 rounded-lg border border-gray-800/40">
                    {b.branchAddress}
                  </p>
                </div>
                <div className="flex gap-2.5 pt-3 border-t border-gray-800/60">
                  <button
                    onClick={() => handleEdit(b)}
                    className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(b)}
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
              No branches found. Click <span className="text-[#AED500] font-medium">+ Add New Branch</span> to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBranches;

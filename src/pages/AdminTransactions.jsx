import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import Pagination from '../components/Pagination';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Loader from '../components/Loader';

// ── Pagination constant ───────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ── Zod schema ────────────────────────────────────────────────────────────────
const TransactionSchema = z.object({
  date: z.string().optional(),
  projectId: z.string().min(1, 'Please select a project'),
  type: z.enum(['Income', 'Expense']),
  category: z.string().min(1, 'Category is required'),
  amount: z.string().min(1, 'Amount is required').refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  description: z.string().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
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
    hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-[#AED500]'
  }`;



// ── Main Component ────────────────────────────────────────────────────────────
const AdminTransactions = () => {
  const toast = useToast();

  const [transactions, setTransactions]         = useState([]);
  const [projects, setProjects]                 = useState([]);
  const [isLoading, setIsLoading]               = useState(true);
  const [isFormOpen, setIsFormOpen]             = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [serverError, setServerError]           = useState('');
  const [deleteTarget, setDeleteTarget]         = useState(null); // { id, label }
  const [currentPage, setCurrentPage]           = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(TransactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      projectId: '',
      type: 'Income',
      category: '',
      amount: '',
      description: '',
    },
  });

  const watchedProjectId = watch('projectId');
  const selectedProject  = projects.find((p) => p.id === watchedProjectId);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTransactions = async (silent = false, activeRef = { current: true }) => {
    if (!silent) setIsLoading(true);
    try {
      const projRes = await api.get('/projects');
      if (!activeRef.current) return;
      const projData = projRes.data;

      const mappedProjects = projData.map(p => ({
        id: p._id,
        projectId: p.projectRefId,
        projectName: p.projectName,
        clientName: p.clientName,
        clientPhone: p.clientMobile,
        location: p.location,
      }));
      setProjects(mappedProjects);

      const allTxnsPromises = projData.map(async (p) => {
        try {
          const txnRes = await api.get(`/projects/${p._id}/transactions`);
          return txnRes.data.map(t => ({
            id: t._id,
            date: t.createdAt ? t.createdAt.split('T')[0] : '',
            projectId: p.projectRefId,
            projectObjectId: p._id,
            clientName: p.clientName,
            clientPhone: p.clientMobile,
            location: p.location,
            type: t.type === 'CREDIT' ? 'Income' : 'Expense',
            category: t.title,
            description: t.description || '',
            amount: t.amount,
          }));
        } catch (err) {
          console.error(`Failed to load transactions for project ${p._id}:`, err);
          return [];
        }
      });

      const results  = await Promise.all(allTxnsPromises);
      if (!activeRef.current) return;
      const flattened = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(flattened);

      if (!silent && flattened.length > 0) {
        toast.info(`${flattened.length} transaction${flattened.length !== 1 ? 's' : ''} loaded`);
      }
    } catch (err) {
      if (!activeRef.current) return;
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch transactions');
    } finally {
      if (activeRef.current && !silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const activeRef = { current: true };
    fetchTransactions(false, activeRef);
    return () => {
      activeRef.current = false;
    };
  }, []);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const paginated  = transactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => { setCurrentPage(1); }, [transactions.length]);

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingTransaction(null);
    setServerError('');
    reset({
      date: new Date().toISOString().split('T')[0],
      projectId: '',
      type: 'Income',
      category: '',
      amount: '',
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction.id);
    setServerError('');
    reset({
      date: transaction.date,
      projectId: transaction.projectObjectId,
      type: transaction.type,
      category: transaction.category,
      amount: String(transaction.amount),
      description: transaction.description,
    });
    setIsFormOpen(true);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteClick = (transaction) => {
    setDeleteTarget({
      id: transaction.id,
      label: `${transaction.category} — ₹${Number(transaction.amount).toLocaleString('en-IN')}`,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/projects/transactions/${deleteTarget.id}`);
      toast.success('Transaction deleted successfully');
      setDeleteTarget(null);
      await fetchTransactions(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete transaction');
      setDeleteTarget(null);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setServerError('');
    const body = {
      projectId: data.projectId,
      type: data.type === 'Income' ? 'CREDIT' : 'DEBIT',
      title: data.category,
      description: data.description || '',
      amount: Number(data.amount),
    };

    try {
      if (editingTransaction) {
        await api.patch(`/projects/transactions/${editingTransaction}`, body);
        toast.success(`Transaction updated successfully`);
      } else {
        await api.post('/projects/transactions/create', body);
        toast.success(`Transaction added successfully`);
      }
      setIsFormOpen(false);
      await fetchTransactions(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save transaction';
      setServerError(msg);
      toast.error(msg);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-sm text-gray-400 mt-1">Manage and view project incomes and expenses.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2 px-4 sm:py-2.5 sm:px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer text-sm sm:text-base w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Transaction
        </button>
      </header>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete Transaction?"
          entityName="Transaction"
          label={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Form Modal ─────────────────────────────────────────────────────── */}
      {isFormOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-left animate-fade-in"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 font-sans">
              {serverError && (
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {serverError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Date</label>
                  <input type="date" {...register('date')} className={inputCls(errors.date)} style={{ colorScheme: 'dark' }} />
                  <FieldError message={errors.date?.message} />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Project *</label>
                  <select {...register('projectId')} className={inputCls(errors.projectId)}>
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.clientName} ({p.projectId})
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.projectId?.message} />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Client Name</label>
                  <input
                    type="text"
                    value={selectedProject?.clientName || ''}
                    className="w-full border border-gray-800 rounded-lg py-2 px-3 bg-[#010813] text-gray-400 cursor-not-allowed focus:outline-none text-sm"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Client Phone</label>
                  <input
                    type="text"
                    value={selectedProject?.clientPhone || ''}
                    className="w-full border border-gray-800 rounded-lg py-2 px-3 bg-[#010813] text-gray-400 cursor-not-allowed focus:outline-none text-sm"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Location</label>
                  <input
                    type="text"
                    value={selectedProject?.location || ''}
                    className="w-full border border-gray-800 rounded-lg py-2 px-3 bg-[#010813] text-gray-400 cursor-not-allowed focus:outline-none text-sm"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Type *</label>
                  <select {...register('type')} className={inputCls(errors.type)}>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                  <FieldError message={errors.type?.message} />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Category *</label>
                  <input
                    type="text"
                    {...register('category')}
                    className={inputCls(errors.category)}
                    placeholder="e.g. Material cost, Consultation fee"
                  />
                  <FieldError message={errors.category?.message} />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Amount *</label>
                  <input
                    type="number"
                    {...register('amount')}
                    className={inputCls(errors.amount)}
                    placeholder="e.g. 50000"
                  />
                  <FieldError message={errors.amount?.message} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Description</label>
                  <textarea
                    {...register('description')}
                    rows="3"
                    className={inputCls(errors.description)}
                    placeholder="Transaction details..."
                  />
                  <FieldError message={errors.description?.message} />
                </div>
              </div>

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
                  {isSubmitting ? 'Saving…' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Transactions Toggle ─────────────────────────────────────────────── */}
      <div className="mt-6">
        {/* Desktop View (lg and above) */}
        <div className="hidden lg:block bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#020B1A] border-b border-gray-800">
                  <th className="py-3 px-3 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center w-10">S.No</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Project ID</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Description</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-4">
                      <Loader message="Loading transactions..." />
                    </td>
                  </tr>
                ) : paginated.length > 0 ? (
                  paginated.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-gray-500 text-xs text-center font-medium">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-4 text-gray-300">{t.date}</td>
                      <td className="py-3 px-4 text-[#AED500] font-bold">{t.projectId}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          t.type === 'Income'
                            ? 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{t.category}</td>
                      <td className="py-3 px-4 text-gray-400 max-w-[200px] truncate" title={t.description}>{t.description || '-'}</td>
                      <td className="py-3 px-4 text-gray-100 font-medium text-right">
                        ₹{Number(t.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(t)}
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(t)}
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
                    <td colSpan="8" className="py-12 text-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                      </svg>
                      No transactions found. Click <span className="text-[#AED500] font-medium">+ Add New Transaction</span> to get started.
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
            totalItems={transactions.length}
            pageSize={PAGE_SIZE}
            itemName="transactions"
          />
        </div>

        {/* Mobile View (under lg) */}
        <div className="block lg:hidden">
          <div className="space-y-4">
            {isLoading ? (
              <Loader message="Loading transactions..." />
            ) : paginated.length > 0 ? (
              paginated.map((t, idx) => (
                <div key={t.id} className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md hover:border-gray-700 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        #{(currentPage - 1) * PAGE_SIZE + idx + 1} • <span className="text-[#AED500] font-bold">{t.projectId}</span>
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">{t.category}</h4>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${
                      t.type === 'Income'
                        ? 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                    }`}>
                      {t.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-gray-800/60 py-3">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Date</span>
                      <span className="text-white font-medium">{t.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Amount</span>
                      <span className="text-[#AED500] font-semibold">₹{Number(t.amount).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Client</span>
                      <span className="text-white font-medium">{t.clientName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Phone</span>
                      <span className="text-white font-medium">{t.clientPhone || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400 block mb-0.5">Location</span>
                      <span className="text-white font-medium">{t.location || '-'}</span>
                    </div>
                    {t.description && (
                      <div className="col-span-2 mt-1">
                        <span className="text-gray-400 block mb-0.5">Description</span>
                        <p className="text-gray-300 leading-relaxed bg-[#020B1A] p-2.5 rounded-lg border border-gray-800/40 text-[11px] sm:text-xs">
                          {t.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleEdit(t)}
                      className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(t)}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
                No transactions found. Click <span className="text-[#AED500] font-medium">+ Add New Transaction</span> to get started.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl mt-4 overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={transactions.length}
                pageSize={PAGE_SIZE}
                itemName="transactions"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTransactions;

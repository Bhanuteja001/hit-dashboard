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
const StoreTransactionSchema = z.object({
  date:     z.string().optional(),
  store:    z.string().min(1, 'Please select a store'),
  trxnType: z.enum(['CREDIT', 'DEBIT']),
  amount:   z.string().min(1, 'Amount is required').refine(
    val => !isNaN(Number(val)) && Number(val) > 0,
    { message: 'Amount must be a positive number' }
  ),
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
  `w-full border rounded-lg py-1.5 sm:py-2 px-2.5 sm:px-3 bg-[#020B1A] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
    hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-[#AED500]'
  }`;



// ── Main Component ────────────────────────────────────────────────────────────
const AdminStoreTransactions = () => {
  const toast = useToast();

  const [transactions, setTransactions]       = useState([]);
  const [stores, setStores]                   = useState([]);
  const [isFormOpen, setIsFormOpen]           = useState(false);
  const [editingTxn, setEditingTxn]           = useState(null); // id of txn being edited
  const [serverError, setServerError]         = useState('');
  const [deleteTarget, setDeleteTarget]       = useState(null); // { id, label }
  const [currentPage, setCurrentPage]         = useState(1);

  // Calculation Modal State
  const [isCalcOpen, setIsCalcOpen]           = useState(false);
  const [calcFromDate, setCalcFromDate]       = useState('');
  const [calcToDate, setCalcToDate]           = useState('');
  const [calcStoreId, setCalcStoreId]         = useState('');
  const [calcResult, setCalcResult]           = useState(null);

  const handleOpenCalculation = () => {
    setCalcFromDate('');
    setCalcToDate('');
    setCalcStoreId('');
    setCalcResult(null);
    setIsCalcOpen(true);
  };

  const handleCalculate = (e) => {
    if (e) e.preventDefault();
    if (!calcStoreId) {
      toast.error('Please select a branch');
      return;
    }
    if (calcFromDate && calcToDate && calcFromDate > calcToDate) {
      toast.error('From Date cannot be after To Date');
      return;
    }

    const filtered = transactions.filter(t => {
      const isStoreMatch = calcStoreId === 'ALL' ? true : t.storeId === calcStoreId;
      const isAfterFrom = calcFromDate ? t.date >= calcFromDate : true;
      const isBeforeTo = calcToDate ? t.date <= calcToDate : true;
      return isStoreMatch && isAfterFrom && isBeforeTo;
    });

    let totalCredit = 0;
    let totalDebit = 0;
    filtered.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.trxnType === 'CREDIT') {
        totalCredit += amt;
      } else if (t.trxnType === 'DEBIT') {
        totalDebit += amt;
      }
    });

    setCalcResult({
      totalCredit,
      totalDebit,
      netBalance: totalCredit - totalDebit,
      count: filtered.length
    });
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(StoreTransactionSchema),
    defaultValues: {
      date:     new Date().toISOString().split('T')[0],
      store:    '',
      trxnType: 'CREDIT',
      amount:   '',
    },
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = async (silent = false, activeRef = { current: true }) => {
    try {
      // 1. Fetch stores
      const storeRes  = await api.get('/stores');
      if (!activeRef.current) return;
      const storesData = storeRes.data;

      const mappedStores = storesData.map(s => ({
        id:      s._id,
        name:    s.name,
        address: s.address,
      }));
      setStores(mappedStores);

      // 2. Fetch transactions for each store concurrently
      const allTxnPromises = storesData.map(async (store) => {
        try {
          const txnRes = await api.get(`/stores/${store._id}/transactions`);
          return txnRes.data.map(t => ({
            id:       t._id,
            date:     t.createdAt ? t.createdAt.split('T')[0] : '',
            storeId:  store._id,
            store:    store.name,
            trxnType: t.type,
            amount:   t.amount,
          }));
        } catch (err) {
          console.error(`Failed to load transactions for store ${store._id}:`, err);
          return [];
        }
      });

      const results   = await Promise.all(allTxnPromises);
      if (!activeRef.current) return;
      const flattened = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(flattened);

      if (!silent && flattened.length > 0) {
        toast.info(`${flattened.length} store transaction${flattened.length !== 1 ? 's' : ''} loaded`);
      }
    } catch (err) {
      if (!activeRef.current) return;
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch store transactions');
    }
  };

  useEffect(() => {
    const activeRef = { current: true };
    fetchAll(false, activeRef);
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

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingTxn(null);
    setServerError('');
    reset({
      date:     new Date().toISOString().split('T')[0],
      store:    stores.length > 0 ? stores[0].id : '',
      trxnType: 'CREDIT',
      amount:   '',
    });
    setIsFormOpen(true);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (txn) => {
    setEditingTxn(txn.id);
    setServerError('');
    reset({
      date:     txn.date,
      store:    txn.storeId,
      trxnType: txn.trxnType,
      amount:   String(txn.amount),
    });
    setIsFormOpen(true);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteClick = (txn) => {
    setDeleteTarget({
      id:    txn.id,
      label: `${txn.store} — ${txn.trxnType} ₹${Number(txn.amount).toLocaleString('en-IN')}`,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/stores/transactions/${deleteTarget.id}`);
      toast.success('Store transaction deleted successfully');
      setDeleteTarget(null);
      await fetchAll(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete transaction');
      setDeleteTarget(null);
    }
  };

  // ── Submit (create / update) ───────────────────────────────────────────────
  const onSubmit = async (data) => {
    setServerError('');
    const selectedStore = stores.find(s => s.id === data.store);
    const body = {
      storeId:     data.store,
      type:        data.trxnType,
      title:       'Store Transaction',
      description: `Store transaction for ${selectedStore ? selectedStore.name : 'Branch'}`,
      amount:      Number(data.amount),
    };

    try {
      if (editingTxn) {
        await api.patch(`/stores/transactions/${editingTxn}`, body);
        toast.success('Store transaction updated successfully');
      } else {
        await api.post('/stores/transactions/create', body);
        toast.success('Store transaction added successfully');
      }
      setIsFormOpen(false);
      await fetchAll(true);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Store Transactions</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage and view your store transactions.</p>
        </div>
        <div className="flex flex-row items-center gap-2.5 sm:gap-3">
          <button
            onClick={handleOpenCalculation}
            className="border border-[#AED500] text-[#AED500] hover:bg-[#AED500]/10 font-bold py-2 sm:py-2.5 px-3 sm:px-5 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer text-xs sm:text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M15 11h.01M12 14h.01M15 17h.01M5 12h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculation
          </button>
          <button
            onClick={handleAdd}
            className="bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2 sm:py-2.5 px-3 sm:px-5 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer text-xs sm:text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Transaction
          </button>
        </div>
      </header>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete Transaction?"
          entityName="Store Transaction"
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
            className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white">
                {editingTxn ? 'Edit Store Transaction' : 'New Store Transaction'}
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
                <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm">
                  {serverError}
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Date</label>
                <input
                  type="date"
                  {...register('date')}
                  className={inputCls(errors.date)}
                  style={{ colorScheme: 'dark' }}
                />
                <FieldError message={errors.date?.message} />
              </div>

              {/* Store */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Store Location *</label>
                <select {...register('store')} className={inputCls(errors.store)}>
                  <option value="">Select Store</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <FieldError message={errors.store?.message} />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Transaction Type *</label>
                <select {...register('trxnType')} className={inputCls(errors.trxnType)}>
                  <option value="CREDIT">CREDIT</option>
                  <option value="DEBIT">DEBIT</option>
                </select>
                <FieldError message={errors.trxnType?.message} />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Amount *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-xs sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    {...register('amount')}
                    placeholder="0.00"
                    className={`${inputCls(errors.amount)} pl-7 sm:pl-8`}
                  />
                </div>
                <FieldError message={errors.amount?.message} />
              </div>

              {/* Actions */}
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
                  {isSubmitting ? 'Saving…' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Calculation Modal ──────────────────────────────────────────────── */}
      {isCalcOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-left animate-fade-in"
          onClick={() => {
            setIsCalcOpen(false);
            setCalcResult(null);
          }}
        >
          <div 
            className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#AED500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M15 11h.01M12 14h.01M15 17h.01M5 12h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Calculate Store Summary
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCalcOpen(false);
                  setCalcResult(null);
                }}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCalculate} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* From Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">From Date</label>
                  <input
                    type="date"
                    value={calcFromDate}
                    onChange={(e) => setCalcFromDate(e.target.value)}
                    className={inputCls(false)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">To Date</label>
                  <input
                    type="date"
                    value={calcToDate}
                    onChange={(e) => setCalcToDate(e.target.value)}
                    className={inputCls(false)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Store Selection */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Branch / Store *</label>
                <select 
                  value={calcStoreId} 
                  onChange={(e) => setCalcStoreId(e.target.value)}
                  className={inputCls(!calcStoreId)}
                >
                  <option value="">Select Branch</option>
                  <option value="ALL">All Branches</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Submit & Reset Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg shadow-md transition-colors cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M15 11h.01M12 14h.01M15 17h.01M5 12h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Calculate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalcFromDate('');
                    setCalcToDate('');
                    setCalcStoreId('');
                    setCalcResult(null);
                  }}
                  className="bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
                >
                  Reset
                </button>
              </div>

              {/* Result Area */}
              {calcResult && (
                <div className="pt-4 mt-4 border-t border-gray-800/80 space-y-4 animate-fade-in">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-400 flex items-center justify-between">
                    <span>Calculation Results</span>
                    <span className="bg-[#020B1A] px-2 py-0.5 rounded text-gray-300 border border-gray-800 text-[10px]">
                      {calcResult.count} transaction{calcResult.count !== 1 ? 's' : ''} found
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Credits Card */}
                    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 sm:p-4 text-center">
                      <span className="text-[10px] sm:text-xs font-semibold text-green-400 uppercase tracking-wider block mb-1">Total Credit</span>
                      <span className="text-base sm:text-lg font-bold text-green-300">
                        ₹{calcResult.totalCredit.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Debits Card */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 sm:p-4 text-center">
                      <span className="text-[10px] sm:text-xs font-semibold text-red-400 uppercase tracking-wider block mb-1">Total Debit</span>
                      <span className="text-base sm:text-lg font-bold text-red-300">
                        ₹{calcResult.totalDebit.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Net Balance Card */}
                    <div className={`${
                      calcResult.netBalance >= 0 
                        ? 'bg-blue-500/5 border border-blue-500/20 text-blue-300' 
                        : 'bg-amber-500/5 border border-amber-500/20 text-amber-300'
                    } rounded-xl p-3 sm:p-4 text-center`}>
                      <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider block mb-1 ${
                        calcResult.netBalance >= 0 ? 'text-blue-400' : 'text-amber-400'
                      }`}>Net Balance</span>
                      <span className="text-base sm:text-lg font-bold">
                        {calcResult.netBalance < 0 ? '-' : ''}₹{Math.abs(calcResult.netBalance).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Store Transactions Tables ────────────────────────────────────────── */}
      <div className="mt-6">
        {/* Desktop View (lg and above) */}
        <div className="hidden lg:block bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#020B1A] border-b border-gray-800">
                  <th className="py-3 px-3 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center w-10">S.No</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Store</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-gray-400 text-xs uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {paginated.length > 0 ? (
                  paginated.map((trxn, idx) => (
                    <tr key={trxn.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-gray-500 text-xs text-center font-medium">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-4 text-gray-300">{trxn.date}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {trxn.store}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          trxn.trxnType === 'CREDIT'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {trxn.trxnType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-right text-white">
                        ₹{Number(trxn.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(trxn)}
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(trxn)}
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
                    <td colSpan="6" className="py-12 text-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      No store transactions found. Click <span className="text-[#AED500] font-medium">+ Add New Transaction</span> to get started.
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
            {paginated.length > 0 ? (
              paginated.map((trxn, idx) => (
                <div key={trxn.id} className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md hover:border-gray-700 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        #{(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">{trxn.store}</h4>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
                      trxn.trxnType === 'CREDIT'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {trxn.trxnType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-800/60 pt-3">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Date</span>
                      <span className="text-gray-300 font-medium">{trxn.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Amount</span>
                      <span className="text-white font-semibold">₹{Number(trxn.amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => handleEdit(trxn)}
                      className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(trxn)}
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
                No store transactions found. Click <span className="text-[#AED500] font-medium">+ Add New Transaction</span> to get started.
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

export default AdminStoreTransactions;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import LogoutModal from '../components/LogoutModal';
import MobileHeader from '../components/MobileHeader';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';


const EmployeeTransactionSchema = z.object({
  store: z.string().min(1, 'Please select a store'),
  trxnType: z.enum(['CREDIT', 'DEBIT']),
  amount: z.string().min(1, 'Amount is required').refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  }),
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

function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(EmployeeTransactionSchema),
    defaultValues: {
      store: '',
      trxnType: 'CREDIT',
      amount: '',
    },
  });

  const fetchUserDataAndTransactions = async () => {
    try {
      // 1. Fetch stores
      const storeRes = await api.get('/stores');
      const storesData = storeRes.data;
      const mappedStores = storesData.map(s => ({
        id: s._id,
        name: s.name
      }));
      setStores(mappedStores);

      // 2. Fetch transactions for each store
      const allTxnsPromises = storesData.map(async (store) => {
        try {
          const trxnRes = await api.get(`/stores/${store._id}/transactions`);
          return trxnRes.data.map(t => ({
            id: t._id,
            date: t.createdAt ? t.createdAt.split('T')[0] : '',
            store: store.name,
            trxnType: t.type,
            amount: t.amount
          }));
        } catch (err) {
          console.error(`Failed to load transactions for store ${store._id}:`, err);
          return [];
        }
      });

      const results = await Promise.all(allTxnsPromises);
      const flattened = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(flattened);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDataAndTransactions();
  }, [navigate]);

  const handleAdd = () => {
    setServerError('');
    reset({
      store: stores.length > 0 ? stores[0].id : '',
      trxnType: 'CREDIT',
      amount: '',
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data) => {
    setServerError('');
    const selectedStoreObj = stores.find(s => s.id === data.store);
    const body = {
      storeId: data.store,
      type: data.trxnType,
      title: 'Store Transaction',
      description: `Store transaction for ${selectedStoreObj ? selectedStoreObj.name : 'Branch'}`,
      amount: Number(data.amount),
    };

    try {
      await api.post('/stores/transactions/create', body);
      setIsFormOpen(false);
      fetchUserDataAndTransactions();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save store transaction');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    navigate('/login');
  };

  if (isLoading) {
    return <Loader fullScreen={true} message="Loading Employee Dashboard..." />;
  }

  return (
    <div className="min-h-screen flex font-sans bg-[#020B1A] text-white animate-fade-in">
      {/* Sidebar */}
      <aside className="w-64 bg-[#010813] border-r border-gray-800/50 flex-col hidden md:flex">
        <div className="">
          <img src="/Logo.png" alt="Hit Dashboard Logo" className="w-40 h-auto object-contain mx-auto" />
        </div>

        <nav className="flex-1 px-4 mt-6">
          <ul className="space-y-2">
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#AED500]/10 text-[#AED500] font-medium transition-colors border border-[#AED500]/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Dashboard
              </a>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <img
              className="h-10 w-10 rounded-full object-cover border-2 border-[#AED500]/50"
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=John"
              alt="Profile"
            />
            <div>
              <p className="text-sm font-semibold text-white">{user ? user.name : 'Employee User'}</p>
              <p className="text-xs text-gray-400">{user ? user.role.toUpperCase() : 'EMPLOYEE'}</p>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 cursor-pointer hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <MobileHeader onLogoutClick={() => setIsLogoutModalOpen(true)} />

        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Employee Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage and track your transactions</p>
            </div>
            <button
              onClick={handleAdd}
              className="w-full sm:w-auto bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer text-xs sm:text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Transaction
            </button>
          </header>

          {isFormOpen && createPortal(
            <div 
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-left animate-fade-in"
              onClick={() => setIsFormOpen(false)}
            >
              <div 
                className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-white">New Transaction</h3>
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
                    <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Store Location *</label>
                    <select {...register('store')} className={inputCls(errors.store)}>
                      <option value="">Select Store</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <FieldError message={errors.store?.message} />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Transaction Type *</label>
                    <select {...register('trxnType')} className={inputCls(errors.trxnType)}>
                      <option value="CREDIT">CREDIT</option>
                      <option value="DEBIT">DEBIT</option>
                    </select>
                    <FieldError message={errors.trxnType?.message} />
                  </div>

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
                      {isSubmitting ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          <div className="space-y-4">
            {/* Desktop View (md and above) */}
            <div className="hidden md:block bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-800 bg-[#010813]">
                <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#020B1A] border-b border-gray-800">
                      <th className="py-4 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Date</th>
                      <th className="py-4 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Store</th>
                      <th className="py-4 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Type</th>
                      <th className="py-4 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    {transactions.length > 0 ? (
                      transactions.map((trxn) => (
                        <tr key={trxn.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 text-gray-300">{trxn.date}</td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {trxn.store}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${trxn.trxnType === 'CREDIT'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                              {trxn.trxnType}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-right text-white">
                            ₹{Number(trxn.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>No transactions found.</p>
                            <p className="text-sm mt-1">Click the Add button above to create one.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View (under md) */}
            <div className="block md:hidden space-y-4">
              <div className="px-4 py-3 bg-[#010813] border border-gray-800 rounded-2xl flex justify-between items-center">
                <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
              </div>
              {transactions.length > 0 ? (
                transactions.map((trxn) => (
                  <div key={trxn.id} className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-4 space-y-3 shadow-md animate-fade-in">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">{trxn.store}</h4>
                        <span className="text-[10px] text-gray-500">{trxn.date}</span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${trxn.trxnType === 'CREDIT'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {trxn.trxnType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-800/60 text-xs">
                      <span className="text-gray-400">Amount</span>
                      <span className="text-white font-semibold">₹{Number(trxn.amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl py-12 text-center text-gray-500">
                  <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No transactions found.</p>
                  <p className="text-xs text-gray-400 mt-1">Click the Add button above to create one.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

export default EmployeeDashboard;

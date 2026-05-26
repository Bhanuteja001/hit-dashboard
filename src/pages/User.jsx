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
const UserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  phone: z.string().min(1, 'Phone number is required'),
  role: z.enum(['user', 'admin']),
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
const User = () => {
  const toast = useToast();

  const [users, setUsers]               = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [editingUser, setEditingUser]   = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [serverError, setServerError]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, label }
  const [currentPage, setCurrentPage]   = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'user',
    },
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchUsers = async (silent = false, activeRef = { current: true }) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.get('/auth/users');
      if (!activeRef.current) return;
      const allUsers = res.data.map(u => ({
        id:       u._id,
        name:     u.name,
        email:    u.email,
        password: '••••••••',
        phone:    u.phone || 'N/A',
        role:     u.role,
      }));
      setUsers(allUsers);
      if (!silent && allUsers.length > 0) {
        toast.info(`${allUsers.length} user${allUsers.length !== 1 ? 's' : ''} loaded`);
      }
    } catch (err) {
      if (!activeRef.current) return;
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch users');
    } finally {
      if (activeRef.current && !silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const activeRef = { current: true };
    fetchUsers(false, activeRef);
    return () => {
      activeRef.current = false;
    };
  }, []);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paginated  = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => { setCurrentPage(1); }, [users.length]);

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingUser(null);
    setServerError('');
    reset({
      name:     '',
      email:    '',
      password: '',
      phone:    '',
      role:     'user',
    });
    setIsFormOpen(true);
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleEdit = (user) => {
    setEditingUser(user.id);
    setServerError('');
    reset({
      name:     user.name,
      email:    user.email,
      password: user.password,
      phone:    user.phone === 'N/A' ? '' : user.phone,
      role:     user.role || 'user',
    });
    setIsFormOpen(true);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteClick = (user) => {
    setDeleteTarget({
      id:    user.id,
      label: user.name,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/auth/users/${deleteTarget.id}`);
      toast.success('User deleted successfully');
      setDeleteTarget(null);
      await fetchUsers(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete user');
      setDeleteTarget(null);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setServerError('');
    const body = {
      name:     data.name,
      email:    data.email,
      password: data.password,
      phone:    data.phone,
      role:     data.role,
    };

    try {
      if (editingUser) {
        await api.patch(`/auth/users/${editingUser}`, body);
        toast.success('User updated successfully');
      } else {
        await api.post('/auth/register', body);
        toast.success('User added successfully');
      }
      setIsFormOpen(false);
      await fetchUsers(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save user';
      setServerError(msg);
      toast.error(msg);
    }
  };

  const togglePasswordVisibility = (userId) => {
    setShowPassword(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage and view system users and credentials.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer text-xs sm:text-sm w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New User
        </button>
      </header>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete User?"
          entityName="User"
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
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white">{editingUser ? 'Edit User' : 'New User'}</h3>
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
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Name *</label>
                <input {...register('name')} className={inputCls(errors.name)} placeholder="e.g. John Doe" />
                <FieldError message={errors.name?.message} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Email *</label>
                <input type="email" {...register('email')} className={inputCls(errors.email)} placeholder="e.g. john@hitzone.com" />
                <FieldError message={errors.email?.message} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Password *</label>
                <input {...register('password')} className={inputCls(errors.password)} placeholder="e.g. secret123" />
                <FieldError message={errors.password?.message} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Phone *</label>
                <input type="tel" {...register('phone')} className={inputCls(errors.phone)} placeholder="e.g. +91XXXXXXXXXX" />
                <FieldError message={errors.phone?.message} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5 sm:mb-2">Role *</label>
                <select {...register('role')} className={inputCls(errors.role)}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <FieldError message={errors.role?.message} />
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
                  {isSubmitting ? 'Saving…' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Users Presentation Container ─────────────────────────────────────── */}
      <div className="mt-6">
        {/* Desktop View (lg and above) */}
        <div className="hidden lg:block bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#020B1A] border-b border-gray-800">
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider w-16 text-center">S.No</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Name</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Email</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Password</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Phone</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Role</th>
                  <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="py-4 text-center">
                      <Loader message="Loading users..." />
                    </td>
                  </tr>
                ) : paginated.length > 0 ? (
                  paginated.map((u, index) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 text-gray-400 font-medium text-center">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="py-4 px-6 text-gray-100 font-semibold">{u.name}</td>
                      <td className="py-4 px-6 text-gray-300">{u.email}</td>
                      <td className="py-4 px-6 text-gray-300">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {showPassword[u.id] ? u.password : '••••••••'}
                          </span>
                          {/* Only show toggle password button for real passwords (if not masked placeholders) */}
                          {u.password !== '••••••••' && (
                            <button
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="text-gray-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
                              title={showPassword[u.id] ? "Hide Password" : "Show Password"}
                            >
                              {showPassword[u.id] ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-300">{u.phone}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'admin'
                            ? 'bg-[#AED500]/10 text-[#AED500] border border-[#AED500]/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(u)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors cursor-pointer"
                            title="Delete User"
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
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      No users found. Click <span className="text-[#AED500] font-medium">+ Add New User</span> to get started.
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
            totalItems={users.length}
            pageSize={PAGE_SIZE}
            itemName="users"
          />
        </div>

        {/* Mobile View (under lg) */}
        <div className="block lg:hidden">
          <div className="space-y-4">
            {isLoading ? (
              <Loader message="Loading users..." />
            ) : paginated.length > 0 ? (
              paginated.map((u, index) => (
                <div 
                  key={u.id} 
                  className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md hover:border-gray-700 transition-all animate-fade-in"
                >
                  <div className="flex justify-between items-center border-b border-gray-800/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        #{(currentPage - 1) * PAGE_SIZE + index + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white">{u.name}</h4>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                      u.role === 'admin'
                        ? 'bg-[#AED500]/10 text-[#AED500] border border-[#AED500]/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {u.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-500 text-[10px] sm:text-xs block mb-0.5">Email</span>
                      <span className="text-gray-300 font-medium break-all">{u.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] sm:text-xs block mb-0.5">Phone</span>
                      <span className="text-gray-300 font-medium">{u.phone}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 text-[10px] sm:text-xs block mb-0.5">Password</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-300 text-xs sm:text-sm">
                          {showPassword[u.id] ? u.password : '••••••••'}
                        </span>
                        {u.password !== '••••••••' && (
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-gray-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
                            title={showPassword[u.id] ? "Hide Password" : "Show Password"}
                          >
                            {showPassword[u.id] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2 border-t border-gray-800/60">
                    <button
                      onClick={() => handleEdit(u)}
                      className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(u)}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                No users found. Click <span className="text-[#AED500] font-medium">+ Add New User</span> to get started.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl mt-4 overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={users.length}
                pageSize={PAGE_SIZE}
                itemName="users"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default User;

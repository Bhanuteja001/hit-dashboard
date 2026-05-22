import { useState, useEffect } from 'react';
import api from '../api/axios';
import Loader from '../components/Loader';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { useToast } from '../components/Toast';

const AdminContacts = () => {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setFetchError('');
        const res = await api.get(`/contacts/paginated?page=${page}&limit=${limit}`);
        if (isMounted) {
          setContacts(res.data.contacts);
          setTotalPages(res.data.pagination.pages);
          setTotalRecords(res.data.pagination.total);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setFetchError(err.response?.data?.message || err.message || 'Failed to load contact submissions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
    };
  }, [page, limit, refreshTrigger]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setLoading(true);
      await api.delete(`/contacts/${deleteTarget._id}`);
      toast.success('Contact submission deleted successfully');
      
      if (contacts.length === 1 && page > 1) {
        setPage(prev => prev - 1);
      } else {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete submission');
      setLoading(false);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Contact Submissions</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          View and manage customer contact and enquiry submissions.
        </p>
      </header>

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 animate-fade-in">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="py-12">
          <Loader message="Fetching submissions..." />
        </div>
      ) : (
        <div className="mt-6">
          {/* Desktop View (lg and above) */}
          <div className="hidden lg:block bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#020B1A] border-b border-gray-800">
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider w-16">S.No</th>
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Date</th>
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Name</th>
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Email</th>
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Phone</th>
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Service Required</th>
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider">Message</th>
                    <th className="py-3 px-6 font-semibold text-gray-400 text-sm uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {contacts.length > 0 ? (
                    contacts.map((contact, index) => (
                      <tr key={contact._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 text-gray-400 font-medium">
                          {(page - 1) * limit + index + 1}
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          {formatDate(contact.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-gray-100 font-semibold">
                          {contact.name}
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          <a href={`mailto:${contact.email}`} className="text-[#AED500] hover:underline">
                            {contact.email}
                          </a>
                        </td>
                        <td className="py-4 px-6 text-gray-300">
                          {contact.phone}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#AED500]/10 text-[#AED500] border border-[#AED500]/25">
                            {contact.serviceRequired}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-300 max-w-xs truncate" title={contact.message}>
                          {contact.message}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setDeleteTarget(contact)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Delete submission"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-gray-500">
                        No contact submissions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View (under lg) */}
          <div className="block lg:hidden space-y-4">
            {contacts.length > 0 ? (
              contacts.map((contact, index) => (
                <div key={contact._id} className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md hover:border-gray-700 transition-all animate-fade-in">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        #{(page - 1) * limit + index + 1} &bull; {formatDate(contact.createdAt)}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">{contact.name}</h4>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(contact)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Delete submission"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-gray-800/60 pt-3">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Email</span>
                      <a href={`mailto:${contact.email}`} className="text-[#AED500] hover:underline break-all font-medium">
                        {contact.email}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Phone</span>
                      <span className="text-white font-medium">{contact.phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Service Required</span>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#AED500]/10 text-[#AED500] border border-[#AED500]/25">
                        {contact.serviceRequired}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-800/60 pt-3">
                    <span className="text-gray-400 text-[10px] sm:text-xs block mb-1">Message</span>
                    <p className="text-gray-300 text-xs sm:text-sm font-medium leading-relaxed bg-[#020B1A] p-2.5 rounded-lg border border-gray-800/40 break-words whitespace-pre-wrap">
                      {contact.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl py-12 text-center text-gray-500">
                No contact submissions found.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <span className="text-xs sm:text-sm text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
              </span>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-800 bg-[#0f1a2e] text-xs sm:text-sm font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
                      p === page
                        ? 'bg-[#AED500] border-[#AED500] text-[#020B1A]'
                        : 'border-gray-800 bg-[#0f1a2e] text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-800 bg-[#0f1a2e] text-xs sm:text-sm font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete Submission?"
          entityName="Submission by"
          label={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminContacts;

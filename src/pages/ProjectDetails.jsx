import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import Loader from '../components/Loader';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjectData = async () => {
    setIsLoading(true);
    try {
      // Fetch project details
      const projectRes = await api.get(`/projects/${id}`);
      const projectData = projectRes.data;
      setProject(projectData);

      // Fetch transactions for this project
      const transactionsRes = await api.get(`/projects/${id}/transactions`);
      setTransactions(transactionsRes.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch project details');
      navigate('/admin'); // Redirect back to admin dashboard on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  if (isLoading) {
    return <Loader fullScreen={true} message="Loading project details..." />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#020B1A] text-white flex flex-col items-center justify-center font-sans p-6">
        <div className="text-center max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <p className="text-gray-400 mb-6">The project you are looking for does not exist or has been deleted.</p>
          <Link to="/admin" className="inline-flex items-center gap-2 bg-[#AED500] hover:bg-[#9cc000] text-[#020B1A] font-bold py-2.5 px-6 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // --- Calculations ---
  const creditTxns = transactions.filter(t => t.type === 'CREDIT');
  const debitTxns = transactions.filter(t => t.type === 'DEBIT');

  const totalCredit = creditTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDebit = debitTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const projectCost = Number(project.budget) || 0;
  const netProfit = totalCredit - totalDebit;
  const remainingBudget = projectCost - totalCredit;

  const calculateDuration = (start, end) => {
    if (!start) return '-';
    const d1 = new Date(start);
    const d2 = end ? new Date(end) : new Date();
    if (isNaN(d1) || isNaN(d2)) return '-';
    const days = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} Day${days !== 1 ? 's' : ''}` : '0 Days';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const projectStatus = project.endDate ? 'Completed' : 'Pending';

  return (
    <div className="min-h-screen bg-[#020B1A] text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm font-semibold mb-2 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Projects
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{project.projectName}</h1>
              <span className="text-sm font-bold text-[#AED500] bg-[#AED500]/10 border border-[#AED500]/25 px-2.5 py-1 rounded-md">
                {project.projectRefId}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                projectStatus === 'Completed'
                  ? 'bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30'
                  : 'bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30'
              }`}>
                {projectStatus}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Detailed project report, financial metrics, and transaction ledgers.</p>
          </div>
        </header>

        {/* Financial Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Project Budget */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-5 shadow-sm space-y-2 hover:border-gray-700 transition-all">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Project Budget</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">₹{projectCost.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-gray-500">Initial allocated budget</p>
          </div>

          {/* Card 2: Total Income (Credit) */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-5 shadow-sm space-y-2 hover:border-gray-700 transition-all">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Received</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#00FF00]">₹{totalCredit.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-green-500/80 font-medium">{creditTxns.length} credit transactions</p>
          </div>

          {/* Card 3: Total Expenses (Debit) */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-5 shadow-sm space-y-2 hover:border-gray-700 transition-all">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Spent</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-400">₹{totalDebit.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-red-400/80 font-medium">{debitTxns.length} debit transactions</p>
          </div>

          {/* Card 4: Net Profit */}
          <div className={`bg-[#0f1a2e] border border-gray-800 rounded-2xl p-5 shadow-sm space-y-2 hover:border-gray-700 transition-all`}>
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${netProfit >= 0 ? 'text-[#00FF00]' : 'text-red-400'}`}>
              ₹{netProfit.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-gray-500">Income minus expenses</p>
          </div>

          {/* Card 5: Remaining Budget */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-5 shadow-sm space-y-2 hover:border-gray-700 transition-all">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-bold uppercase tracking-wider">Remaining Budget</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#AED500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${remainingBudget >= 0 ? 'text-white' : 'text-red-500'}`}>
              ₹{remainingBudget.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-gray-500">Budget minus received amount</p>
          </div>
        </div>

        {/* Project Details Panel */}
        <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-800 pb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#AED500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Project Specification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">Client Name</span>
              <span className="text-white font-medium text-base">{project.clientName}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">Client Phone</span>
              <span className="text-white font-medium text-base">{project.clientMobile}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">Location</span>
              <span className="text-white font-medium text-base">{project.location}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">Area (sft)</span>
              <span className="text-white font-medium text-base">{project.area || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">Start Date</span>
              <span className="text-white font-medium text-base">{formatDate(project.startDate)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">End Date</span>
              <span className="text-white font-medium text-base">{project.endDate ? formatDate(project.endDate) : '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">Project Duration</span>
              <span className="text-white font-medium text-base">{calculateDuration(project.startDate, project.endDate)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold mb-1">Description</span>
              <span className="text-white font-medium text-base block max-w-sm truncate" title={project.projectDescription}>
                {project.projectDescription || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions Ledgers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Credit Ledger (Income) */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-base sm:text-lg font-bold text-white mb-4 pb-2 border-b border-gray-800/80 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00FF00]"></span>
                Credit Transactions (Income)
              </span>
              <span className="text-xs text-[#00FF00] font-bold bg-[#00FF00]/10 border border-[#00FF00]/30 px-2 py-0.5 rounded-md">
                ₹{totalCredit.toLocaleString('en-IN')}
              </span>
            </h3>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-800/80 text-gray-400">
                    <th className="py-2.5 px-2 font-semibold">Date</th>
                    <th className="py-2.5 px-2 font-semibold">Category</th>
                    <th className="py-2.5 px-2 font-semibold">Description</th>
                    <th className="py-2.5 px-2 font-semibold">Added By</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-gray-300">
                  {creditTxns.length > 0 ? (
                    creditTxns.map((t) => (
                      <tr key={t._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-2 font-medium">{formatDate(t.createdAt)}</td>
                        <td className="py-2.5 px-2 font-semibold">{t.title}</td>
                        <td className="py-2.5 px-2 text-gray-400 max-w-[120px] truncate" title={t.description}>
                          {t.description || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-gray-400">{t.addedBy || 'Admin'}</td>
                        <td className="py-2.5 px-2 text-[#00FF00] font-bold text-right">
                          ₹{t.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        No credit transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Debit Ledger (Expenses) */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
            <h3 className="text-base sm:text-lg font-bold text-white mb-4 pb-2 border-b border-gray-800/80 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                Debit Transactions (Expenses)
              </span>
              <span className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-md">
                ₹{totalDebit.toLocaleString('en-IN')}
              </span>
            </h3>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-800/80 text-gray-400">
                    <th className="py-2.5 px-2 font-semibold">Date</th>
                    <th className="py-2.5 px-2 font-semibold">Category</th>
                    <th className="py-2.5 px-2 font-semibold">Description</th>
                    <th className="py-2.5 px-2 font-semibold">Added By</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-gray-300">
                  {debitTxns.length > 0 ? (
                    debitTxns.map((t) => (
                      <tr key={t._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-2 font-medium">{formatDate(t.createdAt)}</td>
                        <td className="py-2.5 px-2 font-semibold">{t.title}</td>
                        <td className="py-2.5 px-2 text-gray-400 max-w-[120px] truncate" title={t.description}>
                          {t.description || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-gray-400">{t.addedBy || 'Admin'}</td>
                        <td className="py-2.5 px-2 text-red-400 font-bold text-right">
                          ₹{t.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        No debit transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;

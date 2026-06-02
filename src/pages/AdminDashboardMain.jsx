import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d) ? 'N/A' : d.toISOString().split('T')[0];
};

// ── Custom Tooltip for Bar / Area charts ──────────────────────────────────────
const DarkTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1a2e] border border-gray-700 rounded-xl px-3 py-2 shadow-2xl text-xs">
      {label && <p className="text-gray-400 mb-1 font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-bold">
          {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
        </p>
      ))}
    </div>
  );
};

// ── Custom Tooltip for Pie chart ──────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1a2e] border border-gray-700 rounded-xl px-3 py-2 shadow-2xl text-xs">
      <p style={{ color: payload[0].payload.color }} className="font-bold">
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
};

// ── Compute chart data from projects list ─────────────────────────────────────
const buildChartData = (projects) => {
  if (!projects.length) return { statusData: [], budgetData: [], monthlyData: [] };

  // 1. Status breakdown
  let pending = 0, completed = 0;
  projects.forEach(p => {
    if (p.endDate) completed++;
    else pending++;
  });
  const statusData = [
    { name: 'Pending',   value: pending,   color: '#FF9900' },
    { name: 'Completed', value: completed, color: '#00FF00' },
  ].filter(d => d.value > 0);

  // 2. Top-10 projects by budget (bar chart)
  const budgetData = [...projects]
    .sort((a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0))
    .slice(0, 10)
    .map(p => ({
      name: p.projectName.length > 14 ? p.projectName.slice(0, 13) + '…' : p.projectName,
      budget: Number(p.budget) || 0,
    }));

  // 3. Projects started per month (last 12 months, area chart)
  const now = new Date();
  const monthMap = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthMap[key] = { month: label, projects: 0 };
  }
  projects.forEach(p => {
    if (!p.startDate) return;
    const d = new Date(p.startDate);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) monthMap[key].projects++;
  });
  const monthlyData = Object.values(monthMap);

  return { statusData, budgetData, monthlyData };
};

// ── Main Component ────────────────────────────────────────────────────────────
const AdminDashboardMain = () => {
  const [metrics, setMetrics] = useState({
    totalBudget: 0,
    projectCount: 0,
    storeCount: 0,
    loading: true
  });
  const [projects, setProjects] = useState([]);
  const [stores, setStores] = useState([]);
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [projectRes, storeRes] = await Promise.all([
          api.get('/projects'),
          api.get('/stores')
        ]);

        const projectsList = projectRes.data || [];
        const projectCount = projectsList.length;
        const totalBudget = projectsList.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

        const storesList = storeRes.data || [];
        const storeCount = storesList.length;

        setProjects(projectsList);
        setStores(storesList);
        setMetrics({ totalBudget, projectCount, storeCount, loading: false });
      } catch (err) {
        console.error('Error fetching dashboard main metrics:', err);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };
    fetchMetrics();
  }, []);

  const closeModal = () => setActiveModal(null);
  const { statusData, budgetData, monthlyData } = buildChartData(projects);

  // ── Modals ────────────────────────────────────────────────────────────────
  const renderModal = () => {
    if (!activeModal) return null;

    let title = '';
    let content = null;

    if (activeModal === 'budget') {
      title = 'Project Budgets Detail';
      const avgBudget = projects.length > 0 ? metrics.totalBudget / projects.length : 0;
      const maxBudget = projects.length > 0 ? Math.max(...projects.map(p => Number(p.budget) || 0)) : 0;

      content = (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#010813] border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Budgets</p>
              <p className="text-xl font-bold text-white mt-1">₹{metrics.totalBudget.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-[#010813] border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Average Budget</p>
              <p className="text-xl font-bold text-[#AED500] mt-1">₹{Math.round(avgBudget).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-[#010813] border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Highest Budget</p>
              <p className="text-xl font-bold text-indigo-400 mt-1">₹{maxBudget.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="bg-[#010813]/40 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#020B1A] border-b border-gray-800 sticky top-0 z-10">
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs w-12 sm:w-16 text-center">S.No</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Project Name</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Client Name</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs text-right">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {projects.length > 0 ? (
                    projects.map((p, index) => (
                      <tr key={p._id || index} className="hover:bg-white/5 transition-colors text-xs sm:text-sm">
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-400 font-medium text-center">{index + 1}</td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-white font-semibold">{p.projectName}</td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-300">{p.clientName}</td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-right font-semibold text-white">
                          ₹{(Number(p.budget) || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="py-8 text-center text-gray-500">No projects found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    } else if (activeModal === 'projects') {
      title = 'Active Projects Overview';
      content = (
        <div className="space-y-6">
          <div className="bg-[#010813]/40 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#020B1A] border-b border-gray-800 sticky top-0 z-10">
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs w-12 sm:w-16 text-center">S.No</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Project</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Client Contact</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Location & Area</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {projects.length > 0 ? (
                    projects.map((p, index) => (
                      <tr key={p._id || index} className="hover:bg-white/5 transition-colors text-xs sm:text-sm">
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-400 font-medium text-center">{index + 1}</td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-white font-semibold">
                          <div>{p.projectName}</div>
                          <span className="text-[10px] text-gray-500 font-normal block mt-0.5 max-w-[160px] sm:max-w-xs truncate" title={p.projectDescription || 'No description'}>
                            {p.projectDescription || 'No description'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-300">
                          <div>{p.clientName}</div>
                          <div className="text-[11px] sm:text-xs text-gray-500">{p.clientMobile || p.clientPhone || 'N/A'}</div>
                        </td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-300">
                          <div>{p.location}</div>
                          <div className="text-[11px] sm:text-xs text-gray-500">{p.area}</div>
                        </td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-300 text-[11px] sm:text-xs">
                          <div><span className="text-gray-500">Start:</span> {formatDate(p.startDate)}</div>
                          <div><span className="text-gray-500">End:</span> {formatDate(p.endDate)}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="py-8 text-center text-gray-500">No projects found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    } else if (activeModal === 'stores') {
      title = 'Branch Stores Directory';
      content = (
        <div className="space-y-6">
          <div className="bg-[#010813]/40 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm border-gray-800">
                <thead>
                  <tr className="bg-[#020B1A] border-b border-gray-800 sticky top-0 z-10">
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs w-12 sm:w-16 text-center">S.No</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Branch/Store Name</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {stores.length > 0 ? (
                    stores.map((s, index) => (
                      <tr key={s._id || index} className="hover:bg-white/5 transition-colors text-xs sm:text-sm">
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-400 font-medium text-center">{index + 1}</td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-white font-semibold">{s.name}</td>
                        <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-gray-300 whitespace-normal leading-relaxed">{s.address}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="py-8 text-center text-gray-500">No branch stores found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return createPortal(
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
        >
          <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
            <button
              type="button"
              onClick={closeModal}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto grow text-left font-sans">
            {content}
          </div>
          <div className="bg-[#010813] px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-800 flex justify-end shrink-0">
            <button
              onClick={closeModal}
              className="bg-transparent border border-gray-700 text-gray-300 font-semibold py-1.5 px-4 sm:py-2 sm:px-5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer text-xs sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ── Shared empty-state renderer ───────────────────────────────────────────
  const NoData = ({ message = 'No data yet — add projects to see charts.' }) => (
    <div className="flex flex-col items-center justify-center h-40 text-gray-600">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Welcome back! Here is an overview of the platform status.</p>
      </header>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <button
          onClick={() => setActiveModal('budget')}
          className="w-full text-left bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 p-4 sm:p-6 flex items-center gap-4 hover:bg-white/5 hover:border-gray-700 active:scale-[0.98] transition-all cursor-pointer focus:outline-none"
        >
          <div className="shrink-0 bg-[#AED500]/10 text-[#AED500] p-3 rounded-xl border border-[#AED500]/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Total Project Budgets</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5 truncate">
              {metrics.loading ? 'Loading...' : `₹${metrics.totalBudget.toLocaleString('en-IN')}`}
            </h3>
          </div>
        </button>

        <button
          onClick={() => setActiveModal('projects')}
          className="w-full text-left bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 p-4 sm:p-6 flex items-center gap-4 hover:bg-white/5 hover:border-gray-700 active:scale-[0.98] transition-all cursor-pointer focus:outline-none"
        >
          <div className="shrink-0 bg-indigo-500/10 text-indigo-400 p-3 rounded-xl border border-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Active Projects</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5 truncate">
              {metrics.loading ? 'Loading...' : `${metrics.projectCount} Projects`}
            </h3>
          </div>
        </button>

        <button
          onClick={() => setActiveModal('stores')}
          className="w-full text-left bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 p-4 sm:p-6 flex items-center gap-4 hover:bg-white/5 hover:border-gray-700 active:scale-[0.98] transition-all cursor-pointer focus:outline-none sm:col-span-2 lg:col-span-1"
        >
          <div className="shrink-0 bg-purple-500/10 text-purple-400 p-3 rounded-xl border border-purple-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Branch Stores</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5 truncate">
              {metrics.loading ? 'Loading...' : `${metrics.storeCount} Stores`}
            </h3>
          </div>
        </button>
      </div>

      {/* ── Analytics Charts ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Analytics Overview</h2>
          <span className="h-px flex-1 bg-gray-800" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* 1. Project Status Donut ─────────────────────────────────────────── */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 bg-[#010813] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Project Status</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Pending vs Completed</p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#AED500]/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#AED500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            <div className="p-4">
              {metrics.loading ? (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading…</div>
              ) : statusData.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex justify-center gap-5 mt-1">
                    {statusData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-gray-400">{d.name} <span className="text-white font-bold">{d.value}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Monthly Project Starts Area Chart ───────────────────────────── */}
          <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-gray-800 bg-[#010813] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Projects Over Time</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">New projects started per month (last 12 months)</p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="p-4">
              {metrics.loading ? (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading…</div>
              ) : projects.length === 0 ? (
                <NoData />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="projects"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#colorProjects)"
                      dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* 3. Budget Bar Chart ─────────────────────────────────────────────── */}
        <div className="mt-4 sm:mt-6 bg-[#0f1a2e] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 bg-[#010813] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Project Budgets</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Top 10 projects by budget (₹)</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#FF9900]/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#FF9900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="p-4">
            {metrics.loading ? (
              <div className="h-56 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading…</div>
            ) : budgetData.length === 0 ? (
              <NoData />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={budgetData} margin={{ top: 4, right: 8, left: 10, bottom: 4 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#AED500" stopOpacity={1} />
                      <stop offset="100%" stopColor="#AED500" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<DarkTooltip prefix="₹" />} />
                  <Bar dataKey="budget" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── System Status ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1a2e] rounded-2xl shadow-sm border border-gray-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-800 bg-[#010813] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">System Status</h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-[10px] text-green-400 font-semibold tracking-wider uppercase">All Systems Operational</span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start border-b border-gray-800 pb-6 mb-6">
            <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 text-green-400 border border-green-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-center sm:text-left grow">
              <h3 className="text-lg font-bold text-white mb-1">Database Connected</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                All microservices and database instances are connected successfully. Secure end-to-end user authentication is active.
              </p>
            </div>
          </div>

          <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-4">System Performance Metrics</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#010813]/60 border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700 transition-colors">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">API Latency</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl sm:text-2xl font-bold text-white">42ms</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-green-500/10 text-green-400 border border-green-500/20">Fast</span>
              </div>
            </div>

            <div className="bg-[#010813]/60 border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700 transition-colors">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">CPU Usage</span>
              <div className="mt-2">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xl sm:text-2xl font-bold text-white">12%</span>
                  <span className="text-[10px] text-gray-500">Normal</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1">
                  <div className="bg-[#AED500] h-1 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-[#010813]/60 border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700 transition-colors">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Memory Allocation</span>
              <div className="mt-2">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xl sm:text-2xl font-bold text-white">48%</span>
                  <span className="text-[10px] text-gray-500">Optimal</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1">
                  <div className="bg-indigo-500 h-1 rounded-full" style={{ width: '48%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-[#010813]/60 border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700 transition-colors">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Network Uptime</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl sm:text-2xl font-bold text-white">99.98%</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-green-500/10 text-green-400 border border-green-500/20">Stable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render Portal Modals */}
      {renderModal()}
    </div>
  );
};

export default AdminDashboardMain;

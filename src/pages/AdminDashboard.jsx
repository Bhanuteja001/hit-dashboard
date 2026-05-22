import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminProjects from './AdminProjects';
import AdminTransactions from './AdminTransactions';
import AdminStoreTransactions from './AdminStoreTransactions';
import AdminBranches from './AdminBranches';
import AdminDashboardMain from './AdminDashboardMain';
import User from './user';
import AdminContacts from './AdminContacts';
import LogoutModal from '../components/LogoutModal';
import MobileHeader from '../components/MobileHeader';
import Loader from '../components/Loader';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const TAB_KEY = 'adminActiveTab';

function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem(TAB_KEY) || 'Dashboard'
  );
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(false);

  const handleTabChange = (tabName) => {
    if (tabName === activeTab) return;
    setIsTabLoading(true);
    setActiveTab(tabName);
    sessionStorage.setItem(TAB_KEY, tabName);
    setTimeout(() => {
      setIsTabLoading(false);
    }, 450);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };


  const menuItems = [
    {
      name: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      )
    },
    {
      name: 'Projects',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: 'Transactions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: 'Store Transactions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      )
    },
    {
      name: 'Branches',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: 'Users',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: 'Contact Submissions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
        </svg>
      )
    },
  ];

  const renderContent = () => {
    if (isTabLoading) {
      return <Loader message={`Loading ${activeTab}...`} />;
    }
    const content = (() => {
      switch (activeTab) {
        case 'Dashboard': return <AdminDashboardMain />;
        case 'Projects': return <AdminProjects />;
        case 'Transactions': return <AdminTransactions />;
        case 'Store Transactions': return <AdminStoreTransactions />;
        case 'Branches': return <AdminBranches />;
        case 'Users': return <User />;
        case 'Contact Submissions': return <AdminContacts />;
        default: return <AdminDashboardMain />;
      }
    })();
    return <div className="animate-fade-in">{content}</div>;
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#020B1A] text-white animate-fade-in">
      {/* Sidebar */}
      <aside className="w-64 bg-[#010813] border-r border-gray-800/50 flex-col hidden md:flex">
        <div className="">
          <img src="/Logo.png" alt="Hit Dashboard Logo" className="w-40 h-auto object-contain mx-auto" />
        </div>

        <nav className="flex-1 px-4 mt-6">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => handleTabChange(item.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors border ${activeTab === item.name
                    ? 'bg-[#AED500]/10 text-[#AED500] border-[#AED500]/20'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                    }`}
                >
                  {item.icon}
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <img
              className="h-10 w-10 rounded-full object-cover border-2 border-[#AED500]/50"
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane"
              alt="Profile"
            />
            <div>
              <p className="text-sm font-semibold text-white">{user ? user.name : 'Admin User'}</p>
              <p className="text-xs text-gray-400">{user ? user.role.toUpperCase() : 'ADMIN'}</p>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full cursor-pointer flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
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

        {/* Mobile Nav Dropdown */}
        <div className="md:hidden p-4 border-b border-gray-800/50 bg-[#020B1A]">
          <select
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value)}
            className="w-full bg-[#0f1a2e] border border-gray-700 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#AED500]"
          >
            {menuItems.map(item => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="max-w-full mx-auto p-6 lg:p-8">
          {renderContent()}
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

export default AdminDashboard;

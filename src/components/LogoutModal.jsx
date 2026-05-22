import React from 'react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-opacity duration-300">
      <div className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 mb-4 border border-red-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Logout</h3>
        <p className="text-gray-400 mb-6">Are you sure you want to logout of your account?</p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-transparent border border-gray-700 text-gray-300 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 cursor-pointer bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-colors"
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;

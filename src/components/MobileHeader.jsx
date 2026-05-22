import React from 'react';

const MobileHeader = ({ onLogoutClick }) => {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800/50 bg-[#010813]">
      <img src="/Logo.png" alt="Hit Dashboard Logo" className="w-24 h-auto object-contain" />
      <button onClick={onLogoutClick} className="text-red-400 text-sm font-medium">Logout</button>
    </div>
  );
};

export default MobileHeader;

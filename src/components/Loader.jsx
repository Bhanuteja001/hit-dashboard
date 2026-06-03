import React from 'react';
import { createPortal } from 'react-dom';

const Loader = ({ fullScreen = false, message = 'Loading details...', className = '' }) => {
  const loaderContent = (
    <div className={`transition-all duration-300 ${fullScreen
      ? 'fixed inset-0 flex flex-col items-center justify-center bg-[#020B1A] z-[100]'
      : `flex flex-col items-center justify-center min-h-[350px] w-full py-12 bg-transparent animate-fade-in ${className}`
      }`}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing shadow layer */}
        <div className="absolute w-20 h-20 rounded-full bg-[#AED500]/5 blur-lg"></div>

        {/* Outer Spinning Ring */}
        <div className="w-16 h-16 rounded-full border-3 border-transparent border-t-[#AED500] border-r-[#AED500]/30 animate-spin"></div>

        {/* Inner Reverse Spinning Ring */}
        <div className="absolute w-11 h-11 rounded-full border-3 border-transparent border-b-[#AED500]/80 border-l-[#AED500]/20 animate-spin-reverse"></div>

        {/* Glowing Center Core */}
        <div className="absolute w-4 h-4 rounded-full bg-[#AED500] shadow-[0_0_12px_#AED500] animate-pulse"></div>
      </div>

      {/* Branding and Loading message */}
      <div className="mt-6 flex flex-col items-center text-center">
        <span className="text-[#AED500] text-[10px] font-bold tracking-[0.3em] uppercase mb-1">HIT GROUP</span>
        <p className="text-gray-400 text-xs font-semibold tracking-wider animate-pulse">{message}</p>
      </div>
    </div>
  );

  if (fullScreen) {
    return createPortal(loaderContent, document.body);
  }

  return loaderContent;
};

export default Loader;


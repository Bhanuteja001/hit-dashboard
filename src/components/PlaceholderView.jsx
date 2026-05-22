import React from 'react';

const PlaceholderView = ({ title }) => {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
        <p className="text-gray-400 mt-1">Manage and view your {title} details.</p>
      </header>
      <div className="bg-[#0f1a2e] p-8 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 font-medium text-lg">{title} Content Comming Soon...</p>
      </div>
    </div>
  );
};

export default PlaceholderView;

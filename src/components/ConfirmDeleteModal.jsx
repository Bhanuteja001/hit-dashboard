import React from 'react';
import { createPortal } from 'react-dom';

const ConfirmDeleteModal = ({
  title = 'Delete Item?',
  entityName = '',
  label,
  onConfirm,
  onCancel,
  description,
}) => {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-[#0f1a2e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 text-center animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/10 mx-auto mb-3 sm:mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-white mb-1">{title}</h3>
        {description ? (
          <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-6">{description}</p>
        ) : (
          <p className="text-xs sm:text-sm text-gray-400 mb-5 sm:mb-6">
            {entityName ? `${entityName} ` : ''}
            <span className="text-white font-medium">"{label}"</span> will be permanently removed. This action cannot be undone.
          </p>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="w-full sm:flex-1 bg-transparent border border-gray-700 text-gray-300 font-semibold py-2 sm:py-2.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer text-xs sm:text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 sm:py-2.5 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDeleteModal;

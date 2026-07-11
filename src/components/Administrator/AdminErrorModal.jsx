import React from 'react';

function AdminErrorModal({ open, title, message, onClose, buttonText = 'Try Again' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <span className="text-xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="max-w-xs mx-auto block px-6 py-3 bg-[#4285F4] text-white rounded-2xl font-semibold shadow-lg shadow-[#4285F4]/30 hover:shadow-2xl hover:bg-[#357AE8] transition text-sm"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export default AdminErrorModal;

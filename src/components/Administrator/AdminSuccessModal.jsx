import React from 'react';

function AdminSuccessModal({ open, message, title = 'Success' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <span className="text-xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center justify-center">
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#4285f4', animationDelay: '0s' }}></div>
          <div className="w-2 h-2 rounded-full animate-bounce mx-1" style={{ backgroundColor: '#4285f4', animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#4285f4', animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

export default AdminSuccessModal;

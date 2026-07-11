import React from 'react';

function AdminSessionExpiredModal({ open, message, onReturnToLogin }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-t-4 border-amber-500">
        <div className="flex flex-col items-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-3">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-red-700">Session Expired</h2>
        </div>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">{message}</p>
        <button
          onClick={onReturnToLogin}
          className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}

export default AdminSessionExpiredModal;

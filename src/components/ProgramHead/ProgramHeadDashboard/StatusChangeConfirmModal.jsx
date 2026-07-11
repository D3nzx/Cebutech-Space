import React from "react";
import { X } from "lucide-react";

function StatusChangeConfirmModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300">
          <div className="p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X size={20} className="text-slate-700" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">Confirm Status Change</h2>
            <p className="text-sm text-slate-600 mt-2">Are you sure you want to proceed with this status change?</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatusChangeConfirmModal;

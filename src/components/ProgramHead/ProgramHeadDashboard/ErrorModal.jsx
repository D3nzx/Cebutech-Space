import React from 'react';
import Modal from './Modal';
import { Wifi, Lock } from 'lucide-react';

function ErrorModal({ isOpen, onClose, error, onRetry }) {
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    
    // Handle specific error types
    if (error?.message) {
      if (error.message.includes("Could not find the table") || error.message.toLowerCase().includes('schema cache')) {
        return (
          <div className="space-y-4">
            <p className="text-sm">
              We couldn't access the <strong className="text-red-700">courses</strong> table. This typically occurs after creating or renaming tables while database metadata updates.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">Try these steps:</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">1.</span>
                  <span>Verify the table name is <code className="bg-red-100 px-2 py-1 rounded text-xs font-mono">public.courses</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">2.</span>
                  <span>Wait a few seconds for database metadata to sync</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">3.</span>
                  <span>Try the operation again or refresh your browser</span>
                </li>
              </ul>
            </div>
          </div>
        );
      }
      if (error.message.includes('duplicate key value violates unique constraint')) {
        return (
          <div className="space-y-3">
            <p>A course with this code already exists in the system.</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-2">💡 Suggestion</p>
              <p className="text-sm text-slate-700">Choose a different course code or name to avoid duplicates.</p>
            </div>
          </div>
        );
      }
      if (error.message.includes('network')) {
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Wifi className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Network connection error</p>
                <p className="text-sm text-slate-700 mt-1">Please check your internet connection and try again.</p>
              </div>
            </div>
          </div>
        );
      }
      if (error.message.includes('permission')) {
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Permission denied</p>
                <p className="text-sm text-slate-700 mt-1">You don't have permission to perform this action.</p>
              </div>
            </div>
          </div>
        );
      }
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const getErrorTitle = (error) => {
    if (typeof error === 'string') return 'Error Occurred';
    
    if (error?.message) {
      if (error.message.includes("Could not find the table") || error.message.toLowerCase().includes('schema cache')) {
        return 'Database Table Unavailable';
      }
      if (error.message.includes('duplicate key value violates unique constraint')) {
        return 'Duplicate Entry Detected';
      }
      if (error.message.includes('network')) {
        return 'Connection Lost';
      }
      if (error.message.includes('permission')) {
        return 'Permission Denied';
      }
    }
    
    return 'Something Went Wrong';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getErrorTitle(error)}
      type="error"
      primaryAction={onRetry}
      secondaryAction={onClose}
      primaryLabel={onRetry ? 'Try Again' : 'Close'}
      secondaryLabel={'Dismiss'}
    >
      {getErrorMessage(error)}
    </Modal>
  );
}

export default ErrorModal;

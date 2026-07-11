import React from 'react';
import Modal from './Modal';
import { CheckCircle } from 'lucide-react';

function SuccessModal({ isOpen, onClose, title = "Success!", message, action }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type="success"
      secondaryLabel="Great!"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed">{message}</p>
        
        {action && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Update confirmed</p>
              <p className="text-sm text-slate-700 mt-1">{action}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default SuccessModal;

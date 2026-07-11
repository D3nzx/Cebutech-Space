import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  type = 'info',
  primaryAction,
  secondaryAction,
  primaryLabel,
  secondaryLabel,
  showClose = false
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle escape key and animations
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      setIsAnimating(true);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 150);
  };

  if (!isOpen && !isAnimating) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: <AlertCircle size={32} className="text-white" />,
          gradient: 'from-red-600 to-red-700',
          bgIcon: 'bg-red-500/20',
          titleColor: 'text-red-900',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          bgHighlight: 'bg-red-50',
          buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
        };
      case 'success':
        return {
          icon: <CheckCircle size={32} className="text-white" />,
          gradient: 'from-emerald-600 to-emerald-700',
          bgIcon: 'bg-emerald-500/20',
          titleColor: 'text-emerald-900',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          bgHighlight: 'bg-emerald-50',
          buttonColor: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={32} className="text-white" />,
          gradient: 'from-amber-600 to-amber-700',
          bgIcon: 'bg-amber-500/20',
          titleColor: 'text-amber-900',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          bgHighlight: 'bg-amber-50',
          buttonColor: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-300'
        };
      default:
        return {
          icon: <Info size={32} className="text-white" />,
          gradient: 'from-blue-600 to-blue-700',
          bgIcon: 'bg-blue-500/20',
          titleColor: 'text-blue-900',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          bgHighlight: 'bg-blue-50',
          buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Enhanced Backdrop with blur */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-200 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      ></div>

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`} style={{ contain: 'layout' }}>
          {/* Gradient Header Background */}
          <div className={`bg-gradient-to-br ${typeStyles.gradient} p-8 text-white`}>
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${typeStyles.bgIcon} backdrop-blur-sm`}>
                {typeStyles.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{title}</h2>
                <div className="mt-1 h-1 w-12 rounded-full bg-white/30"></div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          {showClose && (
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 rounded-full p-2 bg-white hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <X size={20} className="text-slate-900" />
            </button>
          )}

          {/* Content */}
          <div className="px-8 py-6">
            <div className={`text-sm ${typeStyles.textColor} space-y-3`}>
              {children}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-slate-200 bg-slate-50/50 px-8 py-4 sm:justify-end">
            {primaryAction || secondaryAction || primaryLabel || secondaryLabel ? (
              <>
                {(primaryAction || primaryLabel) && (
                  <button
                    type="button"
                    onClick={primaryAction || handleClose}
                    className={`px-6 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 ${typeStyles.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    {primaryLabel || (type === 'error' ? 'Retry' : 'Confirm')}
                  </button>
                )}
                {(secondaryAction || secondaryLabel) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (secondaryAction) {
                        secondaryAction();
                      } else {
                        handleClose();
                      }
                    }}
                    className={`px-6 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 ${typeStyles.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    {secondaryLabel || 'Dismiss'}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className={`px-6 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 ${typeStyles.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                {type === 'error' ? 'Try Again' : type === 'success' ? 'Great!' : 'Got it'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;



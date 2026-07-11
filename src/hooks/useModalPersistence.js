import { useEffect, useCallback } from 'react';

/**
 * Custom hook for persisting modal state and form data across page refreshes
 * Stores modal open/closed state and form data in sessionStorage
 * 
 * @param {string} modalKey - Unique key for this modal (e.g., 'scheduleFormModal')
 * @param {object} formData - Current form data state
 * @param {number} currentStep - Current step in multi-step form
 * @param {boolean} isOpen - Whether modal is currently open
 * @param {function} setFormData - State setter for form data
 * @param {function} setCurrentStep - State setter for current step
 * @param {function} setIsOpen - State setter for modal open state
 * @returns {object} - Object with methods to save and clear modal state
 */
export const useModalPersistence = (
  modalKey,
  formData,
  currentStep,
  isOpen,
  setFormData,
  setCurrentStep,
  setIsOpen
) => {
  // Check if form has significant data (not just empty defaults)
  const hasSignificantData = useCallback(() => {
    if (!formData) return false;
    // Check if any field has meaningful data
    return Object.values(formData).some(value => value && value !== '');
  }, [formData]);

  // Save modal state to sessionStorage only if there's significant data
  const saveModalState = useCallback(() => {
    if (isOpen && hasSignificantData()) {
      const modalState = {
        isOpen: true,
        formData,
        currentStep,
        timestamp: Date.now()
      };
      sessionStorage.setItem(`modal_${modalKey}`, JSON.stringify(modalState));
      console.log(`💾 Saved modal state for ${modalKey}:`, modalState);
    } else if (isOpen && !hasSignificantData()) {
      // Clear saved state if modal is open but empty
      sessionStorage.removeItem(`modal_${modalKey}`);
    }
  }, [modalKey, formData, currentStep, isOpen, hasSignificantData]);

  // Restore modal state from sessionStorage on component mount
  const restoreModalState = useCallback(() => {
    try {
      const savedState = sessionStorage.getItem(`modal_${modalKey}`);
      if (savedState) {
        const { isOpen: wasOpen, formData: savedFormData, currentStep: savedStep } = JSON.parse(savedState);
        
        if (wasOpen && savedFormData) {
          console.log(`♻️ Restoring modal state for ${modalKey}:`, { formData: savedFormData, currentStep: savedStep });
          setFormData(savedFormData);
          if (savedStep) setCurrentStep(savedStep);
          setIsOpen(true);
          return true;
        }
      }
    } catch (error) {
      console.error(`❌ Error restoring modal state for ${modalKey}:`, error);
    }
    return false;
  }, [modalKey, setFormData, setCurrentStep, setIsOpen]);

  // Clear modal state from sessionStorage
  const clearModalState = useCallback(() => {
    sessionStorage.removeItem(`modal_${modalKey}`);
    console.log(`🗑️ Cleared modal state for ${modalKey}`);
  }, [modalKey]);

  // Save state whenever form data or step changes and modal is open
  useEffect(() => {
    if (isOpen) {
      saveModalState();
    }
  }, [formData, currentStep, isOpen, saveModalState]);

  return {
    restoreModalState,
    clearModalState,
    saveModalState
  };
};

/**
 * Hook to restore modal state on component mount
 * Call this in a useEffect with empty dependency array in parent component
 */
export const useRestoreModalOnMount = (modalKey, setFormData, setCurrentStep, setIsOpen) => {
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem(`modal_${modalKey}`);
      if (savedState) {
        const { isOpen: wasOpen, formData: savedFormData, currentStep: savedStep } = JSON.parse(savedState);
        
        if (wasOpen && savedFormData) {
          console.log(`♻️ Restoring modal on mount for ${modalKey}:`, { formData: savedFormData, currentStep: savedStep });
          setFormData(savedFormData);
          if (savedStep) setCurrentStep(savedStep);
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error(`❌ Error restoring modal on mount for ${modalKey}:`, error);
    }
  }, [modalKey, setFormData, setCurrentStep, setIsOpen]);
};

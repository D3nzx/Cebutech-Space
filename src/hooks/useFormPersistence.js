import { useEffect, useCallback } from 'react';

/**
 * Custom hook for persisting form data across page refreshes
 * Automatically saves form data object to sessionStorage
 * 
 * @param {string} formKey - Unique key for this form (e.g., 'loginForm', 'registerForm')
 * @param {object} formData - Current form data state (object with all form fields)
 * @param {boolean} shouldPersist - Whether to persist this form (default: true)
 * @returns {object} - Object with methods to clear and restore form data
 */
export const useFormPersistence = (
  formKey,
  formData,
  shouldPersist = true
) => {
  // Save form data to sessionStorage whenever it changes
  const saveFormData = useCallback(() => {
    if (shouldPersist && formData) {
      try {
        sessionStorage.setItem(`form_${formKey}`, JSON.stringify({
          formData,
          timestamp: Date.now()
        }));
        console.log(`💾 Saved form data for ${formKey}:`, formData);
      } catch (error) {
        console.error(`❌ Error saving form data for ${formKey}:`, error);
      }
    }
  }, [formKey, formData, shouldPersist]);

  // Clear form data from sessionStorage
  const clearFormData = useCallback(() => {
    try {
      sessionStorage.removeItem(`form_${formKey}`);
      console.log(`🗑️ Cleared form data for ${formKey}`);
    } catch (error) {
      console.error(`❌ Error clearing form data for ${formKey}:`, error);
    }
  }, [formKey]);

  // Auto-save form data whenever it changes
  useEffect(() => {
    if (shouldPersist) {
      saveFormData();
    }
  }, [formData, saveFormData, shouldPersist]);

  return {
    clearFormData,
    saveFormData
  };
};

/**
 * Hook to restore form data on component mount
 * Returns the saved form data if it exists
 */
export const useRestoreFormOnMount = (formKey, shouldPersist = true) => {
  const [restoredData, setRestoredData] = useCallback(() => {
    if (!shouldPersist) return null;

    try {
      const savedData = sessionStorage.getItem(`form_${formKey}`);
      if (savedData) {
        const { formData: savedFormData } = JSON.parse(savedData);
        if (savedFormData && Object.keys(savedFormData).length > 0) {
          console.log(`♻️ Restoring form on mount for ${formKey}:`, savedFormData);
          return savedFormData;
        }
      }
    } catch (error) {
      console.error(`❌ Error restoring form on mount for ${formKey}:`, error);
    }
    return null;
  }, [formKey, shouldPersist]);

  useEffect(() => {
    const data = restoredData();
    setRestoredData(data);
  }, [formKey, shouldPersist]);

  return restoredData;
};

/**
 * Simpler hook - just get saved form data
 */
export const getSavedFormData = (formKey) => {
  try {
    const savedData = sessionStorage.getItem(`form_${formKey}`);
    if (savedData) {
      const { formData: savedFormData } = JSON.parse(savedData);
      if (savedFormData && Object.keys(savedFormData).length > 0) {
        console.log(`♻️ Retrieved saved form data for ${formKey}:`, savedFormData);
        return savedFormData;
      }
    }
  } catch (error) {
    console.error(`❌ Error retrieving form data for ${formKey}:`, error);
  }
  return null;
};

/**
 * Hook to clear form data when component unmounts or on logout
 */
export const useClearFormOnUnmount = (formKey) => {
  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem(`form_${formKey}`);
        console.log(`🗑️ Cleared form data for ${formKey} on unmount`);
      } catch (error) {
        console.error(`❌ Error clearing form data for ${formKey}:`, error);
      }
    };
  }, [formKey]);
};

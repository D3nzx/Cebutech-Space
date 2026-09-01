/**
 * Password validation utility
 * Ensures passwords meet security requirements
 */

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  uppercase: true,  // At least one A-Z
  lowercase: true,  // At least one a-z
  number: true,     // At least one 0-9
  special: true     // At least one special char
};

/**
 * Validate a password against security requirements
 * @param {string} password - The password to validate
 * @returns {object} { valid: boolean, errors: string[] }
 * @example
 * const result = validatePassword('weak');
 * // { valid: false, errors: ['At least 8 characters', 'At least one uppercase letter', ...] }
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }

  if (PASSWORD_REQUIREMENTS.uppercase && !/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter (A-Z)');
  }

  if (PASSWORD_REQUIREMENTS.lowercase && !/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter (a-z)');
  }

  if (PASSWORD_REQUIREMENTS.number && !/[0-9]/.test(password)) {
    errors.push('At least one number (0-9)');
  }

  if (PASSWORD_REQUIREMENTS.special && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get a human-readable string of requirements
 * @returns {string} Formatted requirements text
 */
export const getPasswordRequirementsText = () => {
  const reqs = [];
  reqs.push(`${PASSWORD_REQUIREMENTS.minLength}+ characters`);
  if (PASSWORD_REQUIREMENTS.uppercase) reqs.push('Uppercase letter');
  if (PASSWORD_REQUIREMENTS.lowercase) reqs.push('Lowercase letter');
  if (PASSWORD_REQUIREMENTS.number) reqs.push('Number');
  if (PASSWORD_REQUIREMENTS.special) reqs.push('Special character (!@#$%^&*)');
  
  return 'Password must have: ' + reqs.join(', ');
};

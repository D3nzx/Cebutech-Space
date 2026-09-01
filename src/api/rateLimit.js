// Reusable rate limiting utility for login attempts
// Usage: checkLoginRateLimit(email), recordLoginAttempt(email), clearLoginAttempts(email)

const RATE_LIMIT_KEY_PREFIX = 'login_attempts_';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 1000; // 30 seconds

/**
 * Get the storage key for a user's login attempts
 */
const getStorageKey = (email) => `${RATE_LIMIT_KEY_PREFIX}${email}`;

/**
 * Check if login is rate limited for this email
 * @returns { allowed: boolean, remaining: number }
 */
export const checkLoginRateLimit = (email) => {
  try {
    const key = getStorageKey(email);
    const data = sessionStorage.getItem(key);
    const attempts = data ? JSON.parse(data) : [];
    const now = Date.now();

    // Remove attempts older than the window
    const recentAttempts = attempts.filter(t => now - t < WINDOW_MS);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
      const lastAttempt = recentAttempts[recentAttempts.length - 1];
      const timeSinceLastAttempt = now - lastAttempt;

      // Check if still in lockout period
      if (timeSinceLastAttempt < LOCKOUT_MS) {
        const remainingSeconds = Math.ceil((LOCKOUT_MS - timeSinceLastAttempt) / 1000);
        return { allowed: false, remaining: remainingSeconds };
      }

      // Lockout period expired, reset attempts
      sessionStorage.removeItem(key);
      return { allowed: true, remaining: 0 };
    }

    return { allowed: true, remaining: 0 };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remaining: 0 }; // Allow on error (don't block users)
  }
};

/**
 * Record a failed login attempt
 */
export const recordLoginAttempt = (email) => {
  try {
    const key = getStorageKey(email);
    const data = sessionStorage.getItem(key);
    const attempts = data ? JSON.parse(data) : [];
    attempts.push(Date.now());
    sessionStorage.setItem(key, JSON.stringify(attempts));
  } catch (error) {
    console.error('Error recording login attempt:', error);
  }
};

/**
 * Clear login attempts after successful login
 */
export const clearLoginAttempts = (email) => {
  try {
    const key = getStorageKey(email);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing login attempts:', error);
  }
};

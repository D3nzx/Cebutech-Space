import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) {
      setError('Failed to update password. Please try again or contact support.');
    } else {
      setSuccess('Your password has been successfully updated. You may now return to the login page and sign in with your new password. Thank you for keeping your account secure.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
      <main className="w-full flex justify-center">
        <section className="flex flex-col justify-center items-center w-full max-w-md p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 w-full max-w-md">
            <header className="flex flex-col items-center mb-4">
              <h1 className="text-lg md:text-xl font-bold text-gray-800 text-center">Reset Your Password</h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">Please enter and confirm your new password below.</p>
            </header>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
              {success && <div className="text-xs text-green-600 mb-2">{success}</div>}
              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
              {success && (
                <button
                  type="button"
                  className="w-full py-2 px-4 bg-gray-300 text-gray-800 rounded-lg font-semibold mt-2"
                  onClick={() => navigate('/programhead')}
                >
                  Return to Login
                </button>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ResetPassword;

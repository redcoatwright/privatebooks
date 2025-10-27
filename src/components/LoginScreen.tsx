import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Lock, Shield, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onAuthenticated: () => void;
}

export default function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await invoke('verify_password', { password }) as any;
      
      if (result?.success) {
        onAuthenticated();
      } else {
        setError(result?.error || 'Invalid password');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Shield className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            PrivateBooks
          </h1>
          
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            100% Offline & Private
          </p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your password"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Unlock'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-300 text-center">
              <strong>Forgot your password?</strong><br />
              Your data will be permanently lost. There is no recovery option.<br />
              This ensures maximum privacy.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All data stays on your device. Zero cloud storage.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, Lock, Moon, Sun, AlertTriangle, CheckCircle } from 'lucide-react';
import PasswordWarningModal from './PasswordWarningModal';

interface ProfilePageProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function ProfilePage({ darkMode, setDarkMode }: ProfilePageProps) {
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    try {
      const result = await invoke('check_password_status') as any;
      if (result?.success) {
        setPasswordEnabled(result.password_enabled);
      }
    } catch (err) {
      console.error('Failed to check password status:', err);
    }
  };

  const handleEnablePassword = async () => {
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const result = await invoke('setup_password', { password: newPassword }) as any;
      
      if (result?.success) {
        setMessage({ type: 'success', text: 'Password protection enabled successfully' });
        setPasswordEnabled(true);
        setShowSetupPassword(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to enable password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to enable password protection' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const result = await invoke('change_password', {
        oldPassword: currentPassword,
        newPassword: newPassword
      }) as any;
      
      if (result?.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to change password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePassword = async () => {
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password' });
      return;
    }

    setLoading(true);
    try {
      const result = await invoke('disable_password', { password: currentPassword }) as any;
      
      if (result?.success) {
        setMessage({ type: 'success', text: 'Password protection disabled' });
        setPasswordEnabled(false);
        setCurrentPassword('');
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to disable password' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disable password protection' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <p className={message.type === 'success' 
              ? 'text-green-800 dark:text-green-300' 
              : 'text-red-800 dark:text-red-300'}>
              {message.text}
            </p>
          </div>
        )}

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <p className="text-purple-900 dark:text-purple-200 font-medium">
              100% Offline & Private
            </p>
          </div>
          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
            All data stays on your device. Zero cloud storage. No analytics. No tracking.
          </p>
        </div>

        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Password Protection</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {passwordEnabled ? 'Password protection is enabled' : 'Protect your data with a password'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {passwordEnabled ? (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                      Enabled
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setShowWarningModal(true);
                        setMessage(null);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>

              {passwordEnabled && (
                <>
                  <button
                    onClick={() => {
                      setShowChangePassword(!showChangePassword);
                      setMessage(null);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white">Change Password</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update your password</p>
                  </button>

                  {showChangePassword && (
                    <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg space-y-3">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="password"
                        placeholder="New password (min 8 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleChangePassword}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Changing...' : 'Change Password'}
                        </button>
                        <button
                          onClick={() => setShowChangePassword(false)}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="font-medium text-red-900 dark:text-red-300 mb-2">Disable Password Protection</h3>
                    <p className="text-sm text-red-800 dark:text-red-400 mb-3">
                      This will remove password protection. Enter your current password to confirm.
                    </p>
                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={handleDisablePassword}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Disabling...' : 'Disable Password Protection'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </h2>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {darkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                </p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {darkMode ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showWarningModal && (
        <PasswordWarningModal
          onConfirm={() => {
            setShowWarningModal(false);
            setShowSetupPassword(true);
          }}
          onCancel={() => setShowWarningModal(false)}
        />
      )}

      {showSetupPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Set Password</h2>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleEnablePassword}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Setting...' : 'Set Password'}
                </button>
                <button
                  onClick={() => {
                    setShowSetupPassword(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

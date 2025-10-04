import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface PasswordWarningModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PasswordWarningModal({ onConfirm, onCancel }: PasswordWarningModalProps) {
  const [understood, setUnderstood] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Critical Privacy Warning
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded">
            <p className="text-red-900 dark:text-red-200 font-semibold">
              If you forget your password, your financial data will be PERMANENTLY LOST
            </p>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded">
            <p className="text-red-900 dark:text-red-200 font-semibold">
              There is NO password recovery mechanism
            </p>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded">
            <p className="text-red-900 dark:text-red-200 font-semibold">
              This ensures maximum privacy - we cannot access your data even if compelled to do so
            </p>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-6">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                <p className="text-gray-700 dark:text-gray-300">Maximum privacy</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
                <p className="text-gray-700 dark:text-gray-300">No password recovery</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
                <p className="text-gray-700 dark:text-gray-300">No "forgot password" option</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 dark:text-red-400 mt-1">✗</span>
                <p className="text-gray-700 dark:text-gray-300">No support can help you</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mt-4">
            <p className="text-purple-900 dark:text-purple-200 font-medium text-center">
              Your data, your responsibility.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-6">
          <input
            type="checkbox"
            id="understand-checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
          />
          <label
            htmlFor="understand-checkbox"
            className="text-gray-900 dark:text-white font-medium cursor-pointer select-none"
          >
            I understand and accept this risk
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!understood}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enable Password Protection
          </button>
        </div>
      </div>
    </div>
  );
}

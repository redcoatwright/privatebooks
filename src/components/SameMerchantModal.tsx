import { useEffect, useRef, useState } from 'react';
import { X, Store, Loader2 } from 'lucide-react';

export interface SameMerchantTransaction {
  id: string;
  date: string;
  merchant: string;
  description?: string;
  amount: number;
  category: string;
  user_modified?: boolean | number;
}

interface SameMerchantModalProps {
  merchant: string;
  category: string;
  transactions: SameMerchantTransaction[];
  applying: boolean;
  onApply: (ids: string[]) => void | Promise<void>;
  onClose: () => void;
}

// Parse 'YYYY-MM-DD' as a LOCAL calendar date. new Date('YYYY-MM-DD') is
// interpreted as UTC midnight, which renders as the previous day west of UTC.
const formatLocalDate = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const pluralize = (count: number, singular: string, plural: string): string =>
  count === 1 ? singular : plural;

export default function SameMerchantModal({
  merchant,
  category,
  transactions,
  applying,
  onApply,
  onClose,
}: SameMerchantModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(transactions.map((t) => t.id))
  );
  const selectAllRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Everything starts checked; reset if a new set of matches comes in.
  useEffect(() => {
    setCheckedIds(new Set(transactions.map((t) => t.id)));
  }, [transactions]);

  // Move focus into the dialog so keyboard users land in it.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applying) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [applying, onClose]);

  const checkedCount = transactions.filter((t) => checkedIds.has(t.id)).length;
  const allChecked = transactions.length > 0 && checkedCount === transactions.length;
  const someChecked = checkedCount > 0 && !allChecked;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked;
    }
  }, [someChecked]);

  const toggleOne = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setCheckedIds(allChecked ? new Set() : new Set(transactions.map((t) => t.id)));
  };

  const handleApply = () => {
    if (checkedCount === 0 || applying) return;
    const ids = transactions.filter((t) => checkedIds.has(t.id)).map((t) => t.id);
    void onApply(ids);
  };

  const otherCount = transactions.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="same-merchant-title"
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-8 border border-gray-200 dark:border-gray-700 outline-none"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
              <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3
                id="same-merchant-title"
                className="text-xl font-bold text-gray-900 dark:text-white break-words"
              >
                Update other transactions from {merchant}?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                You changed this transaction to{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{category}</span>.{' '}
                {otherCount} other {pluralize(otherCount, 'transaction', 'transactions')} from this
                merchant {pluralize(otherCount, 'is', 'are')} in a different category.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={applying}
            aria-label="Close"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-6">
          <label className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 cursor-pointer select-none">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              disabled={applying}
              aria-label="Select all matching transactions"
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              {allChecked ? 'Select none' : 'Select all'} ({checkedCount}/{otherCount})
            </span>
          </label>

          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((t) => {
              const amount = Number(t.amount);
              const isChecked = checkedIds.has(t.id);
              return (
                <li key={t.id}>
                  <label
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(t.id)}
                      disabled={applying}
                      aria-label={`Include ${t.merchant} on ${t.date}`}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-24 shrink-0">
                      {formatLocalDate(t.date)}
                    </span>
                    <span
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate"
                      title={t.description || t.merchant}
                    >
                      {t.merchant}
                    </span>
                    <span
                      className={`text-sm font-bold shrink-0 ${amount > 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      ${Math.abs(amount).toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="inline-block max-w-[9rem] truncate px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        title={t.category}
                      >
                        {t.category}
                      </span>
                      {t.user_modified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          manually set
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={applying}
            className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep just this one
          </button>
          <button
            onClick={handleApply}
            disabled={checkedCount === 0 || applying}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying && <Loader2 className="w-4 h-4 animate-spin" />}
            Change {checkedCount} {pluralize(checkedCount, 'transaction', 'transactions')}
          </button>
        </div>
      </div>
    </div>
  );
}

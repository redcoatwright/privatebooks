import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, FileText, Shield, Lock, Settings, Moon, Sun, Download, Edit, Trash2, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Receipt, PieChart, List, ChevronDown, ChevronRight, X, CloudUpload, Filter, Calendar, Tag, BarChart3, Activity, CreditCard, ShieldCheck, Eye, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// Components remain the same
const Header = ({ darkMode, setDarkMode, onImportClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <header className="glass-effect border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">SecureBank Analyzer</h1>
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <ShieldCheck className="w-3 h-3" />
                <span className="font-medium">100% Offline • Zero Cloud Storage • Your Data Stays Private</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onImportClick}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <FileText className="w-4 h-4" />
            Import CSV/PDF
          </button>
          
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 w-80 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search transactions, merchants, or amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1 text-gray-900 dark:text-white placeholder-gray-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            {darkMode ? <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>
          
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 relative">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

const Sidebar = ({ activeView, setActiveView, stats }) => {
  const [expandedSections, setExpandedSections] = useState({ filters: true, stats: true });
  const [selectedCategories, setSelectedCategories] = useState(['Groceries', 'Transportation', 'Entertainment']);
  const [dateRange, setDateRange] = useState('last30');
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="w-72 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <nav className="p-4 space-y-2">
        <button
          onClick={() => setActiveView('transactions')}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
            activeView === 'transactions' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105' 
              : 'hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
          }`}
        >
          <List className="w-5 h-5" />
          <span className="font-medium">Transactions</span>
          {activeView === 'transactions' && (
            <span className="ml-auto bg-white/20 px-2 py-0.5 rounded text-xs">
              {stats?.transactionCount || 0}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveView('dashboard')}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
            activeView === 'dashboard' 
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105' 
              : 'hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="font-medium">Analytics</span>
        </button>
      </nav>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <button 
            onClick={() => toggleSection('stats')}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Quick Stats</span>
            </div>
            {expandedSections.stats ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {expandedSections.stats && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Total Spending</span>
                </div>
                <span className="text-sm font-bold text-red-600">
                  -${(stats?.totalSpending || 0).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Total Income</span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  +${(stats?.totalIncome || 0).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Net Cash Flow</span>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  ${(stats?.netCashFlow || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">Privacy Protected</p>
              <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                All processing happens locally on your device. No data is sent to any servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const TransactionTable = ({ transactions }) => {
  const [selectedRows, setSelectedRows] = useState(new Set());

  const getCategoryStyle = (category) => {
    const styles = {
      'AI Services': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'Cloud Services': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Entertainment': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'Health & Fitness': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Fitness': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Transportation': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Parking': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'Income': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'Uncategorized': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return styles[category] || styles['Uncategorized'];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Transactions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing {transactions.length} transactions
            </p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Merchant</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(transaction.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {transaction.merchant}
                </td>
                <td className="px-6 py-4 text-sm font-bold">
                  <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryStyle(transaction.category)}`}>
                    {transaction.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${(transaction.confidence || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {Math.round((transaction.confidence || 0) * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Dashboard = ({ summary, categoryData }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Spending</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            -${(summary?.totalSpending || 0).toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Income</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            +${(summary?.totalIncome || 0).toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase">Net Cash Flow</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            ${(summary?.netCashFlow || 0).toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {summary?.transactionCount || 0}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Spending by Category</h3>
        <div className="space-y-4">
          {categoryData.map((category) => (
            <div key={category.name}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category.name}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  ${category.value.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{ width: `${Math.min((category.value / (summary?.totalSpending || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FileUploadModal = ({ isOpen, onClose, onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBrowseFiles = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Bank Statements',
          extensions: ['csv', 'pdf']
        }]
      });
      
      if (selected) {
        setIsProcessing(true);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          setUploadProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              onFileSelected(selected);
              setIsProcessing(false);
              setUploadProgress(0);
              onClose();
            }, 500);
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import Bank Statement</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload your CSV or PDF file</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {!isProcessing ? (
          <>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
              <CloudUpload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
                Click to select your bank statement
              </p>
              <button 
                onClick={handleBrowseFiles}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Files
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Supported: CSV, PDF • Processed locally
              </p>
            </div>
          </>
        ) : (
          <div className="py-12">
            <div className="flex flex-col items-center">
              <FileText className="w-16 h-16 text-blue-600 mb-4 animate-pulse" />
              <p className="text-gray-900 dark:text-white font-medium mb-2">Processing...</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{uploadProgress}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [categoryData, setCategoryData] = useState([]);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Dark mode handling
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load transactions from backend
      const txnResult = await invoke('get_transactions', {});
      if (txnResult?.success && txnResult?.transactions) {
        setTransactions(txnResult.transactions);
      }
      
      // Load summary
      const summaryResult = await invoke('get_spending_summary', {
        start_date: '2025-08-01',
        end_date: '2025-09-30'
      });
      if (summaryResult?.success && summaryResult?.summary) {
        setSummary(summaryResult.summary);
      }
      
      // Load category breakdown
      const categoryResult = await invoke('get_category_breakdown', {
        start_date: '2025-08-01', 
        end_date: '2025-09-30'
      });
      if (categoryResult?.success && categoryResult?.categories) {
        setCategoryData(categoryResult.categories);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty defaults if backend fails
      setTransactions([]);
      setSummary({});
      setCategoryData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelected = async (filePath) => {
    try {
      setLoading(true);
      
      // Determine if PDF or CSV
      const isPDF = filePath.toLowerCase().endsWith('.pdf');
      const command = isPDF ? 'parse_pdf' : 'parse_csv';
      
      // Call backend to parse file
      const result = await invoke(command, { file_path: filePath });
      
      if (result?.success) {
        // Reload all data after successful import
        await loadData();
        alert(`Successfully imported ${result.count || 0} transactions!`);
      } else {
        alert(`Error importing file: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <Lock className="w-20 h-20 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">Loading secure environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex-1 flex flex-col">
        <Header 
          darkMode={darkMode} 
          setDarkMode={setDarkMode}
          onImportClick={() => setIsFileModalOpen(true)}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            activeView={activeView}
            setActiveView={setActiveView}
            stats={summary}
          />
          
          <main className="flex-1 overflow-y-auto p-6">
            {activeView === 'transactions' ? (
              <TransactionTable transactions={transactions} />
            ) : (
              <Dashboard summary={summary} categoryData={categoryData} />
            )}
          </main>
        </div>
        
        <FileUploadModal 
          isOpen={isFileModalOpen}
          onClose={() => setIsFileModalOpen(false)}
          onFileSelected={handleFileSelected}
        />
        
        {/* Test Backend Button - Remove in production */}
        <button 
          onClick={async () => {
            try {
              const result = await invoke('get_transactions', {});
              console.log('Backend response:', result);
              alert('Backend connected! Check console');
            } catch (error) {
              console.error('Backend error:', error);
              alert(`Backend error: ${error}`);
            }
          }}
          className="fixed bottom-4 right-4 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700"
        >
          Test Backend
        </button>
      </div>
    </div>
  );
}
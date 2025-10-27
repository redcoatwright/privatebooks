import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, FileText, Shield, Lock, Settings, Moon, Sun, Download, Edit, Trash2, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Receipt, PieChart, List, ChevronDown, ChevronRight, X, CloudUpload, Filter, Calendar, Tag, BarChart3, Activity, CreditCard, ShieldCheck, Eye, Check, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import LoginScreen from './components/LoginScreen';
import ProfilePage from './components/ProfilePage';

// Components remain the same
const Header = ({ darkMode, setDarkMode, onImportClick, searchTerm, setSearchTerm, onSettingsClick }) => {
  return (
    <header className="glass-effect border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Privatebooks</h1>
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
          
          <button 
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 relative">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
          <span className="font-medium">Dashboard</span>
        </button>
        
        <button
          onClick={() => setActiveView('settings')}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
            activeView === 'settings' 
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105' 
              : 'hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
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

const SortIcon = ({ column, currentSort }) => {
  if (currentSort.key !== column) {
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  }
  
  return currentSort.direction === 'asc' 
    ? <ArrowUp className="w-4 h-4 text-blue-600" />
    : <ArrowDown className="w-4 h-4 text-blue-600" />;
};

const CategoryFilterDropdown = ({ 
  categories, 
  selectedCategories, 
  setSelectedCategories,
  isOpen,
  setIsOpen,
  transactions
}) => {
  const toggleCategory = (category) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };
  
  const selectAll = () => {
    setSelectedCategories(new Set(categories));
  };
  
  const clearAll = () => {
    setSelectedCategories(new Set());
  };
  
  return (
    <div className="relative category-filter">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
      >
        <span>Category</span>
        <Filter className={`w-4 h-4 ${selectedCategories.size > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
        {selectedCategories.size > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
            {selectedCategories.size}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between">
            <button 
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All
            </button>
            <button 
              onClick={clearAll}
              className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 font-medium"
            >
              Clear All
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            {categories.map(category => (
              <label
                key={category}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.has(category)}
                  onChange={() => toggleCategory(category)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                  {category}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                  {transactions.filter(t => t.category === category).length}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionTable = ({ transactions, onUpdate }) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [categoryColors, setCategoryColors] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Generate colors for categories when transactions change
  useEffect(() => {
    const allCategories = [...new Set(transactions.map(t => t.category))];
    const newColors = { ...categoryColors };
    
    allCategories.forEach(category => {
      if (!newColors[category]) {
        newColors[category] = generateColorForCategory();
      }
    });
    
    setCategoryColors(newColors);
  }, [transactions]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCategoryFilterOpen && !(event.target).closest('.category-filter')) {
        setIsCategoryFilterOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryFilterOpen]);

  // Get unique categories for filter
  const allCategories = useMemo(() => {
    const categories = new Set(transactions.map(t => t.category));
    return Array.from(categories).sort();
  }, [transactions]);

  // Filter + Sort transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions];
    
    // Apply category filter
    if (selectedCategories.size > 0) {
      result = result.filter(t => selectedCategories.has(t.category));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortConfig.key === 'amount') {
        aValue = Math.abs(parseFloat(aValue));
        bValue = Math.abs(parseFloat(bValue));
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [transactions, selectedCategories, sortConfig]);

  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const loadCategories = async () => {
    try {
      const result = await invoke('get_categories');
      if (result?.success) {
        setAvailableCategories(result.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const generateColorForCategory = () => {
    // Generate a random pastel color
    const hue = Math.floor(Math.random() * 360);
    const lightBg = `hsl(${hue}, 70%, 95%)`;
    const lightText = `hsl(${hue}, 70%, 35%)`;
    const darkBg = `hsl(${hue}, 40%, 20%)`;
    const darkText = `hsl(${hue}, 70%, 75%)`;
    
    return {
      light: { bg: lightBg, text: lightText },
      dark: { bg: darkBg, text: darkText }
    };
  };

  const getCategoryStyle = (category) => {
    const colors = categoryColors[category];
    if (!colors) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
    
    // Return inline styles for dynamic colors
    return '';
  };

  const getCategoryInlineStyle = (category, isDark) => {
    const colors = categoryColors[category];
    if (!colors) {
      return {};
    }
    
    const colorSet = isDark ? colors.dark : colors.light;
    return {
      backgroundColor: colorSet.bg,
      color: colorSet.text
    };
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditCategory(transaction.category);
  };

  const handleSave = async (transactionId) => {
    if (!editCategory.trim()) {
      alert('Category cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const result = await invoke('update_transaction', {
        transactionId: transactionId,
        updates: { category: editCategory.trim() }
      });
      
      if (result?.success) {
        // Reload categories and transactions
        await loadCategories();
        await onUpdate();
        setEditingId(null);
        setEditCategory('');
      } else {
        alert(`Failed to update: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transactionId) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        const result = await invoke('delete_transaction', {
          transactionId: transactionId
        });
        
        if (result?.success) {
          await onUpdate();
        } else {
          alert(`Failed to delete: ${result?.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert(`Error: ${error}`);
      }
    }
  };

  const handleKeyPress = (e, transactionId) => {
    if (e.key === 'Enter') {
      handleSave(transactionId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditCategory('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Transactions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing {transactions.length} transactions • {availableCategories.length} categories
            </p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th 
                onClick={() => handleSort('date')}
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Date</span>
                  <SortIcon column="date" currentSort={sortConfig} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('merchant')}
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Merchant</span>
                  <SortIcon column="merchant" currentSort={sortConfig} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('amount')}
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Amount</span>
                  <SortIcon column="amount" currentSort={sortConfig} />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                <CategoryFilterDropdown
                  categories={allCategories}
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  isOpen={isCategoryFilterOpen}
                  setIsOpen={setIsCategoryFilterOpen}
                  transactions={transactions}
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {processedTransactions.map((transaction) => (
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
                  {editingId === transaction.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, transaction.id)}
                        className="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter category..."
                        list="category-suggestions"
                        autoFocus
                        disabled={saving}
                      />
                      <datalist id="category-suggestions">
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <span 
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                      style={getCategoryInlineStyle(transaction.category, document.documentElement.classList.contains('dark'))}
                    >
                      {transaction.category}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {editingId === transaction.id ? (
                      <>
                        <button
                          onClick={() => handleSave(transaction.id)}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Save (Enter)"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditCategory('');
                          }}
                          disabled={saving}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                          title="Cancel (Esc)"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
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

const MonthlySpendingChart = ({ data, categories }) => {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const handleMouseEnter = (e, category, value, percentage, monthTotal) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
    setHoveredSegment({ category, value, percentage, monthTotal });
  };

  const handleMouseLeave = () => {
    setHoveredSegment(null);
  };

  // Generate consistent color for any category using hash
  const getCategoryColor = (category) => {
    // Predefined colors for common categories
    const predefinedColors = {
      'AI Services': '#8b5cf6',
      'Cloud Services': '#3b82f6',
      'Entertainment': '#ec4899',
      'Health & Fitness': '#10b981',
      'Transportation': '#f59e0b',
      'Food & Dining': '#ef4444',
      'Shopping': '#06b6d4',
      'Services': '#84cc16',
      'Insurance': '#f97316',
      'Parking': '#64748b',
      'Uncategorized': '#9ca3af'
    };
    
    if (predefinedColors[category]) {
      return predefinedColors[category];
    }
    
    // Generate deterministic color from category name
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Create a vibrant color palette
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 50 + (Math.abs(hash >> 8) % 15); // 50-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const categoryColors = useMemo(() => {
    const colors = {};
    categories.forEach(cat => {
      colors[cat] = getCategoryColor(cat);
    });
    return colors;
  }, [categories]);

  const chartData = useMemo(() => {
    if (!data || Object.keys(data).length === 0 || !categories || categories.length === 0) {
      return [];
    }
    
    const months = Object.keys(data).sort();
    
    return months.map(month => {
      const monthData = { month: formatMonth(month) };
      
      categories.forEach(category => {
        monthData[category] = data[month][category] || 0;
      });
      
      return monthData;
    });
  }, [data, categories]);
  
  const maxValue = useMemo(() => {
    if (!chartData || chartData.length === 0 || !categories || categories.length === 0) {
      return 1;
    }
    return Math.max(...chartData.map(month => 
      categories.reduce((sum, cat) => sum + (month[cat] || 0), 0)
    ), 1);
  }, [chartData, categories]);
  
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Monthly Spending by Category
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No monthly data available. Import transactions to see spending trends.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Monthly Spending by Category
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Stacked view of spending over time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
      </div>
      
      <div className="relative overflow-visible" style={{ height: '400px' }}>
        <div className="flex items-end justify-around h-full gap-1">
          {chartData.map((monthData, index) => {
            const monthTotal = categories.reduce((sum, cat) => sum + (monthData[cat] || 0), 0);
            const barHeight = monthTotal > 0 ? (monthTotal / maxValue) * 90 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col justify-end items-center gap-2 h-full max-w-[80px] relative">
                <div className="flex flex-col w-full rounded-t-lg overflow-visible" style={{ height: `${barHeight}%`, minHeight: monthTotal > 0 ? '20px' : '0' }}>
                  {categories.map((category, catIndex) => {
                    const value = monthData[category] || 0;
                    if (value === 0) return null;
                    
                    const percentage = (value / monthTotal) * 100;
                    
                    return (
                      <div
                        key={catIndex}
                        className="cursor-pointer hover:opacity-90 transition-all w-full first:rounded-t-lg"
                        style={{
                          flexGrow: percentage,
                          backgroundColor: categoryColors[category] || '#6b7280',
                          minHeight: '3px'
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, category, value, percentage, monthTotal)}
                        onMouseLeave={handleMouseLeave}
                      />
                    );
                  })}
                </div>
                
                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  ${monthTotal.toFixed(0)}
                </div>
                
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                  {monthData.month}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-3">
          {categories.filter(category => {
            // Only show categories that have data in the chart
            return chartData.some(month => (month[category] || 0) > 0);
          }).map(category => {
            // Calculate total for this category across all months
            const categoryTotal = chartData.reduce((sum, month) => sum + (month[category] || 0), 0);
            
            return (
              <div key={category} className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: categoryColors[category] || '#6b7280' }}
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {category}
                </span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  ${categoryTotal.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {hoveredSegment && (
        <div 
          className="fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-[9999]"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-semibold">{hoveredSegment.category}</div>
          <div>${hoveredSegment.value.toFixed(2)}</div>
          <div className="text-gray-400">{hoveredSegment.percentage.toFixed(1)}% of month</div>
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          />
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ summary, categoryData }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [monthlySpendingData, setMonthlySpendingData] = useState({});
  const [spendingCategories, setSpendingCategories] = useState([]);

  useEffect(() => {
    loadMonthlySpending();
  }, []);

  const loadMonthlySpending = async () => {
    try {
      const result = await invoke('get_monthly_spending_by_category', {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      }) as any;
      
      if (result?.success) {
        setMonthlySpendingData(result.data);
        setSpendingCategories(result.categories);
      }
    } catch (error) {
      console.error('Error loading monthly spending:', error);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const selected = await save({
        defaultPath: `spending_by_category_${new Date().toISOString().split('T')[0]}.${exportFormat}`,
        filters: [{
          name: exportFormat.toUpperCase(),
          extensions: [exportFormat]
        }]
      });
      
      if (!selected) {
        setExporting(false);
        return;
      }

      const result = await invoke('export_spending', {
        startDate: '2025-08-01',
        endDate: '2025-09-30',
        format: exportFormat,
        filePath: selected
      }) as any;
      
      if (result?.success) {
        alert(`Successfully exported ${result.record_count} categories to ${exportFormat.toUpperCase()}!\nSaved to: ${selected}`);
      } else {
        alert(`Export failed: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export error: ${error}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <MonthlySpendingChart 
        data={monthlySpendingData} 
        categories={spendingCategories}
      />
      
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Spending by Category</h3>
          
          <div className="flex items-center gap-3">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            
            <button
              onClick={handleExport}
              disabled={exporting || !categoryData || categoryData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {categoryData && categoryData.length > 0 ? (
            categoryData.map((category) => {
              const amount = category.total || category.value || 0;
              return (
                <div key={category.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      ${amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${Math.min((amount / (summary?.totalSpending || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No category data available. Import transactions to see spending breakdown.
            </p>
          )}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  // Check password status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load initial data after authentication
  useEffect(() => {
    if (isAuthenticated || !passwordRequired) {
      loadData();
    }
  }, [isAuthenticated, passwordRequired]);

  const checkAuth = async () => {
    try {
      const result = await invoke('check_password_status') as any;
      if (result?.success) {
        setPasswordRequired(result.password_enabled);
        if (!result.password_enabled) {
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  // Dark mode handling
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const loadData = async () => {
    try {
      // Load transactions from backend
      const txnResult = await invoke('get_transactions', {});
      if (txnResult?.success && txnResult?.transactions) {
        setTransactions(txnResult.transactions);
      }
      
      // Load summary
      const summaryResult = await invoke('get_spending_summary', {
        startDate: '2025-08-01',
        endDate: '2025-09-30'
      });
      if (summaryResult?.success && summaryResult?.summary) {
        setSummary(summaryResult.summary);
      }
      
      // Load category breakdown
      const categoryResult = await invoke('get_category_breakdown', {
        startDate: '2025-08-01', 
        endDate: '2025-09-30'
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
    }
  };

  const handleFileSelected = async (filePath) => {
    try {
      setLoading(true);
      
      // Determine if PDF or CSV
      const isPDF = filePath.toLowerCase().endsWith('.pdf');
      const command = isPDF ? 'parse_pdf' : 'parse_csv';
      
      // Call backend to parse file
      const result = await invoke(command, { filePath });
      
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

  if (passwordRequired && !isAuthenticated) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex-1 flex flex-col">
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        onImportClick={() => setIsFileModalOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSettingsClick={() => setActiveView('settings')}
      />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            activeView={activeView}
            setActiveView={setActiveView}
            stats={summary}
          />
          
          <main className="flex-1 overflow-y-auto p-6">
            {activeView === 'transactions' ? (
              <TransactionTable transactions={transactions} onUpdate={loadData} />
            ) : activeView === 'dashboard' ? (
              <Dashboard summary={summary} categoryData={categoryData} />
            ) : activeView === 'settings' ? (
              <ProfilePage darkMode={darkMode} setDarkMode={setDarkMode} />
            ) : null}
          </main>
        </div>
        
        <FileUploadModal 
          isOpen={isFileModalOpen}
          onClose={() => setIsFileModalOpen(false)}
          onFileSelected={handleFileSelected}
        />
        
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import useStoreStore from '../../stores/storeStore';

const StoreStatsModal = ({ store, onClose }) => {
  const { getStoreStats } = useStoreStore();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (store?.id) {
      fetchStats();
    }
  }, [store?.id]);

  const fetchStats = async () => {
    if (!store?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const storeStats = await getStoreStats(store.id);
      setStats(storeStats);
    } catch (err) {
      setError(err.message || 'Failed to fetch store statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Store Statistics
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {store?.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {stats && (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.product_count}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Products
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.user_count}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Users
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.total_sales}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    Total Sales
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.customer_count}
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">
                    Customers
                  </div>
                </div>
              </div>

              {/* Revenue Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Revenue
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.total_revenue)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Today's Revenue
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.today_revenue)}
                  </div>
                </div>
              </div>

              {/* Today's Stats */}
              <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Today's Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats.today_sales}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Sales
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(stats.today_revenue)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Revenue
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {stats.product_count > 0 && stats.total_sales > 0
                        ? Math.round(stats.total_sales / stats.product_count)
                        : 0
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Avg Sales/Product
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {stats.total_revenue > 0 && stats.total_sales > 0
                        ? formatCurrency(stats.total_revenue / stats.total_sales)
                        : '₹0'
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Avg Sale Value
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Information */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Store Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Store ID:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-mono text-xs">
                      {stats.store_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Store Name:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {stats.store_name}
                    </span>
                  </div>
                  {stats.start_date && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">From:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDate(stats.start_date)}
                      </span>
                    </div>
                  )}
                  {stats.end_date && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">To:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDate(stats.end_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreStatsModal;
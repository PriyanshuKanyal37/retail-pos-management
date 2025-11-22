import React, { useEffect, useState } from 'react';
import useStoreStore from '../../stores/storeStore';
import useAuthStore from '../../stores/authStore';

const StoreSelector = ({ onStoreChange, className = '' }) => {
  const { stores, currentStore, setCurrentStore, loadCurrentStore, getMyStores } = useStoreStore();
  const { user, canAccessMultipleStores } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load current store from localStorage on mount
    loadCurrentStore();

    // Fetch stores if user has access to multiple stores
    if (canAccessMultipleStores()) {
      getMyStores(user?.id, user?.role);
    }
  }, [canAccessMultipleStores, user?.id, user?.role, loadCurrentStore, getMyStores]);

  // Don't show store selector if user can only access one store
  if (!canAccessMultipleStores() || stores.length <= 1) {
    return null;
  }

  const handleStoreSelect = (store) => {
    setCurrentStore(store);
    setIsOpen(false);
    if (onStoreChange) {
      onStoreChange(store);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {currentStore ? currentStore.name : 'Select Store'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Stores
            </div>
            {stores.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                No stores available
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleStoreSelect(store)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-3 ${
                      currentStore?.id === store.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {store.address && `${store.address.substring(0, 50)}${store.address.length > 50 ? '...' : ''}`}
                      </div>
                    </div>
                    {currentStore?.id === store.id && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSelector;
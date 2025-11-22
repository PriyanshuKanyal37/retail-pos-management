import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../stores/cartStore';
import useUIStore from '../stores/uiStore';
import useAuthStore from '../stores/authStore';
import useProductStore from '../stores/productStore';
import useStoreStore from '../stores/storeStore';
import useSettingsStore from '../stores/settingsStore';
import StoreSelector from '../components/common/StoreSelector';
import ProductCard from '../components/pos/ProductCard';
import Cart from '../components/pos/Cart';
import CustomerSelector from '../components/pos/CustomerSelector';
import HoldSaleModal from '../components/pos/HoldSaleModal';
import PaymentModal from '../components/pos/PaymentModal';

const POSTerminal = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showHoldSaleModal, setShowHoldSaleModal] = useState(false);
  const searchInputRef = useRef(null);

  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isManager = useAuthStore((state) => state.isManager());
  const isCashier = useAuthStore((state) => state.isCashier());
  const isInStoreContext = useAuthStore((state) => state.isInStoreContext());
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const getActiveStoreId = useAuthStore((state) => state.getActiveStoreId);
  const getUserStoreId = useAuthStore((state) => state.getUserStoreId);
  const logout = useAuthStore((state) => state.logout);
  const productList = useProductStore((state) => state.products);
  const getProductByBarcode = useProductStore((state) => state.getProductByBarcode);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.cartItems);
  const clearCart = useCartStore((state) => state.clearCart);
  const showAlert = useUIStore((state) => state.showAlert);
  const openModal = useUIStore((state) => state.openModal);
  const currentStore = useStoreStore((state) => state.currentStore);
  const stores = useStoreStore((state) => state.stores);
  const getStoreById = useStoreStore((state) => state.getStoreById);
  const fetchStoreById = useStoreStore((state) => state.fetchStoreById);
  const fetchStores = useStoreStore((state) => state.fetchStores);
  const applyStoreBrandingFromStore = useSettingsStore((state) => state.applyStoreBrandingFromStore);

  useEffect(() => {
    let ignore = false;
    const primeStores = async () => {
      try {
        await fetchStores();
      } catch (error) {
        if (!ignore) {
          console.error('Failed to fetch stores for POS header:', error);
        }
      }
    };

    primeStores();
    return () => {
      ignore = true;
    };
  }, [fetchStores]);

  const resolvedStoreId = useMemo(() => {
    const activeStoreId = typeof getActiveStoreId === 'function' ? getActiveStoreId() : null;
    const userStoreId = typeof getUserStoreId === 'function' ? getUserStoreId() : user?.store_id ?? null;

    if (isSuperAdmin) {
      return activeStoreId || user?.activeStoreId || currentStore?.id || null;
    }

    if (userStoreId) {
      return userStoreId;
    }

    if (isCashier && user?.assigned_manager_id) {
      const managerStore = stores.find((store) => store.manager_id === user.assigned_manager_id);
      if (managerStore) {
        return managerStore.id;
      }
    }

    if (stores.length === 1) {
      return stores[0].id;
    }

    return currentStore?.id || null;
  }, [
    currentStore?.id,
    getActiveStoreId,
    getUserStoreId,
    isCashier,
    isSuperAdmin,
    stores,
    user?.activeStoreId,
    user?.assigned_manager_id,
    user?.store_id,
  ]);

  const resolvedStoreFromList = resolvedStoreId && typeof getStoreById === 'function'
    ? getStoreById(resolvedStoreId)
    : null;

  const [resolvedStore, setResolvedStore] = useState(resolvedStoreFromList || null);
  const [storeLoading, setStoreLoading] = useState(false);

  useEffect(() => {
    setResolvedStore(resolvedStoreFromList || null);
  }, [resolvedStoreFromList]);

  useEffect(() => {
    let cancelled = false;

    const loadStore = async () => {
      if (!resolvedStoreId || resolvedStoreFromList) {
        return;
      }

      setStoreLoading(true);
      try {
        const store = await fetchStoreById(resolvedStoreId);
        if (!cancelled) {
          setResolvedStore(store || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load store info for POS header:', error);
        }
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    };

    loadStore();
    return () => {
      cancelled = true;
    };
  }, [fetchStoreById, resolvedStoreFromList, resolvedStoreId]);

  useEffect(() => {
    let cancelled = false;

    const primeProducts = async () => {
      try {
        await fetchProducts();
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch products for POS terminal:', error);
        }
      }
    };

    if (user && resolvedStoreId) {
      primeProducts();
    }

    return () => {
      cancelled = true;
    };
  }, [fetchProducts, resolvedStoreId, user?.id]);

  useEffect(() => {
    if (resolvedStore && typeof applyStoreBrandingFromStore === 'function') {
      applyStoreBrandingFromStore(resolvedStore);
    }
  }, [resolvedStore, applyStoreBrandingFromStore]);

  const branchName = resolvedStore?.name || (storeLoading ? 'Loading store...' : 'Select a store');

  const roleLabel = (() => {
    if (isSuperAdmin) {
      return 'Admin';
    }
    if (isManager) {
      return 'Manager';
    }
    if (isCashier) {
      return 'Cashier';
    }
    return 'Staff';
  })();

  const formattedUserName = user?.name?.includes("'s Org")
    ? user.email?.split('@')[0] || user.name
    : user?.name || 'User';

  const handleLogout = () => {
    logout();
    showAlert('success', 'Logged out successfully');
    navigate('/login');
  };

  const handleHoldSale = () => {
    if (cartItems.length === 0) {
      showAlert('error', 'Cart is empty');
      return;
    }
    setShowHoldSaleModal(true);
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) {
      showAlert('info', 'Cart is already empty');
      return;
    }
    if (window.confirm('Are you sure you want to clear the cart?')) {
      clearCart();
      showAlert('info', 'Cart cleared');
    }
  };

  const categories = ['All', ...new Set(productList.map((product) => product.category))];

  const storeScopedProducts = useMemo(() => {
    if (!resolvedStoreId) {
      return productList;
    }
    return productList.filter((product) => product.store_id === resolvedStoreId);
  }, [productList, resolvedStoreId]);

  const filteredProducts = storeScopedProducts.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm);
    return matchesCategory && matchesSearch && product.status === 'active';
  });

  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimeout;

    const handleKeyPress = (e) => {
      if (
        document.activeElement.tagName === 'INPUT' &&
        document.activeElement !== searchInputRef.current
      ) {
        return;
      }

      clearTimeout(barcodeTimeout);

      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        const product = getProductByBarcode(barcodeBuffer);
        if (product && product.stock > 0) {
          addToCart(product);
          showAlert('success', `${product.name} added via barcode scan`);
        } else if (product && product.stock === 0) {
          showAlert('error', `${product.name} is out of stock`);
        } else {
          showAlert('error', 'Product not found');
        }
        barcodeBuffer = '';
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }

      barcodeTimeout = setTimeout(() => {
        barcodeBuffer = '';
      }, 100);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(barcodeTimeout);
    };
  }, [addToCart, getProductByBarcode, showAlert]);

  const handleCheckout = () => {
    openModal('payment');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            {/* Store Selector */}
            <StoreSelector />
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              
              {showMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  {/* Store Context Menu Items - Show operational items for all roles in store context */}
                  {/* Sales */}
                  <button
                    onClick={() => { navigate('/sales'); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-gray-900 dark:text-white">Sales</span>
                  </button>

                  {/* Products */}
                  <button
                    onClick={() => { navigate('/products'); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="text-gray-900 dark:text-white">Products</span>
                  </button>

                  {/* Customers */}
                  <button
                    onClick={() => { navigate('/customers'); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-gray-900 dark:text-white">Customers</span>
                  </button>

                  {/* Settings - Available to all authenticated users in store context */}
                  <button
                    onClick={() => { navigate('/settings'); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-900 dark:text-white">Settings</span>
                  </button>

                  {/* Manager-level items */}
                  {isManager && (
                    <button
                      onClick={() => { navigate('/users'); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-3 border-b border-gray-100 dark:border-gray-700"
                    >
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-gray-900 dark:text-white">User Management</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-3 text-red-600 dark:text-red-400"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS Terminal</h1>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Branch: {branchName}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {roleLabel}: {formattedUserName}
              </p>
            </div>
          </div>

          
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products (name, SKU, or scan barcode)..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          
          <div className="flex items-center gap-3">
            <CustomerSelector />

            
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Online
              </span>
            </div>
          </div>
        </div>
      </header>

      
      <div className="flex-1 flex overflow-hidden">
        
        <div className="flex-1 flex flex-col overflow-hidden p-6">

          
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try different search terms or category</p>
              </div>
            )}
          </div>
        </div>

        
        <div className="w-96 p-6 bg-gray-100 dark:bg-gray-950">
          <Cart
            onCheckout={handleCheckout}
            onHoldSale={handleHoldSale}
            onClearCart={handleClearCart}
          />
        </div>
      </div>

      <HoldSaleModal
        isOpen={showHoldSaleModal}
        onClose={() => setShowHoldSaleModal(false)}
      />
      <PaymentModal />
    </div>
  );
};

export default POSTerminal;

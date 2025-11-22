import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './stores/authStore';
import useUIStore from './stores/uiStore';
import useProductStore from './stores/productStore';
import useCustomerStore from './stores/customerStore';
import useSettingsStore from './stores/settingsStore';
import useUserStore from './stores/userStore';
import Alert from './components/common/Alert';
import Sidebar from './components/common/Sidebar';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './pages/Login';
import POSTerminal from './pages/POSTerminal';
import Sales from './pages/Sales';
import Products from './pages/Products';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Stores from './pages/Stores';

const ProtectedRoute = ({ children, requiredRole = null, adminOnly = false }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isManager = useAuthStore((state) => state.isManager());
  const isCashier = useAuthStore((state) => state.isCashier());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for specific role requirements
  if (requiredRole === 'super_admin' && !isSuperAdmin) {
    // Redirect to appropriate page based on user role
    if (isManager) {
      return <Navigate to="/products" replace />;
    } else if (isCashier) {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'manager' && !isManager && !isSuperAdmin) {
    return <Navigate to="/pos" replace />;
  }

  // Legacy adminOnly check (for backward compatibility) - manager and above
  if (adminOnly && !isManager && !isSuperAdmin) {
    return <Navigate to="/pos" replace />;
  }

  return children;
};

const MainLayout = ({ children, fullScreen = false }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  if (fullScreen) {
    return children;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {isAuthenticated && <Sidebar />}
      <main
        className={`flex-1 transition-all duration-300 ${
          isAuthenticated && sidebarOpen ? 'ml-64' : isAuthenticated ? 'ml-20' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
};

// Smart routing component
const SmartRedirect = () => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isManager = useAuthStore((state) => state.isManager());
  const isCashier = useAuthStore((state) => state.isCashier());

  if (isSuperAdmin) {
    return <Navigate to="/stores" replace />;
  } else if (isManager) {
    return <Navigate to="/products" replace />;
  } else if (isCashier) {
    return <Navigate to="/pos" replace />;
  } else {
    return <Navigate to="/pos" replace />;
  }
};

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isManager = useAuthStore((state) => state.isManager());
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const fetchCustomers = useCustomerStore((state) => state.fetchCustomers);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const fetchUsers = useUserStore((state) => state.fetchUsers);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchCustomers();
      fetchSettings();
      // Only fetch users for super admins and managers (not cashiers)
      if (isSuperAdmin || isManager) {
        fetchUsers();
      }
    }
  }, [isAuthenticated, isSuperAdmin, isManager, fetchProducts, fetchCustomers, fetchSettings, fetchUsers]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Alert />
        <Routes>
          <Route
            path="/login"
            element={
              <ErrorBoundary fallback={(error, retry) => (
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-red-600 mb-4">Login page encountered an error</p>
                    <button
                      onClick={retry}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}>
                <Login />
              </ErrorBoundary>
            }
          />

          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <MainLayout fullScreen>
                  <ErrorBoundary fallback={(error, retry) => (
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-red-600 mb-4">POS terminal encountered an error</p>
                        <button
                          onClick={retry}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  )}>
                    <POSTerminal />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <Sales />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <Products />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <Customers />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <CustomerDetail />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

        <Route
            path="/stores"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <MainLayout>
                  <ErrorBoundary>
                    <Stores />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole="manager">
                <MainLayout>
                  <ErrorBoundary>
                    <Users />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ErrorBoundary>
                    <Settings />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

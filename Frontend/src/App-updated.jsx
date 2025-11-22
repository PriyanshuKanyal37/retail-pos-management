import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './stores/authStore-updated';
import useUIStore from './stores/uiStore';
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

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.getPermissions());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required permissions
  const hasRequiredPermissions = requiredPermissions.every(
    permission => permissions[permission]
  );

  if (!hasRequiredPermissions) {
    // Redirect to appropriate page based on user role
    if (permissions.canManageStores) {
      return <Navigate to="/stores" replace />;
    } else if (permissions.canManageUsers) {
      return <Navigate to="/users" replace />;
    } else if (permissions.canAccessProducts) {
      return <Navigate to="/products" replace />;
    } else if (permissions.canAccessSales) {
      return <Navigate to="/sales" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
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

// Smart routing component - redirects based on user role and permissions
const SmartRedirect = () => {
  const permissions = useAuthStore((state) => state.getPermissions());

  if (permissions.canManageStores) {
    return <Navigate to="/stores" replace />;
  } else if (permissions.canManageUsers) {
    return <Navigate to="/users" replace />;
  } else if (permissions.canAccessProducts) {
    return <Navigate to="/products" replace />;
  } else if (permissions.canAccessSales) {
    return <Navigate to="/sales" replace />;
  } else {
    return <Navigate to="/pos" replace />;
  }
};

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const permissions = useAuthStore((state) => state.getPermissions());
  const initializeAuth = useAuthStore((state) => state.initialize);

  // Initialize auth on app load
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Auto-fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // We'll implement data fetching in individual components
      // This allows for better loading states and error handling per page
    }
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Alert />
        <Routes>
          {/* Login Page */}
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
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
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* POS Terminal - Accessible by all authenticated users */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute requiredPermissions={['canAccessSales']}>
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

          {/* Sales Management */}
          <Route
            path="/sales"
            element={
              <ProtectedRoute requiredPermissions={['canAccessSales']}>
                <MainLayout>
                  <ErrorBoundary>
                    <Sales />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Products Management */}
          <Route
            path="/products"
            element={
              <ProtectedRoute requiredPermissions={['canAccessProducts']}>
                <MainLayout>
                  <ErrorBoundary>
                    <Products />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Customers Management */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute requiredPermissions={['canAccessCustomers']}>
                <MainLayout>
                  <ErrorBoundary>
                    <Customers />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Customer Detail */}
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute requiredPermissions={['canAccessCustomers']}>
                <MainLayout>
                  <ErrorBoundary>
                    <CustomerDetail />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Stores Management - Super Admin Only */}
          <Route
            path="/stores"
            element={
              <ProtectedRoute requiredPermissions={['canManageStores']}>
                <MainLayout>
                  <ErrorBoundary>
                    <Stores />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Users Management - Super Admin and Manager */}
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredPermissions={['canManageUsers']}>
                <MainLayout>
                  <ErrorBoundary>
                    <Users />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Settings - Super Admin and Manager */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPermissions={['canAccessSettings']}>
                <MainLayout>
                  <ErrorBoundary>
                    <Settings />
                  </ErrorBoundary>
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<SmartRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
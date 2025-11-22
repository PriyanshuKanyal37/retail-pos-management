import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from './stores/authStore';
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

const fallbackRoute = (role) => {
  switch (role) {
    case 'super_admin':
      return '/stores';
    case 'manager':
      return '/pos';
    case 'cashier':
      return '/pos';
    default:
      return '/login';
  }
};

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={fallbackRoute(user?.role)} replace />;
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

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initializeAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const defaultRoute = isAuthenticated ? fallbackRoute(user?.role) : '/login';

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Alert />
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <ErrorBoundary>
                  <Login />
                </ErrorBoundary>
              ) : (
                <Navigate to={defaultRoute} replace />
              )
            }
          />

          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <MainLayout fullScreen>
                  <ErrorBoundary>
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
              <ProtectedRoute>
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

          <Route path="/" element={<Navigate to={defaultRoute} replace />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? defaultRoute : "/login"} replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

# FA POS Frontend Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [State Management](#state-management)
5. [Component Architecture](#component-architecture)
6. [Routing & Navigation](#routing--navigation)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Integration](#api-integration)
9. [UI/UX Design](#uiux-design)
10. [Styling System](#styling-system)
11. [Configuration & Environment](#configuration--environment)
12. [Build & Deployment](#build--deployment)
13. [Development Workflow](#development-workflow)
14. [Best Practices](#best-practices)

## Project Overview

FA POS Frontend is a modern, responsive Point of Sale system interface built with React 19, designed to provide an intuitive and efficient experience for retail and restaurant operations. The application supports multi-tenant architecture with role-based access control, enabling different user levels (Super Admin, Manager, Cashier) with appropriate permissions.

### Key Features
- **Multi-tenant SaaS Architecture**: Complete tenant isolation and context switching
- **Role-based Access Control**: Super Admin, Manager, and Cashier roles with granular permissions
- **Real-time POS Operations**: Barcode scanning, cart management, and payment processing
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode Support**: Complete dark/light theme system with user preferences
- **Offline Capabilities**: Local storage persistence and smart error handling
- **Performance Optimized**: Lazy loading, memoization, and efficient re-renders

## Architecture

### Project Structure
```
Frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── api/
│   │   ├── client.js              # API client with error handling
│   │   ├── client-updated.js      # Updated API client
│   │   └── client-backup.js       # Backup API client
│   ├── components/
│   │   ├── common/
│   │   │   ├── Alert.jsx           # Global alert system
│   │   │   ├── ErrorBoundary.jsx   # Error boundary wrapper
│   │   │   ├── Sidebar.jsx         # Main navigation sidebar
│   │   │   └── StoreSelector.jsx   # Store context switcher
│   │   ├── customers/
│   │   │   ├── CustomerFormModal.jsx
│   │   │   └── CustomerInvoiceModal.jsx
│   │   ├── pos/
│   │   │   ├── Cart.jsx            # Shopping cart component
│   │   │   ├── CustomerSelector.jsx
│   │   │   ├── HoldSaleModal.jsx
│   │   │   ├── PaymentModal.jsx
│   │   │   ├── PaymentStatusChecker.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   └── UPIQRCode.jsx
│   │   ├── stores/
│   │   │   ├── StoreFormModal.jsx
│   │   │   └── StoreStatsModal.jsx
│   │   └── users/
│   │       └── UserFormModal.jsx
│   ├── data/
│   │   └── mockData.js             # Mock data for development
│   ├── pages/
│   │   ├── CustomerDetail.jsx
│   │   ├── Customers.jsx
│   │   ├── Login.jsx              # Authentication page
│   │   ├── POSTerminal.jsx        # Main POS interface
│   │   ├── Products.jsx
│   │   ├── Sales.jsx
│   │   ├── Settings.jsx
│   │   ├── Stores.jsx
│   │   └── Users.jsx
│   ├── stores/
│   │   ├── authStore.js           # Authentication state
│   │   ├── cartStore.js           # Shopping cart state
│   │   ├── customerStore.js       # Customer data state
│   │   ├── productStore.js        # Product data state
│   │   ├── salesStore.js          # Sales data state
│   │   ├── settingsStore.js       # Application settings
│   │   ├── storeStore.js          # Store data state
│   │   ├── uiStore.js             # UI state (theme, modals)
│   │   └── userStore.js           # User data state
│   ├── utils/
│   │   ├── apiNormalization.js    # API response normalization
│   │   ├── invoice.js             # Invoice generation utilities
│   │   ├── tokenManager.js        # JWT token management
│   │   └── validation.js          # Form validation utilities
│   ├── App.jsx                    # Main application component
│   ├── main.jsx                   # Application entry point
│   └── index.css                  # Global styles
├── .env.example                   # Environment variables template
├── .env                          # Local environment variables
├── eslint.config.js              # ESLint configuration
├── index.html                    # HTML template
├── package.json                  # Dependencies and scripts
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── vite.config.js                # Vite build configuration
```

### Design Patterns

#### 1. Component Composition Pattern
The application uses a highly modular component structure with clear separation of concerns:

```jsx
// High-level composition
<ProtectedRoute>
  <MainLayout>
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  </MainLayout>
</ProtectedRoute>
```

#### 2. Store Pattern with Zustand
State management follows the Zustand pattern with persistent storage:

```javascript
// Store structure with persistence
const useStore = create(
  persist(
    (set, get) => ({
      // State
      data: [],
      // Actions
      fetchData: async () => {
        // Implementation
      }
    }),
    {
      name: 'store-name',
      partialize: (state) => ({ data: state.data })
    }
  )
);
```

#### 3. Custom Hooks Pattern
Business logic is encapsulated in custom hooks for reusability:

```jsx
const useProductData = () => {
  const products = useProductStore((state) => state.products);
  const fetchProducts = useProductStore((state) => state.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, fetchProducts };
};
```

## Technology Stack

### Core Dependencies
- **React 19.1.1**: Latest React with concurrent features and automatic batching
- **Vite 7.1.7**: Fast development server and optimized builds
- **React Router DOM 7.9.5**: Client-side routing with nested routes
- **Zustand 5.0.8**: Lightweight state management with persistence
- **Tailwind CSS 4.1.16**: Utility-first CSS framework with dark mode

### UI & Styling
- **@heroicons/react 2.2.0**: Consistent SVG icon library
- **Tailwind CSS**: Utility-first styling with custom configuration
- **PostCSS**: CSS processing pipeline

### Development Tools
- **ESLint 9.36.0**: Code quality and consistency
- **@vitejs/plugin-react 5.0.4**: React integration for Vite
- **eslint-plugin-react-hooks**: React hooks rules
- **eslint-plugin-react-refresh**: Fast Refresh integration

### Additional Libraries
- **qrcode 1.5.4**: QR code generation for UPI payments
- **dompurify 3.3.0**: XSS protection and HTML sanitization
- **@types/qrcode 1.5.6**: TypeScript definitions for QR codes
- **@types/dompurify 3.0.5**: TypeScript definitions for DOMPurify

## State Management

### Store Architecture with Zustand

The application uses Zustand for state management with the following key stores:

#### 1. Authentication Store (authStore.js)
Manages user authentication, role-based access, and tenant context.

```javascript
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      role: null,
      tenant_id: null,
      tenant_name: null,
      activeStoreId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Core Actions
      login: async (email, password) => {
        // JWT authentication with tenant context
      },
      signup: async (name, email, password, role) => {
        // User registration with tenant creation
      },
      logout: () => {
        // Clear authentication state
      },

      // Role-based Access Control
      hasRole: (role) => get().role === role,
      isSuperAdmin: () => get().role === 'super_admin',
      canAccessMultipleStores: () => get().role === 'super_admin',

      // Store Context Management
      setActiveStore: (storeId, storeName) => {
        set({ activeStoreId: storeId, activeStoreName: storeName });
      },
      getEffectiveRole: () => {
        const { role, activeStoreId } = get();
        return role === 'super_admin' && activeStoreId ? 'manager' : role;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        tenant_id: state.tenant_id,
        tenant_name: state.tenant_name,
        activeStoreId: state.activeStoreId,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
```

#### 2. Cart Store (cartStore.js)
Handles POS cart operations, calculations, and held sales.

```javascript
const useCartStore = create((set, get) => ({
  // State
  cartItems: [],
  selectedCustomer: null,
  discount: 0,
  discountType: 'flat',
  paymentMethod: 'cash',
  amountPaid: 0,
  heldSales: [],

  // Cart Operations
  addToCart: (product) => {
    const { cartItems } = get();
    const existingItem = cartItems.find((item) => item.product.id === product.id);

    if (existingItem) {
      set({
        cartItems: cartItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      set({ cartItems: [...cartItems, { product, quantity: 1 }] });
    }
  },

  // Price Calculations
  getSubtotal: () => {
    const { cartItems } = get();
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
  getGrandTotal: (taxRate = 18) => {
    const totalAfterDiscount = get().getTotalAfterDiscount();
    const tax = get().getTax(taxRate);
    return totalAfterDiscount + tax;
  },

  // Held Sales Management
  holdSale: (customerInfo) => {
    // Save current cart state for later retrieval
  },
  resumeSale: (heldSaleId) => {
    // Restore held sale to active cart
  }
}));
```

#### 3. UI Store (uiStore.js)
Manages UI state including theme, modals, and notifications.

```javascript
const useUIStore = create(
  persist(
    (set) => ({
      // State
      theme: 'light',
      sidebarOpen: true,
      activeModal: null,
      alert: null,

      // Theme Management
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';

          // Update DOM for Tailwind dark mode
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }

          return { theme: newTheme };
        });
      },

      // Modal Management
      openModal: (modalName) => set({ activeModal: modalName }),
      closeModal: () => set({ activeModal: null }),

      // Alert System
      showAlert: (type, message, duration = 3000) => {
        set({ alert: { type, message } });

        if (duration > 0) {
          setTimeout(() => set({ alert: null }), duration);
        }
      }
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen
      })
    }
  )
);
```

### Store Persistence Strategy

All stores use Zustand's persistence middleware with selective serialization:

```javascript
// Partial persistence to avoid storing sensitive or temporary data
partialize: (state) => ({
  user: state.user,
  role: state.role,
  // Excludes temporary state like loading, error, etc.
})
```

## Component Architecture

### Component Hierarchy

```
App (Root)
├── ErrorBoundary (Global error handling)
├── Alert (Global notification system)
├── BrowserRouter (Routing)
└── Routes
    ├── Login (Public route)
    └── ProtectedRoute (Authenticated routes)
        └── MainLayout
            ├── Sidebar (Navigation)
            └── Page Content
                ├── POSTerminal
                │   ├── StoreSelector
                │   ├── ProductGrid
                │   │   └── ProductCard
                │   └── Cart
                │       ├── CartItems
                │       ├── DiscountControls
                │       └── PaymentActions
                ├── Sales
                ├── Products
                ├── Customers
                ├── Users
                ├── Stores
                └── Settings
```

### Component Design Patterns

#### 1. Container/Presentation Pattern
Components are separated into logic (containers) and presentation (UI):

```jsx
// Container Component
const ProductGrid = () => {
  const { products, loading, fetchProducts } = useProductStore();
  const { filteredProducts } = useProductFilters(products);

  return (
    <ProductGridUI
      products={filteredProducts}
      loading={loading}
      onRefresh={fetchProducts}
    />
  );
};

// Presentation Component
const ProductGridUI = ({ products, loading, onRefresh }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {products.map(product => (
      <ProductCard key={product.id} product={product} />
    ))}
  </div>
);
```

#### 2. Compound Component Pattern
Complex components like the Cart use the compound pattern:

```jsx
const Cart = ({ onCheckout, onHoldSale, onClearCart }) => {
  const { cartItems, getGrandTotal, clearCart } = useCartStore();

  return (
    <div className="cart-container">
      <Cart.Header itemCount={cartItems.length} />
      <Cart.Items items={cartItems} />
      {cartItems.length > 0 && (
        <>
          <Cart.Summary total={getGrandTotal()} />
          <Cart.Actions
            onCheckout={onCheckout}
            onHoldSale={onHoldSale}
            onClearCart={onClearCart}
          />
        </>
      )}
    </div>
  );
};
```

#### 3. Render Props Pattern
Flexible data rendering with render props:

```jsx
const DataList = ({
  data,
  loading,
  error,
  renderItem,
  emptyState,
  loadingState
}) => {
  if (loading) return loadingState || <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return emptyState || <EmptyMessage />;

  return (
    <div className="data-list">
      {data.map(renderItem)}
    </div>
  );
};
```

### Component Best Practices

#### 1. Props Typing and Validation
```jsx
const ProductCard = ({
  product,
  onAddToCart,
  variant = 'default',
  className = ''
}) => {
  // Props validation and defaults
  if (!product) return null;

  return (
    <div className={`product-card ${variant} ${className}`}>
      {/* Component implementation */}
    </div>
  );
};
```

#### 2. Memoization for Performance
```jsx
import { memo, useMemo, useCallback } from 'react';

const ExpensiveComponent = memo(({ data, onUpdate }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveCalculation(item));
  }, [data]);

  const handleUpdate = useCallback((id, value) => {
    onUpdate(id, processedData.find(item => item.id === id));
  }, [onUpdate, processedData]);

  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onUpdate={handleUpdate} />
      ))}
    </div>
  );
});
```

## Routing & Navigation

### Route Structure

The application uses React Router DOM for client-side routing with protected routes:

```jsx
// App.jsx - Main routing configuration
function App() {
  const { isAuthenticated, user, initialize } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initialize().finally(() => setIsInitializing(false));
  }, [initialize]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Alert />
      <Routes>
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login />
            ) : (
              <Navigate to={getDefaultRoute(user?.role)} replace />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <MainLayout fullScreen>
                <POSTerminal />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/stores"
          element={
            <ProtectedRoute requiredRole="super_admin">
              <MainLayout>
                <Stores />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Other protected routes... */}

        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Protected Route Pattern

```jsx
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
```

### Role-based Route Configuration

```javascript
const routes = [
  {
    path: '/pos',
    component: POSTerminal,
    roles: ['super_admin', 'manager', 'cashier'],
    fullScreen: true
  },
  {
    path: '/stores',
    component: Stores,
    roles: ['super_admin']
  },
  {
    path: '/users',
    component: Users,
    roles: ['super_admin', 'manager']
  },
  {
    path: '/products',
    component: Products,
    roles: ['super_admin', 'manager', 'cashier']
  }
];
```

### Navigation Components

#### Sidebar Navigation
```jsx
const Sidebar = () => {
  const { role, activeStoreId } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const menuItems = [
    {
      name: 'Stores',
      path: '/stores',
      icon: <StoreIcon />,
      roles: ['super_admin']
    },
    {
      name: 'POS Terminal',
      path: '/pos',
      icon: <POSIcon />,
      roles: ['manager', 'cashier']
    },
    // ... other menu items
  ];

  const availableMenuItems = menuItems.filter(item =>
    item.roles.includes(role)
  );

  return (
    <aside className={`sidebar ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      <SidebarHeader>
        <Logo />
        <ToggleSidebar onClick={toggleSidebar} />
      </SidebarHeader>

      {sidebarOpen && <UserInfo />}

      {activeStoreId && role === 'super_admin' && (
        <StoreContextBanner>
          <ExitStoreView />
        </StoreContextBanner>
      )}

      <Navigation>
        {availableMenuItems.map(item => (
          <NavLink key={item.path} to={item.path}>
            {item.icon}
            {sidebarOpen && <span>{item.name}</span>}
          </NavLink>
        ))}
      </Navigation>
    </aside>
  );
};
```

### Dynamic Routing based on Role

```javascript
const getDefaultRoute = (role) => {
  switch (role) {
    case 'super_admin':
      return '/stores';
    case 'manager':
    case 'cashier':
      return '/pos';
    default:
      return '/login';
  }
};
```

## Authentication & Authorization

### Authentication Flow

#### 1. Login Process
```javascript
// authStore.js - Login implementation
login: async (email, password) => {
  set({ isLoading: true, error: null });

  try {
    const response = await api.auth.login(email, password);
    const { access_token, user, tenant_id, tenant_name } = response;

    // Store JWT token securely
    if (!tokenManager.setToken(access_token)) {
      throw new Error('Failed to secure authentication token');
    }

    // Update authentication state
    set({
      user,
      role: user.role,
      tenant_id,
      tenant_name,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });

    return { success: true, user, role: user.role };
  } catch (error) {
    const errorMessage = error?.response?.data?.detail || error.message;
    set({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: errorMessage
    });
    return { success: false, message: errorMessage };
  }
}
```

#### 2. Token Management
```javascript
// tokenManager.js - Secure JWT handling
class TokenManager {
  setToken(token, expiresIn = 3600) {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }

      const payload = this.decodeToken(token);
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      const expiryTime = Date.now() + (expiresIn * 1000);

      // Store in localStorage with fallback to sessionStorage
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      sessionStorage.setItem(this.TOKEN_KEY, token);

      return true;
    } catch (error) {
      console.error('Failed to store token:', error);
      return false;
    }
  }

  getToken() {
    try {
      let token = localStorage.getItem(this.TOKEN_KEY);
      let expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

      // Fallback to sessionStorage
      if (!token) {
        token = sessionStorage.getItem(this.TOKEN_KEY);
        if (token) {
          localStorage.setItem(this.TOKEN_KEY, token);
        }
      }

      if (!token) return null;

      // Check expiration
      if (expiryTime && Date.now() > parseInt(expiryTime)) {
        this.clearToken();
        return null;
      }

      // Validate token payload
      const payload = this.decodeToken(token);
      if (!payload || payload.exp * 1000 < Date.now()) {
        this.clearToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      this.clearToken();
      return null;
    }
  }
}
```

### Role-based Access Control

#### Permission System
```javascript
// Role-based permission checks
const usePermissions = () => {
  const { role, activeStoreId } = useAuthStore();

  const hasPermission = (resource, action) => {
    const permissions = {
      super_admin: ['*'], // All permissions
      manager: [
        'products:read', 'products:write',
        'customers:read', 'customers:write',
        'sales:read', 'sales:write',
        'users:read', 'users:write'
      ],
      cashier: [
        'products:read',
        'customers:read',
        'sales:write'
      ]
    };

    const userPermissions = permissions[role] || [];
    return userPermissions.includes('*') ||
           userPermissions.includes(`${resource}:${action}`);
  };

  const canAccessRoute = (path) => {
    const routePermissions = {
      '/stores': ['super_admin'],
      '/users': ['super_admin', 'manager'],
      '/products': ['super_admin', 'manager', 'cashier'],
      '/pos': ['manager', 'cashier'],
      '/sales': ['manager', 'cashier'],
      '/customers': ['manager', 'cashier'],
      '/settings': ['super_admin', 'manager', 'cashier']
    };

    const allowedRoles = routePermissions[path] || [];
    return allowedRoles.includes(role) ||
           (role === 'super_admin' && activeStoreId);
  };

  return { hasPermission, canAccessRoute };
};
```

#### Super Admin Store Context
```javascript
// Store context switching for Super Admins
const useStoreContext = () => {
  const { role, activeStoreId, setActiveStore, clearActiveStore } = useAuthStore();

  const enterStoreContext = (storeId, storeName) => {
    if (role === 'super_admin') {
      setActiveStore(storeId, storeName);
      return true;
    }
    return false;
  };

  const exitStoreContext = () => {
    if (role === 'super_admin') {
      clearActiveStore();
      return true;
    }
    return false;
  };

  const getEffectiveRole = () => {
    return role === 'super_admin' && activeStoreId ? 'manager' : role;
  };

  return {
    canEnterStoreContext: role === 'super_admin',
    isInStoreContext: role === 'super_admin' && !!activeStoreId,
    enterStoreContext,
    exitStoreContext,
    getEffectiveRole
  };
};
```

### Authentication Guard Components

```jsx
// ProtectedRoute with role checking
const ProtectedRoute = ({ children, requiredRole = null, requiredPermission = null }) => {
  const { isAuthenticated, user, role } = useAuthStore();
  const { hasPermission } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(...requiredPermission.split(':'))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Usage examples
<ProtectedRoute requiredRole="super_admin">
  <Stores />
</ProtectedRoute>

<ProtectedRoute requiredPermission="users:write">
  <UserForm />
</ProtectedRoute>
```

## API Integration

### API Client Architecture

The application uses a centralized API client with error handling, token management, and file upload support:

```javascript
// api/client.js - Main API client
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;

  // Get authentication token
  const token = tokenManager.getToken();

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build request config
  const config = {
    ...options,
    headers,
  };

  // Handle body serialization
  if (config.body && typeof config.body === 'object' &&
      !(config.body instanceof FormData) &&
      !(config.body instanceof URLSearchParams)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      throw new APIError(
        data.message || data.detail || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error.message || 'Network error occurred',
      0,
      null
    );
  }
}
```

### API Service Structure

```javascript
// Organized API endpoints by resource
export const api = {
  // Authentication endpoints
  auth: {
    login: async (email, password) => {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      return apiRequest('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
    },
    signup: (userData) => apiRequest('/auth/signup', {
      method: 'POST',
      body: userData,
    })
  },

  // Product management
  products: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      return apiRequest(`/products/${params.toString() ? `?${params}` : ''}`);
    },
    create: (productData) => apiRequest('/products/', {
      method: 'POST',
      body: productData,
    }),
    uploadImage: (productId, file, onProgress) => {
      return apiFileUpload(`/products/${productId}/upload-image`, file, onProgress);
    }
  },

  // Sales management
  sales: {
    create: (saleData) => apiRequest('/sales/', {
      method: 'POST',
      body: saleData,
    }),
    getStatistics: (filters = {}) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      return apiRequest(`/sales/statistics/summary?${params}`);
    }
  }
};
```

### Error Handling Strategy

```javascript
// Global error boundary for API errors
const APIErrorBoundary = ({ children }) => {
  const showAlert = useUIStore((state) => state.showAlert);

  const handleAPIError = (error) => {
    if (error instanceof APIError) {
      // Handle different HTTP status codes
      switch (error.status) {
        case 401:
          showAlert('error', 'Session expired. Please login again.');
          // Redirect to login
          window.location.href = '/login';
          break;
        case 403:
          showAlert('error', 'You do not have permission to perform this action.');
          break;
        case 404:
          showAlert('error', 'The requested resource was not found.');
          break;
        case 500:
          showAlert('error', 'Server error. Please try again later.');
          break;
        default:
          showAlert('error', error.message || 'An error occurred.');
      }
    } else {
      showAlert('error', 'Network error. Please check your connection.');
    }
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application Error:', error, errorInfo);
        handleAPIError(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

### File Upload Integration

```javascript
// File upload with progress tracking
async function apiFileUpload(endpoint, file, onProgress = null, additionalData = {}) {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const token = tokenManager.getToken();

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    // Add additional form data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const xhr = new XMLHttpRequest();

    // Progress tracking
    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new APIError(error.message || error.detail, xhr.status, error));
        } catch (e) {
          reject(new APIError(`Upload failed with status ${xhr.status}`, xhr.status, null));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new APIError('Network error during upload', 0, null));
    });

    xhr.open('POST', url);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}
```

## UI/UX Design

### Design Principles

#### 1. Mobile-First Responsive Design
The application uses a mobile-first approach with progressive enhancement:

```css
/* Base styles (mobile-first) */
.product-grid {
  @apply grid grid-cols-1 gap-4;
}

/* Tablet and up */
@media (min-width: 768px) {
  .product-grid {
    @apply grid-cols-2 md:grid-cols-3;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .product-grid {
    @apply grid-cols-3 lg:grid-cols-4 xl:grid-cols-5;
  }
}
```

#### 2. Consistent Design System
Design tokens are defined in Tailwind configuration:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    }
  }
}
```

#### 3. Accessibility Standards

Semantic HTML and ARIA attributes:

```jsx
const ProductCard = ({ product, onSelect, onAddToCart }) => (
  <article
    className="product-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(product);
      }
    }}
    onClick={() => onSelect(product)}
    aria-label={`Product: ${product.name}, Price: ${product.price}`}
  >
    <div className="p-4">
      <h3 className="font-semibold text-gray-900">{product.name}</h3>
      <p className="text-2xl font-bold text-primary-600">
        {formatCurrency(product.price)}
      </p>
      <button
        className="mt-2 w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(product);
        }}
        aria-label={`Add ${product.name} to cart`}
      >
        Add to Cart
      </button>
    </div>
  </article>
);
```

### User Experience Features

#### 1. Loading States
```jsx
const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]}`} />
      {text && <span className="ml-2 text-gray-600">{text}</span>}
    </div>
  );
};
```

#### 2. Empty States
```jsx
const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 text-gray-400 mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 mb-4">{description}</p>
    {action && action}
  </div>
);
```

#### 3. Success/Error Feedback
```jsx
// Alert component for user feedback
const Alert = () => {
  const { alert, hideAlert } = useUIStore();

  if (!alert) return null;

  const alertStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border ${alertStyles[alert.type]} animate-pulse`}>
      <div className="flex items-center">
        <span className="flex-1">{alert.message}</span>
        <button
          onClick={hideAlert}
          className="ml-4 text-current hover:opacity-75"
          aria-label="Dismiss alert"
        >
          ×
        </button>
      </div>
    </div>
  );
};
```

#### 4. Keyboard Navigation
```jsx
const POSKeyboardHandler = ({ children }) => {
  const handleKeyDown = (e) => {
    // Global keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'p':
          e.preventDefault();
          // Open payment modal
          break;
        case 'h':
          e.preventDefault();
          // Hold sale
          break;
        case 'Escape':
          e.preventDefault();
          // Close modal
          break;
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <>{children}</>;
};
```

## Styling System

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
```

### Theme System

#### Dark Mode Implementation
```javascript
// uiStore.js - Theme management
const useUIStore = create(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';

          // Update DOM for Tailwind dark mode
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }

          return { theme: newTheme };
        });
      },

      setTheme: (theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ theme });
      }
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme })
    }
  )
);
```

#### Responsive Design Patterns
```jsx
// Responsive component with breakpoint-specific behavior
const ProductGrid = ({ products }) => {
  return (
    <div className="grid gap-4
                     grid-cols-1
                     sm:grid-cols-2
                     md:grid-cols-3
                     lg:grid-cols-4
                     xl:grid-cols-5">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

// Responsive navigation
const Sidebar = () => {
  const { sidebarOpen } = useUIStore();

  return (
    <aside className={`
      fixed top-0 left-0 h-full bg-white dark:bg-gray-800
      border-r border-gray-200 dark:border-gray-700
      transition-all duration-300 z-40
      ${sidebarOpen ? 'w-64' : 'w-20'}
      lg:translate-x-0
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Sidebar content */}
    </aside>
  );
};
```

### Custom Component Styles

#### Button Variants
```jsx
const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-md font-medium
        transition-colors duration-200 focus:outline-none focus:ring-2
        focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50
        disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
```

## Configuration & Environment

### Environment Variables

```javascript
// .env.example - Environment variable template
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1

# Application Configuration
VITE_APP_NAME=FA POS System
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# Development Configuration
VITE_MOCK_API=false
VITE_LOG_LEVEL=info
```

### Build Configuration

#### Vite Configuration
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@heroicons/react']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
```

#### ESLint Configuration
```javascript
// eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: ['dist'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
```

## Build & Deployment

### Build Process

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext js,jsx --fix"
  }
}
```

### Production Optimizations

#### Code Splitting
```javascript
// Lazy loading for better performance
const POSTerminal = lazy(() => import('./pages/POSTerminal'));
const Products = lazy(() => import('./pages/Products'));
const Sales = lazy(() => import('./pages/Sales'));

// Route configuration with lazy loading
const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/pos" element={<POSTerminal />} />
      <Route path="/products" element={<Products />} />
      <Route path="/sales" element={<Sales />} />
    </Routes>
  </Suspense>
);
```

#### Asset Optimization
```javascript
// vite.config.js - Build optimizations
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@heroicons/react'],
          utils: ['zustand', 'qrcode']
        }
      }
    },
    // Enable source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Minify CSS
    cssCodeSplit: true,
    // Optimize chunk size warning limit
    chunkSizeWarningLimit: 1000
  }
});
```

## Development Workflow

### Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd FA-POS-2/Frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Code Quality Tools

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

#### Git Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run lint"
    }
  },
  "lint-staged": {
    "src/**/*.{js,jsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

## Best Practices

### 1. Performance Optimization

#### Memoization
```jsx
import { memo, useMemo, useCallback } from 'react';

const ProductCard = memo(({ product, onAddToCart }) => {
  const handleAddToCart = useCallback(() => {
    onAddToCart(product);
  }, [product, onAddToCart]);

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(product.price);
  }, [product.price]);

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{formattedPrice}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
});
```

#### Virtual Scrolling
```jsx
import { FixedSizeList as List } from 'react-window';

const VirtualProductList = ({ products }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={products.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### 2. Security Best Practices

#### Input Sanitization
```jsx
import DOMPurify from 'dompurify';

const SafeHTML = ({ html }) => {
  const cleanHTML = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: cleanHTML }} />;
};
```

#### XSS Protection
```jsx
const SecureInput = ({ value, onChange, ...props }) => {
  const handleChange = (e) => {
    // Sanitize input
    const sanitizedValue = e.target.value.replace(/[<>]/g, '');
    onChange({ ...e, target: { ...e.target, value: sanitizedValue } });
  };

  return <input value={value} onChange={handleChange} {...props} />;
};
```

### 3. Error Handling

#### Error Boundaries
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong.</h2>
          <details>
            {this.state.error?.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 4. Testing Strategy

#### Component Testing
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from './ProductCard';

const TestWrapper = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Provider>
);

test('ProductCard renders correctly', () => {
  const product = {
    id: 1,
    name: 'Test Product',
    price: 10.99,
    stock: 5
  };

  render(
    <TestWrapper>
      <ProductCard product={product} />
    </TestWrapper>
  );

  expect(screen.getByText('Test Product')).toBeInTheDocument();
  expect(screen.getByText('$10.99')).toBeInTheDocument();
});
```

This comprehensive documentation covers the entire FA POS Frontend system, providing detailed insights into the architecture, implementation patterns, and best practices used throughout the application.
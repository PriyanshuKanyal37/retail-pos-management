/**
 * API Client for FA POS Backend
 * Handles all HTTP requests with authentication and error handling
 */

import { tokenManager } from '../utils/tokenManager';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Make an API request with automatic token handling
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;

  // Get token securely
  const token = tokenManager.getToken();

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build request config
  const config = {
    ...options,
    headers,
  };

  // If body exists and is an object (but not FormData or URLSearchParams), stringify it
  if (config.body && typeof config.body === 'object' &&
      !(config.body instanceof FormData) &&
      !(config.body instanceof URLSearchParams)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses (like 204 No Content)
    if (response.status === 204) {
      return null;
    }

    // Parse response
    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      throw new APIError(
        data.detail || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    // Re-throw API errors
    if (error instanceof APIError) {
      throw error;
    }

    // Network or parsing errors
    throw new APIError(
      error.message || 'Network error occurred',
      0,
      null
    );
  }
}

/**
 * API Methods
 */
export const api = {
  // Authentication
  auth: {
    signup: (userData) => apiRequest('/auth/signup', {
      method: 'POST',
      body: userData,
    }),
    login: async (email, password) => {
      // OAuth2 password flow requires form data
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
  },

  // Users
  users: {
    getMe: () => apiRequest('/users/me/'),
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.store_id) params.append('store_id', filters.store_id);
      if (filters.role) params.append('role', filters.role);
      const queryString = params.toString();
      return apiRequest(`/users/${queryString ? `?${queryString}` : ''}`);
    },
    getByStore: (storeId) => apiRequest(`/users/store/${storeId}/`),
    getManagers: () => apiRequest('/users/managers/'),
    create: (userData) => apiRequest('/users/', {
      method: 'POST',
      body: userData,
    }),
    update: (userId, userData) => apiRequest(`/users/${userId}/`, {
      method: 'PATCH',
      body: userData,
    }),
  },

  // Stores
  stores: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.manager_id) params.append('manager_id', filters.manager_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.skip) params.append('skip', filters.skip);
      if (filters.limit) params.append('limit', filters.limit);
      const queryString = params.toString();
      return apiRequest(`/stores/${queryString ? `?${queryString}` : ''}`);
    },
    getById: (storeId) => apiRequest(`/stores/${storeId}/`),
    getStats: (storeId) => apiRequest(`/stores/${storeId}/stats/`),
    getActive: () => apiRequest('/stores/active/'),
    search: (searchTerm) => apiRequest(`/stores/search/?search_term=${searchTerm}`),
    create: (storeData) => apiRequest('/stores/', {
      method: 'POST',
      body: storeData,
    }),
    update: (storeId, storeData) => apiRequest(`/stores/${storeId}/`, {
      method: 'PATCH',
      body: storeData,
    }),
    assignManager: (storeId, managerId) => apiRequest(`/stores/${storeId}/assign-manager/`, {
      method: 'PATCH',
      body: { manager_id: managerId },
    }),
    removeManager: (storeId) => apiRequest(`/stores/${storeId}/remove-manager/`, {
      method: 'PATCH',
    }),
    updateStatus: (storeId, status) => apiRequest(`/stores/${storeId}/status/`, {
      method: 'PATCH',
      body: { status },
    }),
    delete: (storeId) => apiRequest(`/stores/${storeId}/`, {
      method: 'DELETE',
    }),
  },

  // Products
  products: {
    getAll: () => apiRequest('/products/'),
    getById: (productId) => apiRequest(`/products/${productId}/`),
    getLowStock: (threshold = 5) => apiRequest(`/products/low-stock/?threshold=${threshold}`),
    create: (productData) => apiRequest('/products/', {
      method: 'POST',
      body: productData,
    }),
    update: (productId, productData) => apiRequest(`/products/${productId}/`, {
      method: 'PATCH',
      body: productData,
    }),
    delete: (productId) => apiRequest(`/products/${productId}/`, {
      method: 'DELETE',
    }),
    uploadImage: async (productId, file) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth-token');
      const url = `${API_BASE_URL}${API_PREFIX}/products/${productId}/image/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new APIError(error.detail, response.status, error);
      }

      return response.json();
    },
    deleteImage: (productId) => apiRequest(`/products/${productId}/image/`, {
      method: 'DELETE',
    }),
  },

  // Customers
  customers: {
    getAll: () => apiRequest('/customers/'),
    create: (customerData) => apiRequest('/customers/', {
      method: 'POST',
      body: customerData,
    }),
    update: (customerId, customerData) => apiRequest(`/customers/${customerId}/`, {
      method: 'PATCH',
      body: customerData,
    }),
  },

  // Sales
  sales: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.cashier_id) params.append('cashier_id', filters.cashier_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const queryString = params.toString();
      return apiRequest(`/sales/${queryString ? `?${queryString}` : ''}`);
    },
    getById: (saleId) => apiRequest(`/sales/${saleId}/`),
    getNextInvoiceNumber: () => apiRequest('/sales/next-invoice-number/'),
    getSummary: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.cashier_id) params.append('cashier_id', filters.cashier_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const queryString = params.toString();
      return apiRequest(`/sales/summary/${queryString ? `?${queryString}` : ''}`);
    },
    create: (saleData) => apiRequest('/sales/', {
      method: 'POST',
      body: saleData,
    }),
  },

  // Settings
  settings: {
    get: () => apiRequest('/settings/'),
    update: (settingsData) => apiRequest('/settings/', {
      method: 'PATCH',
      body: settingsData,
    }),
  },

  // Health
  health: {
    check: () => apiRequest('/health'),
    checkDB: () => apiRequest('/health/db'),
  },
};

export { APIError };
export default api;

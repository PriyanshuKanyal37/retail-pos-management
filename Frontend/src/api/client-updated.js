/**
 * API Client for FA POS Backend
 * Updated to work with new backend endpoints and authentication
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

const isFormDataBody = (value) => typeof FormData !== 'undefined' && value instanceof FormData;
const isURLSearchParamsBody = (value) =>
  typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams;

/**
 * Make an API request with automatic token handling
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;

  // Get token securely
  const token = tokenManager.getToken();

  // Build headers
  const originalBody = options.body;
  const hasFormDataBody = isFormDataBody(originalBody);
  const hasSearchParamsBody = isURLSearchParamsBody(originalBody);

  const headers = {
    ...options.headers,
  };

  if (!hasFormDataBody && !hasSearchParamsBody) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build request config
  const config = {
    ...options,
    headers,
    body: originalBody,
  };

  // If body exists and is an object (but not FormData or URLSearchParams), stringify it
  if (config.body && typeof config.body === 'object' &&
      !hasFormDataBody &&
      !hasSearchParamsBody) {
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
        data.message || data.detail || `Request failed with status ${response.status}`,
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
 * File upload with progress tracking
 */
async function apiFileUpload(endpoint, file, onProgress = null, additionalData = {}) {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const token = tokenManager.getToken();

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    // Add additional form data
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
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

    // Set up headers
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

const buildProductFormData = (productData, imageFile) => {
  const formData = new FormData();
  formData.append('product_data', JSON.stringify(productData));
  if (imageFile) {
    formData.append('image', imageFile);
  }
  return formData;
};

/**
 * API Methods - Updated for new backend
 */
export const api = {
  // Authentication - Updated to match new backend response structure
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
    // Verify current token
    verify: () => apiRequest('/auth/verify'),
  },

  // Users - Updated for new user schema
  users: {
    getProfile: () => apiRequest('/users/me'),
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.store_id) params.append('store_id', filters.store_id);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.skip) params.append('skip', filters.skip);
      if (filters.limit) params.append('limit', filters.limit);
      const queryString = params.toString();
      return apiRequest(`/users/${queryString ? `?${queryString}` : ''}`);
    },
    getById: (userId) => apiRequest(`/users/${userId}`),
    create: (userData) => apiRequest('/users/', {
      method: 'POST',
      body: userData,
    }),
    update: (userId, userData) => apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: userData,
    }),
    delete: (userId) => apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    }),
  },

  // Stores - Updated for new store schema (removed manager_id and address fields)
  stores: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.skip) params.append('skip', filters.skip);
      if (filters.limit) params.append('limit', filters.limit);
      const queryString = params.toString();
      return apiRequest(`/stores/${queryString ? `?${queryString}` : ''}`);
    },
    getById: (storeId) => apiRequest(`/stores/${storeId}`),
    create: (storeData) => apiRequest('/stores/', {
      method: 'POST',
      body: storeData,
    }),
    update: (storeId, storeData) => apiRequest(`/stores/${storeId}`, {
      method: 'PUT',
      body: storeData,
    }),
    delete: (storeId) => apiRequest(`/stores/${storeId}`, {
      method: 'DELETE',
    }),
  },

  // Products - Updated with new product schema and file upload
  products: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.store_id) params.append('store_id', filters.store_id);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.low_stock) params.append('low_stock', 'true');
      const queryString = params.toString();
      return apiRequest(`/products/${queryString ? `?${queryString}` : ''}`);
    },
    getById: (productId) => apiRequest(`/products/${productId}`),
    create: (productData, imageFile = null) => apiRequest('/products/', {
      method: 'POST',
      body: imageFile ? buildProductFormData(productData, imageFile) : productData,
    }),
    update: (productId, productData, imageFile = null) => apiRequest(`/products/${productId}`, {
      method: 'PUT',
      body: imageFile ? buildProductFormData(productData, imageFile) : productData,
    }),
    delete: (productId) => apiRequest(`/products/${productId}`, {
      method: 'DELETE',
    }),
    // New file upload endpoints
    uploadImage: (productId, file, onProgress) => {
      return apiFileUpload(`/products/${productId}/upload-image`, file, onProgress);
    },
    getImageUrl: (productId) => `${API_BASE_URL}${API_PREFIX}/products/${productId}/image`,
    search: (searchTerm) => apiRequest(`/products/search/${searchTerm}`),
  },

  // Customers - Updated for new customer schema
  customers: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.store_id) params.append('store_id', filters.store_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.skip) params.append('skip', filters.skip);
      if (filters.limit) params.append('limit', filters.limit);
      const queryString = params.toString();
      return apiRequest(`/customers/${queryString ? `?${queryString}` : ''}`);
    },
    getById: (customerId) => apiRequest(`/customers/${customerId}`),
    create: (customerData) => apiRequest('/customers/', {
      method: 'POST',
      body: customerData,
    }),
    update: (customerId, customerData) => apiRequest(`/customers/${customerId}`, {
      method: 'PUT',
      body: customerData,
    }),
    delete: (customerId) => apiRequest(`/customers/${customerId}`, {
      method: 'DELETE',
    }),
  },

  // Sales - Updated for new sales schema with file upload
  sales: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.store_id) params.append('store_id', filters.store_id);
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.cashier_id) params.append('cashier_id', filters.cashier_id);
      if (filters.payment_status) params.append('payment_status', filters.payment_status);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.skip) params.append('skip', filters.skip);
      if (filters.limit) params.append('limit', filters.limit);
      const queryString = params.toString();
      return apiRequest(`/sales/${queryString ? `?${queryString}` : ''}`);
    },
    getById: (saleId) => apiRequest(`/sales/${saleId}`),
    getNextInvoiceNumber: () => apiRequest('/sales/next-invoice'),
    create: (saleData) => apiRequest('/sales/', {
      method: 'POST',
      body: saleData,
    }),
    update: (saleId, saleData) => apiRequest(`/sales/${saleId}`, {
      method: 'PUT',
      body: saleData,
    }),
    delete: (saleId) => apiRequest(`/sales/${saleId}`, {
      method: 'DELETE',
    }),
    // New statistics endpoint
    getStatistics: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.store_id) params.append('store_id', filters.store_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      const queryString = params.toString();
      return apiRequest(`/sales/statistics/summary${queryString ? `?${queryString}` : ''}`);
    },
    // New file upload endpoints
    uploadInvoice: (saleId, file, onProgress) => {
      return apiFileUpload(`/sales/${saleId}/upload-invoice`, file, onProgress);
    },
    getInvoiceUrl: (saleId) => `${API_BASE_URL}${API_PREFIX}/sales/${saleId}/invoice`,
    downloadInvoice: (saleId) => {
      const url = `${API_BASE_URL}${API_PREFIX}/sales/${saleId}/download-invoice`;
      const token = tokenManager.getToken();

      return fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }).then(response => {
        if (!response.ok) {
          throw new APIError('Failed to download invoice', response.status);
        }
        return response.blob();
      });
    },
  },

  // Settings - Updated for new settings structure
  settings: {
    get: (storeId = null) => {
      if (storeId) {
        return apiRequest(`/settings/store/${storeId}`);
      }
      return apiRequest('/settings/');
    },
    update: (settingsData) => apiRequest('/settings/', {
      method: 'PUT',
      body: settingsData,
    }),
    uploadLogo: (file, onProgress) => {
      return apiFileUpload('/settings/upload-logo', file, onProgress);
    },
  },

  // Health check - Using public endpoints
  health: {
    check: () => apiRequest('/public/health'),
    info: () => apiRequest('/public/info'),
    storage: () => apiRequest('/public/storage-test'),
  },

  // File management
  files: {
    uploadTestImage: (file, onProgress) => {
      return apiFileUpload('/public/test-image-upload', file, onProgress);
    },
    uploadTestPdf: (file, onProgress) => {
      return apiFileUpload('/public/test-pdf-upload', file, onProgress);
    },
    listTestFiles: () => apiRequest('/public/test-file-list'),
  },
};

export { APIError, apiFileUpload };
export default api;

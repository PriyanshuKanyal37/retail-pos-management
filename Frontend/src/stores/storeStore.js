import { create } from 'zustand';
import api from '../api/client-updated';

// Store Store
// Manages store records and current store selection
const useStoreStore = create((set, get) => ({
  stores: [],
  currentStore: null,
  isLoading: false,
  error: null,

  // Fetch all stores (super_admin/manager only)
  fetchStores: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.stores.getAll();
      set({ stores: Array.isArray(response) ? response : [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Get all stores
  getStores: () => get().stores,

  // Get store by ID
  getStoreById: (storeId) => get().stores.find((store) => store.id === storeId) ?? null,

  // Fetch a single store by ID and cache it locally
  fetchStoreById: async (storeId) => {
    if (!storeId) {
      return null;
    }

    const existing = get().getStoreById(storeId);
    if (existing) {
      return existing;
    }

    set({ isLoading: true, error: null });
    try {
      const store = await api.stores.getById(storeId);
      set((state) => ({
        stores: [...state.stores.filter((s) => s.id !== store.id), store],
        isLoading: false
      }));
      return store;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Get current store
  getCurrentStore: () => get().currentStore,

  // Set current store (for users with access to multiple stores)
  setCurrentStore: (store) => {
    set({ currentStore: store });
    // Store in localStorage for persistence
    if (store) {
      localStorage.setItem('selected-store', JSON.stringify(store));
    } else {
      localStorage.removeItem('selected-store');
    }
  },

  // Load current store from localStorage
  loadCurrentStore: () => {
    try {
      const storedStore = localStorage.getItem('selected-store');
      if (storedStore) {
        const store = JSON.parse(storedStore);
        set({ currentStore: store });
      }
    } catch (error) {
      console.error('Failed to load current store:', error);
      localStorage.removeItem('selected-store');
    }
  },

  // Create a new store (super admin only)
  addStore: async (storeData) => {
    set({ isLoading: true, error: null });
    try {
      const newStore = await api.stores.create(storeData);
      set((state) => ({
        stores: [...state.stores, newStore],
        isLoading: false
      }));
      return newStore;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Update a store (super admin only)
  updateStore: async (storeId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStore = await api.stores.update(storeId, updates);
      set((state) => ({
        stores: state.stores.map((store) =>
          store.id === storeId ? updatedStore : store
        ),
        currentStore: state.currentStore?.id === storeId ? updatedStore : state.currentStore,
        isLoading: false
      }));
      return updatedStore;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Assign manager to store (super admin only)
  assignManager: async (storeId, managerId) => {
    set({ isLoading: true, error: null });
    try {
      await api.stores.update(storeId, { manager_id: managerId });
      // Refresh stores
      await get().fetchStores();
      set({ isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Remove manager from store (super admin only)
  removeManager: async (storeId) => {
    set({ isLoading: true, error: null });
    try {
      await api.stores.update(storeId, { manager_id: null });
      // Refresh stores
      await get().fetchStores();
      set({ isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Update store status (super admin only)
  updateStoreStatus: async (storeId, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.stores.update(storeId, { status });
      // Refresh stores
      await get().fetchStores();
      set({ isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Get store statistics
  getStoreStats: async (storeId) => {
    try {
      // Return basic stats since dedicated endpoint may not exist
      const store = await api.stores.getById(storeId);
      return {
        total_sales: 0,
        total_customers: 0,
        total_products: 0,
        ...store
      };
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Delete a store (super admin only)
  deleteStore: async (storeId) => {
    set({ isLoading: true, error: null });
    try {
      await api.stores.delete(storeId);
      set((state) => ({
        stores: state.stores.filter((store) => store.id !== storeId),
        currentStore: state.currentStore?.id === storeId ? null : state.currentStore,
        isLoading: false
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Search stores
  searchStores: async (searchTerm) => {
    set({ isLoading: true, error: null });
    try {
      // Use getAll with search filter instead of search endpoint
      const response = await api.stores.getAll({ search: searchTerm });
      set({ stores: Array.isArray(response) ? response : [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Get active stores
  getActiveStores: () => {
    return get().stores.filter(store => store.status === 'active');
  },

  // Get stores managed by current user
  getMyStores: (userId, userRole) => {
    const { stores } = get();
    if (userRole === 'super_admin') {
      return stores;
    } else if (userRole === 'manager') {
      return stores.filter(store => store.manager_id === userId);
    }
    return [];
  }
}));

export default useStoreStore;

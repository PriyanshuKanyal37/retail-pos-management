import { create } from 'zustand';
import api from '../api/client';
import { normalizeCustomer } from '../utils/apiNormalization';

// Customer Store
// Manages customer records with backend integration
const useCustomerStore = create((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  // Fetch customers from backend
  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const customers = await api.customers.getAll();
      set({ customers: customers.map(normalizeCustomer).filter(Boolean), isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to fetch customers:', error);
    }
  },

  getCustomers: () => get().customers,

  getCustomerById: (customerId) =>
    get().customers.find((customer) => customer.id === customerId) ?? null,

  addCustomer: async ({ name, phone }) => {
    const newCustomer = await api.customers.create({ name, phone });
    const normalized = normalizeCustomer(newCustomer);
    if (!normalized) {
      throw new Error('Failed to create customer');
    }
    set((state) => ({
      customers: [...state.customers, normalized]
    }));
    return normalized;
  },

  updateCustomer: async (customerId, updates) => {
    const updatedCustomer = await api.customers.update(customerId, updates);
    const normalized = normalizeCustomer(updatedCustomer);
    if (!normalized) {
      throw new Error('Failed to update customer');
    }
    set((state) => ({
      customers: state.customers.map((customer) =>
        customer.id === customerId ? normalized : customer
      )
    }));
    return normalized;
  }
}));

export default useCustomerStore;

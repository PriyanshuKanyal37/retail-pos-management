import { create } from 'zustand';
import api from '../api/client-updated';
import { normalizeUser } from '../utils/apiNormalization';

// User Store
// Centralises user records for role checks and user management
const useUserStore = create((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  // Fetch all users (super_admin/manager only)
  fetchUsers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.users.getAll(filters);
      set({ users: Array.isArray(users) ? users.map(normalizeUser).filter(Boolean) : [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch users by store
  fetchUsersByStore: async (storeId) => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.users.getAll({ store_id: storeId });
      set({ users: Array.isArray(users) ? users.map(normalizeUser).filter(Boolean) : [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch managers only
  fetchManagers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.users.getAll({ role: 'manager' });
      set({ users: Array.isArray(users) ? users.map(normalizeUser).filter(Boolean) : [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  getUsers: () => get().users,

  getUserById: (userId) => get().users.find((user) => user.id === userId) ?? null,

  getUserByEmail: (email) =>
    get()
      .users
      .find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null,

  // Create a new user (super_admin/manager only)
  addUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const newUser = normalizeUser(await api.users.create(userData));
      if (!newUser) {
        throw new Error('Failed to create user');
      }
      set((state) => ({
        users: [...state.users, newUser],
        isLoading: false
      }));
      return newUser;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Update a user (super_admin/manager only)
  updateUser: async (userId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = normalizeUser(await api.users.update(userId, updates));
      if (!updatedUser) {
        throw new Error('Failed to update user');
      }
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userId ? updatedUser : user
        ),
        isLoading: false
      }));
      return updatedUser;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Toggle user status (active/inactive)
  toggleUserStatus: async (userId) => {
    const user = get().getUserById(userId);
    if (!user) return null;

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    return get().updateUser(userId, { status: newStatus });
  },

  // Reset password (super_admin/manager only)
  // Note: Backend doesn't have a dedicated reset password endpoint yet
  // This would need to be implemented as part of the update endpoint
  resetPassword: async (userId, newPassword) => {
    return get().updateUser(userId, { password: newPassword });
  },

  // Delete user (super admin only)
  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await api.users.delete(userId);
      set((state) => ({
        users: state.users.filter((user) => user.id !== userId),
        isLoading: false
      }));
      return true;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Get users by role
  getUsersByRole: (role) => {
    return get().users.filter((user) => user.role === role);
  },

  // Get cashiers for a specific manager
  getCashiersForManager: (managerId) => {
    return get().users.filter(
      (user) => user.role === 'cashier' && user.assigned_manager_id === managerId
    );
  },

  // Get users by store
  getUsersByStore: (storeId) => {
    return get().users.filter((user) => user.store_id === storeId);
  },

  // Create a cashier (manager only)
  createCashier: async (userData, managerId, storeId) => {
    const cashierData = {
      ...userData,
      role: 'cashier',
      store_id: storeId,
      assigned_manager_id: managerId,
    };
    return get().addUser(cashierData);
  },

  // Create a manager (super admin only)
  createManager: async (userData) => {
    const managerData = {
      ...userData,
      role: 'manager',
    };
    return get().addUser(managerData);
  },

  // Create a super admin (super admin only)
  createSuperAdmin: async (userData) => {
    const superAdminData = {
      ...userData,
      role: 'super_admin',
    };
    return get().addUser(superAdminData);
  }
}));

export default useUserStore;

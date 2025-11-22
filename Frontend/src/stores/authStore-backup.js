import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import { normalizeUser } from '../utils/apiNormalization';
import { tokenManager } from '../utils/tokenManager';

// Authentication Store
// Manages user login, logout, and role-based access with backend integration
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      signup: async (name, email, password, role = 'super_admin') => {
        set({ isLoading: true, error: null });

        try {
          // Call backend API
          const response = await api.auth.signup({
            name,
            email,
            password,
            role
          });

          // Store JWT token securely
          if (!tokenManager.setToken(response.access_token)) {
            throw new Error('Failed to secure authentication token');
          }

          // Store user data
          const user = normalizeUser(response.user);
          if (!user) {
            throw new Error('Invalid user payload received from server');
          }
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user, message: response.message };
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Signup failed'
          });

          return {
            success: false,
            message: error.message || 'Failed to create account'
          };
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          // Call backend API
          const response = await api.auth.login(email, password);

          // Store JWT token securely
          if (!tokenManager.setToken(response.access_token)) {
            throw new Error('Failed to secure authentication token');
          }

          // Store user data (from response.user)
          const user = normalizeUser(response.user);
          if (!user) {
            throw new Error('Invalid user payload received from server');
          }
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user };
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Login failed'
          });

          return {
            success: false,
            message: error.message || 'Invalid credentials or inactive account'
          };
        }
      },

      logout: () => {
        // Clear JWT token securely
        tokenManager.clearToken();
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      // Refresh user data from backend
      refreshUser: async () => {
        const token = tokenManager.getToken();
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const user = normalizeUser(await api.users.getMe());
          set({ user, isAuthenticated: true, error: null });
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('auth-token');
          set({ user: null, isAuthenticated: false, error: null });
        }
      },

      // === GLOBAL ROLE METHODS (Based on logged-in user) ===

      // Check if user has super admin role (global)
      isSuperAdmin: () => {
        const { user } = get();
        return user?.role === 'super_admin';
      },

      // Check if user has manager role (global)
      isManagerGlobal: () => {
        const { user } = get();
        return user?.role === 'manager';
      },

      // Check if user has cashier role (global)
      isCashierGlobal: () => {
        const { user } = get();
        return user?.role === 'cashier';
      },

      // === STORE-LEVEL ROLE METHODS (Based on current context) ===

      // Get active store role (what role the user is currently acting as)
      getActiveStoreRole: () => {
        const { user } = get();
        if (!user) return null;

        // If Super Admin is in store context, they act as Manager
        if (user.role === 'super_admin' && user.activeStoreId) {
          return 'manager';
        }

        // If Manager or Cashier are in their store context, they act as their global role
        if (user.role === 'manager' || user.role === 'cashier') {
          return user.role;
        }

        return null; // No active store context
      },

      // Check if user is acting as Manager in current context
      isManager: () => {
        const { user } = get();
        if (!user) return false;

        // Super Admin acts as Manager only when in store context
        if (user.role === 'super_admin' && user.activeStoreId) {
          return true;
        }

        // Manager acts as Manager when in store context
        if (user.role === 'manager') {
          return true;
        }

        return false;
      },

      // Check if user is acting as Cashier in current context
      isCashier: () => {
        const { user } = get();
        if (!user) return false;

        // Cashier acts as Cashier when in store context
        if (user.role === 'cashier') {
          return true;
        }

        return false;
      },

      // Check if user is acting as Admin (Manager or Super Admin in any context)
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager';
      },

      // Get user's store ID
      getUserStoreId: () => {
        const { user } = get();
        return user?.store_id || null;
      },

      // Super Admin store context switching
      setActiveStore: (storeId) => {
        const { user } = get();
        if (user?.role === 'super_admin') {
          set({
            user: {
              ...user,
              activeStoreId: storeId,
              originalStoreId: user.store_id
            }
          });
        }
      },

      // Clear active store (return to Super Admin mode)
      clearActiveStore: () => {
        const { user } = get();
        if (user?.role === 'super_admin') {
          set({
            user: {
              ...user,
              activeStoreId: null,
              store_id: user.originalStoreId
            }
          });
        }
      },

      // Get current active store ID (for Super Admin context switching)
      getActiveStoreId: () => {
        const { user } = get();
        if (user?.role === 'super_admin') {
          return user?.activeStoreId || user?.store_id;
        }
        return user?.store_id;
      },

      // Check if Super Admin is in store context mode
      isInStoreContext: () => {
        const { user } = get();
        return user?.role === 'super_admin' && !!user?.activeStoreId;
      },

      // Check if user can access multiple stores
      canAccessMultipleStores: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager';
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage', // Key in localStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client-updated';
import { tokenManager } from '../utils/tokenManager';

// Authentication Store - Updated for new backend
// Manages user login, logout, and role-based access with backend integration
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tenant: null,

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

          // Store user data and tenant info
          const user = {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
            tenant_id: response.user.tenant_id,
            store_id: response.user.store_id,
            status: response.user.status
          };

          const tenant = {
            id: response.tenant_id,
            name: response.tenant_name
          };

          set({
            user,
            tenant,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user, tenant, message: response.message };
        } catch (error) {
          set({
            user: null,
            tenant: null,
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
          if (!tokenManager.setToken(response.token)) {
            throw new Error('Failed to secure authentication token');
          }

          // Store user data and tenant info
          const user = {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
            tenant_id: response.user.tenant_id,
            store_id: response.user.store_id,
            status: response.user.status
          };

          const tenant = {
            id: response.tenant_id,
            name: response.tenant_name
          };

          set({
            user,
            tenant,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return { success: true, user, tenant };
        } catch (error) {
          set({
            user: null,
            tenant: null,
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
          tenant: null,
          isAuthenticated: false,
          error: null
        });
      },

      // Refresh user data from backend
      refreshUser: async () => {
        const token = tokenManager.getToken();
        if (!token) {
          set({ user: null, tenant: null, isAuthenticated: false });
          return;
        }

        try {
          // Get user profile from backend
          const userProfile = await api.users.getProfile();
          const user = {
            id: userProfile.id,
            name: userProfile.name,
            email: userProfile.email,
            role: userProfile.role,
            tenant_id: userProfile.tenant_id,
            store_id: userProfile.store_id,
            status: userProfile.status
          };

          set({ user, isAuthenticated: true, error: null });
        } catch (error) {
          // Token invalid or expired
          tokenManager.clearToken();
          set({ user: null, tenant: null, isAuthenticated: false, error: null });
        }
      },

      // Initialize auth state from stored token
      initialize: async () => {
        const token = tokenManager.getToken();
        if (token) {
          set({ isLoading: true });
          try {
            await get().refreshUser();
            set({ isLoading: false });
          } catch (error) {
            tokenManager.clearToken();
            set({ user: null, tenant: null, isAuthenticated: false, isLoading: false });
          }
        }
      },

      // === ROLE-BASED ACCESS CONTROL ===

      // Check if user has specific role
      hasRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },

      // Check if user is super admin
      isSuperAdmin: () => {
        return get().hasRole('super_admin');
      },

      // Check if user is manager
      isManager: () => {
        return get().hasRole('manager');
      },

      // Check if user is cashier
      isCashier: () => {
        return get().hasRole('cashier');
      },

      // Check if user has any admin role (super_admin or manager)
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager';
      },

      // Check if user can access store management
      canManageStores: () => {
        const { user } = get();
        return user?.role === 'super_admin';
      },

      // Check if user can access user management
      canManageUsers: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager';
      },

      // Check if user can access sales
      canAccessSales: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'cashier';
      },

      // Check if user can access products
      canAccessProducts: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'cashier';
      },

      // Check if user can access customers
      canAccessCustomers: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'cashier';
      },

      // Check if user can access settings
      canAccessSettings: () => {
        const { user } = get();
        return user?.role === 'super_admin' || user?.role === 'manager';
      },

      // Get user permissions
      getPermissions: () => {
        const { user } = get();
        const permissions = {
          canManageStores: false,
          canManageUsers: false,
          canAccessSales: false,
          canAccessProducts: false,
          canAccessCustomers: false,
          canAccessSettings: false,
          canViewReports: false
        };

        if (!user) return permissions;

        switch (user.role) {
          case 'super_admin':
            permissions.canManageStores = true;
            permissions.canManageUsers = true;
            permissions.canAccessSales = true;
            permissions.canAccessProducts = true;
            permissions.canAccessCustomers = true;
            permissions.canAccessSettings = true;
            permissions.canViewReports = true;
            break;
          case 'manager':
            permissions.canManageUsers = true;
            permissions.canAccessSales = true;
            permissions.canAccessProducts = true;
            permissions.canAccessCustomers = true;
            permissions.canAccessSettings = true;
            permissions.canViewReports = true;
            break;
          case 'cashier':
            permissions.canAccessSales = true;
            permissions.canAccessProducts = true;
            permissions.canAccessCustomers = true;
            break;
        }

        return permissions;
      },

      // Get current store ID
      getUserStoreId: () => {
        const { user } = get();
        return user?.store_id || null;
      },

      // Get tenant info
      getTenant: () => {
        const { tenant } = get();
        return tenant;
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
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
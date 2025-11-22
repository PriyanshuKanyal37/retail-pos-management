import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client-updated';
import { tokenManager } from '../utils/tokenManager';

// Authentication Store - Updated for new backend structure
// Manages user login, logout, and role-based access with backend integration
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
          if (!tokenManager.setToken(response.token)) {
            throw new Error('Failed to secure authentication token');
          }

          // Store user data and tenant info from new backend response
          const user = {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
            tenant_id: response.user.tenant_id,
            store_id: response.user.store_id,
            status: response.user.status
          };

          set({
            user,
            role: response.user.role,
            tenant_id: response.tenant_id,
            tenant_name: response.tenant_name,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return {
            success: true,
            user,
            role: response.user.role,
            tenant_id: response.tenant_id,
            tenant_name: response.tenant_name,
            message: response.message
          };
        } catch (error) {
          set({
            user: null,
            role: null,
            tenant_id: null,
            tenant_name: null,
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

          // Store user data and tenant info from new backend response
          const user = {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
            tenant_id: response.user.tenant_id,
            store_id: response.user.store_id,
            status: response.user.status
          };

          set({
            user,
            role: response.user.role,
            tenant_id: response.tenant_id,
            tenant_name: response.tenant_name,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          return {
            success: true,
            user,
            role: response.user.role,
            tenant_id: response.tenant_id,
            tenant_name: response.tenant_name
          };
        } catch (error) {
          set({
            user: null,
            role: null,
            tenant_id: null,
            tenant_name: null,
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
          role: null,
          tenant_id: null,
          tenant_name: null,
          activeStoreId: null,
          isAuthenticated: false,
          error: null
        });
      },

      // Refresh user data from backend
      refreshUser: async () => {
        const token = tokenManager.getToken();
        if (!token) {
          set({ user: null, role: null, tenant_id: null, tenant_name: null, activeStoreId: null, isAuthenticated: false });
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

          set({
            user,
            role: userProfile.role,
            isAuthenticated: true,
            error: null
          });
        } catch (error) {
          // Token invalid or expired
          tokenManager.clearToken();
          set({ user: null, role: null, tenant_id: null, tenant_name: null, activeStoreId: null, isAuthenticated: false, error: null });
        }
      },

      // Initialize auth state from stored token
      initialize: async () => {
        const token = tokenManager.getToken();
        if (token) {
          set({ isLoading: true });
          try {
            await get().refreshUser();
          } catch (error) {
            console.warn('Token refresh failed, clearing auth state:', error);
            tokenManager.clearToken();
            set({ user: null, role: null, tenant_id: null, tenant_name: null, activeStoreId: null, isAuthenticated: false });
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Ensure clean state when no token exists
          set({ user: null, role: null, tenant_id: null, tenant_name: null, activeStoreId: null, isAuthenticated: false, isLoading: false });
        }
      },

      // === ROLE-BASED ACCESS CONTROL ===

      // Check if user has specific role
      hasRole: (role) => {
        const { role: userRole } = get();
        return userRole === role;
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
        const { role } = get();
        return role === 'super_admin' || role === 'manager';
      },

      // Check if user can access multiple stores
      // Only Super Admins can access multiple stores
      // Managers and Cashiers are restricted to their assigned store
      canAccessMultipleStores: () => {
        const { role } = get();
        return role === 'super_admin';
      },

      // Get current store ID
      getUserStoreId: () => {
        const { user } = get();
        return user?.store_id || null;
      },

      // Get tenant info
      getTenant: () => {
        const { tenant_id, tenant_name } = get();
        return { id: tenant_id, name: tenant_name };
      },

      // Store context methods for POS Terminal
      setActiveStore: (storeId) => {
        set({ activeStoreId: storeId });
      },

      getActiveStoreId: () => {
        const { activeStoreId, user } = get();
        return activeStoreId || user?.store_id || null;
      },

      clearActiveStore: () => {
        set({ activeStoreId: null });
      },

      isInStoreContext: () => {
        const { user, role, activeStoreId } = get();
        // Super admin is always in context if they have an active store
        if (role === 'super_admin' && activeStoreId) {
          return true;
        }
        // Managers and cashiers are always in store context
        return role === 'manager' || role === 'cashier';
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
        role: state.role,
        tenant_id: state.tenant_id,
        tenant_name: state.tenant_name,
        activeStoreId: state.activeStoreId,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
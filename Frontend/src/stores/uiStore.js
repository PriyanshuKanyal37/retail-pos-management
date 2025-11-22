import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// UI Store
// Manages theme, modals, alerts, and other UI state
const useUIStore = create(
  persist(
    (set) => ({
      // State
      theme: 'light', // 'light' or 'dark'
      sidebarOpen: true,
      activeModal: null, // null, 'payment', 'customer', 'user', etc.
      alert: null, // {type: 'success'|'error'|'info', message: ''}

      // Actions

      // Toggle theme
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';

          // Update document class for Tailwind dark mode
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }

          return { theme: newTheme };
        });
      },

      // Set theme explicitly
      setTheme: (theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ theme });
      },

      // Toggle sidebar
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      // Open modal
      openModal: (modalName) => {
        set({ activeModal: modalName });
      },

      // Close modal
      closeModal: () => {
        set({ activeModal: null });
      },

      // Show alert
      showAlert: (type, message, duration = 3000) => {
        set({ alert: { type, message } });

        // Auto-hide alert after duration
        if (duration > 0) {
          setTimeout(() => {
            set({ alert: null });
          }, duration);
        }
      },

      // Hide alert
      hideAlert: () => {
        set({ alert: null });
      }
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme on app load
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      }
    }
  )
);

export default useUIStore;

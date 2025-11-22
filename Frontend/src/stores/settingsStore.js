import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import useUIStore from './uiStore';
import { normalizeSettings, serializeSettings } from '../utils/apiNormalization';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: null,
      isLoading: false,
      error: null,

      // Fetch settings from backend
      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const settings = normalizeSettings(await api.settings.get());
          set({ settings, isLoading: false });

          // Apply theme from settings
          if (settings?.theme) {
            useUIStore.getState().setTheme(settings.theme);
          }

          return settings;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      // Update settings (super_admin only)
      updateSettings: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const payload = serializeSettings(updates);
          const updatedSettings = normalizeSettings(await api.settings.update(payload));
          set({ settings: updatedSettings, isLoading: false });

          // Apply theme if it was updated
          if (Object.prototype.hasOwnProperty.call(updates, 'theme')) {
            useUIStore.getState().setTheme(updates.theme);
          }

          return updatedSettings;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Convenience method to update theme
      setTheme: async (theme) => {
        const current = get().settings;
        if (!current) {
          set({ settings: normalizeSettings({ theme }) });
          return null;
        }
        return get().updateSettings({ ...current, theme });
      },

      // Override store branding fields with the currently active store's data
      applyStoreBrandingFromStore: (store) => {
        if (!store) {
          return;
        }

        set((state) => {
          const nextSettings = {
            ...(state.settings ?? {}),
            storeName: store.name ?? state.settings?.storeName ?? '',
            storeAddress: store.address ?? state.settings?.storeAddress ?? '',
            storePhone: store.phone ?? state.settings?.storePhone ?? '',
            storeEmail: store.email ?? state.settings?.storeEmail ?? ''
          };

          return { settings: nextSettings };
        });
      }
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        settings: state.settings
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme from persisted settings on rehydration
        if (state?.settings?.theme) {
          useUIStore.getState().setTheme(state.settings.theme);
        }
      }
    }
  )
);

export default useSettingsStore;

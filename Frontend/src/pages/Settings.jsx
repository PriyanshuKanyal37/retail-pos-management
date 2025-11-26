import { useEffect, useMemo, useState } from 'react';
import useSettingsStore from '../stores/settingsStore';
import useUIStore from '../stores/uiStore';
import useAuthStore from '../stores/authStore';

const themeOptions = [
  { label: 'Light Mode', value: 'light', description: 'Bright interface for well-lit environments.' },
  { label: 'Dark Mode', value: 'dark', description: 'Dimmed interface for low-light counters.' }
];

const initialSettings = {
  storeName: '',
  storeAddress: '',
  storePhone: '',
  storeEmail: '',
  taxRate: 0,
  currencySymbol: 'Rs.',
  currencyCode: 'INR',
  currency: 'Rs.',
  upiId: '',
  storeLogoUrl: '',
  lowStockThreshold: 5,
  theme: 'light'
};
const Settings = () => {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const showAlert = useUIStore((state) => state.showAlert);
  const role = useAuthStore((state) => state.role);

  const isSuperAdmin = role === 'super_admin';
  const isManager = role === 'manager';
  const isCashier = role === 'cashier';
  const showAdvancedSettings = isManager;
  const showPasswordSection = isSuperAdmin || isManager || isCashier;
  const showAppearanceSection = false;

  const [formData, setFormData] = useState(settings ?? initialSettings);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const isDirty = useMemo(() => {
    if (!settings) {
      return false;
    }
    return JSON.stringify(formData) !== JSON.stringify(settings);
  }, [formData, settings]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    } else {
      setFormData(initialSettings);
    }
  }, [settings]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value
      };
      if (name === 'currencySymbol') {
        next.currency = value;
      }
      if (name === 'storePhone' && typeof value === 'string') {
        next.storePhone = value;
      }
      if (name === 'storeEmail' && typeof value === 'string') {
        next.storeEmail = value;
      }
      return next;
    });
  };

  const handleNumberChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? '' : Number(value)
    }));
  };

  const handleThemeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      theme: value
    }));
    setTheme(value);
    showAlert('success', `Theme switched to ${value === 'dark' ? 'Dark' : 'Light'} mode`);
  };

  const handlePasswordInput = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordUpdate = (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showAlert('error', 'Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showAlert('error', 'New password and confirmation do not match');
      return;
    }

    showAlert(
      'info',
      'Password reset request noted. Please contact your administrator to complete the change.'
    );
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await updateSettings(formData);
      showAlert('success', 'Settings updated successfully');
    } catch (error) {
      showAlert('error', error.message || 'Failed to update settings');
    }
  };

  const handleReset = () => {
    setFormData(settings ?? initialSettings);
    showAlert('info', 'Changes reverted');
  };

  return (
    <div className="min-h-full bg-gray-50 px-6 py-6 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update store information, taxation, currency and theme preferences.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            form="settings-form"
            type="submit"
            disabled={!isDirty}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save Changes
          </button>
        </div>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isManager ? 'Store Information' : 'Profile'}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isManager
                ? 'Details shown on invoices and customer communications.'
                : 'Update the information that appears on receipts and notifications.'}
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {isManager ? 'Store Name *' : 'Full Name *'}
              </label>
              <input
                type="text"
                name="storeName"
                value={formData.storeName}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                name="storeEmail"
                value={formData.storeEmail}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <input
                type="tel"
                name="storePhone"
                value={formData.storePhone}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {isManager && (
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Store Address
                </label>
                <textarea
                  name="storeAddress"
                  value={formData.storeAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}
          </div>
        </section>

        {showAdvancedSettings && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">POS Configuration</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Adjust taxation, currency display and stock alerts.
              </p>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="taxRate"
                  min={0}
                  step="0.01"
                  value={formData.taxRate}
                  onChange={handleNumberChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  name="currencySymbol"
                  maxLength={3}
                  value={formData.currencySymbol}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency Code
                </label>
                <input
                  type="text"
                  name="currencyCode"
                  maxLength={5}
                  value={formData.currencyCode}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  min={0}
                  value={formData.lowStockThreshold}
                  onChange={handleNumberChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </section>
        )}

        {showPasswordSection && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Password Reset</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Update your password to keep your account secure.
              </p>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInput}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInput}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInput}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handlePasswordUpdate}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Reset Password
              </button>
            </div>
          </section>
        )}

        {showAppearanceSection && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select the default theme for all users. They can still toggle it from the sidebar.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {themeOptions.map((option) => {
                const isActive = formData.theme === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/30'
                        : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{option.label}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                      </div>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                          isActive
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 text-gray-400 dark:border-gray-500'
                        }`}
                      >
                        {isActive ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="block h-3 w-3 rounded-full bg-transparent" />
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </form>
    </div>
  );
};

export default Settings;

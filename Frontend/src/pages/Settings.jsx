import { useCallback, useEffect, useMemo, useState } from 'react';
import useSettingsStore from '../stores/settingsStore';
import useUIStore from '../stores/uiStore';
import useAuthStore from '../stores/authStore';
import useRazorpayStore from '../stores/razorpayStore';
import api from '../api/client-updated';

const initialSettings = {
  taxRate: 0,
  currencySymbol: 'Rs.',
  currencyCode: 'INR',
  lowStockThreshold: 5,
};

const Settings = () => {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const showAlert = useUIStore((state) => state.showAlert);
  const role = useAuthStore((state) => state.role);
  const razorpayStatus = useRazorpayStore((state) => state.status);
  const fetchRazorpayStatus = useRazorpayStore((state) => state.fetchStatus);
  const connectRazorpay = useRazorpayStore((state) => state.connect);
  const razorpayLoading = useRazorpayStore((state) => state.isLoading);
  const razorpayError = useRazorpayStore((state) => state.error);

  const isSuperAdmin = role === 'super_admin';
  const isManager = role === 'manager';
  const isCashier = role === 'cashier';
  const showAdvancedSettings = isManager;
  const showPasswordSection = true;

  const [formData, setFormData] = useState(settings ?? initialSettings);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [storeDetails, setStoreDetails] = useState(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState(null);
  const [razorpayForm, setRazorpayForm] = useState({
    keyId: '',
    keySecret: '',
    mode: 'test'
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const isDirty = useMemo(() => {
    if (!showAdvancedSettings || !settings) {
      return false;
    }
    return JSON.stringify(formData) !== JSON.stringify(settings);
  }, [showAdvancedSettings, formData, settings]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    } else {
      setFormData(initialSettings);
    }
  }, [settings]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await api.users.getProfile();
      setProfile(data);
    } catch (error) {
      setProfileError(error.message || 'Unable to fetch profile');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const storeId = profile?.store_id;
    if (!storeId) {
      setStoreDetails(null);
      setStoreError(null);
      return;
    }

    let cancelled = false;
    const fetchStore = async () => {
      setStoreLoading(true);
      setStoreError(null);
      try {
        const store = await api.stores.getById(storeId);
        if (!cancelled) {
          setStoreDetails(store);
        }
      } catch (error) {
        if (!cancelled) {
          setStoreError(error.message || 'Unable to fetch store details');
        }
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    };

    fetchStore();
    return () => {
      cancelled = true;
    };
  }, [profile?.store_id]);

  useEffect(() => {
    if (!isManager) {
      return;
    }
    fetchRazorpayStatus().catch(() => {
      // surface handled via razorpayError
    });
  }, [isManager, fetchRazorpayStatus]);

  const handleNumberChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? '' : Number(value)
    }));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordInput = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRazorpayInput = (event) => {
    const { name, value } = event.target;
    setRazorpayForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRazorpayConnect = async (event) => {
    event.preventDefault();
    if (!razorpayForm.keyId.trim() || !razorpayForm.keySecret.trim()) {
      showAlert('error', 'Both Key ID and Secret Key are required');
      return;
    }

    try {
      await connectRazorpay({
        keyId: razorpayForm.keyId.trim(),
        keySecret: razorpayForm.keySecret.trim(),
        mode: razorpayForm.mode
      });
      showAlert('success', 'Connections are good');
      setRazorpayForm((prev) => ({ ...prev, keySecret: '' }));
    } catch (error) {
      showAlert('error', error.message || 'Unable to connect Razorpay');
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    try {
      const date = value instanceof Date ? value : new Date(value);
      return date.toLocaleString();
    } catch {
      return '—';
    }
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
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!showAdvancedSettings) {
      return;
    }

    try {
      await updateSettings(formData);
      showAlert('success', 'POS configuration updated successfully');
    } catch (error) {
      showAlert('error', error.message || 'Failed to update settings');
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
    } else {
      setFormData(initialSettings);
    }
    showAlert('info', 'Changes reverted');
  };

  const assignedStoreName = (() => {
    if (profileLoading) {
      return 'Loading...';
    }
    if (!profile?.store_id) {
      return 'Unassigned';
    }
    if (storeLoading) {
      return 'Loading store...';
    }
    return storeDetails?.name || 'Store not found';
  })();

  return (
    <div className="min-h-full bg-gray-50 px-6 py-6 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review your account, store details, and POS configuration.
          </p>
        </div>
        {showAdvancedSettings && (
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
        )}
      </div>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pulled directly from your user account.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {profileLoading ? 'Loading...' : profile?.name || 'Not available'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {profileLoading ? 'Loading...' : profile?.email || 'Not available'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</p>
              <p className="mt-1 text-sm font-medium capitalize text-gray-900 dark:text-white">
                {role?.replace('_', ' ') || 'Unknown'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Assigned Store
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{assignedStoreName}</p>
            </div>
          </div>
          {profileError && <p className="mt-4 text-sm text-red-500">{profileError}</p>}
        </section>

        {isManager && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Store Details</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Retrieved from your assigned store.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Store Name
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {storeLoading ? 'Loading...' : storeDetails?.name || 'Not available'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Store Email
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {storeLoading ? 'Loading...' : storeDetails?.email || 'Not available'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Store Phone
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {storeLoading ? 'Loading...' : storeDetails?.phone || 'Not available'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Address
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {storeLoading ? 'Loading...' : storeDetails?.address || 'Not available'}
                </p>
              </div>
            </div>
            {storeError && <p className="mt-4 text-sm text-red-500">{storeError}</p>}
          </section>
        )}

        {isManager && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Razorpay Connection</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Link your store’s Razorpay API credentials. Managers can replace them anytime.
              </p>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                <p
                  className={`mt-2 text-lg font-semibold ${
                    razorpayStatus?.isConnected ? 'text-green-600' : 'text-yellow-600'
                  }`}
                >
                  {razorpayStatus?.isConnected ? 'Connections are good' : 'Not connected'}
                </p>
                <dl className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <dt>Mode</dt>
                    <dd className="font-medium">{razorpayStatus?.mode ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Key ID</dt>
                    <dd className="font-mono">
                      {razorpayStatus?.keyIdLast4 ? `****${razorpayStatus.keyIdLast4}` : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Connected At</dt>
                    <dd>{formatDateTime(razorpayStatus?.connectedAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last Updated</dt>
                    <dd>{formatDateTime(razorpayStatus?.updatedAt)}</dd>
                  </div>
                </dl>
                {razorpayError && (
                  <p className="mt-4 text-sm text-red-500 dark:text-red-400">{razorpayError}</p>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    name="keyId"
                    value={razorpayForm.keyId}
                    onChange={handleRazorpayInput}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="rzp_test_***"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Razorpay Secret Key
                  </label>
                  <input
                    type="password"
                    name="keySecret"
                    value={razorpayForm.keySecret}
                    onChange={handleRazorpayInput}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter secret key"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mode
                  </label>
                  <select
                    name="mode"
                    value={razorpayForm.mode}
                    onChange={handleRazorpayInput}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="test">Test</option>
                    <option value="live">Live</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleRazorpayConnect}
                  disabled={razorpayLoading}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {razorpayLoading
                    ? 'Connecting...'
                    : razorpayStatus?.isConnected
                      ? 'Replace Credentials'
                      : 'Connect Razorpay'}
                </button>
              </div>
            </div>
          </section>
        )}

        {showAdvancedSettings && (
          <form id="settings-form" onSubmit={handleSubmit}>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">POS Configuration</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Update taxation, currency, and stock thresholds for this tenant.
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
                    value={formData.taxRate ?? ''}
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
                    value={formData.currencySymbol ?? ''}
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
                    value={formData.currencyCode ?? ''}
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
                    value={formData.lowStockThreshold ?? ''}
                    onChange={handleNumberChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </section>
          </form>
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
      </div>
    </div>
  );
};

export default Settings;

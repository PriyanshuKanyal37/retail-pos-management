import { useEffect, useState } from 'react';
import useAuthStore from '../../stores/authStore';
import useStoreStore from '../../stores/storeStore';
import useUserStore from '../../stores/userStore';

const getDefaultFormState = (userRole) => ({
  name: '',
  email: '',
  password: '',
  role: userRole === 'super_admin' ? 'cashier' : 'cashier', // Default to cashier for all roles
  store_id: '',
  assigned_manager_id: ''
});

const roles = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Cashier', value: 'cashier' }
];

const UserFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null
}) => {
  const [formData, setFormData] = useState(getDefaultFormState('cashier'));
  const { stores, fetchStores } = useStoreStore();
  const { user: currentUser, isSuperAdmin, isManager } = useAuthStore();
  const { users, fetchUsers } = useUserStore();

  useEffect(() => {
    if (isOpen) {
      // Fetch stores and users for dropdowns
      fetchStores();
      fetchUsers();

      if (initialData) {
        setFormData({
          name: initialData.name ?? '',
          email: initialData.email ?? '',
          password: '',
          role: initialData.role ?? 'cashier',
          store_id: initialData.store_id ?? '',
          assigned_manager_id: initialData.assigned_manager_id ?? ''
        });
      } else {
        // For new users, default role depends on who is creating:
        // Super Admin -> default to cashier (but can change)
        // Manager -> must be cashier (cannot change)
        const defaultRole = isManager ? 'cashier' : 'cashier';
        setFormData(getDefaultFormState(defaultRole));
      }
    }
  }, [initialData, isOpen, fetchStores, fetchUsers]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Clear store assignment when role changes from cashier
    if (name === 'role' && value !== 'cashier') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        store_id: '',
        assigned_manager_id: ''
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();

    if (!trimmedName || !trimmedEmail) {
      return;
    }

    // Validate store assignment for managers and cashiers (only for Super Admins)
    if (isSuperAdmin() && (formData.role === 'manager' || formData.role === 'cashier') && !formData.store_id) {
      alert(`Please select a store for this ${formData.role}.`);
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      role: formData.role
    };

    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    // Add store assignment for cashiers and managers
    if ((formData.role === 'cashier' || formData.role === 'manager') && formData.store_id) {
      payload.store_id = formData.store_id;
    } else if (isManager() && formData.role === 'cashier') {
      // For managers creating cashiers, use manager's store
      payload.store_id = currentUser.store_id;
    }

    // Add manager assignment for cashiers (super admin only)
    if (isSuperAdmin() && formData.role === 'cashier' && formData.assigned_manager_id) {
      payload.assigned_manager_id = formData.assigned_manager_id;
    }

    const success = await onSubmit?.(payload);
    if (success) {
      setFormData(getDefaultFormState(currentUser?.role || 'cashier'));
    }
  };

  const isEditing = Boolean(initialData);

  // Helper functions
  const getAvailableManagers = () => {
    return users.filter(user => user.role === 'manager');
  };

  const getAvailableStores = () => {
    if (isSuperAdmin) {
      return stores;
    } else if (isManager) {
      // Managers can only assign cashiers to their own stores
      return stores.filter(store => store.manager_id === currentUser.id);
    }
    return [];
  };

  const shouldShowStoreField = () => {
    // Only Super Admins need to see store assignment
    // Managers are in single store context and cashiers are assigned to their store
    return isSuperAdmin() && (formData.role === 'cashier' || formData.role === 'manager');
  };

  const shouldShowManagerField = () => {
    // Only Super Admins can assign cashiers to specific managers
    return isSuperAdmin() && formData.role === 'cashier';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit User' : 'Add User'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditing
                ? 'Update the user details and permissions.'
                : 'Create a new team member for the POS system.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          {/* Role Selection */}
          {isSuperAdmin() && currentUser?.role === 'super_admin' ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {roles
                  .map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            // For Managers or any non-super-admin, show a read-only role field
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Role *
              </label>
              <div className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
                Cashier
              </div>
              <input
                type="hidden"
                name="role"
                value="cashier"
              />
            </div>
          )}

          {shouldShowStoreField() && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {formData.role === 'manager' ? 'Assign to Store *' : 'Store Assignment *'}
              </label>
              <select
                name="store_id"
                value={formData.store_id}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                required
              >
                <option value="">Select a store</option>
                {getAvailableStores().map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
              {getAvailableStores().length === 0 && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                  No stores available. Please create a store first.
                </p>
              )}
            </div>
          )}

          {shouldShowManagerField() && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Manager Assignment
              </label>
              <select
                name="assigned_manager_id"
                value={formData.assigned_manager_id}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select a manager (optional)</option>
                {getAvailableManagers().map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Assign this cashier to a specific manager. If not assigned, they can be managed by any manager of the store.
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {isEditing ? 'New Password (optional)' : 'Password *'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isEditing ? 'Leave blank to keep current password' : 'Enter password'}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              required={!isEditing}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {isEditing ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;

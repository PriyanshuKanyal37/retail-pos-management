import { useMemo, useState, useEffect } from 'react';
import useUIStore from '../stores/uiStore';
import useUserStore from '../stores/userStore';
import useAuthStore from '../stores/authStore';
import useStoreStore from '../stores/storeStore';
import UserFormModal from '../components/users/UserFormModal';

const roleBadges = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cashier: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
};

const roleLabels = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  cashier: 'Cashier'
};

const statusBadges = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
};

const Users = () => {
  const users = useUserStore((state) => state.users);
  const { fetchUsers, fetchUsersByStore, createCashier, createManager, deleteUser } = useUserStore();
  const stores = useStoreStore((state) => state.stores);
  const { fetchStores } = useStoreStore();
  const addUser = useUserStore((state) => state.addUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const toggleUserStatus = useUserStore((state) => state.toggleUserStatus);
  const resetPassword = useUserStore((state) => state.resetPassword);
  const getUserByEmail = useUserStore((state) => state.getUserByEmail);
  const currentUser = useAuthStore((state) => state.user);
  const { isSuperAdmin, isManager } = useAuthStore();
  const showAlert = useUIStore((state) => state.showAlert);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');

  useEffect(() => {
    // Load stores for filtering
    if (isSuperAdmin() || isManager()) {
      fetchStores();
    }

    // Load users based on user role
    if (isSuperAdmin()) {
      fetchUsers();
    } else if (isManager()) {
      // Managers should only see cashiers assigned to their store
      fetchUsers();
    }
  }, [isSuperAdmin, isManager, fetchUsers, fetchStores]);

  const managerStoreIds = useMemo(() => {
    if (!currentUser?.id) return [];
    return stores
      .filter((store) => store.manager_id === currentUser.id)
      .map((store) => store.id);
  }, [stores, currentUser?.id]);

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Role-based filtering: Managers can only see cashiers, Super Admins can see everyone
    if (isManager()) {
      filtered = filtered.filter((user) => {
        if (user.role !== 'cashier') {
          return false;
        }

        // First, check explicit manager assignment
        if (user.assigned_manager_id && user.assigned_manager_id === currentUser?.id) {
          return true;
        }

        // Check if user is in the same store as the manager
        if (user.store_id && currentUser?.store_id && user.store_id === currentUser.store_id) {
          return true;
        }

        // Otherwise, fall back to store relationships from stores data
        if (user.store_id && managerStoreIds.includes(user.store_id)) {
          return true;
        }

        return false;
      });
    }

    // Super Admin role filter
    if (isSuperAdmin() && roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Manager role filter (only cashier option applies)
    if (isManager() && roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Filter by store
    if (storeFilter !== 'all') {
      filtered = filtered.filter((user) => user.store_id === storeFilter);
    }

    // Filter by search term
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((user) => {
        const inName = user.name.toLowerCase().includes(term);
        const inEmail = user.email.toLowerCase().includes(term);
        const inRole = user.role.toLowerCase().includes(term);
        return inName || inEmail || inRole;
      });
    }

    return filtered;
  }, [users, searchTerm, roleFilter, storeFilter, isSuperAdmin, isManager, currentUser?.id, managerStoreIds]);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowFormModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowFormModal(true);
  };

  const handleModalClose = () => {
    setShowFormModal(false);
    setEditingUser(null);
  };

  const handleFormSubmit = async (payload) => {
    const emailInUse = getUserByEmail(payload.email);
    const isEdit = Boolean(editingUser);

    if (!isEdit && emailInUse) {
      showAlert('error', 'A user with this email already exists');
      return false;
    }

    if (isEdit && emailInUse && emailInUse.id !== editingUser.id) {
      showAlert('error', 'Another user already uses this email');
      return false;
    }

  if (isEdit) {
    const updates = {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      store_id: (payload.role === 'manager' || payload.role === 'cashier') ? payload.store_id : null,
      manager_id:
        payload.role === 'cashier'
          ? (editingUser?.managerId ?? currentUser?.id ?? null)
          : null
    };

    if (payload.password) {
      updates.password = payload.password;
    }

      try {
        await updateUser(editingUser.id, updates);
        showAlert('success', 'User updated successfully');
      } catch (error) {
        showAlert('error', error.message || 'Failed to update user');
        return false;
      }
    } else {
      try {
        const requestPayload = {
          ...payload,
          manager_id: payload.role === 'cashier' ? currentUser?.id ?? null : null
        };

        if (requestPayload.role === 'cashier' && !requestPayload.manager_id) {
          showAlert('error', 'Assign the cashier to a manager before saving');
          return false;
        }

        await addUser(requestPayload);

        // Refresh the user list to ensure UI updates with new user
        if (isSuperAdmin()) {
          await fetchUsers();
        } else if (isManager()) {
          await fetchUsers();
        }

        showAlert('success', 'User added successfully');
      } catch (error) {
        showAlert('error', error.message || 'Failed to add user');
        return false;
      }
    }

    handleModalClose();
    return true;
  };

  const handleToggleStatus = async (user) => {
    try {
      const updated = await toggleUserStatus(user.id);
      showAlert(
        'info',
        `User ${updated.name} marked as ${updated.status === 'active' ? 'active' : 'inactive'}`
      );
    } catch (error) {
      showAlert('error', error.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(
      `Set new password for ${user.name}`,
      'password123'
    );

    if (newPassword && newPassword.trim()) {
      try {
        await resetPassword(user.id, newPassword.trim());
        showAlert('success', 'Password updated');
      } catch (error) {
        showAlert('error', error.message || 'Failed to reset password');
      }
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(
      `Are you sure you want to permanently delete ${user.name} (${user.role})? This action cannot be undone and will remove all user data.`
    )) {
      return;
    }

    try {
      await deleteUser(user.id);
      showAlert('success', `${user.name} has been permanently deleted`);
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete user');
    }
  };

  return (
    <div className="min-h-full bg-gray-50 px-6 py-6 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isSuperAdmin() ? 'User Management' : 'Cashier Management'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isSuperAdmin()
              ? 'Add, update, or deactivate team members who can access the POS system.'
              : 'Add, update, or deactivate cashiers for your store.'
            }
          </p>
        </div>

        {(isSuperAdmin() || isManager()) && (
          <button
            type="button"
            onClick={handleAddUser}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isSuperAdmin() ? 'Add User' : 'Add Cashier'}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search users (name, email, role)"
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Roles</option>
          {isSuperAdmin() && <option value="super_admin">Super Admin</option>}
          {isSuperAdmin() && <option value="manager">Manager</option>}
          <option value="cashier">Cashier</option>
        </select>

        {/* Store Filter (only show if user has access to stores) */}
        {(isSuperAdmin() || isManager()) && (
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Store
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${roleBadges[user.role]}`}>
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      if (user.role === 'super_admin') {
                        return <span className="text-xs text-gray-500">All Stores</span>;
                      }
                      if (user.role === 'manager') {
                        // Check both manager assignment to store and user's store_id
                        const managedStore = stores.find(s => s.manager_id === user.id) ||
                                           stores.find(s => s.id === user.store_id);
                        return managedStore ? (
                          <span className="text-xs text-gray-700 dark:text-gray-300">{managedStore.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">No Store</span>
                        );
                      }
                      if (user.role === 'cashier' && user.store_id) {
                        const userStore = stores.find(s => s.id === user.store_id);
                        return userStore ? (
                          <span className="text-xs text-gray-700 dark:text-gray-300">{userStore.name}</span>
                        ) : (
                          <span className="text-xs text-red-500">Unknown Store</span>
                        );
                      }
                      return <span className="text-xs text-gray-400">-</span>;
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadges[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditUser(user)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      {currentUser?.id !== user.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="rounded-lg border border-blue-600 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            className="rounded-lg border border-amber-500 px-3 py-2 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          >
                            Reset Password
                          </button>
                          {(isSuperAdmin() && user.role !== 'super_admin') || (isManager() && user.role === 'cashier') ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="rounded-lg border border-red-600 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Delete
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No users found. Try adjusting your search or add a new user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UserFormModal
        isOpen={showFormModal}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        initialData={editingUser}
      />
    </div>
  );
};

export default Users;

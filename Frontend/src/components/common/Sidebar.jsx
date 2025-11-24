import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';

const Sidebar = () => {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);
  const activeStoreName = useAuthStore((state) => state.activeStoreName);
  const logout = useAuthStore((state) => state.logout);
  const clearActiveStore = useAuthStore((state) => state.clearActiveStore);

  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const showAlert = useUIStore((state) => state.showAlert);

  const handleLogout = () => {
    logout();
    showAlert('success', 'Logged out successfully');
    navigate('/login');
  };

  const icons = {
    stores: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    pos: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    sales: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    products: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
    customers: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    )
  };

  const menuItems = [
    // Super Admin menu items ONLY
    {
      name: 'Stores',
      path: '/stores',
      icon: icons.stores,
      roles: ['super_admin']
    },

    // Manager and Super Admin menu items
    {
      name: 'User Management',
      path: '/users',
      icon: icons.users,
      roles: ['super_admin', 'manager']
    },

    // Common menu items for Manager and Cashier (operational roles)
    {
      name: 'POS Terminal',
      path: '/pos',
      icon: icons.pos,
      roles: ['manager', 'cashier']
    },
    {
      name: 'Sales',
      path: '/sales',
      icon: icons.sales,
      roles: ['manager', 'cashier']
    },
    {
      name: 'Products',
      path: '/products',
      icon: icons.products,
      roles: ['manager', 'cashier']
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: icons.customers,
      roles: ['manager', 'cashier']
    },

    // Settings for all roles
    {
      name: 'Settings',
      path: '/settings',
      icon: icons.settings,
      roles: ['super_admin', 'manager', 'cashier']
    }
  ];

  const isSuperAdminInStore = role === 'super_admin' && !!activeStoreId;
  const effectiveRole = isSuperAdminInStore ? 'manager' : role;

  // Filter menu items based on effective role while preserving super admin links
  const availableMenuItems = menuItems.filter((item) => {
    if (role === 'super_admin' && item.roles.includes('super_admin')) {
      return true;
    }
    return effectiveRole ? item.roles.includes(effectiveRole) : false;
  });

  const handleExitStore = () => {
    clearActiveStore();
    showAlert('info', 'Returned to Super Admin view');
    navigate('/stores');
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">POS System</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {sidebarOpen && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {role === 'super_admin'
                    ? isSuperAdminInStore
                      ? 'Super Admin (Store View)'
                      : 'Super Admin'
                    : role === 'manager'
                      ? 'Manager'
                      : role === 'cashier'
                        ? 'Cashier'
                        : role}
                </p>
                {isSuperAdminInStore && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                    {activeStoreName ? `Store: ${activeStoreName}` : `Store ID: ${activeStoreId}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isSuperAdminInStore && sidebarOpen && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              You are viewing the system as a store manager.
            </p>
            <button
              onClick={handleExitStore}
              className="w-full text-sm py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Exit Store View
            </button>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
          {availableMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              {item.icon}
              {sidebarOpen && <span className="font-medium">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {isSuperAdminInStore && !sidebarOpen && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleExitStore}
              className="w-full flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              title="Exit Store View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


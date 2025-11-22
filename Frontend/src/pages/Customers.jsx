import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCustomerStore from '../stores/customerStore';
import useSalesStore from '../stores/salesStore';
import useUIStore from '../stores/uiStore';
import useUserStore from '../stores/userStore';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import useSettingsStore from '../stores/settingsStore';


const Customers = () => {
  const navigate = useNavigate();
  const customers = useCustomerStore((state) => state.customers);
  const addCustomer = useCustomerStore((state) => state.addCustomer);
  const sales = useSalesStore((state) => state.sales);
  const users = useUserStore((state) => state.users);
  const showAlert = useUIStore((state) => state.showAlert);
  const settings = useSettingsStore((state) => state.settings);
  const currency = settings?.currency ?? settings?.currencySymbol ?? 'Rs.';
  const formatCurrency = (value) => `${currency}${Number(value ?? 0).toFixed(2)}`;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('recent');
  const [showAddModal, setShowAddModal] = useState(false);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const customerSummaries = useMemo(() => {
    return customers.map((customer) => {
      const customerSales = sales.filter((sale) => sale.customerId === customer.id);
      const totalOrders = customerSales.length;
      const totalSpent = customerSales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);

      const lastSale = customerSales.reduce((latest, sale) => {
        if (!latest) return sale;
        return new Date(sale.createdAt) > new Date(latest.createdAt) ? sale : latest;
      }, null);

      return {
        ...customer,
        totalOrders,
        totalSpent,
        lastPurchase: lastSale ? lastSale.createdAt : null,
        lastInvoice: lastSale?.invoiceNo ?? null,
        lastCashier: lastSale ? userMap.get(lastSale.cashierId)?.name ?? 'N/A' : 'N/A'
      };
    });
  }, [customers, sales, userMap]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customerSummaries;

    return customerSummaries.filter((customer) => {
      const matchesName = customer.name.toLowerCase().includes(term);
      const matchesPhone = customer.phone?.includes(term);
      return matchesName || matchesPhone;
    });
  }, [customerSummaries, searchTerm]);

  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];

    switch (sortOption) {
      case 'spent':
        list.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case 'orders':
        list.sort((a, b) => b.totalOrders - a.totalOrders);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
      default: {
        const getTimestamp = (value) => (value ? new Date(value).getTime() : 0);
        list.sort((a, b) => getTimestamp(b.lastPurchase) - getTimestamp(a.lastPurchase));
        break;
      }
    }

    return list;
  }, [filteredCustomers, sortOption]);

  const aggregateStats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customerSummaries.filter((customer) => customer.totalOrders > 0).length;
    const lifetimeValue = customerSummaries.reduce(
      (sum, customer) => sum + Number(customer.totalSpent ?? 0),
      0
    );
    const averageOrderValue =
      lifetimeValue && activeCustomers
        ? lifetimeValue / customerSummaries.reduce((sum, c) => sum + c.totalOrders, 0)
        : 0;

    return {
      totalCustomers,
      activeCustomers,
      lifetimeValue,
      averageOrderValue
    };
  }, [customerSummaries, customers.length]);

  const handleAddCustomer = async ({ name, phone }) => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      showAlert('error', 'Name and phone are required');
      return false;
    }

    try {
      const newCustomer = await addCustomer({
        name: trimmedName,
        phone: trimmedPhone
      });

      showAlert('success', `Customer ${newCustomer.name} added successfully`);
      setShowAddModal(false);
      return true;
    } catch (error) {
      showAlert('error', error.message || 'Failed to add customer');
      return false;
    }
  };

  const formatLastPurchase = (dateString) => {
    if (!dateString) return 'No purchases yet';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-full bg-gray-50 px-6 py-6 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage customer profiles, spending and purchase history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Customers</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {aggregateStats.totalCustomers}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Customers</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {aggregateStats.activeCustomers}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lifetime Value</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(aggregateStats.lifetimeValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Order Value</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(aggregateStats.averageOrderValue || 0)}
          </p>
        </div>
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
            placeholder="Search customers (name or phone)"
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="recent">Most Recent Purchase</option>
            <option value="spent">Highest Spend</option>
            <option value="orders">Most Orders</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Phone
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Spent
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Last Purchase
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Cashier
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedCustomers.length > 0 ? (
              sortedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {customer.phone || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    {customer.totalOrders}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {formatLastPurchase(customer.lastPurchase)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {customer.lastCashier}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="inline-flex items-center justify-center rounded-lg border border-blue-600 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No customers found. Try adjusting your search or add a new customer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CustomerFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddCustomer}
      />
    </div>
  );
};

export default Customers;

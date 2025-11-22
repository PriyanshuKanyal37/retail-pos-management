import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useCustomerStore from '../stores/customerStore';
import useProductStore from '../stores/productStore';
import useSalesStore from '../stores/salesStore';
import useUserStore from '../stores/userStore';
import CustomerInvoiceModal from '../components/customers/CustomerInvoiceModal';
import useSettingsStore from '../stores/settingsStore';

const formatCurrencyFactory = (currency) => (value) =>
  `${currency}${Number(value ?? 0).toFixed(2)}`;

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const settings = useSettingsStore((state) => state.settings);
  const currency = settings?.currency ?? settings?.currencySymbol ?? 'Rs.';
  const formatCurrency = formatCurrencyFactory(currency);
  const customer = useCustomerStore((state) => state.getCustomerById(id));
  const sales = useSalesStore((state) => state.sales);
  const saleItems = useSalesStore((state) => state.saleItems);
  const products = useProductStore((state) => state.products);
  const users = useUserStore((state) => state.users);

  const [activeSale, setActiveSale] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const customerSales = useMemo(() => {
    if (!customer) return [];
    return sales.filter((sale) => sale.customerId === customer.id);
  }, [customer, sales]);

  const enrichedSales = useMemo(() => {
    return customerSales
      .map((sale) => {
        const items = saleItems
          .filter((item) => item.saleId === sale.id)
          .map((item) => ({
            ...item,
            productName: productMap.get(item.productId)?.name ?? `Product #${item.productId}`
          }));

        const cashierName = userMap.get(sale.cashierId)?.name ?? 'Unknown';

        return {
          sale,
          lineItems: items,
          cashierName
        };
      })
      .sort(
        (a, b) =>
          new Date(b.sale.createdAt).getTime() - new Date(a.sale.createdAt).getTime()
      );
  }, [customerSales, saleItems, productMap, userMap]);

  const metrics = useMemo(() => {
    const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalOrders = customerSales.length;
    const lastPurchaseSale = customerSales.reduce((latest, sale) => {
      if (!latest) return sale;
      return new Date(sale.createdAt) > new Date(latest.createdAt) ? sale : latest;
    }, null);
    const averageOrderValue = totalOrders ? totalSpent / totalOrders : 0;

    return {
      totalSpent,
      totalOrders,
      lastPurchase: lastPurchaseSale ? lastPurchaseSale.createdAt : null,
      averageOrderValue
    };
  }, [customerSales]);

  const registeredBy =
    customer?.cashierId ? userMap.get(customer.cashierId)?.name ?? 'Unknown' : 'N/A';

  const handleViewInvoice = (saleBundle) => {
    setActiveSale(saleBundle);
    setShowInvoiceModal(true);
  };

  const closeInvoiceModal = () => {
    setActiveSale(null);
    setShowInvoiceModal(false);
  };

  if (!customer) {
    return (
      <div className="min-h-full bg-gray-50 px-6 py-6 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Customers
        </button>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Customer not found</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            The customer you are looking for does not exist. Please return to the customer list.
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Spent', value: formatCurrency(metrics.totalSpent) },
    { label: 'Total Orders', value: metrics.totalOrders },
    {
      label: 'Average Order Value',
      value: formatCurrency(metrics.averageOrderValue || 0)
    },
    {
      label: 'Last Purchase',
      value: metrics.lastPurchase ? new Date(metrics.lastPurchase).toLocaleString() : 'No purchases yet'
    }
  ];

  return (
    <div className="min-h-full bg-gray-50 px-6 py-6 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Customers
      </button>

  <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Joined {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Phone
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {customer.phone || 'Not provided'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Registered By
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {registeredBy}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Customer ID
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                #{customer.id}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Snapshot</h2>
          <div className="mt-4 space-y-4">
            {statCards.map((stat) => (
              <div key={stat.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-base font-medium text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {metrics.totalOrders > 0
                ? `${metrics.totalOrders} ${metrics.totalOrders === 1 ? 'order' : 'orders'} recorded`
                : 'No purchases recorded yet'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cashier
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Items
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {enrichedSales.length > 0 ? (
                enrichedSales.map((entry) => (
                  <tr
                    key={entry.sale.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {entry.sale.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(entry.sale.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {entry.cashierName}
                    </td>
                    <td className="px-6 py-4 text-sm capitalize text-gray-900 dark:text-white">
                      {entry.sale.paymentMethod}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(entry.sale.total)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {entry.lineItems.length}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewInvoice(entry)}
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
                    No purchases available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerInvoiceModal
        isOpen={showInvoiceModal}
        onClose={closeInvoiceModal}
        sale={activeSale?.sale}
        lineItems={activeSale?.lineItems ?? []}
        customerName={customer.name}
        customerPhone={customer.phone}
        cashierName={activeSale?.cashierName ?? 'Unknown'}
      />
    </div>
  );
};

export default CustomerDetail;

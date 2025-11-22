import useUIStore from '../../stores/uiStore';
import useSettingsStore from '../../stores/settingsStore';
import { openInvoicePrintWindow } from '../../utils/invoice';

const formatCurrencyFactory = (currency) => (value) =>
  `${currency}${Number(value ?? 0).toFixed(2)}`;

const CustomerInvoiceModal = ({
  isOpen,
  onClose,
  sale,
  lineItems,
  customerName,
  customerPhone,
  cashierName
}) => {
  const showAlert = useUIStore((state) => state.showAlert);
  const settings = useSettingsStore((state) => state.settings);
  const currency = settings?.currency ?? settings?.currencySymbol ?? 'Rs.';
  const formatCurrency = formatCurrencyFactory(currency);

  if (!isOpen || !sale) return null;

  const saleDate = new Date(sale.createdAt).toLocaleString();

  const handlePrint = () => {
    const success = openInvoicePrintWindow({
      sale,
      items: lineItems,
      customerName,
      customerPhone,
      cashierName,
      settings,
      discountInputValue: sale.discountValueInput
    });

    if (!success) {
      showAlert('error', 'Please allow pop-ups to print the invoice.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Invoice {sale.invoiceNumber}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {saleDate} | {cashierName}
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

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Customer
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-white">{customerName}</p>
              {customerPhone && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{customerPhone}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Invoice {sale.invoiceNumber}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
                {sale.paymentMethod} payment
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Items
              </h3>
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.quantity} x {formatCurrency(item.unitPrice ?? item.price ?? 0)}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Summary
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(sale.tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                  <span>Total</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(sale.paidAmount ?? sale.amountPaid ?? 0)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Actions
              </h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 rounded-lg border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  Print Invoice
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInvoiceModal;

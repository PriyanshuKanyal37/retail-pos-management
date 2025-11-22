import { settings as defaultSettings } from '../data/mockData';
import DOMPurify from 'dompurify';

/**
 * Escape HTML special characters to prevent XSS
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Generate professional invoice markup for printing
export const generateInvoiceHTML = ({
  sale,
  items,
  customerName,
  customerPhone = '',
  cashierName,
  settings = defaultSettings,
  discountInputValue = null
}) => {
  const printSettings = {
    storeName: escapeHtml(settings.storeName || ''),
    storeAddress: escapeHtml(settings.storeAddress || ''),
    phone: escapeHtml(settings.phone ?? settings.storePhone ?? ''),
    email: escapeHtml(settings.email ?? settings.storeEmail ?? ''),
    currency: escapeHtml(settings.currencySymbol ?? settings.currency ?? 'Rs.'),
    taxRate: settings.taxRate
  };

  const formatCurrency = (value) =>
    `${printSettings.currency}${Number(value).toFixed(2)}`;

  const saleDate = new Date(sale.createdAt).toLocaleDateString();
  const saleTime = new Date(sale.createdAt).toLocaleTimeString();

  const formatDiscountRow = () => {
    if (!sale.discount || Number(sale.discount) === 0) return '';
    const descriptor =
      sale.discountType === 'percentage'
        ? `${discountInputValue ?? sale.discount}%`
        : formatCurrency(sale.discount);
    return `
      <tr class="discount-row">
        <td class="label">Discount (${descriptor})</td>
        <td class="value">-${formatCurrency(sale.discount)}</td>
      </tr>
    `;
  };

  // Enhanced line items with proper table structure
  const lineItems = items
    .map(
      (item, index) => `
        <tr class="item-row ${index % 2 === 0 ? 'even' : 'odd'}">
          <td class="item-sr">${index + 1}</td>
          <td class="item-name">
            <div class="product-name">${escapeHtml(item.productName)}</div>
            ${(item.sku || item.productSku) ? `<div class="item-sku">SKU: ${escapeHtml(item.sku || item.productSku)}</div>` : ''}
          </td>
          <td class="item-quantity">${escapeHtml(item.quantity)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice ?? item.price ?? 0)}</td>
          <td class="item-total">${formatCurrency(item.total)}</td>
        </tr>
      `
    )
    .join('');

  const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(sale.invoiceNumber)} - v2.0</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          width: 210mm; /* A4 width */
          max-width: 100%;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11px;
          color: #1f2937;
          padding: 20px;
          line-height: 1.4;
          background: white;
        }

        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .invoice-header {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }

        .invoice-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .invoice-header .store-info {
          font-size: 14px;
          opacity: 0.9;
        }

        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 20px;
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .invoice-meta-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .invoice-meta-section p {
          margin: 4px 0;
          font-size: 12px;
          color: #6b7280;
        }

        .invoice-meta-section p strong {
          color: #1f2937;
          font-weight: 600;
        }

        .invoice-items {
          padding: 20px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #3b82f6;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        .items-table th {
          background: #3b82f6;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .items-table th:first-child {
          border-top-left-radius: 6px;
        }

        .items-table th:last-child {
          border-top-right-radius: 6px;
          text-align: right;
        }

        .items-table th.item-sr {
          width: 40px;
          text-align: center;
        }

        .items-table th.item-quantity {
          width: 80px;
          text-align: center;
        }

        .items-table th.item-price {
          width: 100px;
          text-align: right;
        }

        .items-table th.item-total {
          width: 100px;
          text-align: right;
        }

        .items-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }

        .items-table .item-row.even {
          background: #f9fafb;
        }

        .items-table .item-row:hover {
          background: #eff6ff;
        }

        .items-table .item-sr {
          text-align: center;
          font-weight: 600;
          color: #6b7280;
        }

        .items-table .item-name {
          min-width: 200px;
        }

        .product-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
        }

        .item-sku {
          font-size: 10px;
          color: #9ca3af;
          font-style: italic;
        }

        .items-table .item-quantity {
          text-align: center;
          font-weight: 500;
        }

        .items-table .item-price,
        .items-table .item-total {
          text-align: right;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .invoice-totals {
          padding: 20px;
          background: #f9fafb;
          border-top: 2px solid #e5e7eb;
        }

        .totals-table {
          width: 100%;
          max-width: 300px;
          margin-left: auto;
          border-collapse: collapse;
        }

        .totals-table td {
          padding: 8px 0;
          vertical-align: middle;
        }

        .totals-table .label {
          color: #6b7280;
          font-weight: 500;
          text-align: left;
        }

        .totals-table .value {
          text-align: right;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .totals-table .grand-total-row {
          border-top: 2px solid #3b82f6;
          padding-top: 12px;
          margin-top: 4px;
        }

        .totals-table .grand-total-row .label {
          font-size: 14px;
          color: #1f2937;
          font-weight: 700;
        }

        .totals-table .grand-total-row .value {
          font-size: 16px;
          color: #3b82f6;
          font-weight: 700;
        }

        .discount-row {
          color: #059669;
        }

        .discount-row .value {
          color: #059669;
        }

        .invoice-footer {
          padding: 20px;
          text-align: center;
          background: #f3f4f6;
          border-top: 1px solid #e5e7eb;
        }

        .thank-you {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .powered-by {
          font-size: 11px;
          color: #9ca3af;
        }

        .payment-info {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #d1d5db;
        }

        .payment-info div {
          flex: 1;
        }

        .payment-info .label {
          font-size: 10px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .payment-info .value {
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
        }

        @media print {
          body {
            width: 210mm;
            padding: 0;
            background: white;
          }

          .invoice-container {
            box-shadow: none;
            border: none;
          }

          .invoice-header {
            background: #3b82f6 !important;
            -webkit-print-color-adjust: exact;
          }

          .invoice-footer {
            background: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
          }

          .items-table th {
            background: #3b82f6 !important;
            -webkit-print-color-adjust: exact;
          }

          .items-table .item-row:hover {
            background: transparent !important;
          }
        }

        @media screen and (max-width: 768px) {
          body {
            padding: 10px;
          }

          .invoice-meta {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .items-table {
            font-size: 10px;
          }

          .items-table th,
          .items-table td {
            padding: 8px 4px;
          }

          .product-name {
            font-size: 11px;
          }

          .item-sku {
            font-size: 9px;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Invoice Header -->
        <div class="invoice-header">
          <h1>TAX INVOICE</h1>
          <div class="store-info">
            <div><strong>${printSettings.storeName}</strong></div>
            <div>${printSettings.storeAddress}</div>
            <div>Phone: ${printSettings.phone} | Email: ${printSettings.email}</div>
          </div>
        </div>

        <!-- Invoice Meta Information -->
        <div class="invoice-meta">
          <div class="invoice-meta-section">
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> ${escapeHtml(sale.invoiceNumber)}</p>
            <p><strong>Date:</strong> ${escapeHtml(saleDate)}</p>
            <p><strong>Time:</strong> ${escapeHtml(saleTime)}</p>
            <p><strong>Payment Method:</strong> ${escapeHtml(sale.paymentMethod?.toUpperCase() || '')}</p>
          </div>

          <div class="invoice-meta-section">
            <h3>Customer & Staff</h3>
            <p><strong>Customer:</strong> ${escapeHtml(customerName || 'Walk-in Customer')}</p>
            ${customerPhone ? `<p><strong>Phone:</strong> ${escapeHtml(customerPhone)}</p>` : ''}
            <p><strong>Cashier:</strong> ${escapeHtml(cashierName)}</p>
          </div>
        </div>

        <!-- Invoice Items -->
        <div class="invoice-items">
          <h2 class="section-title">Invoice Items</h2>
          <table class="items-table">
            <thead>
              <tr>
                <th class="item-sr">#</th>
                <th>Item Description</th>
                <th class="item-quantity">Qty</th>
                <th class="item-price">Price</th>
                <th class="item-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems}
            </tbody>
          </table>
        </div>

        <!-- Invoice Totals -->
        <div class="invoice-totals">
          <table class="totals-table">
            <tbody>
              <tr>
                <td class="label">Subtotal</td>
                <td class="value">${formatCurrency(sale.subtotal)}</td>
              </tr>
              ${formatDiscountRow()}
              <tr>
                <td class="label">Tax (${printSettings.taxRate}%)</td>
                <td class="value">${formatCurrency(sale.tax)}</td>
              </tr>
              <tr class="grand-total-row">
                <td class="label">Grand Total</td>
                <td class="value">${formatCurrency(sale.total)}</td>
              </tr>
              <tr>
                <td class="label">Amount Paid</td>
                <td class="value">${formatCurrency(sale.paidAmount ?? sale.amountPaid ?? 0)}</td>
              </tr>
              <tr>
                <td class="label">Balance Due</td>
                <td class="value">${formatCurrency((sale.total ?? 0) - (sale.paidAmount ?? sale.amountPaid ?? 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Invoice Footer -->
        <div class="invoice-footer">
          <div class="thank-you">Thank you for your business!</div>
          <div class="powered-by">Powered by FA POS System</div>

          <div class="payment-info">
            <div>
              <div class="label">Payment Status</div>
              <div class="value">${(sale.paidAmount ?? sale.amountPaid ?? 0) >= (sale.total ?? 0) ? 'PAID' : 'PENDING'}</div>
            </div>
            <div>
              <div class="label">Terms</div>
              <div class="value">Due on Receipt</div>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;

  // Final XSS protection with DOMPurify
  return DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['html', 'head', 'body', 'div', 'h1', 'h2', 'h3', 'p', 'strong', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'style'],
    ALLOWED_ATTR: ['class', 'type'],
    ALLOW_DATA_ATTR: false
  });
};

export const openInvoicePrintWindow = ({
  sale,
  items,
  customerName,
  customerPhone = '',
  cashierName,
  settings = defaultSettings,
  discountInputValue = null
}) => {
  try {
    const resolvedSettings = settings ?? defaultSettings;
    const invoiceHTML = generateInvoiceHTML({
      sale,
      items,
      customerName,
      customerPhone,
      cashierName,
      settings: resolvedSettings,
      discountInputValue
    });

    const printWindow = window.open('', 'PRINT', 'height=800,width=1000,scrollbars=yes');

    if (!printWindow) {
      return false;
    }

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    return true;
  } catch (error) {
    console.error('Failed to open invoice print window', error);
    return false;
  }
};

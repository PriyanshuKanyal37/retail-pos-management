const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const normalizeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    store_id: user.store_id ?? null,
    manager_id: user.assigned_manager_id ?? user.manager_id ?? null,
    managerId: user.assigned_manager_id ?? user.manager_id ?? user.managerId ?? null,
    assigned_manager_id: user.assigned_manager_id ?? null,
    createdAt: user.created_at ?? null,
    updatedAt: user.updated_at ?? null
  };
};

export const normalizeCustomer = (customer) => {
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? '',
    createdAt: customer.created_at ?? null,
    updatedAt: customer.updated_at ?? null,
    cashierId: customer.cashier_id ?? null
  };
};

export const normalizeProduct = (product) => {
  if (!product) return null;
  const imageUrl = product.img_url ?? product.image ?? null;
  return {
    id: product.id,
    store_id: product.store_id ?? product.storeId ?? null,
    storeId: product.store_id ?? product.storeId ?? null,
    tenant_id: product.tenant_id ?? product.tenantId ?? null,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? '',
    category: product.category ?? '',
    price: toNumber(product.price),
    stock: toNumber(product.stock),
    low_stock_threshold: toNumber(product.low_stock_threshold, 5),
    lowStockThreshold: toNumber(product.low_stock_threshold, 5), // Backwards compatibility
    minStock: toNumber(product.min_stock ?? product.low_stock_threshold, 5), // Fallback for older code
    status: product.status ?? 'active',
    image: imageUrl,
    img_url: imageUrl, // maintain backwards compatibility
    ownerId: product.owner_id ?? product.ownerId ?? null,
    createdAt: product.created_at ?? null,
    updatedAt: product.updated_at ?? null
  };
};

const normalizeSaleItem = (item) => {
  if (!item) return null;
  return {
    id: item.id,
    saleId: item.sale_id ?? item.saleId ?? null,
    productId: item.product_id ?? item.productId ?? null,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unit_price ?? item.unitPrice),
    total: item.total === null || item.total === undefined ? null : toNumber(item.total),
    productName: item.product_name ?? item.productName ?? null
  };
};

export const normalizeSale = (sale) => {
  if (!sale) return null;
  const items = Array.isArray(sale.items) ? sale.items.map(normalizeSaleItem).filter(Boolean) : [];

  return {
    id: sale.id,
    invoiceNo: sale.invoice_no ?? sale.invoiceNo ?? '',
    invoiceNumber: sale.invoice_no ?? sale.invoiceNumber ?? '',
    customerId: sale.customer_id ?? sale.customerId ?? null,
    cashierId: sale.cashier_id ?? sale.cashierId ?? null,
    paymentMethod: sale.payment_method ?? sale.paymentMethod ?? '',
    subtotal: toNumber(sale.subtotal),
    discount: toNumber(sale.discount),
    discountType: sale.discount_type ?? sale.discountType ?? 'flat',
    discountValueInput: toNumber(sale.discount_value_input ?? sale.discountValueInput),
    tax: toNumber(sale.tax),
    total: toNumber(sale.total),
    paidAmount: toNumber(sale.paid_amount ?? sale.paidAmount),
    changeAmount: sale.change_amount === null || sale.change_amount === undefined
      ? toNumber(sale.changeAmount, 0)
      : toNumber(sale.change_amount, 0),
    upiStatus: sale.upi_status ?? sale.upiStatus ?? 'n/a',
    invoicePdfUrl: sale.invoice_pdf_url ?? sale.invoicePdfUrl ?? null,
    status: sale.status ?? 'completed',
    createdAt: sale.created_at ?? sale.createdAt ?? null,
    items
  };
};

export const normalizeSalesSummary = (summary) => {
  if (!summary) return null;
  return {
    totalSales: toNumber(summary.total_sales ?? summary.totalSales),
    totalRevenue: toNumber(summary.total_revenue ?? summary.totalRevenue),
    totalDiscount: toNumber(summary.total_discount ?? summary.totalDiscount),
    averageOrderValue: toNumber(summary.average_order_value ?? summary.averageOrderValue),
    paymentBreakdown: Array.isArray(summary.payment_breakdown ?? summary.paymentBreakdown)
      ? (summary.payment_breakdown ?? summary.paymentBreakdown).map((entry) => ({
          method: entry.method,
          total: toNumber(entry.total)
        }))
      : [],
    topProducts: Array.isArray(summary.top_products ?? summary.topProducts)
      ? (summary.top_products ?? summary.topProducts).map((product) => ({
          productId: product.product_id ?? product.productId ?? null,
          productName: product.product_name ?? product.productName ?? null,
          quantity: toNumber(product.quantity),
          revenue: toNumber(product.revenue)
        }))
      : []
  };
};

export const normalizeSettings = (payload) => {
  if (!payload) return null;
  const currencySymbol = payload.currency_symbol ?? payload.currencySymbol ?? 'Rs.';
  return {
    id: payload.id ?? null,
    storeName: payload.store_name ?? payload.storeName ?? '',
    storeAddress: payload.store_address ?? payload.storeAddress ?? '',
    storePhone: payload.store_phone ?? payload.storePhone ?? '',
    storeEmail: payload.store_email ?? payload.storeEmail ?? '',
    taxRate: toNumber(payload.tax_rate ?? payload.taxRate),
    currencySymbol,
    currencyCode: payload.currency_code ?? payload.currencyCode ?? 'INR',
    currency: currencySymbol,
    upiId: payload.upi_id ?? payload.upiId ?? '',
    storeLogoUrl: payload.store_logo_url ?? payload.storeLogoUrl ?? '',
    lowStockThreshold: toNumber(payload.low_stock_threshold ?? payload.lowStockThreshold, 5),
    theme: payload.theme ?? 'light',
    createdAt: payload.created_at ?? payload.createdAt ?? null,
    updatedAt: payload.updated_at ?? payload.updatedAt ?? null
  };
};

export const serializeSettings = (settings) => {
  if (!settings) return {};
  return {
    store_name: settings.storeName,
    store_address: settings.storeAddress,
    store_phone: settings.storePhone,
    store_email: settings.storeEmail,
    tax_rate: settings.taxRate,
    currency_symbol: settings.currencySymbol,
    currency_code: settings.currencyCode,
    upi_id: settings.upiId,
    store_logo_url: settings.storeLogoUrl,
    low_stock_threshold: settings.lowStockThreshold,
    theme: settings.theme
  };
};

export const flattenSaleItems = (sales) =>
  sales
    .flatMap((sale) => (sale.items || []).map((item) => ({
      ...item,
      saleId: sale.id
    })));

export const normalizeSaleCollection = (sales) =>
  Array.isArray(sales) ? sales.map(normalizeSale).filter(Boolean) : [];

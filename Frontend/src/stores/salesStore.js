import { create } from 'zustand';
import api, { APIError } from '../api/client';
import {
  flattenSaleItems,
  normalizeSale,
  normalizeSaleCollection,
  normalizeSalesSummary
} from '../utils/apiNormalization';

// Sales Store
// Centralises completed sales and sale item history for reporting and customers
const useSalesStore = create((set, get) => ({
  sales: [],
  saleItems: [],
  isLoading: false,
  error: null,

  // Fetch all sales with optional filters
  fetchSales: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const sales = normalizeSaleCollection(await api.sales.getAll(filters));
      set({
        sales,
        saleItems: flattenSaleItems(sales),
        isLoading: false
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch a single sale by ID
  fetchSaleById: async (saleId) => {
    set({ isLoading: true, error: null });
    try {
      const sale = normalizeSale(await api.sales.getById(saleId));
      set({ isLoading: false });
      return sale;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Get next invoice number from backend
  getNextInvoiceNumber: async () => {
    try {
      const response = await api.sales.getNextInvoiceNumber();
      return response.invoice_number;
    } catch (error) {
      console.error('Error fetching next invoice number:', error);
      // Fallback
      const year = new Date().getFullYear();
      return `INV-${year}-0001`;
    }
  },

  // Create a sale via the backend API
  createSale: async ({
    cartItems,
    subtotal,
    discount,
    discountType,
    tax,
    total,
    paymentMethod,
    amountPaid,
    change,
    customerId,
    cashierId,
    discountValueInput = null,
    upiStatus = 'n/a'
  }) => {
    set({ isLoading: true, error: null });
    try {
      // Get invoice number from backend
      const invoiceNumber = await get().getNextInvoiceNumber();

      // Transform cart items to match backend schema
      const items = cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total: item.product.price * item.quantity
      }));

      // Create sale payload matching backend SaleCreate schema
      const salePayload = {
        invoice_no: invoiceNumber,
        customer_id: customerId || null,
        cashier_id: cashierId || null,
        payment_method: paymentMethod,
        subtotal: subtotal,
        discount: discount,
        discount_type: discountType,
        discount_value_input: discountValueInput || 0,
        tax: tax,
        total: total,
        paid_amount: amountPaid,
        change_amount: change,
        upi_status: upiStatus,
        status: 'completed',
        items: items
      };

      let newSale;
      try {
        newSale = normalizeSale(await api.sales.create(salePayload));
      } catch (err) {
        throw err;
      }
      if (!newSale) {
        throw new Error('Failed to create sale');
      }

      // Add the new sale to the store
      set((state) => ({
        sales: [...state.sales, newSale],
        saleItems: [...state.saleItems, ...flattenSaleItems([newSale])],
        isLoading: false
      }));

      return newSale;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Fetch helpers for future screens
  getSalesByCustomer: (customerId) =>
    get().sales.filter((sale) => sale.customerId === customerId),

  getSaleByInvoice: (invoiceNumber) =>
    get().sales.find((sale) => sale.invoiceNo === invoiceNumber),

  getSaleItemsBySaleId: (saleId) => {
    return get().saleItems.filter((item) => item.saleId === saleId);
  },

  // Get sales summary/analytics
  fetchSalesSummary: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const summary = normalizeSalesSummary(await api.sales.getSummary(filters));
      set({ isLoading: false });
      return summary;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));

export default useSalesStore;

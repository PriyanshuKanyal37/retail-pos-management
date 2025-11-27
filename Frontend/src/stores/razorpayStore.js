import { create } from 'zustand';
import api from '../api/client-updated';

const normalizeStatus = (payload) => ({
  isConnected: Boolean(payload?.is_connected),
  mode: payload?.mode ?? null,
  connectedAt: payload?.connected_at ? new Date(payload.connected_at) : null,
  updatedAt: payload?.updated_at ? new Date(payload.updated_at) : null,
  keyIdLast4: payload?.key_id_last4 ?? null
});

const normalizeOrder = (payload) => ({
  saleId: payload?.sale_id ?? null,
  orderId: payload?.order_id ?? null,
  amount: payload?.amount ?? 0,
  currency: payload?.currency ?? 'INR',
  keyId: payload?.key_id ?? '',
  receipt: payload?.receipt ?? null
});

const normalizePaymentStatus = (payload) => ({
  saleId: payload?.sale_id ?? null,
  status: payload?.status ?? 'pending',
  amount: payload?.amount_paise ?? 0,
  currency: payload?.currency ?? 'INR',
  orderId: payload?.razorpay_order_id ?? null,
  paymentId: payload?.razorpay_payment_id ?? null,
  capturedAt: payload?.captured_at ? new Date(payload.captured_at) : null,
  updatedAt: payload?.updated_at ? new Date(payload.updated_at) : null
});

const useRazorpayStore = create((set) => ({
  status: null,
  currentOrder: null,
  paymentStatus: null,
  isLoading: false,
  error: null,

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = normalizeStatus(await api.razorpay.getStatus());
      set({ status, isLoading: false });
      return status;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  connect: async ({ keyId, keySecret, mode = 'test' }) => {
    set({ isLoading: true, error: null });
    try {
      const payload = {
        key_id: keyId,
        key_secret: keySecret,
        mode
      };
      const status = normalizeStatus(await api.razorpay.connect(payload));
      set({ status, isLoading: false });
      return status;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createOrderForSale: async ({ saleId, amountOverridePaise = null, receipt = null }) => {
    try {
      const payload = {
        sale_id: saleId,
        amount_override_paise: amountOverridePaise,
        receipt
      };
      const order = normalizeOrder(await api.razorpay.createOrder(payload));
      set({ currentOrder: order });
      return order;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchPaymentStatus: async (saleId) => {
    try {
      const status = normalizePaymentStatus(await api.razorpay.getOrderStatus(saleId));
      set({ paymentStatus: status });
      return status;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  clearStatus: () => set({ status: null, currentOrder: null, paymentStatus: null })
}));

export default useRazorpayStore;

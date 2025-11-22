import { create } from 'zustand';

// Cart Store for POS
// Manages cart items, totals, discounts, and held sales
const useCartStore = create((set, get) => ({
  // State
  cartItems: [], // Array of {product, quantity}
  selectedCustomer: null,
  discount: 0,
  discountType: 'flat', // 'flat' or 'percentage'
  paymentMethod: 'cash', // 'cash', 'card', 'upi'
  amountPaid: 0,
  heldSales: [], // Array of temporarily saved sales

  // Actions

  // Add product to cart
  addToCart: (product) => {
    const { cartItems } = get();
    const existingItem = cartItems.find((item) => item.product.id === product.id);

    if (existingItem) {
      // Increase quantity if product already in cart
      set({
        cartItems: cartItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      // Add new item to cart
      set({ cartItems: [...cartItems, { product, quantity: 1 }] });
    }
  },

  // Remove product from cart
  removeFromCart: (productId) => {
    const { cartItems } = get();
    set({ cartItems: cartItems.filter((item) => item.product.id !== productId) });
  },

  // Update quantity
  updateQuantity: (productId, quantity) => {
    const { cartItems } = get();
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }

    set({
      cartItems: cartItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    });
  },

  // Increase quantity by 1
  incrementQuantity: (productId) => {
    const { cartItems } = get();
    const item = cartItems.find((item) => item.product.id === productId);
    if (item) {
      get().updateQuantity(productId, item.quantity + 1);
    }
  },

  // Decrease quantity by 1
  decrementQuantity: (productId) => {
    const { cartItems } = get();
    const item = cartItems.find((item) => item.product.id === productId);
    if (item && item.quantity > 1) {
      get().updateQuantity(productId, item.quantity - 1);
    } else if (item && item.quantity === 1) {
      get().removeFromCart(productId);
    }
  },

  // Set selected customer
  setSelectedCustomer: (customer) => {
    set({ selectedCustomer: customer });
  },

  // Set discount
  setDiscount: (discount, type = 'flat') => {
    set({ discount, discountType: type });
  },

  // Set payment method
  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
  },

  // Set amount paid
  setAmountPaid: (amount) => {
    set({ amountPaid: amount });
  },

  // Calculate subtotal
  getSubtotal: () => {
    const { cartItems } = get();
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },

  // Calculate discount amount
  getDiscountAmount: () => {
    const { discount, discountType } = get();
    const subtotal = get().getSubtotal();

    if (discountType === 'percentage') {
      return (subtotal * discount) / 100;
    }
    return discount;
  },

  // Calculate total after discount
  getTotalAfterDiscount: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    return subtotal - discountAmount;
  },

  // Calculate tax (from settings - default 18%)
  getTax: (taxRate = 18) => {
    const totalAfterDiscount = get().getTotalAfterDiscount();
    return (totalAfterDiscount * taxRate) / 100;
  },

  // Calculate grand total
  getGrandTotal: (taxRate = 18) => {
    const totalAfterDiscount = get().getTotalAfterDiscount();
    const tax = get().getTax(taxRate);
    return totalAfterDiscount + tax;
  },

  // Calculate change
  getChange: (taxRate = 18) => {
    const { amountPaid } = get();
    const grandTotal = get().getGrandTotal(taxRate);
    return Math.max(0, amountPaid - grandTotal);
  },

  // Hold current sale
  holdSale: (customerInfo) => {
    const { cartItems, discount, discountType } = get();

    if (cartItems.length === 0) {
      return { success: false, message: 'Cart is empty' };
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.phone) {
      return { success: false, message: 'Customer information required' };
    }

    const heldSale = {
      id: Date.now(),
      cartItems: [...cartItems],
      customerInfo, // Store customer name and phone
      discount,
      discountType,
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      heldSales: [...state.heldSales, heldSale],
      cartItems: [],
      selectedCustomer: null,
      discount: 0,
      discountType: 'flat',
      amountPaid: 0
    }));

    return { success: true, message: 'Sale held successfully' };
  },

  // Remove held sale
  removeHeldSale: (heldSaleId) => {
    set((state) => ({
      heldSales: state.heldSales.filter((sale) => sale.id !== heldSaleId)
    }));
  },

  // Resume held sale
  resumeSale: (heldSaleId) => {
    const { heldSales } = get();
    const heldSale = heldSales.find((sale) => sale.id === heldSaleId);

    if (!heldSale) {
      return { success: false, message: 'Held sale not found' };
    }

    set({
      cartItems: heldSale.cartItems,
      selectedCustomer: null, // Don't restore customer, they'll select again
      discount: heldSale.discount,
      discountType: heldSale.discountType,
      heldSales: heldSales.filter((sale) => sale.id !== heldSaleId)
    });

    return { success: true, message: `Sale resumed for ${heldSale.customerInfo.name}` };
  },

  // Clear cart
  clearCart: () => {
    set({
      cartItems: [],
      selectedCustomer: null,
      discount: 0,
      discountType: 'flat',
      paymentMethod: 'cash',
      amountPaid: 0
    });
  }
}));

export default useCartStore;

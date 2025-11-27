import { useEffect, useRef, useState } from 'react';
import useAuthStore from '../../stores/authStore';
import useCartStore from '../../stores/cartStore';
import useCustomerStore from '../../stores/customerStore';
import useProductStore from '../../stores/productStore';
import useSalesStore from '../../stores/salesStore';
import useSettingsStore from '../../stores/settingsStore';
import useRazorpayStore from '../../stores/razorpayStore';
import useUIStore from '../../stores/uiStore';
import { openInvoicePrintWindow } from '../../utils/invoice';
import UPIQRCode from './UPIQRCode';
import PaymentStatusChecker from './PaymentStatusChecker';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';
const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js';

const loadRazorpayScript = () => new Promise((resolve, reject) => {
  if (typeof window === 'undefined') {
    reject(new Error('Window is not available'));
    return;
  }

  const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID);
  if (existingScript) {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    existingScript.addEventListener('load', () => resolve(true), { once: true });
    existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = RAZORPAY_SCRIPT_ID;
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
  document.body.appendChild(script);
});

const PaymentModal = () => {
  const activeModal = useUIStore((state) => state.activeModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const showAlert = useUIStore((state) => state.showAlert);

  const user = useAuthStore((state) => state.user);

  const {
    cartItems,
    selectedCustomer,
    discount,
    discountType,
    paymentMethod,
    amountPaid,
    setPaymentMethod,
    setAmountPaid,
    getSubtotal,
    getDiscountAmount,
    getTax,
    getGrandTotal,
    clearCart,
    setSelectedCustomer
  } = useCartStore();

  const decrementStock = useProductStore((state) => state.decrementStock);
  const getNextInvoiceNumber = useSalesStore((state) => state.getNextInvoiceNumber);
  const createSale = useSalesStore((state) => state.createSale);
  const addCustomer = useCustomerStore((state) => state.addCustomer);
  const settings = useSettingsStore((state) => state.settings);
  const currency = settings?.currency ?? settings?.currencySymbol ?? 'Rs.';
  const taxRate = settings?.taxRate ?? 0;
  const razorpayStatus = useRazorpayStore((state) => state.status);
  const fetchRazorpayStatus = useRazorpayStore((state) => state.fetchStatus);
  const createRazorpayOrder = useRazorpayStore((state) => state.createOrderForSale);
  const razorpayLoading = useRazorpayStore((state) => state.isLoading);

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  const [customerErrors, setCustomerErrors] = useState({ name: '', phone: '' });
  const [pendingInvoiceNumber, setPendingInvoiceNumber] = useState('INV-XXXX-XXXX');
  const [upiPaymentStep, setUpiPaymentStep] = useState('init'); // 'init', 'qr', 'processing', 'completed'
  const [pendingSaleId, setPendingSaleId] = useState(null);
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [razorpayCheckoutError, setRazorpayCheckoutError] = useState('');
  const [isLaunchingRazorpay, setIsLaunchingRazorpay] = useState(false);
  const customerNameRef = useRef(null);
  const customerPhoneRef = useRef(null);

  useEffect(() => {
    if (activeModal === 'payment' && !completedSale) {
      getNextInvoiceNumber().then((invoiceNo) => {
        setPendingInvoiceNumber(invoiceNo);
      }).catch(() => {
        const year = new Date().getFullYear();
        setPendingInvoiceNumber(`INV-${year}-XXXX`);
      });
    }
  }, [activeModal, completedSale, getNextInvoiceNumber]);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const tax = getTax(taxRate);
  const grandTotal = getGrandTotal(taxRate);
  const isRazorpayConnected = Boolean(razorpayStatus?.isConnected);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerForm({
        name: selectedCustomer.name ?? '',
        phone: selectedCustomer.phone ?? ''
      });
      setCustomerErrors({ name: '', phone: '' });
    } else {
      setCustomerForm({ name: '', phone: '' });
      setCustomerErrors({ name: '', phone: '' });
    }
  }, [selectedCustomer, activeModal]);

  useEffect(() => {
    if (activeModal === 'payment' && !selectedCustomer) {
      const timer = setTimeout(() => {
        customerNameRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeModal, selectedCustomer]);

  useEffect(() => {
    if (activeModal === 'payment') {
      fetchRazorpayStatus().catch(() => {});
    }
  }, [activeModal, fetchRazorpayStatus]);

  useEffect(() => {
    if (activeModal !== 'payment') {
      setIsProcessing(false);
      setCompletedSale(null);
      setUpiPaymentStep('init');
      setPendingSaleId(null);
      setRazorpayOrder(null);
      setRazorpayCheckoutError('');
      setIsLaunchingRazorpay(false);
      return;
    }

    if (completedSale) {
      return;
    }

    if (cartItems.length === 0) {
      showAlert('error', 'Cart is empty');
      closeModal();
      return;
    }

    if (paymentMethod === 'cash') {
      if (amountPaid < grandTotal) {
        setAmountPaid(grandTotal);
      }
    } else {
      setAmountPaid(grandTotal);
    }
  }, [
    activeModal,
    amountPaid,
    cartItems.length,
    closeModal,
    completedSale,
    grandTotal,
    paymentMethod,
    setAmountPaid,
    showAlert
  ]);

  useEffect(() => {
    if (!isRazorpayConnected) {
      setRazorpayOrder(null);
    }
  }, [isRazorpayConnected]);

  const handleCustomerFormChange = (field) => (event) => {
    let { value } = event.target;

    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    setCustomerForm((prev) => ({
      ...prev,
      [field]: value
    }));

    setCustomerErrors((prev) => ({
      ...prev,
      [field]: ''
    }));
  };

  const handleCustomerNameKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      customerPhoneRef.current?.focus();
    }
  };

  const launchRazorpayCheckout = async (order, customer) => {
    setIsLaunchingRazorpay(true);
    setRazorpayCheckoutError('');
    try {
      await loadRazorpayScript();
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK unavailable');
      }
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: settings?.storeName || 'FA POS Store',
        description: `Invoice ${pendingInvoiceNumber}`,
        order_id: order.orderId,
        callback_url: `${API_BASE_URL}${API_PREFIX}/razorpay/callback`,
        redirect: true,
        notes: {
          sale_id: pendingSaleId ?? '',
          customer_name: customer?.name || 'Walk-in Customer'
        },
        prefill: {
          name: customer?.name || '',
          contact: customer?.phone || ''
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          paylater: true
        },
        config: {
          display: {
            blocks: {
              upi_qr_block: {
                name: 'Scan & Pay via UPI',
                instruments: [
                  {
                    method: 'upi',
                    type: 'qr'
                  },
                  {
                    method: 'upi'
                  }
                ]
              }
            },
            sequence: ['upi_qr_block', 'card', 'netbanking', 'wallet', 'paylater'],
            preferences: {
              show_default_blocks: true
            }
          },
          upi: {
            flow: 'qr',
            mode: 'qr',
            active: true,
            max_amount: order.amount
          }
        },
        theme: {
          color: '#2563eb'
        }
      });
      checkout.open();
    } catch (error) {
      setRazorpayCheckoutError(error.message || 'Failed to open Razorpay Checkout');
      throw error;
    } finally {
      setIsLaunchingRazorpay(false);
    }
  };

  const handleLaunchRazorpayCheckout = async () => {
    if (!razorpayOrder) {
      showAlert('error', 'Razorpay order is not ready yet.');
      return;
    }

    try {
      await launchRazorpayCheckout(razorpayOrder, selectedCustomer);
      showAlert('info', 'Razorpay Checkout opened. Complete payment in the popup.');
    } catch (error) {
      showAlert('error', error.message || 'Unable to launch Razorpay Checkout');
    }
  };

  if (activeModal !== 'payment') {
    return null;
  }

  const handleClose = () => {
    if (isProcessing) return;
    closeModal();
  };

  const handleConfirmPayment = async () => {
    if (isProcessing) return;

    if (cartItems.length === 0) {
      showAlert('error', 'Cart is empty');
      closeModal();
      return;
    }

    if (paymentMethod === 'cash' && amountPaid < grandTotal) {
      showAlert('error', 'Amount paid is less than the total');
      return;
    }

    if (!user) {
      showAlert('error', 'No cashier information found');
      return;
    }

    if (paymentMethod === 'upi') {
      await initiateUPITransaction();
      return;
    }

    await processCashPayment();
  };

  const initiateUPITransaction = async () => {
    setIsProcessing(true);

    let customerRecord = selectedCustomer;

    try {
      if (!customerRecord) {
        const trimmedName = customerForm.name.trim();
        const trimmedPhone = customerForm.phone.trim();

        if (!trimmedName) {
          setIsProcessing(false);
          setCustomerErrors({ name: 'Customer name is required', phone: '' });
          return;
        }

        if (!/^[a-zA-Z\s\-\.'\p{L}]+$/u.test(trimmedName)) {
          setIsProcessing(false);
          setCustomerErrors({ name: 'Name can only contain letters, spaces, hyphens, and apostrophes', phone: '' });
          return;
        }

        if (!trimmedPhone) {
          setIsProcessing(false);
          setCustomerErrors({ name: '', phone: 'Phone number is required' });
          return;
        }

        if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
          setIsProcessing(false);
          setCustomerErrors({ name: '', phone: 'Enter a valid 10 digit mobile number starting with 6-9' });
          return;
        }

        customerRecord = await addCustomer({
          name: trimmedName,
          phone: trimmedPhone
        });

        if (!customerRecord || !customerRecord.id) {
          throw new Error('Customer creation failed - no valid ID returned');
        }

        setSelectedCustomer(customerRecord);
      }

      const nameDirectory = cartItems.reduce((accumulator, item) => {
        accumulator[item.product.id] = item.product.name;
        return accumulator;
      }, {});

      const customerId = customerRecord?.id;
      if (!customerId) {
        throw new Error('Customer ID is missing - cannot create sale');
      }

      const saleResult = await createSale({
        cartItems,
        subtotal,
        discount: discountAmount,
        discountType,
        tax,
        total: grandTotal,
        paymentMethod: 'upi',
        amountPaid: grandTotal,
        change: 0,
        customerId: customerId,
        cashierId: user.id,
        discountValueInput: discount,
        upiStatus: 'pending' // Add pending UPI status
      });

      setPendingSaleId(saleResult.id);
      setPendingInvoiceNumber(saleResult.invoice_no || pendingInvoiceNumber);
      setRazorpayCheckoutError('');

      if (isRazorpayConnected) {
        try {
          const order = await createRazorpayOrder({
            saleId: saleResult.id,
            amountOverridePaise: Math.round(grandTotal * 100),
            receipt: saleResult.invoice_no || pendingInvoiceNumber
          });
          setRazorpayOrder(order);
          await launchRazorpayCheckout(order, customerRecord);
          showAlert('info', 'Razorpay Checkout launched. Awaiting confirmation.');
        } catch (orderError) {
          console.error('Failed to initialize Razorpay order:', orderError);
          setRazorpayOrder(null);
          setRazorpayCheckoutError(orderError.message || 'Unable to initialize Razorpay');
          showAlert('error', 'Unable to connect to Razorpay. Showing manual UPI QR as fallback.');
        }
      } else {
        setRazorpayOrder(null);
        showAlert('success', 'Sale created! Please scan QR code to complete payment.');
      }

      setUpiPaymentStep('qr');

    } catch (error) {
      console.error('UPI transaction initiation failed:', error);
      showAlert('error', `Failed to initiate UPI transaction: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processCashPayment = async () => {
    let customerRecord = selectedCustomer;

    setIsProcessing(true);

    if (!customerRecord) {
      const trimmedName = customerForm.name.trim();
      const trimmedPhone = customerForm.phone.trim();

      if (!trimmedName) {
        setIsProcessing(false);
        setCustomerErrors({ name: 'Customer name is required', phone: '' });
        return;
      }

      if (!/^[a-zA-Z\s\-\.'\p{L}]+$/u.test(trimmedName)) {
        setIsProcessing(false);
        setCustomerErrors({ name: 'Name can only contain letters, spaces, hyphens, and apostrophes', phone: '' });
        return;
      }

      if (!trimmedPhone) {
        setIsProcessing(false);
        setCustomerErrors({ name: '', phone: 'Phone number is required' });
        return;
      }

      if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
        setIsProcessing(false);
        setCustomerErrors({ name: '', phone: 'Enter a valid 10 digit mobile number starting with 6-9' });
        return;
      }

      try {
        if (import.meta.env.DEV) {
          console.log('Creating customer:', { name: trimmedName, phone: trimmedPhone });
        }

        customerRecord = await addCustomer({
          name: trimmedName,
          phone: trimmedPhone
        });

        if (!customerRecord || !customerRecord.id) {
          throw new Error('Customer creation failed - no valid ID returned');
        }

        if (import.meta.env.DEV) {
          console.log('Customer created successfully:', customerRecord);
        }
        setSelectedCustomer(customerRecord);

      } catch (customerError) {
        if (import.meta.env.DEV) {
          console.error('Customer creation failed:', customerError);
        }
        setIsProcessing(false);
        showAlert('error', `Failed to create customer: ${customerError.message}`);
        return;
      }
    } else {
      if (!customerRecord.id) {
        setIsProcessing(false);
        showAlert('error', 'Selected customer has invalid ID');
        return;
      }
      if (import.meta.env.DEV) {
        console.log('Using existing customer:', customerRecord);
      }
    }

    try {
      const nameDirectory = cartItems.reduce((accumulator, item) => {
        accumulator[item.product.id] = item.product.name;
        return accumulator;
      }, {});

      const changeAmount =
        paymentMethod === 'cash' ? Math.max(0, amountPaid - grandTotal) : 0;

      const customerId = customerRecord?.id;
      if (!customerId) {
        throw new Error('Customer ID is missing - cannot create sale');
      }

      if (import.meta.env.DEV) {
        console.log('Creating sale with customer ID:', customerId, 'and customer:', customerRecord);
      }

      const saleResult = await createSale({
        cartItems,
        subtotal,
        discount: discountAmount,
        discountType,
        tax,
        total: grandTotal,
        paymentMethod,
        amountPaid,
        change: changeAmount,
        customerId: customerId, // No fallback to null - must have valid ID
        cashierId: user.id,
        discountValueInput: discount
      });

      if (import.meta.env.DEV) {
        console.log('Sale created successfully:', saleResult);
      }


      clearCart();

      setCompletedSale({
        ...saleResult,
        change: changeAmount,
        customerName: customerRecord?.name ?? 'Walk-in Customer',
        customerPhone: customerRecord?.phone ?? '',
        discountInputValue: discount,
        lineItems:
          saleResult.items?.map((saleItem) => ({
            ...saleItem,
            productName: nameDirectory[saleItem.productId] || `Product #${saleItem.productId}`
          })) ?? []
      });
      showAlert('success', `Sale completed. Invoice ${saleResult.invoiceNo}`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Payment processing failed', error);
        console.error('Error details:', error);
      }

      let errorMessage = 'Failed to complete sale';

      if (error.message) {
        if (error.message.includes('409') || error.message.includes('Conflict') || error.message.includes('already exists')) {
          errorMessage = 'Invoice number already exists. Please try again.';
        } else if (error.message.includes('Customer') && error.message.includes('failed')) {
          errorMessage = 'Customer creation failed. Please check customer details and try again.';
        } else if (error.message.includes('Customer ID') && error.message.includes('missing')) {
          errorMessage = 'Customer information is incomplete. Please try again.';
        } else if (error.message.includes('stock') || error.message.includes('inventory')) {
          errorMessage = 'Some items are out of stock. Please review your cart.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      } else if (error.name === 'TypeError') {
        errorMessage = 'System error: Invalid data format. Please try again.';
      } else {
        errorMessage = 'An unexpected error occurred. Please try again or contact support.';
      }

      showAlert('error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUPIPaymentReceived = async (paymentData) => {
    try {
      setUpiPaymentStep('completed');

      const nameDirectory = cartItems.reduce((accumulator, item) => {
        accumulator[item.product.id] = item.product.name;
        return accumulator;
      }, {});

      setCompletedSale({
        ...paymentData,
        change: 0,
        customerName: selectedCustomer?.name ?? 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone ?? '',
        discountInputValue: discount,
        lineItems: paymentData.items?.map((saleItem) => ({
          ...saleItem,
          productName: nameDirectory[saleItem.productId] || `Product #${saleItem.productId}`
        })) ?? []
      });

      clearCart();
      showAlert('success', `UPI Payment of ${currency}${grandTotal} received successfully!`);
    } catch (error) {
      console.error('Error processing UPI payment completion:', error);
      showAlert('error', 'Error completing payment. Please contact support.');
    }
  };

  const handleUPIPaymentTimeout = () => {
    setUpiPaymentStep('init');
    setPendingSaleId(null);
    showAlert('warning', 'Payment timeout. You can try again or use another payment method.');
  };

  const handlePrintInvoice = () => {
    if (!completedSale) return;

    const isSuccess = openInvoicePrintWindow({
      sale: completedSale,
      items: completedSale.lineItems || [],
      customerName: completedSale.customerName,
      customerPhone: completedSale.customerPhone,
      cashierName: user?.name ?? 'Cashier',
      settings,
      discountInputValue: completedSale.discountInputValue
    });

    if (!isSuccess) {
      showAlert('error', 'Please allow pop-ups to print the invoice.');
    }
  };

  const renderLineItems = () =>
    cartItems.map((item) => (
      <div key={item.product.id} className="flex items-center justify-between text-sm">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{item.product.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
                    {currency}
            {item.product.price} x {item.quantity}
          </p>
        </div>
        <p className="font-semibold text-gray-900 dark:text-white">
          {currency}
          {(item.product.price * item.quantity).toFixed(2)}
        </p>
      </div>
    ));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {completedSale ? 'Payment Successful' : 'Payment Summary'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {completedSale
                ? 'Sale recorded in the system. You can print the invoice or start a new sale.'
                : `Invoice Number: ${pendingInvoiceNumber}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            disabled={isProcessing}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
          {!completedSale ? (
            <>
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Items
                  </h3>
                  <div className="space-y-3">{renderLineItems()}</div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>
                        {currency}
                        {subtotal.toFixed(2)}
                      </span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>
                          Discount{' '}
                          {discountType === 'percentage' ? `(${discount}%)` : '(flat)'}
                        </span>
                        <span>
                          -{currency}
                          {discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Tax ({taxRate}%)</span>
                      <span>
                        {currency}
                        {tax.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold text-gray-900 dark:border-gray-700 dark:text-white">
                      <span>Total</span>
                      <span>
                        {currency}
                        {grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 p-4 space-y-4 dark:border-gray-700">
                  <div>
                    <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Customer Details
                    </h3>

                    {selectedCustomer ? (
                      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center justify-between">
                          <span>Name</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {selectedCustomer.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Phone</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {selectedCustomer.phone || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Customer Name *
                          </label>
                          <input
                            type="text"
                            ref={customerNameRef}
                            value={customerForm.name}
                            onChange={handleCustomerFormChange('name')}
                            onKeyDown={handleCustomerNameKeyDown}
                            placeholder="Enter customer name"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                          {customerErrors.name && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {customerErrors.name}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            ref={customerPhoneRef}
                            value={customerForm.phone}
                            onChange={handleCustomerFormChange('phone')}
                            placeholder="Enter phone number"
                            maxLength={10}
                            inputMode="numeric"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                          {customerErrors.phone && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {customerErrors.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>Cashier</span>
                      <span className="font-medium text-gray-900 dark:text-white">{user?.name}</span>
                    </div>
                  </div>
                </div>

                
                {upiPaymentStep === 'qr' ? (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-4 dark:border-gray-700">
                    <div>
                      <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        UPI Payment
                      </h3>
                      {isRazorpayConnected ? (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Razorpay Checkout handles the UPI payment request. If the popup closed, you can reopen it below.
                          </p>
                          {razorpayOrder ? (
                            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                              <dl className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                <div className="flex justify-between">
                                  <dt>Order ID</dt>
                                  <dd className="font-mono text-xs">{razorpayOrder.orderId}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt>Amount</dt>
                                  <dd className="font-medium text-gray-900 dark:text-white">
                                    {currency}
                                    {(razorpayOrder.amount / 100).toFixed(2)}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt>Receipt</dt>
                                  <dd>{razorpayOrder.receipt || 'N/A'}</dd>
                                </div>
                              </dl>
                              <button
                                type="button"
                                onClick={handleLaunchRazorpayCheckout}
                                disabled={isLaunchingRazorpay}
                                className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isLaunchingRazorpay ? 'Opening Razorpay...' : 'Open Razorpay Checkout'}
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                              Unable to create a Razorpay order. You can cancel and choose another payment method or try again.
                            </div>
                          )}
                          {razorpayCheckoutError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{razorpayCheckoutError}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Razorpay is not connected for this store. Use the QR code below with your preferred UPI app.
                          </p>
                          <UPIQRCode
                            upiId={settings?.upiId || 'default@upi'}
                            amount={grandTotal}
                            merchantName={settings?.storeName || 'FA POS Store'}
                            transactionNote={`Invoice ${pendingInvoiceNumber}`}
                            onCancel={() => setUpiPaymentStep('init')}
                          />
                        </>
                      )}
                    </div>

                    {isRazorpayConnected && pendingSaleId ? (
                      <PaymentStatusChecker
                        saleId={pendingSaleId}
                        amount={grandTotal}
                        onPaymentReceived={handleUPIPaymentReceived}
                        onTimeout={handleUPIPaymentTimeout}
                      />
                    ) : (
                      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                        After the customer pays using the QR code, mark the sale as paid manually from the Sales screen.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setUpiPaymentStep('init')}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 py-3 text-red-700 font-semibold transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel UPI Payment & Choose Another Method
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-4 dark:border-gray-700">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={`relative p-4 rounded-lg border-2 transition-all ${
                            paymentMethod === 'cash'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <svg className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className={`text-sm font-medium ${paymentMethod === 'cash' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              Cash
                            </span>
                          </div>
                          {paymentMethod === 'cash' && (
                            <div className="absolute top-2 right-2">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`relative p-4 rounded-lg border-2 transition-all ${
                            paymentMethod === 'card'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <svg className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              Card
                            </span>
                          </div>
                          {paymentMethod === 'card' && (
                            <div className="absolute top-2 right-2">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('upi')}
                          className={`relative p-4 rounded-lg border-2 transition-all ${
                            paymentMethod === 'upi'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <svg className={`w-8 h-8 ${paymentMethod === 'upi' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className={`text-sm font-medium ${paymentMethod === 'upi' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              UPI
                            </span>
                          </div>
                          {paymentMethod === 'upi' && (
                            <div className="absolute top-2 right-2">
                              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    {paymentMethod === 'upi' && (
                      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        <p className="font-medium mb-1">UPI Payment Information</p>
                        <p>UPI ID: <span className="font-mono">{settings?.upiId || 'Not configured'}</span></p>
                        <p className="mt-1">
                          Status:{' '}
                          {razorpayLoading
                            ? 'Checking Razorpay connection...'
                            : isRazorpayConnected
                              ? 'Razorpay connected'
                              : 'Razorpay not connected - using fallback QR'}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        min={0}
                        onChange={(event) => setAmountPaid(Number(event.target.value))}
                        disabled={paymentMethod === 'upi'}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                      />
                      {paymentMethod === 'upi' && (
                        <p className="text-xs text-gray-500 mt-1">Amount is fixed for UPI payments</p>
                      )}
                    </div>
                  </div>
                )}

                
                {upiPaymentStep !== 'qr' && (
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isProcessing}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-white font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <>
                        <svg
                          className="h-5 w-5 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        Processing...
                      </>
                    ) : paymentMethod === 'upi' ? (
                      <>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2l3 3m0 0l3-3m-3 3v2m0-8V4a2 2 0 00-2-2H6a2 2 0 00-2 2v8h2m-2 0h.01" />
                        </svg>
                        Generate UPI QR
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Confirm Payment
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <div className="mx-auto flex max-w-xl flex-col items-center space-y-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Invoice{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {completedSale.invoiceNumber}
                    </span>{' '}
                    has been generated for {completedSale.customerName}.
                  </p>
                  {completedSale.customerPhone && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Contact: {completedSale.customerPhone}
                    </p>
                  )}
                </div>

                <div className="w-full rounded-xl border border-gray-200 p-6 text-left dark:border-gray-700">
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Total</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {currency}
                        {completedSale.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Method</span>
                      <span className="capitalize">{completedSale.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount Paid</span>
                      <span>
                        {currency}
                        {completedSale.paidAmount.toFixed(2)}
                      </span>
                    </div>
                    {completedSale.customerPhone && (
                      <div className="flex justify-between">
                        <span>Customer Phone</span>
                        <span>{completedSale.customerPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Cashier</span>
                      <span>{user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date & Time</span>
                      <span>{new Date(completedSale.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 md:flex-row">
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="flex-1 rounded-lg border border-blue-600 py-3 font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    Print Invoice
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Start New Sale
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

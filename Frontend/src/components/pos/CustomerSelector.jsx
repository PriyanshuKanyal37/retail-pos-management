import { useState } from 'react';
import useCartStore from '../../stores/cartStore';
import useCustomerStore from '../../stores/customerStore';
import useUIStore from '../../stores/uiStore';

const CustomerSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' or 'held'
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [formErrors, setFormErrors] = useState({ name: '', phone: '' });

  const customers = useCustomerStore((state) => state.customers);
  const addCustomer = useCustomerStore((state) => state.addCustomer);

  const selectedCustomer = useCartStore((state) => state.selectedCustomer);
  const setSelectedCustomer = useCartStore((state) => state.setSelectedCustomer);
  const heldSales = useCartStore((state) => state.heldSales);
  const resumeSale = useCartStore((state) => state.resumeSale);
  const removeHeldSale = useCartStore((state) => state.removeHeldSale);
  const showAlert = useUIStore((state) => state.showAlert);

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || '').includes(searchTerm)
  );

  // Filter held sales based on search
  const filteredHeldSales = heldSales.filter(
    (sale) =>
      sale.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerInfo.phone || '').includes(searchTerm)
  );

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsOpen(false);
    setSearchTerm('');
    showAlert('success', `Customer ${customer.name} selected`);
  };

  const handleResumeSale = (saleId) => {
    const result = resumeSale(saleId);
    if (result.success) {
      showAlert('success', result.message);
      setIsOpen(false);
      setSearchTerm('');
    } else {
      showAlert('error', result.message);
    }
  };

  const handleRemoveHeldSale = (saleId, customerName) => {
    if (window.confirm(`Remove held sale for ${customerName}?`)) {
      removeHeldSale(saleId);
      showAlert('info', 'Held sale removed');
    }
  };

  const handleAddCustomer = async () => {
    const trimmedName = newCustomer.name.trim();
    const trimmedPhone = newCustomer.phone.trim();

    const validationErrors = {
      name: trimmedName ? '' : 'Customer name is required',
      phone: ''
    };

    if (!trimmedPhone) {
      validationErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      validationErrors.phone = 'Enter a valid 10 digit phone number';
    }

    if (validationErrors.name || validationErrors.phone) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      const customer = await addCustomer({
        name: trimmedName,
        phone: trimmedPhone
      });

      setSelectedCustomer(customer);
      setShowAddForm(false);
      setNewCustomer({ name: '', phone: '' });
      setFormErrors({ name: '', phone: '' });
      setIsOpen(false);
      showAlert('success', `Customer ${customer.name} added successfully`);
    } catch (error) {
      showAlert('error', error.message || 'Failed to add customer');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition relative"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
        </span>

        {heldSales.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {heldSales.length}
          </span>
        )}

        <svg
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {!showAddForm ? (
            <>
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                    activeTab === 'customers'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Customers
                </button>
                <button
                  onClick={() => setActiveTab('held')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition relative ${
                    activeTab === 'held'
                      ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Held Sales
                  {heldSales.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-yellow-500 rounded-full">
                      {heldSales.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={activeTab === 'customers' ? 'Search customers...' : 'Search held sales...'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {activeTab === 'customers' ? (
                  // Customers List
                  filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No customers found
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                      </button>
                    ))
                  )
                ) : (
                  // Held Sales List
                  filteredHeldSales.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No held sales
                    </div>
                  ) : (
                    filteredHeldSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="px-4 py-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleResumeSale(sale.id)}
                            className="flex-1 text-left"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              {sale.customerInfo.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {sale.customerInfo.phone} • {sale.cartItems.length} items
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(sale.timestamp).toLocaleString()}
                            </p>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveHeldSale(sale.id, sale.customerInfo.name);
                            }}
                            className="ml-3 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>

              {activeTab === 'customers' && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Customer
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Add Customer Form */
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Add New Customer
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => {
                    setNewCustomer({ ...newCustomer, name: e.target.value });
                    setFormErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Customer Name *"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 dark:text-red-400">{formErrors.name}</p>
                )}
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={newCustomer.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewCustomer({ ...newCustomer, phone: value });
                    setFormErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="Phone Number *"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-500 dark:text-red-400">{formErrors.phone}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustomer}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    Add Customer
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCustomer({ name: '', phone: '' });
                      setFormErrors({ name: '', phone: '' });
                    }}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
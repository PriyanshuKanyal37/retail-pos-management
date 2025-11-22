import { useState } from 'react';
import useCartStore from '../../stores/cartStore';
import useUIStore from '../../stores/uiStore';

const HoldSaleModal = ({ isOpen, onClose }) => {
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({ name: '', phone: '' });
  const holdSale = useCartStore((state) => state.holdSale);
  const showAlert = useUIStore((state) => state.showAlert);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = customerInfo.name.trim();
    const trimmedPhone = customerInfo.phone.trim();

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
      setErrors(validationErrors);
      return;
    }

    const result = holdSale({ name: trimmedName, phone: trimmedPhone });
    if (result.success) {
      showAlert('success', `Sale held for ${trimmedName}`);
      setCustomerInfo({ name: '', phone: '' });
      setErrors({ name: '', phone: '' });
      onClose();
    } else {
      showAlert('error', result.message);
    }
  };

  const handleClose = () => {
    setCustomerInfo({ name: '', phone: '' });
    setErrors({ name: '', phone: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hold Sale</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              placeholder="Enter customer name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo({
                  ...customerInfo,
                  phone: e.target.value.replace(/\D/g, '').slice(0, 10)
                })
              }
              placeholder="Enter phone number"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>This information will help identify the held sale later.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition"
            >
              Hold Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HoldSaleModal;
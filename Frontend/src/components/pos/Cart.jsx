import useCartStore from '../../stores/cartStore';
import useSettingsStore from '../../stores/settingsStore';

const Cart = ({ onCheckout, onHoldSale, onClearCart }) => {
  const {
    cartItems,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    discount,
    discountType,
    setDiscount,
    getSubtotal,
    getDiscountAmount,
    getTax,
    getGrandTotal
  } = useCartStore();

  const settings = useSettingsStore((state) => state.settings);
  const currency = settings?.currency ?? settings?.currencySymbol ?? 'Rs.';
  const taxRate = settings?.taxRate ?? 0;
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const tax = getTax(taxRate);
  const grandTotal = getGrandTotal(taxRate);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Cart ({cartItems.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <svg
              className="w-20 h-20 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-lg font-medium">Cart is empty</p>
            <p className="text-sm">Add products to get started</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.product.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {item.product.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currency}{item.product.price} x {item.quantity}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => decrementQuantity(item.product.id)}
                  className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center transition"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">
                  {item.quantity}
                </span>
                <button
                  onClick={() => incrementQuantity(item.product.id)}
                  disabled={item.quantity >= item.product.stock}
                  className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">
                  {currency}{item.product.price * item.quantity}
                </p>
              </div>

              <button
                onClick={() => removeFromCart(item.product.id)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0, discountType)}
              placeholder="Discount"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <select
              value={discountType}
              onChange={(e) => setDiscount(discount, e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="flat">{currency}</option>
              <option value="percentage">%</option>
            </select>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span>{currency}{subtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount:</span>
                <span>-{currency}{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Tax ({taxRate}%):</span>
              <span>{currency}{tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Total:</span>
              <span>{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onHoldSale}
                className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Hold
              </button>

              <button
                onClick={onClearCart}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear
              </button>
            </div>

            <button
              onClick={onCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Proceed to Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
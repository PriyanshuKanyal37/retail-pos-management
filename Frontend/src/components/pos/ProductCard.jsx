import { useState } from 'react';
import useCartStore from '../../stores/cartStore';
import useProductStore from '../../stores/productStore';
import useSettingsStore from '../../stores/settingsStore';
import useUIStore from '../../stores/uiStore';

const ProductCard = ({ product }) => {
  const [showUpload, setShowUpload] = useState(false);
  const addToCart = useCartStore((state) => state.addToCart);
  const setProductImage = useProductStore((state) => state.setProductImage);
  const uploadProductImage = useProductStore((state) => state.uploadProductImage);
  const settings = useSettingsStore((state) => state.settings);
  const showAlert = useUIStore((state) => state.showAlert);
  const currency = settings?.currency ?? settings?.currencySymbol ?? 'Rs.';
  const lowStockThreshold = settings?.lowStockThreshold ?? 5;

  // Determine stock status
  const getStockStatus = () => {
    if (product.stock === 0) return 'out';
    if (product.stock <= lowStockThreshold) return 'low';
    return 'good';
  };

  const stockStatus = getStockStatus();
  const productImage = product.image || product.img_url || product.imgUrl;

  const stockColors = {
    out: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
    low: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
    good: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
  };

  const stockBadgeColors = {
    out: 'bg-gray-500',
    low: 'bg-yellow-500',
    good: 'bg-green-500'
  };

  const handleAddToCart = () => {
    if (product.stock === 0) {
      showAlert('error', 'Product is out of stock!');
      return;
    }
    addToCart(product);
    showAlert('success', `${product.name} added to cart`);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setProductImage(product.id, previewUrl);
      uploadProductImage(product.id, file)
        .then((response) => {
          if (response?.success) {
            showAlert('success', 'Image uploaded successfully!');
          } else if (response?.message) {
            showAlert('error', response.message);
          } else {
            showAlert('error', 'Failed to upload product image');
          }
        })
        .catch((error) => {
          showAlert('error', error.message || 'Failed to upload product image');
        })
        .finally(() => {
          setShowUpload(false);
        });
    }
  };

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        stockColors[stockStatus]
      } ${
        stockStatus !== 'out'
          ? 'hover:shadow-lg hover:scale-105 cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
      onClick={stockStatus !== 'out' ? handleAddToCart : undefined}
    >
      <div className="absolute top-2 right-2 z-10">
        <div
          className={`${stockBadgeColors[stockStatus]} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}
        >
          {product.stock}
        </div>
      </div>

      <div className="relative h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        {productImage ? (
          <img
            src={productImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUpload(true);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Upload Image
            </button>
          </div>
        )}

        {showUpload && (
          <div
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm mb-2 text-gray-900 dark:text-white">
                Upload Image
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs"
              />
              <button
                onClick={() => setShowUpload(false)}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          SKU: {product.sku}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {currency}{product.price}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded ${
              stockStatus === 'out'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : stockStatus === 'low'
                ? 'bg-yellow-200 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : 'bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}
          >
            {stockStatus === 'out'
              ? 'Out of Stock'
              : stockStatus === 'low'
              ? 'Low Stock'
              : 'In Stock'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

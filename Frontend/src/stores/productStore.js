import { create } from 'zustand';
import api from '../api/client-updated';
import { normalizeProduct } from '../utils/apiNormalization';

// Product Store
// Provides reactive product inventory data for the POS experience with backend integration
const useProductStore = create((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  // Fetch products from backend
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.products.getAll();
      const items = Array.isArray(response?.items) ? response.items : response ?? [];
      const products = items.map(normalizeProduct).filter(Boolean);
      set({ products, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to fetch products:', error);
    }
  },

  // Retrieve single product helpers
  getProductById: (productId) => get().products.find((product) => product.id === productId),

  getProductByBarcode: (barcode) =>
    get().products.find((product) => product.barcode === barcode),

  // Update stock locally (optimistic update)
  decrementStock: (productId, quantity = 1) => {
    if (quantity <= 0) return;

    set((state) => ({
      products: state.products.map((product) => {
        if (product.id !== productId) return product;
        const updatedStock = Math.max(0, product.stock - quantity);
        return { ...product, stock: updatedStock };
      })
    }));
  },

  // Restore stock (useful when cancelling or resuming held sales)
  incrementStock: (productId, quantity = 1) => {
    if (quantity <= 0) return;

    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId
          ? { ...product, stock: product.stock + quantity }
          : product
      )
    }));
  },

  // Add new product
  addProduct: async (productData, imageFile = null) => {
    try {
      console.log('Creating product with data:', productData);
      const newProduct = await api.products.create(productData, imageFile);
      console.log('Product created successfully:', newProduct);
      const normalized = normalizeProduct(newProduct);
      if (!normalized) {
        throw new Error('Failed to normalize product');
      }
      set((state) => ({
        products: [...state.products, normalized]
      }));
      return { success: true, product: normalized };
    } catch (error) {
      console.error('Failed to create product:', error);
      console.error('Error details:', error.details);
      console.error('Error status:', error.status);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      return { success: false, message: error.message || 'Failed to create product' };
    }
  },

  // Update product
  updateProduct: async (productId, productData, imageFile = null) => {
    try {
      console.log('Updating product with ID:', productId, 'and data:', productData);
      if (!productId || productId === 'undefined') {
        throw new Error('Invalid product ID provided for update');
      }
      const updatedProduct = await api.products.update(productId, productData, imageFile);
      console.log('Product updated successfully:', updatedProduct);
      const normalized = normalizeProduct(updatedProduct);
      if (!normalized) {
        throw new Error('Failed to normalize updated product');
      }
      set((state) => ({
        products: state.products.map((product) =>
          product.id === productId ? normalized : product
        )
      }));
      return { success: true, product: normalized };
    } catch (error) {
      console.error('Failed to update product:', error);
      return { success: false, message: error.message };
    }
  },

  // Delete product
  deleteProduct: async (productId) => {
    try {
      await api.products.delete(productId);
      set((state) => ({
        products: state.products.filter((product) => product.id !== productId)
      }));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Upload product image
  uploadProductImage: async (productId, file) => {
    try {
      const result = await api.products.uploadImage(productId, file);
      // Update product with new image URL
      set((state) => ({
        products: state.products.map((product) =>
          product.id === productId
            ? { ...product, image: result.image_url, img_url: result.image_url }
            : product
        )
      }));
      return { success: true, imageUrl: result.image_url };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  // Replace products list (for manual refresh)
  setProducts: (productList) => {
    set({ products: productList.map(normalizeProduct).filter(Boolean) });
  },

  setProductImage: (productId, imageUrl) => {
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? { ...product, image: imageUrl, img_url: imageUrl } : product
      )
    }));
  }
}));

export default useProductStore;

/**
 * Comprehensive Input Validation System
 * Provides production-ready validation for all form inputs
 */

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const sanitizedEmail = sanitizeInput(email);

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitizedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  if (sanitizedEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  return { isValid: true, sanitizedValue: sanitizedEmail };
};

/**
 * Validate phone number (10 digits for Indian numbers)
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  const sanitizedPhone = phone.replace(/\D/g, ''); // Remove non-digits

  if (sanitizedPhone.length !== 10) {
    return { isValid: false, error: 'Phone number must be exactly 10 digits' };
  }

  // Validate Indian mobile number patterns
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(sanitizedPhone)) {
    return { isValid: false, error: 'Please enter a valid Indian mobile number' };
  }

  return { isValid: true, sanitizedValue: sanitizedPhone };
};

/**
 * Validate person name
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const sanitizedName = sanitizeInput(name.trim());

  if (sanitizedName.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }

  if (sanitizedName.length > 50) {
    return { isValid: false, error: `${fieldName} is too long (max 50 characters)` };
  }

  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(sanitizedName)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { isValid: true, sanitizedValue: sanitizedName };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (max 128 characters)' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    };
  }

  return { isValid: true };
};

/**
 * Validate product name
 */
export const validateProductName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Product name is required' };
  }

  const sanitizedName = sanitizeInput(name.trim());

  if (sanitizedName.length < 1) {
    return { isValid: false, error: 'Product name cannot be empty' };
  }

  if (sanitizedName.length > 100) {
    return { isValid: false, error: 'Product name is too long (max 100 characters)' };
  }

  return { isValid: true, sanitizedValue: sanitizedName };
};

/**
 * Validate product price
 */
export const validatePrice = (price) => {
  const numPrice = parseFloat(price);

  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Price must be a valid number' };
  }

  if (numPrice < 0) {
    return { isValid: false, error: 'Price cannot be negative' };
  }

  if (numPrice > 999999.99) {
    return { isValid: false, error: 'Price is too high (max 999,999.99)' };
  }

  return { isValid: true, sanitizedValue: parseFloat(numPrice.toFixed(2)) };
};

/**
 * Validate stock quantity
 */
export const validateStock = (stock) => {
  const numStock = parseInt(stock);

  if (isNaN(numStock)) {
    return { isValid: false, error: 'Stock must be a valid number' };
  }

  if (numStock < 0) {
    return { isValid: false, error: 'Stock cannot be negative' };
  }

  if (numStock > 999999) {
    return { isValid: false, error: 'Stock quantity is too high (max 999,999)' };
  }

  return { isValid: true, sanitizedValue: numStock };
};

/**
 * Validate payment amount
 */
export const validateAmount = (amount, requiredAmount = 0) => {
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }

  if (numAmount > 999999.99) {
    return { isValid: false, error: 'Amount is too high (max 999,999.99)' };
  }

  if (requiredAmount > 0 && numAmount < requiredAmount) {
    return {
      isValid: false,
      error: `Amount must be at least ${requiredAmount.toFixed(2)}`
    };
  }

  return { isValid: true, sanitizedValue: parseFloat(numAmount.toFixed(2)) };
};

/**
 * Validate discount value
 */
export const validateDiscount = (discount, type = 'flat') => {
  const numDiscount = parseFloat(discount);

  if (isNaN(numDiscount)) {
    return { isValid: false, error: 'Discount must be a valid number' };
  }

  if (numDiscount < 0) {
    return { isValid: false, error: 'Discount cannot be negative' };
  }

  if (type === 'percentage') {
    if (numDiscount > 100) {
      return { isValid: false, error: 'Percentage discount cannot exceed 100%' };
    }
    return { isValid: true, sanitizedValue: parseFloat(numDiscount.toFixed(2)) };
  }

  // For flat discount
  if (numDiscount > 999999.99) {
    return { isValid: false, error: 'Discount amount is too high (max 999,999.99)' };
  }

  return { isValid: true, sanitizedValue: parseFloat(numDiscount.toFixed(2)) };
};

/**
 * Validate store settings
 */
export const validateStoreSettings = (settings) => {
  const errors = {};
  const sanitized = {};

  // Validate store name
  const nameValidation = validateName(settings.storeName, 'Store name');
  if (!nameValidation.isValid) {
    errors.storeName = nameValidation.error;
  } else {
    sanitized.storeName = nameValidation.sanitizedValue;
  }

  // Validate store address
  if (settings.storeAddress) {
    const address = sanitizeInput(settings.storeAddress.trim());
    if (address.length > 200) {
      errors.storeAddress = 'Store address is too long (max 200 characters)';
    } else {
      sanitized.storeAddress = address;
    }
  }

  // Validate store phone
  if (settings.storePhone) {
    const phoneValidation = validatePhone(settings.storePhone);
    if (!phoneValidation.isValid) {
      errors.storePhone = phoneValidation.error;
    } else {
      sanitized.storePhone = phoneValidation.sanitizedValue;
    }
  }

  // Validate store email
  if (settings.storeEmail) {
    const emailValidation = validateEmail(settings.storeEmail);
    if (!emailValidation.isValid) {
      errors.storeEmail = emailValidation.error;
    } else {
      sanitized.storeEmail = emailValidation.sanitizedValue;
    }
  }

  // Validate tax rate
  const taxRate = parseFloat(settings.taxRate);
  if (isNaN(taxRate)) {
    errors.taxRate = 'Tax rate must be a valid number';
  } else if (taxRate < 0 || taxRate > 100) {
    errors.taxRate = 'Tax rate must be between 0 and 100';
  } else {
    sanitized.taxRate = parseFloat(taxRate.toFixed(2));
  }

  // Validate UPI ID
  if (settings.upiId) {
    const upiId = sanitizeInput(settings.upiId.trim());
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upiId)) {
      errors.upiId = 'Please enter a valid UPI ID';
    } else {
      sanitized.upiId = upiId;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate customer data
 */
export const validateCustomer = (customer) => {
  const errors = {};
  const sanitized = {};

  // Validate name
  const nameValidation = validateName(customer.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error;
  } else {
    sanitized.name = nameValidation.sanitizedValue;
  }

  // Validate phone (required for customers)
  const phoneValidation = validatePhone(customer.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error;
  } else {
    sanitized.phone = phoneValidation.sanitizedValue;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate sale data
 */
export const validateSale = (sale) => {
  const errors = {};

  // Validate cart items
  if (!sale.cartItems || !Array.isArray(sale.cartItems) || sale.cartItems.length === 0) {
    errors.cartItems = 'Cart cannot be empty';
  }

  // Validate payment method
  const validPaymentMethods = ['cash', 'card', 'upi'];
  if (!sale.paymentMethod || !validPaymentMethods.includes(sale.paymentMethod)) {
    errors.paymentMethod = 'Invalid payment method';
  }

  // Validate total amount
  const totalValidation = validateAmount(sale.total);
  if (!totalValidation.isValid) {
    errors.total = totalValidation.error;
  }

  // Validate amount paid for cash payments
  if (sale.paymentMethod === 'cash') {
    const amountValidation = validateAmount(sale.amountPaid, sale.total);
    if (!amountValidation.isValid) {
      errors.amountPaid = amountValidation.error;
    }
  }

  // Validate discount
  if (sale.discount && sale.discount > 0) {
    const discountValidation = validateDiscount(sale.discount, sale.discountType);
    if (!discountValidation.isValid) {
      errors.discount = discountValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Rate limiting for form submissions
 */
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  canAttempt(identifier) {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);

    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);
    return true;
  }

  reset(identifier) {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * CSRF token management (simplified for this implementation)
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export default {
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateName,
  validatePassword,
  validateProductName,
  validatePrice,
  validateStock,
  validateAmount,
  validateDiscount,
  validateStoreSettings,
  validateCustomer,
  validateSale,
  rateLimiter,
  generateCSRFToken
};
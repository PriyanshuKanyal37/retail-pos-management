// Mock Database - Simulates relational database structure
// This will be replaced with actual API calls later

// ==================== USERS TABLE ====================
export const users = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@pos.com",
    password: "admin123", // In production, this would be hashed
    role: "super_admin", // super_admin, manager, or cashier
    status: "active", // active or inactive
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 2,
    name: "John Cashier",
    email: "john@pos.com",
    password: "cashier123",
    role: "cashier",
    status: "active",
    createdAt: "2025-01-15T10:00:00Z"
  },
  {
    id: 3,
    name: "Sarah Cashier",
    email: "sarah@pos.com",
    password: "cashier123",
    role: "cashier",
    status: "active",
    createdAt: "2025-02-01T10:00:00Z"
  }
];

// ==================== PRODUCTS TABLE ====================
export const products = [
  // Drinks
  {
    id: 1,
    name: "Coca Cola",
    sku: "DRK-001",
    barcode: "8901030510007",
    price: 40,
    stock: 150,
    category: "Drinks",
    image: null, // Will be uploaded from POS if needed
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 2,
    name: "Pepsi",
    sku: "DRK-002",
    barcode: "8901030510014",
    price: 40,
    stock: 120,
    category: "Drinks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 3,
    name: "Sprite",
    sku: "DRK-003",
    barcode: "8901030510021",
    price: 40,
    stock: 100,
    category: "Drinks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 4,
    name: "Mountain Dew",
    sku: "DRK-004",
    barcode: "8901030510038",
    price: 40,
    stock: 80,
    category: "Drinks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 5,
    name: "Water Bottle",
    sku: "DRK-005",
    barcode: "8901030510045",
    price: 20,
    stock: 200,
    category: "Drinks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },

  // Snacks
  {
    id: 6,
    name: "Lays Classic",
    sku: "SNK-001",
    barcode: "8901234567890",
    price: 20,
    stock: 180,
    category: "Snacks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 7,
    name: "Kurkure",
    sku: "SNK-002",
    barcode: "8901234567897",
    price: 20,
    stock: 150,
    category: "Snacks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 8,
    name: "Bingo Mad Angles",
    sku: "SNK-003",
    barcode: "8901234567904",
    price: 20,
    stock: 120,
    category: "Snacks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 9,
    name: "Parle-G Biscuit",
    sku: "SNK-004",
    barcode: "8901234567911",
    price: 10,
    stock: 250,
    category: "Snacks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 10,
    name: "Oreo",
    sku: "SNK-005",
    barcode: "8901234567928",
    price: 30,
    stock: 100,
    category: "Snacks",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },

  // Stationery
  {
    id: 11,
    name: "Pen Blue",
    sku: "STN-001",
    barcode: "8905678901234",
    price: 10,
    stock: 300,
    category: "Stationery",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 12,
    name: "Pen Black",
    sku: "STN-002",
    barcode: "8905678901241",
    price: 10,
    stock: 280,
    category: "Stationery",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 13,
    name: "Notebook A4",
    sku: "STN-003",
    barcode: "8905678901258",
    price: 50,
    stock: 150,
    category: "Stationery",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 14,
    name: "Eraser",
    sku: "STN-004",
    barcode: "8905678901265",
    price: 5,
    stock: 400,
    category: "Stationery",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  },
  {
    id: 15,
    name: "Pencil HB",
    sku: "STN-005",
    barcode: "8905678901272",
    price: 5,
    stock: 350,
    category: "Stationery",
    image: null,
    status: "active",
    createdAt: "2025-01-01T10:00:00Z"
  }
];

// ==================== CUSTOMERS TABLE ====================
export const customers = [
    {
      id: 1,
      name: "Rajesh Kumar",
      phone: "9876543210",
      cashierId: 2, // FK to users table - who registered this customer
      createdAt: "2025-02-15T14:30:00Z"
    },
    {
      id: 2,
      name: "Priya Sharma",
      phone: "9876543211",
      cashierId: 2,
      createdAt: "2025-02-20T10:15:00Z"
    },
    {
      id: 3,
      name: "Amit Patel",
      phone: "9876543212",
      cashierId: 3,
      createdAt: "2025-03-01T11:20:00Z"
    },
    {
      id: 4,
      name: "Sneha Gupta",
      phone: "9876543213",
      cashierId: 2,
      createdAt: "2025-03-05T16:45:00Z"
    }
  ];

// ==================== SALES TABLE ====================
export const sales = [
  {
    id: 1,
    invoiceNumber: "INV-2025-0001",
    customerId: 1, // FK to customers table
    cashierId: 2, // FK to users table - who made this sale
    subtotal: 160,
    discount: 0,
    discountType: "flat", // flat or percentage
    tax: 28.8, // 18% tax
    total: 188.8,
    paymentMethod: "cash", // cash, card, upi
    amountPaid: 200,
    change: 11.2,
    createdAt: "2025-02-15T15:00:00Z"
  },
  {
    id: 2,
    invoiceNumber: "INV-2025-0002",
    customerId: 2,
    cashierId: 2,
    subtotal: 100,
    discount: 10,
    discountType: "flat",
    tax: 16.2, // 18% on (100-10)
    total: 106.2,
    paymentMethod: "upi",
    amountPaid: 106.2,
    change: 0,
    createdAt: "2025-02-20T11:30:00Z"
  },
  {
    id: 3,
    invoiceNumber: "INV-2025-0003",
    customerId: 1,
    cashierId: 3,
    subtotal: 80,
    discount: 0,
    discountType: "flat",
    tax: 14.4,
    total: 94.4,
    paymentMethod: "card",
    amountPaid: 94.4,
    change: 0,
    createdAt: "2025-03-01T12:15:00Z"
  }
];

// ==================== SALE_ITEMS TABLE ====================
// Each row represents one product in a sale
export const saleItems = [
  // Sale 1 items
  {
    id: 1,
    saleId: 1, // FK to sales table
    productId: 1, // FK to products table (Coca Cola)
    quantity: 2,
    price: 40, // Unit price at time of sale
    total: 80
  },
  {
    id: 2,
    saleId: 1,
    productId: 6, // Lays Classic
    quantity: 4,
    price: 20,
    total: 80
  },

  // Sale 2 items
  {
    id: 3,
    saleId: 2,
    productId: 2, // Pepsi
    quantity: 1,
    price: 40,
    total: 40
  },
  {
    id: 4,
    saleId: 2,
    productId: 9, // Parle-G
    quantity: 3,
    price: 10,
    total: 30
  },
  {
    id: 5,
    saleId: 2,
    productId: 13, // Notebook
    quantity: 1,
    price: 50,
    total: 50
  },

  // Sale 3 items
  {
    id: 6,
    saleId: 3,
    productId: 3, // Sprite
    quantity: 2,
    price: 40,
    total: 80
  }
];

// ==================== SETTINGS TABLE ====================
export const settings = {
  storeName: "My POS Store",
  storeAddress: "123 Main Street, City, State - 123456",
  phone: "1800-123-4567",
  email: "store@pos.com",
  taxRate: 18, // percentage
  currency: "Rs.",
  currencySymbol: "Rs.",
  theme: "light", // light or dark
  lowStockThreshold: 20
};

// Helper functions to simulate database queries
export const getNextInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const lastSale = sales[sales.length - 1];
  if (lastSale) {
    const lastNum = parseInt(lastSale.invoiceNumber.split('-')[2]);
    const nextNum = (lastNum + 1).toString().padStart(4, '0');
    return `INV-${year}-${nextNum}`;
  }
  return `INV-${year}-0001`;
};

export const getNextId = (array) => {
  if (array.length === 0) return 1;
  return Math.max(...array.map(item => item.id)) + 1;
};

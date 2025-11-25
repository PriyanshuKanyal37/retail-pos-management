# 🛒 FA POS - FastAPI & React Point of Sale System

<div align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.104.1-009688?style=for-the-badge&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-19.1.1-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Zustand-000000?style=for-the-badge&logo=zustand" alt="Zustand">
</div>

<div align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/status-production_ready-green?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/version-1.0.0-orange?style=for-the-badge" alt="Version">
</div>

<br>

<div align="center">
  <strong>A comprehensive, multi-tenant Point of Sale (POS) system built for retail and restaurant management</strong>
</div>

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📦 Tech Stack](#-tech-stack)
- [🔧 Installation](#-installation)
- [🏃‍♂️ Usage](#️-usage)
- [📊 Screenshots](#-screenshots)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

### 🏢 Multi-Tenant SaaS Architecture
- **🔐 Complete Data Isolation**: Each tenant has isolated data with tenant_id filtering
- **👥 Role-Based Access Control**: Super Admin, Manager, and Cashier roles with granular permissions
- **🏪 Store Management**: Multi-store support with store-specific data and operations
- **📊 Centralized Administration**: Super Admin can manage all stores and users

### 💰 Point of Sale Operations
- **🛍️ Product Management**: Complete inventory tracking with barcode support
- **🛒 Shopping Cart**: Real-time cart management with quantity controls
- **💳 Payment Processing**: Multiple payment methods (Cash, Card, UPI)
- **🧾 Invoice Generation**: Automatic invoice creation with PDF export
- **📈 Sales Analytics**: Real-time sales statistics and reporting

### 🎨 Modern User Interface
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **🌙 Dark Mode Support**: Complete dark/light theme system
- **⚡ Real-time Updates**: Live inventory and sales data
- **🎯 Intuitive UX**: User-friendly interface optimized for speed

### 🔒 Security & Performance
- **🛡️ JWT Authentication**: Secure token-based authentication
- **🔒 SQL Injection Protection**: Protected database operations
- **⚡ Optimized Performance**: Lazy loading and efficient caching
- **📝 Comprehensive Logging**: Structured logging with security event tracking

## 🏗️ Architecture

```
📁 FA-POS-2/
├── 📄 README.md
├── 📄 Backend-Documentation.md
├── 📄 Frontend-Documentation.md
├── 📁 backend/                    # FastAPI Backend
│   ├── 📁 app/
│   │   ├── 📁 api/              # API Routes
│   │   ├── 📁 core/             # Configuration & Security
│   │   ├── 📁 crud/             # Database Operations
│   │   ├── 📁 models/           # SQLAlchemy Models
│   │   ├── 📁 schemas/          # Pydantic Schemas
│   │   ├── 📁 services/         # Business Logic
│   │   └── 📁 utils/            # Utilities
│   ├── 📄 requirements.txt
│   ├── 📄 Dockerfile
│   └── 📄 render.yaml
└── 📁 Frontend/                  # React Frontend
    ├── 📁 src/
    │   ├── 📁 components/       # React Components
    │   ├── 📁 pages/           # Page Components
    │   ├── 📁 stores/          # Zustand State Management
    │   ├── 📁 api/             # API Client
    │   ├── 📁 utils/           # Utilities
    │   └── 📄 App.jsx
    ├── 📄 package.json
    ├── 📄 vite.config.js
    └── 📄 tailwind.config.js
```

## 🚀 Quick Start

### 🐳 Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/PriyanshuKanyal37/retail-pos-management.git
   cd retail-pos-management
   ```

2. **Using Docker Compose**
   ```bash
   # Start backend and database
   cd backend
   docker-compose up -d

   # Start frontend (in new terminal)
   cd ../Frontend
   npm install
   npm run dev
   ```

### 🔧 Manual Installation

#### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
# Navigate to frontend
cd Frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### 🌐 Access the Application

- **🏠 Frontend**: http://localhost:5173
- **📡 Backend API**: http://localhost:8000
- **📚 API Documentation**: http://localhost:8000/docs
- **🏥 Health Check**: http://localhost:8000/health

## 📦 Tech Stack

### 🔧 Backend Technologies

| Technology | Version | Description |
|-------------|---------|-------------|
| **FastAPI** | 0.104.1 | Modern, fast web framework for building APIs |
| **SQLAlchemy** | 2.0+ | Powerful SQL toolkit and ORM |
| **PostgreSQL** | - | Advanced open-source relational database |
| **Pydantic** | 2.0+ | Data validation using Python type annotations |
| **Alembic** | - | Database migration tool |
| **JWT** | - | JSON Web Token authentication |
| **Bcrypt** | - | Password hashing library |
| **Supabase** | - | File storage and database hosting |
| **Uvicorn** | - | ASGI server implementation |

### 🎨 Frontend Technologies

| Technology | Version | Description |
|-------------|---------|-------------|
| **React** | 19.1.1 | Modern JavaScript library for building UIs |
| **Vite** | 7.1.7 | Next-generation frontend tooling |
| **Tailwind CSS** | 4.1.16 | Utility-first CSS framework |
| **Zustand** | 5.0.8 | Small, fast, and scalable state management |
| **React Router** | 7.9.5 | Declarative routing for React |
| **Heroicons** | 2.2.0 | Beautiful SVG icons |
| **QRCode.js** | 1.5.4 | QR code generation library |
| **DOMPurify** | 3.3.0 | XSS protection and HTML sanitization |

### 🛠️ Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code quality and consistency |
| **PostCSS** | CSS processing pipeline |
| **Docker** | Containerization and deployment |
| **Render/Railway** | Cloud deployment platforms |

## 🔧 Installation

### 📋 Prerequisites

- **Python** 3.11+ (Backend)
- **Node.js** 18+ (Frontend)
- **PostgreSQL** 13+ (Database)
- **Git** (Version control)

### 🔐 Environment Variables

#### Backend (.env)
```env
# Database
SUPABASE_DB_URL=postgresql://username:password@localhost:5432/fapos

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Supabase
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_URL=your-project-url

# Buckets
SUPABASE_PRODUCTS_BUCKET=products
SUPABASE_INVOICES_BUCKET=invoices
SUPABASE_BRANDING_BUCKET=branding
```

#### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1

# Application
VITE_APP_NAME=FA POS System
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

## 🏃‍♂️ Usage

### 👤 User Roles & Permissions

#### 🔑 Super Admin
- ✅ Manage multiple stores
- ✅ Create and manage users
- ✅ Access all system settings
- ✅ View all sales reports
- ✅ Switch between store contexts

#### 📊 Manager
- ✅ Manage assigned store
- ✅ Create and manage products
- ✅ Handle sales operations
- ✅ Manage cashiers and customers
- ✅ View store-specific reports

#### 💵 Cashier
- ✅ Process sales transactions
- ✅ Manage shopping cart
- ✅ Handle customer payments
- ✅ View daily sales summary

### 🎯 Core Workflows

#### 1. **Initial Setup**
```mermaid
graph LR
    A[Super Admin Sign Up] --> B[Create Tenant Account]
    B --> C[Add Store Information]
    C --> D[Create Manager Users]
    D --> E[Add Products to Inventory]
```

#### 2. **Daily Operations**
```mermaid
graph LR
    A[Manager/Cashier Login] --> B[Select Store Context]
    B --> C[Open POS Terminal]
    C --> D[Add Products to Cart]
    D --> E[Process Payment]
    E --> F[Generate Invoice]
```

#### 3. **Multi-Store Management**
```mermaid
graph LR
    A[Super Admin Login] --> B[View All Stores]
    B --> C[Switch Store Context]
    C --> D[Access Store as Manager]
    D --> E[Manage Store Operations]
    E --> F[Switch Back to Admin View]
```

## 📊 Screenshots

### 🏪 Point of Sale Terminal
*(Add screenshots of your POS interface here)*

### 📈 Sales Dashboard
*(Add screenshots of your sales analytics here)*

### 🛍️ Product Management
*(Add screenshots of product management here)*

### 👥 User Management
*(Add screenshots of user management here)*

## 🔄 API Endpoints

### 🔐 Authentication
```http
POST /api/v1/auth/signup     # Create Super Admin account
POST /api/v1/auth/login      # User login
GET  /api/v1/auth/verify     # Verify token
```

### 🏪 Store Management
```http
GET    /api/v1/stores/           # Get all stores
POST   /api/v1/stores/           # Create new store
GET    /api/v1/stores/{id}       # Get store details
PUT    /api/v1/stores/{id}       # Update store
DELETE /api/v1/stores/{id}       # Delete store
```

### 🛍️ Product Management
```http
GET    /api/v1/products/         # Get products
POST   /api/v1/products/         # Create product
PUT    /api/v1/products/{id}     # Update product
DELETE /api/v1/products/{id}     # Delete product
POST   /api/v1/products/{id}/upload-image  # Upload product image
```

### 💰 Sales Operations
```http
GET    /api/v1/sales/            # Get sales
POST   /api/v1/sales/            # Create sale
GET    /api/v1/sales/{id}        # Get sale details
GET    /api/v1/sales/next-invoice # Get next invoice number
POST   /api/v1/sales/{id}/upload-invoice # Upload invoice PDF
```

### 👥 User Management
```http
GET    /api/v1/users/            # Get users
POST   /api/v1/users/            # Create user
PUT    /api/v1/users/{id}        # Update user
DELETE /api/v1/users/{id}        # Delete user
```

## 🗃️ Database Schema

### 🔗 Entity Relationships

```mermaid
erDiagram
    TENANT ||--o{ USER : contains
    TENANT ||--o{ STORE : owns
    STORE ||--o{ PRODUCT : contains
    STORE ||--o{ CUSTOMER : serves
    STORE ||--o{ SALE : processes
    SALE ||--o{ SALE_ITEM : contains
    USER ||--o{ SALE : creates
    CUSTOMER ||--o{ SALE : makes
    PRODUCT ||--o{ SALE_ITEM : includes

    TENANT {
        uuid id PK
        string name
        string domain
        string status
        timestamp created_at
    }

    USER {
        uuid id PK
        uuid tenant_id FK
        uuid store_id FK
        string name
        string email
        string password_hash
        string role
        string status
        timestamp created_at
    }

    STORE {
        uuid id PK
        uuid tenant_id FK
        string name
        text address
        string phone
        string email
        string status
        timestamp created_at
    }

    PRODUCT {
        uuid id PK
        uuid tenant_id FK
        uuid store_id FK
        string name
        string sku
        string barcode
        string category
        decimal price
        integer stock
        string img_url
        string status
        timestamp created_at
    }

    CUSTOMER {
        uuid id PK
        uuid tenant_id FK
        uuid store_id FK
        string name
        string phone
        string email
        string status
        timestamp created_at
    }

    SALE {
        uuid id PK
        uuid tenant_id FK
        uuid store_id FK
        uuid customer_id FK
        uuid cashier_id FK
        string invoice_no
        string payment_method
        decimal subtotal
        decimal discount
        decimal tax
        decimal total
        string status
        timestamp created_at
    }

    SALE_ITEM {
        uuid id PK
        uuid sale_id FK
        uuid product_id FK
        integer quantity
        decimal unit_price
        decimal total
        timestamp created_at
    }
```

## 🚀 Deployment

### 🌐 Production Deployment

#### Using Render (Recommended)
1. **Backend Deployment**
   ```yaml
   # render.yaml is already configured
   # Just connect your GitHub repository to Render
   ```

2. **Frontend Deployment**
   ```bash
   # Build for production
   cd Frontend
   npm run build

   # Deploy dist/ folder to Vercel, Netlify, or GitHub Pages
   ```

#### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **🍴 Fork the repository**
   ```bash
   git fork https://github.com/PriyanshuKanyal37/retail-pos-management.git
   ```

2. **🌿 Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **💻 Make your changes**
   - Follow the existing code style
   - Add tests for new features
   - Update documentation

4. **📝 Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```

5. **🚀 Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **🔄 Open a Pull Request**

### 📋 Development Guidelines

- **Code Style**: Follow existing patterns and use ESLint
- **Testing**: Add unit tests for new features
- **Documentation**: Update relevant documentation
- **Performance**: Consider performance implications
- **Security**: Follow security best practices

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 🔧 Backend Issues

**Problem**: Database connection failed
```bash
# Solution: Check database configuration
# 1. Verify PostgreSQL is running
# 2. Check .env database URL
# 3. Ensure database exists
psql -h localhost -U postgres -c "CREATE DATABASE fapos;"
```

**Problem**: JWT token not working
```bash
# Solution: Check JWT secret
# 1. Verify JWT_SECRET in .env
# 2. Ensure token format is correct
# 3. Check token expiration
```

#### 🎨 Frontend Issues

**Problem**: API calls failing
```bash
# Solution: Check API configuration
# 1. Verify VITE_API_URL in .env
# 2. Check CORS settings in backend
# 3. Ensure backend is running
```

**Problem**: Styles not loading
```bash
# Solution: Reinstall dependencies
cd Frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 📞 Getting Help

- **📖 Documentation**: Check our [Backend Docs](./Backend-Documentation.md) and [Frontend Docs](./Frontend-Documentation.md)
- **🐛 Bug Reports**: [Open an issue](https://github.com/PriyanshuKanyal37/retail-pos-management/issues)
- **💬 Discussions**: [Start a discussion](https://github.com/PriyanshuKanyal37/retail-pos-management/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **⚡ [FastAPI](https://fastapi.tiangolo.com/)** - Modern web framework
- **⚛️ [React](https://reactjs.org/)** - User interface library
- **🎨 [Tailwind CSS](https://tailwindcss.com/)** - CSS framework
- **🗃️ [SQLAlchemy](https://www.sqlalchemy.org/)** - SQL toolkit
- **🔐 [Supabase](https://supabase.com/)** - Backend as a service

## 📈 Project Stats

<div align="center">
  <img src="https://img.shields.io/github/repo-size/PriyanshuKanyal37/retail-pos-management?style=flat-square" alt="Repo Size">
  <img src="https://img.shields.io/github/last-commit/PriyanshuKanyal37/retail-pos-management?style=flat-square" alt="Last Commit">
  <img src="https://img.shields.io/github/commit-activity/m/PriyanshuKanyal37/retail-pos-management?style=flat-square" alt="Commit Activity">
</div>

<div align="center">
  <strong>🛒 Made with ❤️ for retail and restaurant businesses</strong>
</div>

---

<div align="center">
  <p>🌟 If this project helped you, please give it a star! ⭐</p>
</div>
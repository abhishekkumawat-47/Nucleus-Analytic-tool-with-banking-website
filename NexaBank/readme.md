# NexaBank - Modern Fintech Solutions

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5-blue?logo=prisma)](https://prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

NexaBank is a premium, multi-tenant digital banking platform designed for the modern era. It features a robust backend powered by Node.js and Prisma, and a sleek, high-performance frontend built with Next.js 15. The platform supports complex banking operations, from secure fund transfers to detailed financial analytics.

---

## Key Features

| Feature | Description |
| :--- | :--- |
| **Multi-Tenant Architecture** | Support for multiple banking brands (e.g., NexaBank, SafeX Bank) with distinct configurations. |
| **Smart Transactions** | Real-time fund transfers, transaction categorization, and detailed history tracking. |
| **Interactive Analytics** | Visual data representation of income, expenses, and spending habits using Recharts. |
| **Secure Authentication** | Robust security with JWT and secure session-based authentication. |
| **Loan Management** | End-to-end loan application process with KYC/AML verification steps. |
| **Profile & Settings** | Comprehensive user profile management including security settings and preferences. |
| **Responsive Design** | Pixel-perfect UI using Tailwind CSS, Radix UI, and Framer Motion for smooth animations. | ✅ Complete |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS & Lucide Icons
- **UI Components**: Radix UI (Headless components)
- **State/Data**: Axios & React Hook Form
- **Animations**: Framer Motion
- **Visualization**: Recharts

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabaseconnection pooling)
- **ORM**: Prisma
- **Validation**: Zod & Express Validator
- **Security**: Bcrypt, Helmet, & JWT

---

## Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [PostgreSQL](https://www.postgresql.org/) or [Supabase](https://supabase.com/) account
- npm or yarn

---

### Step 1: Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `backend` folder and add the following:
   ```env
   PORT=5000
   NODE_ENV="development"
   JWT_SEC="your_secret_key_here"
   DATABASE_URL="postgresql://user:password@localhost:5432/nexabank"
   DIRECT_URL="postgresql://user:password@localhost:5432/nexabank"
   FRONTEND_URL="http://localhost:3000"
   ```

4. **Run Database Migrations:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the Backend Server:**
   ```bash
   npm run dev
   ```

---

### Step 2: Frontend Setup

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   Create a `.env.local` file if you need to override defaults:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5000/api"
   ```

4. **Start the Frontend Development Server:**
   ```bash
   npm run dev
   ```

---

## Project Structure

```text
├── backend
│   ├── prisma         # Database schema & migrations
│   ├── src
│   │   ├── controllers # Request handlers
│   │   ├── middleware  # Auth & validation
│   │   ├── routes      # API endpoints
│   │   └── server.ts   # Entry point
│   └── .env           # Backend secrets
├── frontend
│   ├── app            # Next.js pages & layouts
│   ├── components     # Reusable UI components
│   ├── lib            # API client & utils
│   └── tailwind.config.ts
└── readme.md          # Project documentation
```

---


*Developed with ❤️ for the future of Digital Banking.*

***Designed and Developed by  Abhishek Kumawat*** 

# Garuda Netra — FDR & Security Deposit Portal

> **Smart India Hackathon 2026** | Problem ID: **SIH26265**  
> Team: **Garuda Netra**

A centralized platform to manage Fixed Deposit Receipts (FDRs) and security deposits — covering submission, verification, maturity tracking, renewal, replacement, and release workflows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| UI Components | Custom components (shadcn/ui patterns), Radix UI primitives |
| Icons | Lucide React |
| State / Data | React Query (TanStack Query v5) |
| Forms | React Hook Form + Zod |
| Routing | React Router v7 |
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) + bcrypt |
| HTTP Client | Axios |

---

## Project Structure

```
SIH 123/
├── src/                          # Frontend source
│   ├── pages/
│   │   ├── auth/                 # Login, Register pages
│   │   ├── dashboard/            # Main dashboard
│   │   ├── fdr/                  # FDR list, detail, submit pages
│   │   ├── security-deposit/     # Security deposit pages
│   │   └── admin/                # Admin pages (user management, requests)
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives (Button, Card, etc.)
│   │   ├── layout/               # AppLayout, Sidebar, Topbar, ProtectedRoute
│   │   └── shared/               # Domain components (FDRStatusBadge, PageHeader, etc.)
│   ├── services/                 # Axios API service layer
│   ├── types/                    # TypeScript interfaces and types
│   ├── hooks/                    # Custom React hooks (usePermission, etc.)
│   ├── context/                  # React contexts (AuthContext)
│   ├── utils/                    # Formatters, constants, helpers
│   └── lib/                      # Core utilities (cn())
├── backend/                      # Backend source
│   ├── src/
│   │   ├── index.ts              # Express app entry point
│   │   ├── routes/               # Express route handlers
│   │   ├── controllers/          # Business logic controllers
│   │   ├── models/               # SQL schema, query helpers
│   │   │   └── schema.sql        # Full PostgreSQL schema
│   │   ├── middleware/           # Auth, validation middleware
│   │   ├── config/               # Database, env config
│   │   └── utils/                # Backend utilities
│   ├── .env.example              # Environment variable template
│   ├── package.json
│   └── tsconfig.json
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

---

## User Roles & Permissions

| Role | Permissions |
|---|---|
| `admin` | Full access — user management, all FDR actions, system settings |
| `officer` | Submit FDRs, approve renewals/releases |
| `verifier` | Verify submitted FDRs |
| `depositor` | Submit and track own FDRs |

---

## FDR Lifecycle

```
Draft → Submitted → Under Review → Verified → Active
                                                ↓
                                         Maturity Due
                                         ↙         ↘
                                  Renewal         Release
                                  Approved        Approved
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+

### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Type check
npm run build
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your DB credentials and JWT secret

# Create the database
createdb garuda_netra_db

# Run schema migration
psql -U postgres -d garuda_netra_db -f src/models/schema.sql

# Start development server (http://localhost:3001)
npm run dev
```

### 3. Available Scripts

| Directory | Command | Description |
|---|---|---|
| Root | `npm run dev` | Start frontend dev server |
| Root | `npm run build` | Build frontend for production |
| `backend/` | `npm run dev` | Start backend with hot-reload |
| `backend/` | `npm run build` | Compile TypeScript |
| `backend/` | `npm start` | Run compiled backend |

---

## API Endpoints (Planned)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/fdrs` | List FDRs (with filters) |
| POST | `/api/fdrs` | Create new FDR |
| GET | `/api/fdrs/:id` | Get FDR details |
| POST | `/api/fdrs/:id/submit` | Submit FDR for verification |
| POST | `/api/fdrs/:id/verify` | Verify FDR |
| POST | `/api/fdrs/:id/renewal/request` | Request renewal |
| POST | `/api/fdrs/:id/release/request` | Request release |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/notifications` | User notifications |

---

## Environment Variables

See [`backend/.env.example`](./backend/.env.example) for all backend variables.

Frontend uses Vite's dev proxy — all `/api/*` requests are forwarded to `http://localhost:3001`.

---

*Built with ❤️ by Team Garuda Netra for SIH 2026*

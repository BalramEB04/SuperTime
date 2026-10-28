# Timesheet Management System - Frontend

Frontend application for the **Timesheet Management System**, built with **React 19**, **TypeScript**, and **Vite**. Features a modern, role-based dashboard for employees, project managers, account managers, and admins to manage timesheets, leaves, projects, and reporting.

---

## Tech Stack

* **Framework:** React 19
* **Language:** TypeScript
* **Build Tool:** Vite
* **State Management:** Redux Toolkit (RTK Query)
* **Styling:** Tailwind CSS 4
* **Charts:** Recharts
* **Animations:** Motion (Framer Motion)
* **Icons:** Lucide React
* **Authentication:** Google OAuth2

---

## Prerequisites

* **Node.js:** v18+
* **npm:** v9+

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd timesheet-Frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
BASE_URL=/api/v1
```

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run TypeScript type checking |
| `npm run clean` | Remove build artifacts |

---

## Project Structure

```text
timesheet-Frontend/
│
├── src/
│   ├── components/
│   │   ├── ac_manager/       # Account Manager views (Portfolio, Financials)
│   │   ├── admin/            # Admin panel (User management, Settings, etc.)
│   │   ├── employee/         # Employee views (Timesheets, Leaves, etc.)
│   │   ├── pm/               # Project Manager views (PM Dashboard)
│   │   ├── shared/           # Shared/reusable UI components
│   │   ├── Header.tsx        # Top navigation bar
│   │   ├── Sidebar.tsx       # Side navigation
│   │   ├── LoginPage.tsx     # Google OAuth login page
│   │   ├── Toast.tsx         # Toast notification component
│   │   └── ErrorBoundary.tsx # Error boundary wrapper
│   │
│   ├── store/                # Redux store, slices, and RTK Query API
│   ├── utils/                # Utility functions and API helpers
│   ├── data/                 # Static data and constants
│   ├── types.ts              # Shared TypeScript type definitions
│   ├── App.tsx               # Main application with routing logic
│   ├── main.tsx              # App entry point
│   └── index.css             # Global styles
│
├── assets/                   # Static assets (images, fonts)
├── .env                      # Environment variables (git-ignored)
├── .env.example              # Environment variable template
├── index.html                # HTML entry point
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
├── Dockerfile                # Docker build configuration
├── nginx.conf                # Nginx config for production deployment
└── README.md                 # Project documentation
```

---

## Key Features

* **Google OAuth Login** — Seamless enterprise sign-in via Google.
* **Role-Based Dashboards** — Different views for Employee, Project Manager, Account Manager, and Admin.
* **Timesheet Management** — Log daily work hours, submit for approval, and track status.
* **Leave Management** — Apply for leaves, view balances, and manage approvals.
* **Project & Client Management** — Manage projects, assignments, milestones, and client info.
* **Weekend & Holiday Work** — Request and approve overtime work.
* **Reports & Analytics** — Interactive charts and exportable reports with Recharts.
* **Tool Allocation** — Track software licenses and tool assignments.
* **Notifications** — Real-time status updates and alerts.

---

## Deployment

### Docker

```bash
docker build -t timesheet-frontend .
docker run -p 80:80 timesheet-frontend
```

The production build is served via **Nginx** using the included `nginx.conf`.

---

## Developers

* **Balram Prajapati** — Developer
* **Govinda Tapadia** — Developer

---

Happy Coding! 🚀

# SuperTime — Timesheet Management System 

A unified full-stack monorepo for employee timesheet tracking, project allocations, leave management, and reporting.

---

## 🏗️ Architecture Overview

The monorepo contains two primary applications orchestrated via Docker Compose:

* **[Frontend (`timesheet-Frontend`)](file:///timesheet-Frontend):**
  - **Framework:** React 19 + TypeScript + Vite
  - **Styling:** Tailwind CSS + Lucide Icons + Motion
  - **Server (Production):** Nginx 1.27 Alpine (Reverse-proxies API calls directly to the backend)

* **[Backend (`timesheet-Backend`)](file:///timesheet-Backend):**
  - **Framework:** FastAPI (Python 3.12)
  - **Database ORM:** SQLAlchemy 2 (Async) + Alembic migrations
  - **Driver:** `asyncpg` for PostgreSQL
  - **Server (Production):** Uvicorn

---

## 📁 Repository Structure

```
SuperTime/
├── docker-compose.yml           # Multi-service production orchestration
├── .env.example                 # Root environment variable template
├── .gitignore                   # Global ignore rules
├── README.md                    # Project documentation
│
├── timesheet-Frontend/          # React + Vite application
│   ├── Dockerfile               # Multi-stage Node.js build -> Nginx runtime
│   ├── nginx.conf               # Nginx reverse proxy & SPA configuration
│   ├── package.json
│   └── src/
│
└── timesheet-Backend/           # FastAPI backend
    ├── Dockerfile               # Python 3.12 slim container with auto-migrations
    ├── requirements.txt
    ├── alembic/                 # Database migrations
    └── app/                     # FastAPI core, modules, schemas, routers
```

---

## 🚀 Quick Start (Docker Compose — Recommended)

### 1. Clone the repository
```bash
git clone -b dev https://github.com/Supersourcing-Team/SuperTime.git
cd SuperTime
```

### 2. Configure Environment Variables
Copy the template and fill in your database credentials:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` points to your PostgreSQL database (e.g. Supabase, AWS RDS, Neon, or local):
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@db-host:5432/timesheet_db?ssl=require
SECRET_KEY=generate_a_random_32_character_secret
ADMIN_EMAIL=admin@yourcompany.com
```

### 3. Build & Run
```bash
docker compose up -d --build
```

* **Frontend:** Open [http://localhost:3000](http://localhost:3000) (Google SSO compatible)
* **Backend API Docs:** Open [http://localhost:3000/docs](http://localhost:3000/docs)
* **Health Check:** Open [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

To view live logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

## 💻 Local Development (Without Docker)

If you prefer running services individually during local development:

### Backend:
```bash
cd timesheet-Backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend:
```bash
cd timesheet-Frontend
npm install
npm run dev
```

---

## 🗄️ Database Migrations (Alembic)

Database schema migrations are run **automatically** when the Docker backend container boots.

To create a new migration after editing SQLAlchemy models:
```bash
# Inside timesheet-Backend directory
alembic revision --autogenerate -m "describe_your_changes"
alembic upgrade head
```

---

## 🔐 Security & Best Practices
- **No CORS Overhead:** Nginx routes all `/api/` traffic internally on port 80.
- **Persistent Storage:** Uploaded receipts and files are stored in Docker volume `backend-uploads`.
- **Health Checks:** Container startup order is guaranteed via Docker Compose health checks.

# Finance Dashboard Backend

A backend API for a finance dashboard that handles users, roles, financial records, and summary analytics. Built as a backend assignment submission. Includes a simple frontend UI for testing everything in the browser.

## Why this stack?

I went with **Node.js + Express + SQLite** for a few reasons:

- Express is what I'm most comfortable with, and for an assignment like this, using something familiar meant I could focus on the actual logic instead of fighting with framework boilerplate.
- SQLite because it's zero-config. No database server to install, no connection strings to manage. The whole db is just a file. For a project that needs to be easy to run and evaluate, this felt like the right call.
- `better-sqlite3` over the more popular `sqlite3` package because it's synchronous. Sounds weird, but for SQLite (which is already local), async doesn't add much — it just makes the code harder to read. The synchronous API keeps things clean.
- JWT for auth because it's stateless and simple. No session store needed.

I skipped using an ORM like Sequelize or Prisma. For this schema size (2 tables), raw SQL is more readable and gives me full control over queries, especially for the dashboard aggregation stuff.

## Setup

```bash
# clone and install
cd finance-backend
npm install

# seed the database with test data
npm run seed

# start the server
npm start

# or with auto-reload during development
npm run dev
```

Server runs on `http://localhost:3000` by default.

**Open `http://localhost:3000` in your browser** to use the frontend dashboard. It has quick-login buttons for all three roles so you can test everything visually.

## Running Tests

Tests use Node's built-in test runner — no extra dependencies.

```bash
# start a test server on a different port (in one terminal)
DB_PATH=/tmp/test-finance.db PORT=3001 node src/app.js

# run tests (in another terminal)
npm test
```

The tests cover auth, CRUD, RBAC, dashboard, validation, and soft delete.

## Seed Data

Running `npm run seed` creates:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | admin |
| analyst@example.com | password123 | analyst |
| viewer@example.com | password123 | viewer |

Plus 15 sample financial records across 3 months.

## API Endpoints

### Auth
- `POST /api/auth/register` — create account (first user auto-becomes admin)
- `POST /api/auth/login` — get JWT token

Auth endpoints are rate-limited to 20 requests/minute per IP.

### Users (admin only)
- `GET /api/users` — list all users
- `GET /api/users/:id` — get single user
- `PATCH /api/users/:id/role` — change user role
- `PATCH /api/users/:id/status` — activate/deactivate user

### Financial Records
- `GET /api/records` — list records (supports filtering, search & pagination)
- `GET /api/records/:id` — get single record
- `POST /api/records` — create record (admin only)
- `PUT /api/records/:id` — update record (admin only)
- `DELETE /api/records/:id` — soft delete record (admin only)
- `PATCH /api/records/:id/restore` — restore deleted record (admin only)

**Filters for GET /api/records:**
- `?type=income` or `?type=expense`
- `?category=Rent`
- `?search=keyword` (searches in notes field)
- `?start_date=2025-01-01&end_date=2025-03-31`
- `?page=1&limit=10`

### Dashboard (all authenticated users)
- `GET /api/dashboard/summary` — total income, expenses, net balance
- `GET /api/dashboard/category-breakdown` — totals grouped by category
- `GET /api/dashboard/recent` — recent transactions (default 10)
- `GET /api/dashboard/monthly` — monthly income/expense/net for last 12 months

### Other
- `GET /api/health` — health check

## Role Permissions

| Action | Viewer | Analyst | Admin |
|--------|--------|---------|-------|
| View dashboard | Yes | Yes | Yes |
| View records | Yes | Yes | Yes |
| Create records | No | No | Yes |
| Update records | No | No | Yes |
| Delete records | No | No | Yes |
| Restore records | No | No | Yes |
| Manage users | No | No | Yes |

## Sample Requests

```bash
# register (first user becomes admin)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Aman", "email": "aman@test.com", "password": "test123"}'

# login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# create a record (use token from login)
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"amount": 5000, "type": "income", "category": "Freelance", "date": "2025-04-01", "notes": "Side project"}'

# get dashboard summary
curl http://localhost:3000/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# filter records
curl "http://localhost:3000/api/records?type=expense&category=Rent&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# search records by notes
curl "http://localhost:3000/api/records?search=salary" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Project Structure

```
finance-backend/
├── public/
│   └── index.html          # frontend dashboard UI
├── src/
│   ├── app.js              # express setup, routes, error handling
│   ├── seed.js             # populates db with test data
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── recordController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT verification + role checking
│   │   ├── validate.js     # input validation
│   │   └── rateLimit.js    # in-memory rate limiter
│   ├── models/
│   │   └── db.js           # sqlite setup + schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── records.js
│   │   └── dashboard.js
│   └── utils/
│       └── config.js
├── tests/
│   └── api.test.js         # integration tests
├── package.json
├── .gitignore
└── README.md
```

## Assumptions I Made

- The first user to register is automatically an admin. This avoids the chicken-and-egg problem of needing an admin to create an admin.
- Financial records are global, not per-user. Everyone sees the same data, access is just about what you can *do* with it. In a real app you'd probably want per-user or per-org scoping, but for this assignment, global made more sense.
- Dates are stored as strings in YYYY-MM-DD format. SQLite doesn't have a real date type anyway, and string comparison works fine for date ranges with this format.
- Soft delete means records aren't actually removed from the database — they get flagged with `is_deleted = 1` and excluded from all queries. Admins can restore them.

## Tradeoffs

- **SQLite vs Postgres**: SQLite can't handle concurrent writes well. Fine for this assignment, but you'd switch to Postgres in production.
- **No ORM**: Means I wrote SQL by hand, which is more work but also means the dashboard queries are exactly what I want them to be. ORMs sometimes generate weird joins for aggregations.
- **Hand-rolled validation**: Used simple validation functions instead of Joi/Yup. For 2-3 request bodies, a validation library adds more complexity than it removes.
- **In-memory rate limiter**: Works for a single-server setup. In production with multiple instances you'd use Redis for shared state.
- **Synchronous SQLite**: `better-sqlite3` is sync, which would block the event loop under heavy load. Doesn't matter here since it's a local assessment project.
- **Frontend is a single HTML file**: Kept it simple — no build tools, no React, just vanilla JS. It's meant for testing and demoing, not production.

## What Could Be Improved

- Swagger/OpenAPI docs for the API
- Move from SQLite to Postgres if this ever needed to handle real traffic
- Audit log for who created/modified what
- More comprehensive test coverage (edge cases, concurrent access)
- Better frontend with a proper framework and charts library

## Known Limitations

- No refresh token mechanism — tokens just expire after 24h and you need to login again
- Password reset flow isn't implemented
- The dashboard queries scan all records every time. For a large dataset you'd want materialized views or caching, but that's overkill here
- Search only works on the notes field (doesn't search categories or other fields)

## 📄 API Documentation

This project includes interactive API documentation using **Swagger (OpenAPI 3.0)**.

The documentation provides a complete overview of all available endpoints, request formats, and responses.

---

### 🚀 How to Run the Project

1. Run the project:
   ```bash
   npm install
   npm start
2. Open in browser:
   ```bash
   http://localhost:3000/api-docs




   

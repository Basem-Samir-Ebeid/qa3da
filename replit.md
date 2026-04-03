# قعدة (Kaada) - Drink Ordering & Management System

## Overview
A Next.js cafe/social space drink ordering and management system. Customers can browse a menu, place orders, and track their order status in real-time. Staff can manage pending orders, and admins can manage drinks, users, inventory, and send broadcast messages.

## Architecture
- **Framework:** Next.js 16.2.0 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL (Replit built-in) via `pg`
- **Styling:** Tailwind CSS 4.0 + Shadcn/UI (Radix UI)
- **Data Fetching:** SWR (polling every 3-10s for real-time updates)
- **Port:** 5000

## Key Routes
- `/` — Customer interface (login, menu, order tracking, admin tab)
- `/staff` — Staff dashboard for managing and completing orders
- `/api/*` — Backend API routes (drinks, inventory, messages, orders, sessions, staff, users)

## Database
Uses Replit's built-in PostgreSQL. Schema managed via `scripts/008_full_rebuild.sql`.

### Tables
- `drinks` — Menu items
- `inventory` — Stock levels per drink
- `users` — Customer accounts (with table assignments)
- `staff_users` — Staff login accounts
- `sessions` — Daily ordering sessions
- `orders` — Customer orders with status tracking
- `admin_messages` — Broadcast messages from admin
- `app_settings` — Key-value config store

### Default credentials
- Admin user: `admin` / `admin123`
- Staff user: `staff` / `staff123`

## Environment Variables
All managed as Replit secrets:
- `DATABASE_URL` — PostgreSQL connection string (auto-managed by Replit)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Also auto-managed

## Development
The workflow runs `npm run dev` which starts Next.js on port 5000 at `0.0.0.0`.

## Key Features
- **Session persistence:** User login saved in `localStorage` so page refresh doesn't log out the user
- **Order notes:** Customers can add a comment/note when submitting an order (stored in `orders.notes`)
- **Inventory decrement:** Placing an order automatically reduces inventory count via `PUT /api/inventory/[drinkId]` with `action: 'decrement'`
- **Image uploads:** Saved locally to `public/images/uploads/` (not Vercel Blob)
- **Edit dialog:** Admin drink-edit dialog uses controlled state and auto-closes after saving

## Migration Notes
- Originally built with `@neondatabase/serverless` (Neon); migrated to use `pg` for Replit's built-in PostgreSQL.
- Database schema initialized via `executeSql` with contents of `scripts/008_full_rebuild.sql`.

# My ERP — Next.js Business Dashboard

A full ERP system built with Next.js, Prisma (SQLite), NextAuth, and Tailwind CSS.

## Features
- 🔐 Authentication (NextAuth with credentials)
- 📄 Invoices — create, view, update status, delete, export PDF
- 📋 Quotations — create, update status, convert to invoice
- 👥 Clients — full CRUD with license file upload
- 📊 Dashboard — stats cards + monthly revenue bar chart

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate deploy
node scripts/createAdmin.js   # create first admin user
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — login with the credentials from createAdmin.js.

## Tech Stack
- **Framework:** Next.js 13 (Pages Router)
- **Database:** Prisma + SQLite
- **Auth:** NextAuth.js (JWT sessions)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **PDF:** PDFKit
- **File Upload:** Formidable
# SEID
# SEID
# SEID

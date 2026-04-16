# ERP Extension — Setup Guide

## What Was Added

### New Database Models
- **Supplier** — vendors you purchase from
- **Product** — inventory items with SKU, cost/sell price, stock levels
- **Purchase / PurchaseItem** — purchase orders linked to suppliers
- **PurchaseReturn / PurchaseReturnItem** — return tracking
- **InventoryLog** — every stock movement (IN / OUT / ADJUSTMENT)

### New API Routes
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/suppliers` | GET, POST | List / create suppliers |
| `/api/suppliers/[id]` | GET, PUT, DELETE | Manage a supplier |
| `/api/products` | GET, POST | List / create products |
| `/api/products/[id]` | GET, PUT, DELETE | Manage a product |
| `/api/products/[id]/adjust` | POST | Manual stock adjustment |
| `/api/purchases` | GET, POST | List / create purchases |
| `/api/purchases/[id]` | GET, PATCH, DELETE | View / update status |
| `/api/inventory` | GET | Inventory movement log |
| `/api/reports` | GET | Reports (profit/vat/inventory/summary) |

### New Pages
| Path | Description |
|------|-------------|
| `/suppliers` | Supplier CRUD |
| `/products` | Product list with low-stock badges |
| `/purchases` | Purchase list with status filters |
| `/purchases/create` | Create purchase order |
| `/purchases/[id]` | Purchase detail + receive action |
| `/inventory` | Stock movement log + low stock alerts |
| `/reports` | Profit / VAT / Inventory reports with charts |
| `/dashboard` | Enhanced with Sales, Purchases, Net Profit, Inventory Value |

---

## 🚀 Setup Steps

### 1. Run the Prisma Migration

```bash
npx prisma migrate dev --name add_purchases_inventory
```

> This applies the new schema to your SQLite database. All existing data is preserved.

### 2. Regenerate the Prisma Client

```bash
npx prisma generate
```

### 3. Start the Dev Server

```bash
npm run dev
```

### 4. (Optional) Seed Sample Data

```bash
# Open Prisma Studio to manually add suppliers and products
npx prisma studio
```

---

## Key Business Logic

### Average Cost Calculation
When a product is purchased multiple times, the system recalculates its average cost using the **weighted average** method:

```
New Avg Cost = (Old Stock × Old Cost + New Qty × New Cost) / (Old Stock + New Qty)
```

This is stored in `Product.costPrice` and used for profit calculations.

### Stock Flow
- **Purchase → RECEIVED**: triggers `IN` entries in InventoryLog, increases `stockQuantity`, recalculates average cost
- **Invoice created with productId**: triggers `OUT` entries, decreases `stockQuantity` (stock validation enforced)
- **Manual adjustment**: via `/api/products/[id]/adjust` — logs `ADJUSTMENT` type

### Invoice ↔ Inventory Integration
To link an invoice item to a product (for stock deduction), include `productId` in the items array when creating an invoice. Existing invoices without `productId` are unaffected — fully backward compatible.

### Reports
All reports accept query params:
- `?type=profit|vat|inventory|summary`
- `?period=monthly|quarterly|yearly`
- `?year=2026&month=4` (for monthly)
- `?year=2026&quarter=2` (for quarterly)

---

## Backward Compatibility
- Existing invoice, quotation, client APIs are **not modified**
- `productId` on `InvoiceItem` is optional/nullable
- All existing data is preserved through migration
- Dashboard is enhanced but all old stats remain

---

## File Structure Added

```
pages/
  api/
    suppliers/       index.ts, [id].ts
    products/        index.ts, [id].ts, [id]/adjust.ts
    purchases/       index.ts, [id].ts
    inventory/       index.ts
    reports/         index.ts
  suppliers/         index.tsx
  products/          index.tsx
  purchases/         index.tsx, create.tsx, [id].tsx
  inventory/         index.tsx
  reports/           index.tsx
  dashboard.tsx      (enhanced)
lib/
  inventory.ts       (stock logic + avg cost)
components/
  Sidebar.tsx        (updated with new sections)
prisma/
  schema.prisma      (updated)
  migrations/
    20260403000000_add_purchases_inventory/migration.sql
```

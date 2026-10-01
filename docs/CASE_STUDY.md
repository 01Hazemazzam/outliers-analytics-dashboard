# Outliers Analytics — Case Study

**A six-domain business-intelligence dashboard built on Next.js and DuckDB — every chart and KPI computed server-side from 181,002 raw CSV rows, with no number hardcoded into the frontend.**

- **Live demo:** https://analytics-dashboard-phi-kohl.vercel.app
- **Source code:** https://github.com/01Hazemazzam/outliers-analytics-dashboard

| | |
|---|---|
| Independent datasets | 6 |
| Rows ingested | 181,002 |
| Dashboard pages | 8 |
| Hardcoded metrics | 0 |

---

## Overview

The brief: turn six unrelated CSV exports — sales, customers, marketing, inventory, banking, and HR — into a BI product a stakeholder could actually trust. The obvious shortcut was to stitch the datasets together on their matching-looking ID columns and ship a flashy "360° view." I checked that assumption against the data first, found it didn't hold, and built the architecture around what the data actually supports instead.

The result is a Next.js App Router application with DuckDB running in-process as the analytical engine: every KPI, chart, and table is a SQL aggregation computed on request, never a number typed into a component.

**Constraints I designed around:**
- No cross-dataset joins, anywhere — enforced by giving each page exactly one source table
- Every aggregation lives in SQL, not in React — the frontend only renders what the API returns
- Refresh has to detect real file changes (mtime/size), not just re-poll blindly every 30s
- Ship on Vercel's serverless runtime, where the filesystem is read-only and ephemeral

## Architecture

```
6 CSV files → Ingestion/validation → DuckDB (in-memory) → API routes (SQL aggregation) → React UI (Recharts)
```

A single DuckDB connection is kept alive in-process (survives Next.js hot reloads via `globalThis`) and loaded once from the six CSVs on first request. Every API route runs a parameterized SQL query against it — filters are bound values, never string-concatenated.

**Stack:** Next.js 16 (App Router) · TypeScript · `@duckdb/node-api` · Recharts · Tailwind CSS v4 · shadcn/ui on base-ui · Vercel

## Key engineering decision: no cross-dataset joins

Three datasets carry a `Customer_ID` column and two carry a `Product_ID` column, formatted exactly like foreign keys (`CUST-#####`, `PROD-#####`) with overlapping numeric ranges. Before joining anything, I tested the relationship against a shared attribute in each pair:

- **1.5–1.7% agreement** when `Customer_ID` is joined across the three datasets and compared against `Age` — consistent with random chance, not a real match.
- **89% mismatch** when `Product_ID` is joined between sales and inventory and compared against `Category` — again, random chance (1-in-8 categories).

These are independently-generated synthetic ID pools that coincidentally share a format — not foreign keys. So every page in the app queries exactly one dataset. The Data Explorer page documents the naming coincidence as an explicit, unverified relationship diagram instead of hiding it — recorded as [ADR 0001](adr/0001-no-cross-dataset-joins.md) in the repo.

## Screens

Captured directly from the production deployment — real aggregation results from the 181,002-row dataset, not mock data.

### Executive Overview
Cross-domain snapshot — $49.8M revenue, 50,000 orders, auto-generated insights, none of it blended across datasets.

![Executive Overview](screenshots/overview.png)

### Sales & E-commerce
50,000 orders, full filter bar, revenue trend and category/region breakdowns from `sales_ecommerce_data`.

![Sales & E-commerce](screenshots/sales.png)

### Customers
Segment and churn-risk analysis over 25,000 customer records, with a click-through profile dialog.

![Customers](screenshots/customers.png)

### Marketing
Blended ROAS of 5.26x across 15,000 campaigns, with per-platform ROAS against the blended average.

![Marketing](screenshots/marketing.png)

### Inventory
20,000 SKUs, stock-vs-reorder-point alerts, and inventory value by category and warehouse.

![Inventory](screenshots/inventory.png)

### Banking & Financial
41,002 transactions; fraud and risk thresholds (`Risk_Score ≥ 70`, FICO `< 580`) applied in SQL, not the UI.

![Banking & Financial](screenshots/banking.png)

### HR / Employees
30,000 employee records — headcount, compensation, and performance/engagement indicators by department.

![HR / Employees](screenshots/hr.png)

### Data Explorer
Generic browser over all six tables — schema from DuckDB's own `DESCRIBE`, search, filter, sort, CSV export, and the relationship diagram above.

![Data Explorer](screenshots/explorer.png)

## Challenges solved

Three picked because they were real debugging, not just feature work — each found by verifying the deployed app rather than trusting a green build.

### 1. DuckDB's native binary vanished on Vercel — *Deployment*

Every API route returned 500 on first deploy: `libduckdb.so: cannot open shared object file`. Next's file tracer follows `require()` calls, but DuckDB's native addon `dlopen()`s its shared library directly — invisible to static analysis.

**Fix:** force-included the Linux binding package's directory via `outputFileTracingIncludes` so the `.so` ships inside the Lambda bundle.

### 2. A hydration mismatch only the browser console caught — *Bug*

The build was green and the page rendered fine visually, but a loading skeleton (a `<div>`) was nested inside a `<p>` tag — invalid HTML that React silently re-renders around on hydrate.

**Fix:** caught it only by reading console output during an end-to-end verification pass, not from lint or the build. Swapped the wrapper to a `<div>`.

### 3. Resisting the "impressive but fake" dashboard — *Data integrity*

A Customer 360 view joining sales, banking, and demographics would have looked far more complete. It would also have been statistically meaningless, per the 1.5–1.7% match-rate test above.

**Fix:** the no-joins rule above, enforced architecturally — each page's query layer only has access to its own table.

## Full stack

| Role | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Analytical engine | DuckDB (in-process) |
| Charts | Recharts |
| UI components | shadcn/ui on base-ui |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (serverless) |
| Data layer | Parameterized SQL, zero ORM |
| Source control | Git, conventional commits |

---

Built end-to-end — data modeling, SQL, API design, UI, and deployment — with every page verified against the real dataset before shipping, not just lint-and-build green.

**[Live demo ↗](https://analytics-dashboard-phi-kohl.vercel.app)** · **[GitHub repo ↗](https://github.com/01Hazemazzam/outliers-analytics-dashboard)**

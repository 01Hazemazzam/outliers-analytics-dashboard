# Context: Analytics Dashboard Data Model

## Glossary

**Domain**
One of six independent business areas covered by the dashboard: Sales & E-commerce, Customers, Marketing, Inventory, Banking & Financial, HR. Each domain is backed by exactly one source dataset. Domains do not share entities with each other in this data (see *Relationship candidate* below).

**Scoped identifier**
An ID column (e.g. `Customer_ID`, `Product_ID`) whose values are only meaningful *within the dataset that defines them*. `sales_ecommerce_data.Customer_ID`, `customer_demographics_data.Customer_ID`, and `banking_financial_data.Customer_ID` are three distinct scoped identifiers — they share a name and a format (`CUST-#####`) but do not refer to the same underlying customer. The same applies to `Product_ID` in `product_inventory_data` vs `sales_ecommerce_data`. Referring to "the customer" or "the product" without naming the domain is a category error in this system — always qualify (e.g. "a Sales-domain customer," "an Inventory-domain product").

**Relationship candidate**
A pair of columns across two datasets that share a name and ID format strongly suggestive of a foreign-key relationship, but for which referential integrity was checked against a shared attribute (e.g. Age, Category) and found to hold no better than random chance. Relationship candidates are documented (in the Data Explorer's data-model diagram) but never joined in analytical queries. Known relationship candidates: `Customer_ID` across `customer_demographics_data` / `sales_ecommerce_data` / `banking_financial_data`; `Product_ID` across `product_inventory_data` / `sales_ecommerce_data`.

**Snapshot field**
A column with zero variance across every row in a dataset (e.g. `product_inventory_data.Weight_kg` ≡ 19.71, `product_inventory_data.Rating` ≡ 3.5, `product_inventory_data.Last_Restocked` ≡ 2025-09-30, `marketing_campaigns_data.End_Date` ≡ 2025-10-01). Indicates a placeholder or report-generation-time value rather than a real per-row measurement. Excluded from analytical charts/KPIs; may still be shown as metadata (e.g. "data as of 2025-09-30").

## Datasets (one per domain, no cross-dataset joins)

| Domain | Dataset | Grain | Row count |
|---|---|---|---|
| Customers | `customer_demographics_data.csv` | one row per customer | 25,000 |
| Sales & E-commerce | `sales_ecommerce_data.csv` | one row per order | 50,000 |
| Marketing | `marketing_campaigns_data.csv` | one row per campaign | 15,000 |
| Inventory | `product_inventory_data.csv` | one row per product | 20,000 |
| Banking & Financial | `banking_financial_data.csv` | one row per transaction | 41,002 |
| HR | `employee_hr_data.csv` | one row per employee | 30,000 |

Total: 181,002 rows across six independent tables.

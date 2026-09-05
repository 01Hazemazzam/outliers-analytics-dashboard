# 1. Do not join datasets on Customer_ID / Product_ID

## Status
Accepted

## Context
Three datasets carry a `Customer_ID` column (`customer_demographics_data`, `sales_ecommerce_data`, `banking_financial_data`) and two carry a `Product_ID` column (`product_inventory_data`, `sales_ecommerce_data`). The formats look relational (`CUST-#####`, `PROD-#####`) and the numeric ranges overlap, which is exactly what a real foreign-key relationship would look like.

Verification against a shared attribute in each pair tells a different story:
- Joining on Customer_ID and comparing Age: 1.5–1.7% agreement across every pair of the three datasets — consistent with random chance, not a real match.
- Joining on Product_ID and comparing Category: 89% mismatch between `sales_ecommerce_data` and `product_inventory_data` — again consistent with random chance (1-in-8 categories).

These are independently-generated synthetic ID pools that coincidentally share a numeric range and string format. They are not foreign keys.

## Decision
Every analytical page is built on exactly one dataset (its own domain). No dashboard query joins across `Customer_ID` or `Product_ID`. There is no "Customer 360" view and no inventory-linked sales analysis.

The Data Explorer documents the *naming-convention similarity* as a relationship diagram, explicitly labeled as unverified:

> "⚠️ Relationship candidates detected by column naming, but referential integrity was not established in the current data. Cross-dataset joins are intentionally disabled."

The data layer is built so that a future dataset with genuine referential integrity could be dropped in and joined without restructuring the application — the constraint is on the current data, not a permanent architectural limitation.

## Consequences
- Executive Overview and per-domain pages report metrics per-domain only; no metric is described as blending two datasets' entities.
- If the source CSVs are ever replaced with data that has real overlapping keys, the join logic still needs to be written — this ADR does not pre-build it, since building a join with no way to verify it against real data would risk shipping unverified logic.
- Prevents a materially more "impressive-looking" but statistically meaningless dashboard (e.g. fabricated customer lifetime-value-across-banking-and-sales).

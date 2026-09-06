import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB's Node bindings load a platform-specific native addon via a
  // runtime require() switch; bundling it makes Turbopack/webpack try to
  // statically resolve every platform's binary. Keep it external so Node
  // requires it directly at runtime instead.
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
  // The CSVs are read via a dynamic path (path.join(DATA_DIR, ...)) marked
  // turbopackIgnore, so Next's file-tracing can't see they're needed by the
  // API routes. Without this, Vercel's deploy bundle would omit them.
  outputFileTracingIncludes: {
    "/api/overview": ["./*.csv"],
    "/api/refresh": ["./*.csv"],
    "/api/sales": ["./*.csv"],
    "/api/sales/orders": ["./*.csv"],
    "/api/customers": ["./*.csv"],
    "/api/customers/rows": ["./*.csv"],
    "/api/customers/[customerId]": ["./*.csv"],
    "/api/marketing": ["./*.csv"],
    "/api/marketing/campaigns": ["./*.csv"],
    "/api/inventory": ["./*.csv"],
    "/api/inventory/products": ["./*.csv"],
    "/api/banking": ["./*.csv"],
    "/api/banking/transactions": ["./*.csv"],
    "/api/hr": ["./*.csv"],
    "/api/hr/employees": ["./*.csv"],
    // The native addon (duckdb.node) dlopen's libduckdb.so at runtime, a
    // dependency the file tracer can't see via require()/import analysis —
    // without this, Vercel's Linux function is missing the .so and every
    // route fails with "libduckdb.so: cannot open shared object file".
    "/api/*": [
      "./node_modules/@duckdb/node-bindings-linux-x64/**/*",
      "./node_modules/@duckdb/node-bindings-linux-x64-musl/**/*",
    ],
  },
};

export default nextConfig;

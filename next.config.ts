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
  },
};

export default nextConfig;

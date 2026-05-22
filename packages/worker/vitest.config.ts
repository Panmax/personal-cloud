import path from "node:path";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(
    path.join(__dirname, "migrations")
  );

  return {
    test: {
      setupFiles: ["./test/setup.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.toml" },
          miniflare: {
            d1Databases: ["DB"],
            r2Buckets: ["BUCKET"],
            bindings: {
              TEST_MIGRATIONS: migrations,
              JWT_SECRET: "test-jwt-secret",
              AUTH_PASSWORD_HASH:
                "13d249f2cb4127b40cfa757866850278793f814ded3c587fe5889e889a7a9f6c",
            },
          },
        },
      },
    },
  };
});

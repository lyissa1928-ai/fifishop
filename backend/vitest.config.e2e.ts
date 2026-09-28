import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/*
 * IMPORTANT :
 * - .env fournit les secrets JWT nécessaires au démarrage.
 * - .env.e2e remplace DATABASE_URL par fifishop_e2e.
 */
loadEnv({ path: '.env' });
loadEnv({ path: '.env.e2e', override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('SECURITE E2E : DATABASE_URL est absent.');
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, '');

if (databaseName !== 'fifishop_e2e') {
  throw new Error(
    `SECURITE E2E : base interdite "${databaseName}". ` +
      'Les tests doivent utiliser exclusivement fifishop_e2e.',
  );
}

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],

    sequence: {
      concurrent: false,
    },
  },
});

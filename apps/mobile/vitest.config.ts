import { defineConfig } from 'vitest/config';

// Pure-TS layers only (domain, data mappers); RN screens are checked on device.
export default defineConfig({ test: { include: ['src/**/*.spec.ts'] } });

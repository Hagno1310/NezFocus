import { z } from 'zod';
import type { ExampleRow } from './example.schema.js';

// Move to @nezfocus/shared once the app sends or reads this shape too.
export const CreateExampleBody = z.object({
  name: z.string().trim().min(1).max(100),
});
export type CreateExampleBody = z.infer<typeof CreateExampleBody>;

// API JSON is snake_case and ids are strings (SRS 5.2).
export const toExampleJson = (row: ExampleRow) => ({
  id: row.id.toString(),
  name: row.name,
  created_at: row.createdAt.toISOString(),
});

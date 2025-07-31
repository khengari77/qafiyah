import { drizzle } from "drizzle-orm/postgres-js";
import { createMiddleware } from "hono/factory";
import postgres from "postgres";
import type { AppContext } from "../types";

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  let client: ReturnType<typeof postgres> | null = null;

  try {
    if (!c.env.DATABASE_URL) {
      throw new Error('Database configuration missing');
    }

    client = postgres(c.env.DATABASE_URL, {
      ssl: false,
      max: 2,
      idle_timeout: 30,
      connect_timeout: 10,
      prepare: false,
      transform: { undefined: null },
      onnotice: () => { },
    });

    const db = drizzle(client);
    c.set("db", db);
    await next();

  } catch (error) {
    console.error('Database error:', error);

    if (client) {
      try {
        await client.end({ timeout: 2000 });
      } catch {
      }
    }

    return c.json(
      {
        success: false,
        error: 'Database unavailable',
        status: 503
      },
      503
    );
  }
});
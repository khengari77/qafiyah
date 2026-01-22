import { drizzle } from "drizzle-orm/postgres-js";
import { createMiddleware } from "hono/factory";
import postgres from "postgres";
import type { AppContext } from "../types";

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  let client: ReturnType<typeof postgres> | null = null;

  try {
    const databaseUrl = c.env.DEV_DATABASE_URL || c.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Database configuration missing");
    }
    const urlWithoutPassword = databaseUrl.replace(/:[^:@]+@/, ":****@");
    console.log(`Connecting to database: ${urlWithoutPassword}`);
    const url = new URL(databaseUrl);
    const options = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: false,
      max: 2,
      idle_timeout: 30,
      connect_timeout: 10,
      prepare: false,
      transform: { undefined: null },
      onnotice: () => {},
    };

    console.log(`Connection options: host=${options.host}, port=${options.port}, database=${options.database}, user=${options.user}`);

    try {
      client = postgres(options);
      await client`SELECT 1 as test`;
      console.log('Database connection successful');
    } catch (connError: any) {
      console.error('Connection error details:', {
        message: connError.message,
        code: connError.code,
        severity: connError.severity,
        host: options.host,
        port: options.port,
        user: options.user,
        database: options.database
      });
      throw connError;
    }

    const db = drizzle(client);
    c.set("db", db);
    await next();
  } catch (error) {
    console.error("Database error:", error);

    if (client) {
      try {
        await client.end({ timeout: 2000 });
      } catch {}
    }

    return c.json(
      {
        success: false,
        error: "Database unavailable",
        status: 503,
      },
      503,
    );
  }
});

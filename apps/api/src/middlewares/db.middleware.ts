import { drizzle } from 'drizzle-orm/postgres-js';
import { createMiddleware } from 'hono/factory';
import postgres from 'postgres';
import type { AppContext } from '../types';

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  let client: ReturnType<typeof postgres> | null = null;

  try {
    const databaseUrl = c.env.DEV_DATABASE_URL || c.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('Database configuration missing');
    }
    const urlWithoutPassword = databaseUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`Connecting to database: ${urlWithoutPassword}`);
    const url = new URL(databaseUrl);
    const options = {
      host: url.hostname,
      port: Number.parseInt(url.port, 10) || 5432,
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

    console.log(
      `Connection options: host=${options.host}, port=${options.port}, database=${options.database}, user=${options.user}`
    );

    try {
      client = postgres(options);
      await client`SELECT 1 as test`;
      console.log('Database connection successful');
    } catch (connError: unknown) {
      const error = connError instanceof Error ? connError : new Error(String(connError));
      console.error('Connection error details:', {
        message: error.message,
        code: 'code' in error ? error.code : undefined,
        severity: 'severity' in error ? error.severity : undefined,
        host: options.host,
        port: options.port,
        user: options.user,
        database: options.database,
      });
      throw connError;
    }

    const db = drizzle(client);
    c.set('db', db);
    return await next();
  } catch (error) {
    console.error('Database error:', error);

    if (client) {
      try {
        await client.end({ timeout: 2000 });
      } catch {}
    }

    return c.json(
      {
        success: false,
        error: 'Database unavailable',
        status: 503,
      },
      503
    );
  }
});

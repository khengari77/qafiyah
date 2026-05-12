import { os } from '@orpc/server';
import type { DbClient } from '../db';

type AppOrpcContext = { db: DbClient };

export const pub = os.$context<AppOrpcContext>();

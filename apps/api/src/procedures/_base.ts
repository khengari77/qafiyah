import { implement } from '@orpc/server';
import { contract } from '@qafiyah/contracts';
import type { DbClient } from '@qafiyah/db';

type AppOrpcContext = { db: DbClient };

export const pub = implement(contract).$context<AppOrpcContext>();

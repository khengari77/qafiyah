import { implement } from '@orpc/server';
import { contract } from '@qafiyah/contracts';
import type { DbClient } from '@qafiyah/db';
import type { SearchClient } from '@qafiyah/search';
import type { DomainFields } from '@/lib/logger';

type AppOrpcContext = {
  readonly db: DbClient;
  readonly es: SearchClient;
  readonly log?: (data: DomainFields) => void;
};

export const publicProcedure = implement(contract).$context<AppOrpcContext>();

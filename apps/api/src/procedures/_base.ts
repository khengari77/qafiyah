import { implement } from '@orpc/server';
import { contract } from '@qafiyah/contracts';
import type { DbClient } from '@qafiyah/db';
import type { DomainFields } from '../lib/logger';

type AppOrpcContext = {
  db: DbClient;
  log?: (data: DomainFields) => void;
};

export const pub = implement(contract).$context<AppOrpcContext>();

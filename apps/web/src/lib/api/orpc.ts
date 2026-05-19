import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { apiBrowser } from './rpc';

export const orpc = createTanstackQueryUtils(apiBrowser);

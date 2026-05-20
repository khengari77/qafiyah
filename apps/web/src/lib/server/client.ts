import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { API_V1_PREFIX } from '@qafiyah/constants';
import { type AppContract, contract } from '@qafiyah/contracts';
import { INTERNAL_API_URL } from './env';

// Mirror of apiBrowser (src/lib/api/rpc.ts) but pointed at the internal API
// container instead of production. SSR-only; never imported by a client island.
const SERVER_BASE_URL = `${INTERNAL_API_URL}${API_V1_PREFIX}`;

export const apiServer: ContractRouterClient<AppContract> = createORPCClient(
  new OpenAPILink(contract, { url: SERVER_BASE_URL })
);

import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient, InferContractRouterOutputs } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { API_V1_PREFIX } from '@qafiyah/constants';
import { type AppContract, contract } from '@qafiyah/contracts';
import { API_URL } from '@/constants/globals/urls';
import { env } from '@/env';

const SSR_BASE_URL = `${env.BUILD_API_URL ?? API_URL}${API_V1_PREFIX}`;
const BROWSER_BASE_URL = `${API_URL}${API_V1_PREFIX}`;

function makeClient(baseUrl: string): ContractRouterClient<AppContract> {
  const link = new OpenAPILink(contract, { url: baseUrl });
  return createORPCClient(link);
}

export const apiServer = makeClient(SSR_BASE_URL);
export const apiBrowser = makeClient(BROWSER_BASE_URL);

export type ApiOutputs = InferContractRouterOutputs<AppContract>;

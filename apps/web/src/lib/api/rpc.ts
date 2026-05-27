import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient, InferContractRouterOutputs } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { API_V1_PREFIX } from '@qafiyah/constants';
import { type AppContract, contract } from '@qafiyah/contracts';
import { API_URL } from '@/constants';

const BROWSER_BASE_URL = `${API_URL}${API_V1_PREFIX}`;

export const apiBrowser: ContractRouterClient<AppContract> = createORPCClient(
  new OpenAPILink(contract, { url: BROWSER_BASE_URL })
);

type ApiOutputs = InferContractRouterOutputs<AppContract>;

type DataField<T> = T extends { data: infer D } ? D : never;

// Single resource
export type Poem = DataField<ApiOutputs['poems']['get']>;

// Search
type SearchResponse = ApiOutputs['search']['search'];
type PoemsSection = NonNullable<SearchResponse['poems']>;
type PoetsSection = NonNullable<SearchResponse['poets']>;
export type PoemSearchResult = PoemsSection['data'][number];
export type PoetSearchResult = PoetsSection['data'][number];

import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient, InferContractRouterOutputs } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { API_V1_PREFIX } from '@qafiyah/constants';
import { type AppContract, contract } from '@qafiyah/contracts';
import { API_URL } from '@/constants';
import { env } from '@/env';

const SSR_BASE_URL = `${env.BUILD_API_URL ?? API_URL}${API_V1_PREFIX}`;
const BROWSER_BASE_URL = `${API_URL}${API_V1_PREFIX}`;

function makeClient(baseUrl: string): ContractRouterClient<AppContract> {
  const link = new OpenAPILink(contract, { url: baseUrl });
  return createORPCClient(link);
}

export const apiServer = makeClient(SSR_BASE_URL);
export const apiBrowser = makeClient(BROWSER_BASE_URL);

type ApiOutputs = InferContractRouterOutputs<AppContract>;

type ListData<T> = T extends { data: infer D } ? D : never;
type ResourceData<T> = T extends { data: infer D } ? D : never;

// Collection items
export type Era = ListData<ApiOutputs['eras']['list']>[number];
export type Meter = ListData<ApiOutputs['meters']['list']>[number];
export type Rhyme = ListData<ApiOutputs['rhymes']['list']>[number];
export type Theme = ListData<ApiOutputs['themes']['list']>[number];
export type Poet = ListData<ApiOutputs['poets']['list']>[number];

// Full envelopes (carry data + pagination + meta)
export type EraPoemsResponse = ApiOutputs['eras']['listPoems'];
export type MeterPoemsResponse = ApiOutputs['meters']['listPoems'];
export type PoetPoemsResponse = ApiOutputs['poets']['listPoems'];
export type RhymePoemsResponse = ApiOutputs['rhymes']['listPoems'];
export type ThemePoemsResponse = ApiOutputs['themes']['listPoems'];
export type PoetsResponse = ApiOutputs['poets']['list'];

// Single resource
export type Poem = ResourceData<ApiOutputs['poems']['getBySlug']>;

// Search
type SearchResponse = ApiOutputs['search']['search'];
export type PoemsSearchEnvelope = Extract<SearchResponse, { searchType: 'poems' }>;
export type PoetsSearchEnvelope = Extract<SearchResponse, { searchType: 'poets' }>;
export type PoemSearchResult = ListData<PoemsSearchEnvelope>[number];
export type PoetSearchResult = ListData<PoetsSearchEnvelope>[number];

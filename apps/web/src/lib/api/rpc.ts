import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient, InferContractRouterOutputs } from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { API_V1_PREFIX } from '@qafiyah/constants';
import { type AppContract, contract } from '@qafiyah/contracts';
import { API_URL } from '@/constants';

const BROWSER_BASE_URL = `${API_URL}${API_V1_PREFIX}`;

function makeBrowserClient(): ContractRouterClient<AppContract> {
  return createORPCClient(new OpenAPILink(contract, { url: BROWSER_BASE_URL }));
}

export const apiBrowser = makeBrowserClient();

type ApiOutputs = InferContractRouterOutputs<AppContract>;

type DataField<T> = T extends { data: infer D } ? D : never;

// Collection items
export type Era = DataField<ApiOutputs['eras']['list']>[number];
export type Meter = DataField<ApiOutputs['meters']['list']>[number];
export type Rhyme = DataField<ApiOutputs['rhymes']['list']>[number];
export type Theme = DataField<ApiOutputs['themes']['list']>[number];
export type Poet = DataField<ApiOutputs['poets']['list']>[number];

// Full envelopes (carry data + pagination + meta)
export type EraPoemsResponse = ApiOutputs['eras']['listPoems'];
export type MeterPoemsResponse = ApiOutputs['meters']['listPoems'];
export type PoetPoemsResponse = ApiOutputs['poets']['listPoems'];
export type RhymePoemsResponse = ApiOutputs['rhymes']['listPoems'];
export type ThemePoemsResponse = ApiOutputs['themes']['listPoems'];
export type PoetsResponse = ApiOutputs['poets']['list'];

// Single resource
export type Poem = DataField<ApiOutputs['poems']['getPoemBySlug']>;

// Search
type SearchResponse = ApiOutputs['search']['search'];
type PoemsSearchEnvelope = Extract<SearchResponse, { searchType: 'poems' }>;
type PoetsSearchEnvelope = Extract<SearchResponse, { searchType: 'poets' }>;
export type PoemSearchResult = DataField<PoemsSearchEnvelope>[number];
export type PoetSearchResult = DataField<PoetsSearchEnvelope>[number];

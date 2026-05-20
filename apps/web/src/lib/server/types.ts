import type { InferContractRouterOutputs } from '@orpc/contract';
import type { AppContract } from '@qafiyah/contracts';

export type ApiOutputs = InferContractRouterOutputs<AppContract>;

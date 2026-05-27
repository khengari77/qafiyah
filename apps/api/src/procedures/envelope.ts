import type { pagination } from '@qafiyah/contracts';
import type * as v from 'valibot';

type Pagination = v.InferOutput<typeof pagination>;

export function buildPagination(args: {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
}): Pagination {
  return {
    page: args.page,
    pageSize: args.pageSize,
    totalPages: Math.max(1, Math.ceil(args.totalItems / args.pageSize)),
    totalItems: args.totalItems,
  };
}

// @WARN: return types use mutable arrays to satisfy the oRPC contract's inferred
//   output shape (Valibot's InferOutput does not preserve readonly). Internally,
//   callers pass readonly data, the envelope copies it into a mutable wire-shape
//   only at the boundary.
export function listEnvelope<T>(args: {
  readonly data: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
}): { data: T[]; pagination: Pagination } {
  return {
    data: [...args.data],
    pagination: buildPagination(args),
  };
}

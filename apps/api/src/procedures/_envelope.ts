type Pagination = {
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;
};

// @WARN: return types use mutable arrays to satisfy the oRPC contract's inferred
//   output shape (Valibot's InferOutput does not preserve readonly). Internally,
//   callers pass readonly data, the envelope copies it into a mutable wire-shape
//   only at the boundary.
export function listEnvelope<T>(
  data: readonly T[],
  totalItems: number,
  page: number,
  pageSize: number
): { data: T[]; pagination: Pagination } {
  return {
    data: [...data],
    pagination: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      totalItems,
    },
  };
}

export function listEnvelopeWithMeta<T, M>(
  data: readonly T[],
  totalItems: number,
  page: number,
  pageSize: number,
  meta: M
): { data: T[]; pagination: Pagination; meta: M } {
  return { ...listEnvelope(data, totalItems, page, pageSize), meta };
}

export function resourceEnvelope<T>(data: T): { data: T } {
  return { data };
}

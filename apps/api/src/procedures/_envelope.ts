type Pagination = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
};

export function listEnvelope<T>(
  data: T[],
  totalItems: number,
  page: number,
  pageSize: number
): { data: T[]; pagination: Pagination } {
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      totalItems,
    },
  };
}

export function listEnvelopeWithMeta<T, M>(
  data: T[],
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

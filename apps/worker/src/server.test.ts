import { describe, expect, it, vi } from 'vitest';
import { createHealthHandler } from './server';

function makeState(overrides: Partial<{
  lastReindexAt: string | null;
  lastReconcileAt: string | null;
  lastError: string | null;
}> = {}) {
  return {
    lastReindexAt: null,
    lastReconcileAt: null,
    lastError: null,
    ...overrides,
  };
}

describe('createHealthHandler', () => {
  describe('GET /healthz', () => {
    it('returns 200 with status ok and state fields', async () => {
      const state = makeState({ lastReindexAt: '2024-01-01T00:00:00.000Z' });
      const handler = createHealthHandler({
        getState: () => state,
        reconcileToken: 'secret',
        triggerReconcile: vi.fn(),
      });

      const res = await handler(new Request('http://worker/healthz', { method: 'GET' }));
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body['status']).toBe('ok');
      expect(body['lastReindexAt']).toBe('2024-01-01T00:00:00.000Z');
      expect(body['lastReconcileAt']).toBeNull();
      expect(body['lastError']).toBeNull();
    });

    it('reflects null fields when worker has not run yet', async () => {
      const handler = createHealthHandler({
        getState: () => makeState(),
        reconcileToken: undefined,
        triggerReconcile: vi.fn(),
      });

      const res = await handler(new Request('http://worker/healthz', { method: 'GET' }));
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body['status']).toBe('ok');
      expect(body['lastReindexAt']).toBeNull();
    });
  });

  describe('POST /reconcile', () => {
    it('returns 202 and calls triggerReconcile with correct token', async () => {
      const triggerReconcile = vi.fn();
      const handler = createHealthHandler({
        getState: () => makeState(),
        reconcileToken: 'my-secret',
        triggerReconcile,
      });

      const res = await handler(
        new Request('http://worker/reconcile', {
          method: 'POST',
          headers: { authorization: 'Bearer my-secret' },
        }),
      );
      expect(res.status).toBe(202);
      const body = await res.text();
      expect(body).toBe('accepted');
      expect(triggerReconcile).toHaveBeenCalledOnce();
    });

    it('returns 401 with wrong token', async () => {
      const triggerReconcile = vi.fn();
      const handler = createHealthHandler({
        getState: () => makeState(),
        reconcileToken: 'correct',
        triggerReconcile,
      });

      const res = await handler(
        new Request('http://worker/reconcile', {
          method: 'POST',
          headers: { authorization: 'Bearer wrong' },
        }),
      );
      expect(res.status).toBe(401);
      expect(triggerReconcile).not.toHaveBeenCalled();
    });

    it('returns 401 with no authorization header', async () => {
      const triggerReconcile = vi.fn();
      const handler = createHealthHandler({
        getState: () => makeState(),
        reconcileToken: 'secret',
        triggerReconcile,
      });

      const res = await handler(
        new Request('http://worker/reconcile', { method: 'POST' }),
      );
      expect(res.status).toBe(401);
      expect(triggerReconcile).not.toHaveBeenCalled();
    });

    it('returns 401 when reconcileToken is undefined even with a token header', async () => {
      const triggerReconcile = vi.fn();
      const handler = createHealthHandler({
        getState: () => makeState(),
        reconcileToken: undefined,
        triggerReconcile,
      });

      const res = await handler(
        new Request('http://worker/reconcile', {
          method: 'POST',
          headers: { authorization: 'Bearer anything' },
        }),
      );
      expect(res.status).toBe(401);
      expect(triggerReconcile).not.toHaveBeenCalled();
    });
  });

  describe('unknown routes', () => {
    it('returns 404 for an unknown GET path', async () => {
      const handler = createHealthHandler({
        getState: () => makeState(),
        reconcileToken: 'secret',
        triggerReconcile: vi.fn(),
      });

      const res = await handler(new Request('http://worker/unknown', { method: 'GET' }));
      expect(res.status).toBe(404);
    });

    it('returns 404 for a POST to an unknown path', async () => {
      const handler = createHealthHandler({
        getState: () => makeState(),
        reconcileToken: 'secret',
        triggerReconcile: vi.fn(),
      });

      const res = await handler(new Request('http://worker/other', { method: 'POST' }));
      expect(res.status).toBe(404);
    });
  });
});

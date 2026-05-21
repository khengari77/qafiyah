import { err, ok, type Result } from 'neverthrow';
import * as v from 'valibot';

const schema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.url()),
  ELASTICSEARCH_URL: v.optional(v.pipe(v.string(), v.url())),
  ENVIRONMENT: v.optional(v.string()),
});

export type Bindings = v.InferOutput<typeof schema>;

export type ParseBindingsError = {
  readonly kind: 'invalid_bindings';
  readonly issues: readonly { readonly path: string; readonly message: string }[];
};

export function parseBindings(raw: unknown): Result<Bindings, ParseBindingsError> {
  const result = v.safeParse(schema, raw);
  if (!result.success) {
    const issues = result.issues.map((issue) => ({
      path: Array.isArray(issue.path)
        ? issue.path
            .map((seg) =>
              typeof seg === 'object' && seg && 'key' in seg ? String(seg.key) : String(seg)
            )
            .join('.')
        : '',
      message: issue.message,
    }));
    return err({ kind: 'invalid_bindings', issues });
  }
  return ok(result.output);
}

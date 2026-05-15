import * as v from 'valibot';

const schema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.url()),
});

export type Bindings = v.InferOutput<typeof schema>;

export function parseBindings(raw: unknown): Bindings {
  const result = v.safeParse(schema, raw);
  if (!result.success) {
    const issues = result.issues.map((i) => i.message).join(', ');
    throw new Error(`Invalid worker bindings: ${issues}`);
  }
  return result.output;
}

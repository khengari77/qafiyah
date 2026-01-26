/**
 * Server-side JSON-LD component for static generation
 */
export function JsonLdServer({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires dangerouslySetInnerHTML, and JSON.stringify is safe
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

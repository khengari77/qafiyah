'use client';

import { useEffect } from 'react';

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  useEffect(() => {
    const existingScript = document.getElementById('json-ld') as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.textContent = JSON.stringify(data);
    }
  }, [data]);

  return null;
}

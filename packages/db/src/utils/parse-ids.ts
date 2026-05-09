export function parseIds(idString?: string): string | null {
  if (!idString || idString.trim() === '') {
    return null;
  }

  const ids = idString
    .split(',')
    .map((id) => Number.parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id));

  if (ids.length === 0) {
    return null;
  }

  return `{${ids.join(',')}}`;
}

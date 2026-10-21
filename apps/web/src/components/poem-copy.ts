export function getPoemSelectionText(
  selection: Selection | null,
  container: HTMLElement
): string | null {
  if (selection === null || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }
  const text = selection.toString().trim();
  return text === '' ? null : text;
}

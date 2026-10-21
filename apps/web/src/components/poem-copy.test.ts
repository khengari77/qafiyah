import { describe, expect, it } from 'vitest';

import { getPoemSelectionText } from './poem-copy';

const inside = {};
const outside = {};
const container = { contains: (node: unknown) => node === inside } as unknown as HTMLElement;

function selection({
  text = 'صدر البيت\nعجز البيت',
  collapsed = false,
  ranges = 1,
  start = inside,
  end = inside,
}: {
  readonly text?: string;
  readonly collapsed?: boolean;
  readonly ranges?: number;
  readonly start?: object;
  readonly end?: object;
}): Selection {
  return {
    isCollapsed: collapsed,
    rangeCount: ranges,
    getRangeAt: () => ({ startContainer: start, endContainer: end }),
    toString: () => text,
  } as unknown as Selection;
}

describe('getPoemSelectionText', () => {
  it('gives the trimmed text of a selection inside the poem', () => {
    expect(getPoemSelectionText(selection({ text: '\n صدر البيت \n' }), container)).toBe(
      'صدر البيت'
    );
  });

  it('gives nothing when there is no selection', () => {
    expect(getPoemSelectionText(null, container)).toBeNull();
  });

  it('gives nothing for a collapsed selection', () => {
    expect(getPoemSelectionText(selection({ collapsed: true }), container)).toBeNull();
  });

  it('gives nothing for a selection of more than one range', () => {
    expect(getPoemSelectionText(selection({ ranges: 2 }), container)).toBeNull();
  });

  it('gives nothing when the selection starts outside the poem', () => {
    expect(getPoemSelectionText(selection({ start: outside }), container)).toBeNull();
  });

  it('gives nothing when the selection ends outside the poem', () => {
    expect(getPoemSelectionText(selection({ end: outside }), container)).toBeNull();
  });

  it('gives nothing for a selection of only white space', () => {
    expect(getPoemSelectionText(selection({ text: ' \n ' }), container)).toBeNull();
  });
});

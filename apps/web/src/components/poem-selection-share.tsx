import { Share2 } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

import { getPoemCopyText } from '@/components/poem-copy';
import { Button } from '@/components/ui/button';
import { POEM_SELECTION_SHARE_TEXTS } from '@/lib/constants/copy';

type SelectedPoem = {
  readonly text: string;
  readonly top: number;
  readonly left: number;
};

type PoemSelectionShareProps = {
  readonly poemRef: RefObject<HTMLElement | null>;
  readonly signature: string;
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly onShare: (text: string) => void;
};

export function PoemSelectionShare({
  poemRef,
  signature,
  dialogRef,
  onShare,
}: PoemSelectionShareProps) {
  const [selection, setSelection] = useState<SelectedPoem | null>(null);

  useEffect(() => {
    const updateSelection = () => {
      if (dialogRef.current?.open === true) return;
      const container = poemRef.current;
      const currentSelection = document.getSelection();
      if (container === null || currentSelection === null) {
        setSelection(null);
        return;
      }
      const text = getPoemCopyText(currentSelection, container, signature);
      if (text === null) {
        setSelection(null);
        return;
      }
      const bounds = currentSelection.getRangeAt(0).getBoundingClientRect();
      if (
        bounds.bottom <= 0 ||
        bounds.top >= window.innerHeight ||
        bounds.right <= 0 ||
        bounds.left >= window.innerWidth
      ) {
        setSelection(null);
        return;
      }
      const top = Math.max(
        8,
        Math.min(window.innerHeight - 60, bounds.top >= 60 ? bounds.top - 52 : bounds.bottom + 8)
      );
      const left = Math.max(
        8,
        Math.min(window.innerWidth - 168, bounds.left + bounds.width / 2 - 80)
      );
      setSelection((current) =>
        current?.text === text && current.top === top && current.left === left
          ? current
          : { text, top, left }
      );
    };
    document.addEventListener('selectionchange', updateSelection);
    document.addEventListener('scroll', updateSelection, true);
    window.addEventListener('resize', updateSelection);
    return () => {
      document.removeEventListener('selectionchange', updateSelection);
      document.removeEventListener('scroll', updateSelection, true);
      window.removeEventListener('resize', updateSelection);
    };
  }, [poemRef, signature, dialogRef]);

  const positionStyle: CSSProperties & Record<'--selection-top' | '--selection-left', string> = {
    '--selection-top': `${selection?.top ?? 0}px`,
    '--selection-left': `${selection?.left ?? 0}px`,
  };
  if (selection === null) return null;
  return (
    <div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 md:top-(--selection-top) md:bottom-auto md:left-(--selection-left) md:translate-x-0"
      style={positionStyle}
    >
      <Button
        type="button"
        className="min-h-11 w-40 shadow-lg"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          onShare(selection.text);
        }}
      >
        <Share2 aria-hidden="true" />
        {POEM_SELECTION_SHARE_TEXTS.share}
      </Button>
    </div>
  );
}

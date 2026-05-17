'use client';

import { useState } from 'react';

const FONT_SIZE_MIN = 0.7;
const FONT_SIZE_MAX = 1.5;
const FONT_SIZE_INITIAL = 1;
const FONT_SIZE_STEP = 0.1;
const FONT_SIZE_BASE_GAP_PX = 16;

export function useFontSize(
  minSize = FONT_SIZE_MIN,
  maxSize = FONT_SIZE_MAX,
  initialSize = FONT_SIZE_INITIAL
) {
  const [fontSize, setFontSize] = useState(initialSize);

  const increaseFontSize = () => {
    if (fontSize < maxSize) setFontSize((prev) => prev + FONT_SIZE_STEP);
  };

  const decreaseFontSize = () => {
    if (fontSize > minSize) setFontSize((prev) => prev - FONT_SIZE_STEP);
  };

  const getVerseFontSize = () => {
    const baseClasses = 'text-base xxs:text-lg xs:text-xl sm:text-2xl md:text-2xl';
    const scaleStyle = { transform: `scale(${fontSize})`, transformOrigin: 'center' };
    return { className: baseClasses, style: scaleStyle };
  };

  const getVerseGap = () => {
    const gapSize = FONT_SIZE_BASE_GAP_PX * fontSize;
    return { gap: `${gapSize}px` };
  };

  return {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    getVerseFontSize,
    getVerseGap,
  };
}

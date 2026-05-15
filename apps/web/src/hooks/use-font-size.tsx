'use client';

import {
  FONT_SIZE_BASE_GAP_PX,
  FONT_SIZE_INITIAL,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
} from '@qafiyah/constants';
import { useState } from 'react';

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

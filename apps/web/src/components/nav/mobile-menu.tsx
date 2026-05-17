'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { NAV_LINKS } from '@/constants/nav';
import { RESPONSIVE_ICON_SIZE } from '@/constants/ui';
import { NavLinks } from './nav-links';

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

export function MobileMenu({ isOpen, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div
      id="mobile-menu"
      inert={!isOpen || undefined}
      aria-hidden={!isOpen}
      className={`fixed overflow-auto inset-0 bg-zinc-50 z-20 pt-20 px-4 transition-transform duration-300 ease-in-out transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
    >
      {/* MOBILE LINKS */}
      <NavLinks links={NAV_LINKS} isMobile={true} onLinkClick={onClose} />

      {/* CLOSE BUTTON */}
      <button
        type="button"
        tabIndex={-1}
        id="close-menu"
        className="absolute top-4 left-4 p-2 text-zinc-500 hover:text-zinc-700"
        aria-label="إغلاق القائمة"
        onClick={onClose}
      >
        <X className={RESPONSIVE_ICON_SIZE} />
      </button>
    </div>
  );
}

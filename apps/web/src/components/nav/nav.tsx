'use client';

import { NAV_LINKS, RESPONSIVE_ICON_SIZE } from '@qafiyah/constants';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { NavLinks } from './nav-links';

type Props = {
  onMenuToggle: () => void;
  className?: string;
};

export function Nav({ onMenuToggle, className }: Props) {
  return (
    <nav className={cn('w-full z-10', className)}>
      <div className="w-full">
        <div className="flex justify-between items-center gap-8">
          <Logo />
          <button
            type="button"
            id="menu-toggle"
            className="md:hidden"
            aria-label="فتح القائمة"
            onClick={onMenuToggle}
          >
            <Menu className={cn(RESPONSIVE_ICON_SIZE, 'opacity-70')} />
          </button>
          <NavLinks links={NAV_LINKS} className="hidden md:block" />
        </div>
      </div>
    </nav>
  );
}

'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { NAV_LINKS, RESPONSIVE_ICON_SIZE } from '@/constants';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { NavLinks } from './nav-links';

type Props = {
  readonly className?: string;
};

export function NavWithMenu({ className }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = () => setMenuOpen((v) => !v);

  return (
    <>
      <nav className={cn('w-full z-10', className)}>
        <div className="w-full">
          <div className="flex justify-between items-center gap-8">
            <Logo />
            <button
              type="button"
              id="menu-toggle"
              className="md:hidden"
              aria-label="فتح القائمة"
              onClick={toggle}
            >
              <Menu className={cn(RESPONSIVE_ICON_SIZE, 'opacity-70')} />
            </button>
            <NavLinks links={NAV_LINKS} className="hidden md:block" />
          </div>
        </div>
      </nav>
      <MobileMenu isOpen={menuOpen} onClose={toggle} />
    </>
  );
}

'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { NAV_LINKS, RESPONSIVE_ICON_SIZE } from '@/constants';
import { cn } from '@/lib/utils';
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
      <nav className={cn('z-10 w-full', className)}>
        <div className="w-full">
          <div className="flex items-center justify-between gap-8">
            <a href="/" className="flex items-center">
              <img
                src="/logo-48x48.svg"
                height="48"
                width="48"
                alt="Logo"
                className={cn('size-10', 'md:size-12', 'xl:size-14', '2xl:size-16', '4xl:size-20')}
              />
            </a>
            <button type="button" className="md:hidden" aria-label="فتح القائمة" onClick={toggle}>
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

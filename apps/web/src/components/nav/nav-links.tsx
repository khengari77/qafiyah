'use client';

import { useEffect, useState } from 'react';
import type { NavLink } from '@/constants';
import { cn } from '@/lib/utils';

type Props = {
  readonly links: readonly NavLink[];
  readonly className?: string;
  readonly isMobile?: boolean;
  readonly onLinkClick?: () => void;
};

export function NavLinks({ links, className = '', isMobile = false, onLinkClick }: Props) {
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleLinkClick = () => {
    if (isMobile && onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <nav
      aria-label={isMobile ? 'القائمة الرئيسية (موبايل)' : 'القائمة الرئيسية'}
      className={className}
    >
      <ul
        className={
          isMobile
            ? 'flex flex-col items-end gap-4 text-sm xxs:text-xl'
            : 'flex flex-row gap-4 text-base lg:text-lg 2xl:text-xl'
        }
      >
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <li
              key={link.href}
              className={cn(isMobile && 'w-full border-zinc-300/30 border-b pb-2 text-right')}
            >
              <a
                tabIndex={isMobile ? -1 : 0}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                className={cn(
                  isMobile
                    ? 'block py-2 hover:text-zinc-600'
                    : 'underline-offset-2 duration-200 hover:text-zinc-600 hover:underline',
                  active &&
                    (isMobile ? 'font-bold text-zinc-900 underline' : 'text-zinc-900 underline')
                )}
                onClick={handleLinkClick}
              >
                {link.name}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

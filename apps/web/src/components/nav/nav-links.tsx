'use client';

import { useEffect, useState } from 'react';
import type { NavLink } from '@/constants';
import { NavItem } from './nav-item';

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
        {links.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            external={link.external}
            isActive={isActive(link.href)}
            isMobile={isMobile}
            onClick={handleLinkClick}
          >
            {link.name}
          </NavItem>
        ))}
      </ul>
    </nav>
  );
}

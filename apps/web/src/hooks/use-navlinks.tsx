'use client';

import { useEffect, useState } from 'react';
import { useNavStore } from '@/stores/nav-store';

type Props = {
  isMobile?: boolean;
  onLinkClick?: () => void;
};

export function useNavLinks({ isMobile = false, onLinkClick }: Props = {}) {
  const [pathname, setPathname] = useState('');
  const { toggleMobileMenu } = useNavStore();

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  const handleLinkClick = () => {
    if (isMobile) {
      if (onLinkClick) {
        onLinkClick();
      } else {
        toggleMobileMenu();
      }
    }
  };

  return {
    isActive,
    handleLinkClick,
  };
}

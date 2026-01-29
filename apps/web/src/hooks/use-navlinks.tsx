'use client';

import { usePathname } from 'next/navigation';
import { useNavStore } from '@/stores/nav-store';

type Props = {
  isMobile?: boolean;
  onLinkClick?: () => void;
};

export function useNavLinks({ isMobile = false, onLinkClick }: Props = {}) {
  const pathname = usePathname();
  const { toggleMobileMenu } = useNavStore();

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

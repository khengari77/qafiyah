'use client';

import { Menu } from 'lucide-react';
import { responsiveIconSize } from '@/constants/GLOBALS';
import { cn } from '@/lib/utils';
import { useNavStore } from '@/stores/nav-store';

export function MobileMenuButton() {
  const { toggleMobileMenu } = useNavStore();

  return (
    <button
      id="menu-toggle"
      className="md:hidden"
      aria-label="فتح القائمة"
      onClick={toggleMobileMenu}
    >
      <Menu className={cn(responsiveIconSize, 'opacity-70')} />
    </button>
  );
}

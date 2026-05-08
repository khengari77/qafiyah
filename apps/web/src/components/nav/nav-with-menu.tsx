'use client';

import { useState } from 'react';
import { MobileMenu } from './mobile-menu';
import { Nav } from './nav';

export function NavWithMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = () => setMenuOpen((v) => !v);
  return (
    <>
      <Nav onMenuToggle={toggle} />
      <MobileMenu isOpen={menuOpen} onClose={toggle} />
    </>
  );
}

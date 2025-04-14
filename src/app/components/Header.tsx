'use client';

import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';

export default function Header() {
  const pathname = usePathname();
  
  // ログインページでは表示しない
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="bg-white shadow">
      <div className="mx-auto flex max-w-7xl items-center justify-end p-4">
        <LogoutButton />
      </div>
    </header>
  );
} 
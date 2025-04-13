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
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">YouTubeアナライザー</h1>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
} 
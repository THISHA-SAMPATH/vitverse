'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

export function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}

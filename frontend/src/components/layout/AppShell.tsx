'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="flex min-h-screen" style={{ background: '#F8FAFC' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-5 md:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

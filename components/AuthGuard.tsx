'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, getAuthToken, setAuthToken } from '@/lib/api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(pathname === '/login');

  useEffect(() => {
    if (pathname === '/login') {
      setReady(true);
      return;
    }
    if (!getAuthToken()) {
      router.replace('/login');
      return;
    }
    api.me()
      .then(() => setReady(true))
      .catch(() => {
        setAuthToken(null);
        router.replace('/login');
      });
  }, [pathname, router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink/45">Opening Zenrth…</div>;
  }
  return <>{children}</>;
}

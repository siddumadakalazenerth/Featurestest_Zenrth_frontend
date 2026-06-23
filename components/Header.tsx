'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-hairline bg-surface/90 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display text-lg font-bold tracking-tight group-hover:text-analysis transition-colors">
            Zenrth
          </span>
        </Link>
      </div>
    </header>
  );
}

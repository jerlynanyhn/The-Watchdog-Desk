'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSyncExternalStore, type ReactNode } from 'react';
import { User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { btn } from '@/lib/ui';

const TABS = [
  { href: '/newsroom', label: 'Newsroom' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/leaderboard', label: 'Leaderboard & Duels' },
];

const subscribe = () => () => {};
function dateText() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();
}

// Today's date, generated in the browser (empty on the server, so no hydration mismatch)
export function TodayDate() {
  const text = useSyncExternalStore(subscribe, dateText, () => '');
  return <time className="font-sans text-xs">{text}</time>;
}

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await supabase.auth.signOut();
    router.replace('/');
  }
  return (
    <button onClick={logout} className={btn('outline', '!min-h-9 !px-3 !py-1 !text-xs')}>
      Log Out
    </button>
  );
}

// `actions` = slot for Kate's notification bell and How to Play button
export function NavBar({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="flex items-center justify-between gap-3 border-y border-ink"
    >
      <ul className="flex min-w-0 flex-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-3 py-3 font-display text-sm font-bold uppercase tracking-wide sm:px-4 sm:text-base ${
                  active ? 'bg-ink text-paper' : 'hover:bg-card'
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex shrink-0 items-center gap-2 py-1.5">
        {actions}
        <Link
          href="/profile"
          aria-label="My Press ID"
          className="grid h-10 w-10 place-items-center border-2 border-ink hover:bg-card"
        >
          <User className="h-5 w-5" />
        </Link>
      </div>
    </nav>
  );
}
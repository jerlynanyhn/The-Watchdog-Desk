import type { ReactNode } from 'react';
import { LogoutButton, NavBar, TodayDate } from './NavBar';

const TICKER = [
  'Stop the presses',
  'Check the spelling twice',
  '120 seconds to print',
  'Clean copy only',
  'Accommodate has two M’s',
  'Fact-check',
];

function TickerRow() {
  return (
    <>
      {TICKER.map((t) => (
        <span key={t} className="mx-6 whitespace-nowrap font-mono text-[11px] uppercase">
          ★ {t}
        </span>
      ))}
    </>
  );
}

export function PaperPage({
  children,
  nav = true,
  navActions,
  topRight,
}: {
  children: ReactNode;
  nav?: boolean; // false on /, gameplay, reward
  navActions?: ReactNode; // Kate's bell + How to Play
  topRight?: ReactNode; // replaces the Log Out button (e.g. MENU/ESC in gameplay)
}) {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8">
      <div className="relative mx-auto max-w-6xl">
        {/* stacked page edges, like the Figma */}
        <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-1 border-2 border-ink bg-paper" />
        <div aria-hidden className="absolute inset-0 translate-x-1 translate-y-0.5 border-2 border-ink bg-paper" />

        <div className="relative border-2 border-ink bg-paper px-4 pb-10 pt-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-3 pb-2">
            <TodayDate />
            {topRight ?? (nav ? <LogoutButton /> : null)}
          </div>

          <header className="border-y-[3px] border-double border-ink py-2 text-center">
            <p className="font-serif text-[11px] tracking-[0.25em] sm:text-sm">
              The Watchdog Desk • Metro Malinam
            </p>
            <p className="font-masthead text-4xl leading-tight sm:text-6xl lg:text-7xl">
              The Boolean Bulletin
            </p>
          </header>

          <div className="ticker overflow-hidden border-b border-ink py-1.5" aria-hidden>
            <div className="ticker-track">
              <TickerRow />
              <TickerRow />
            </div>
          </div>

          {nav && <NavBar actions={navActions} />}

          <main className="pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
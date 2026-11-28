'use client';

import Image from 'next/image';
import { useState } from 'react';

export const PRESET_AVATARS = {
  Male: [
    { id: 'M1', label: 'Blond reporter', badge: 'M1', bg: 'bg-[#1E4D3B] text-[#F2EDE1]' },
    { id: 'M2', label: 'Curly-haired fact-checker', badge: 'M2', bg: 'bg-[#2C251E] text-[#F2EDE1]' },
    { id: 'M3', label: 'Bespectacled columnist', badge: 'M3', bg: 'bg-[#932A13] text-[#F2EDE1]' },
  ],
  Female: [
    { id: 'F1', label: 'Ponytail reporter', badge: 'F1', bg: 'bg-[#932A13] text-[#F2EDE1]' },
    { id: 'F2', label: 'Bespectacled fact-checker', badge: 'F2', bg: 'bg-[#1E4D3B] text-[#F2EDE1]' },
    { id: 'F3', label: 'Braided columnist', badge: 'F3', bg: 'bg-[#2C251E] text-[#F2EDE1]' },
  ],
};

const SIZES = { sm: 36, md: 48, lg: 72, xl: 112 } as const;

export function AvatarPortrait({
  avatarId,
  size = 'md',
}: {
  avatarId: string;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  const all = [...PRESET_AVATARS.Male, ...PRESET_AVATARS.Female];
  const found = all.find((a) => a.id === avatarId) || PRESET_AVATARS.Male[0];
  const px = SIZES[size];

  if (failed) {
    // fallback if the image file is missing
    return (
      <div
        style={{ width: px, height: px }}
        className={`${found.bg} flex shrink-0 select-none items-center justify-center rounded-full border-2 border-ink font-mono text-xs font-bold`}
        title={found.label}
      >
        {found.badge}
      </div>
    );
  }

  return (
    <Image
      src={`/avatars/${found.id}.webp`}
      alt={found.label}
      width={px}
      height={px}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full border-2 border-stroke bg-row object-cover"
    />
  );
}
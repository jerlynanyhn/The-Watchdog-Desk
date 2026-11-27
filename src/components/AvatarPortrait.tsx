'use client';

export const PRESET_AVATARS = {
  Male: [
    { id: 'M1', label: 'Investigative Reporter', badge: 'M1', bg: 'bg-[#1E4D3B] text-[#F2EDE1]' },
    { id: 'M2', label: 'Fact-Checker', badge: 'M2', bg: 'bg-[#2C251E] text-[#F2EDE1]' },
    { id: 'M3', label: 'Layout Specialist', badge: 'M3', bg: 'bg-[#932A13] text-[#F2EDE1]' },
  ],
  Female: [
    { id: 'F1', label: 'Investigative Reporter', badge: 'F1', bg: 'bg-[#932A13] text-[#F2EDE1]' },
    { id: 'F2', label: 'Fact-Checker', badge: 'F2', bg: 'bg-[#1E4D3B] text-[#F2EDE1]' },
    { id: 'F3', label: 'Columnist', badge: 'F3', bg: 'bg-[#2C251E] text-[#F2EDE1]' },
  ],
};

export function AvatarPortrait({
  avatarId,
  size = 'md',
}: {
  avatarId: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const all = [...PRESET_AVATARS.Male, ...PRESET_AVATARS.Female];
  const found = all.find((a) => a.id === avatarId) || PRESET_AVATARS.Male[0];

  const sizeClasses =
    size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'lg'
      ? 'w-16 h-16 text-lg'
      : 'w-12 h-12 text-sm';

  return (
    <div
      className={`${sizeClasses} ${found.bg} border-2 border-[#101311] font-mono font-bold flex items-center justify-center shrink-0 select-none`}
      title={found.label}
    >
      {found.badge}
    </div>
  );
}
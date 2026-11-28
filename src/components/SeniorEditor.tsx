export type EditorMood = 'neutral' | 'happy' | 'angry';
export type EditorName = 'glasses' | 'woman' | 'bald';

export function SeniorEditor({
  editor = 'glasses',
  mood = 'neutral',
  className = '',
}: {
  editor?: EditorName;
  mood?: EditorMood;
  className?: string;
}) {
  return (
    <picture>
      {/* users who turned on "reduce motion" get the still image */}
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet={`/editors/${editor}-still.png`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/editors/${editor}-${mood}.webp`}
        alt={`Senior Desk Editor looking ${mood}`}
        className={`border-2 border-stroke bg-row object-cover ${className}`}
      />
    </picture>
  );
}
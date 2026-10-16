import { useState } from 'react';
import type { MediaItem } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { Illustration } from './Illustration';
import { cn } from './cn';

/** Shows a real photo when provided and loadable; otherwise the bundled illustration. Never a broken image. */
export function SmartImage({ media, seed, className, decorative }: { media: MediaItem; seed?: number; className?: string; decorative?: boolean }) {
  const { l } = useLocale();
  const [failed, setFailed] = useState(false);
  const label = decorative ? undefined : l(media.alt);
  if (media.url && !failed) {
    return (
      <img
        src={media.url}
        alt={label ?? ''}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('object-cover', className)}
      />
    );
  }
  return <Illustration motif={media.motif} seed={seed} label={label} className={className} />;
}

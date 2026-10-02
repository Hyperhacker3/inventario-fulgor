import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { isStoredImage, resolveImage } from '../shared/images';
import type { ImageVariant } from '../shared/imagePaths';

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> { source: string; variant?: ImageVariant }
export function ItemImage({ source, alt, variant = 'full', ...props }: Props) {
  const [resolved, setResolved] = useState<{ source: string; variant: ImageVariant; url: string; fallback?: boolean } | null>(null);
  useEffect(() => {
    if (!isStoredImage(source)) return;
    let active = true;
    resolveImage(source, variant).then(value => { if (active) setResolved({ source, variant, url: value }); }).catch(() => { if (active) setResolved({ source, variant, url: '' }); });
    return () => { active = false; };
  }, [source, variant]);
  const url = isStoredImage(source) ? (resolved?.source === source && resolved.variant === variant ? resolved.url : '') : source;
  if (!url) return <span aria-label={alt} className={`${props.className || ''} inline-flex items-center justify-center bg-[#f8fafc] text-[#94a3b8]`}>Sin foto</span>;
  return <img {...props} onError={event => {
    props.onError?.(event);
    if (variant === 'thumbnail' && isStoredImage(source) && !resolved?.fallback) {
      resolveImage(source).then(url => setResolved(current => current?.source === source && current.variant === variant ? { source, variant, url, fallback: true } : current))
        .catch(() => setResolved(current => current?.source === source && current.variant === variant ? { source, variant, url: '', fallback: true } : current));
    }
  }} style={{ ...props.style, objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }} src={url} alt={alt} loading={props.loading || 'lazy'} />;
}

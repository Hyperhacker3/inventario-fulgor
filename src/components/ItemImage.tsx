import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { isStoredImage, resolveImage } from '../shared/images';
import type { CategoriaElemento } from '../types';
import { ItemPhotoPlaceholder } from './ItemPhotoPlaceholder';

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> { source: string; category?: CategoriaElemento; compact?: boolean }
export function ItemImage({ source, alt, category, compact, ...props }: Props) {
  const [resolved, setResolved] = useState<{ source: string; url: string } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  useEffect(() => {
    if (!isStoredImage(source)) return;
    let active = true;
    resolveImage(source).then(value => { if (active) setResolved({ source, url: value }); }).catch(() => { if (active) setResolved({ source, url: '' }); });
    return () => { active = false; };
  }, [source]);
  const url = isStoredImage(source) ? (resolved?.source === source ? resolved.url : '') : source;
  if (!url || failedSource === source) return <ItemPhotoPlaceholder category={category} compact={compact} className={props.className} />;
  return <img {...props} onError={event => { setFailedSource(source); props.onError?.(event); }} style={{ ...props.style, objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }} src={url} alt={alt} loading={props.loading || 'lazy'} />;
}

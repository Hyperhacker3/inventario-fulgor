import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { isStoredImage, resolveImage } from '../shared/images';

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> { source: string }
export function ItemImage({ source, alt, ...props }: Props) {
  const [resolved, setResolved] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!isStoredImage(source)) return;
    let active = true;
    resolveImage(source).then(value => { if (active) setResolved({ source, url: value }); }).catch(() => { if (active) setResolved({ source, url: '' }); });
    return () => { active = false; };
  }, [source]);
  const url = isStoredImage(source) ? (resolved?.source === source ? resolved.url : '') : source;
  if (!url) return <span aria-label={alt} className={`${props.className || ''} inline-flex items-center justify-center bg-[#f8fafc] text-[#94a3b8]`}>Sin foto</span>;
  return <img {...props} src={url} alt={alt} loading={props.loading || 'lazy'} />;
}

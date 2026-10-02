export type ImageVariant = 'full' | 'thumbnail';
export function imagePath(path: string, variant: ImageVariant) {
  return variant === 'thumbnail' && path.endsWith('/full.jpg') ? path.replace(/\/full\.jpg$/, '/thumb.jpg') : path;
}
export function imagePaths(path: string) {
  return [...new Set([path, imagePath(path, 'thumbnail')])];
}

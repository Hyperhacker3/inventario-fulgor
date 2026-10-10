export const PRODUCT_IMAGE_SIZE = 1200;
export type PhotoMime = 'image/webp' | 'image/jpeg';

export function photoExtension(image: Blob) {
  if (image.type === 'image/webp') return 'webp';
  if (image.type === 'image/jpeg') return 'jpg';
  throw new Error('La foto procesada debe ser WebP o JPG.');
}

// Unsupported canvas encoders can silently return PNG. Never label it as WebP.
export async function encodePhoto(canvas: HTMLCanvasElement, type: PhotoMime = 'image/webp', quality = 0.82): Promise<Blob> {
  const attempt = (mime: PhotoMime) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, quality));
  const image = await attempt(type);
  if (image?.type === type) return image;
  if (type === 'image/webp') {
    const jpeg = await attempt('image/jpeg');
    if (jpeg?.type === 'image/jpeg') return jpeg;
  }
  throw new Error('No se pudo comprimir la foto.');
}

export function webpNotAllowed(error: { message: string; statusCode?: string | number }) {
  return String(error.statusCode) === '415' || /mime.*(?:not supported|not allowed|unsupported)/i.test(error.message);
}

import { MAX_COMPANY_LOGO_LENGTH } from '../domain/company';

export async function prepareCompanyLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Elija un archivo PNG, JPG o WebP de hasta 5 MB.');
  }
  let image: ImageBitmap;
  try { image = await createImageBitmap(file); }
  catch { throw new Error('No se pudo leer el logo. Elija otra imagen.'); }
  try {
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    if (!context || !image.width || !image.height) throw new Error('No se pudo preparar el logo.');
    let ratio = Math.min(1, 480 / image.width, 240 / image.height);
    for (let attempt = 0; attempt < 4; attempt++, ratio *= .7) {
      canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/png');
      if (data.length <= MAX_COMPANY_LOGO_LENGTH) return data;
    }
    throw new Error('El logo es demasiado grande. Elija una imagen más sencilla.');
  } finally { image.close(); }
}

export function evidenceSize(width: number, height: number, maxSize = 600) {
  if (width <= 0 || height <= 0) throw new Error('La imagen no tiene dimensiones válidas.');
  const scale = Math.min(1, maxSize / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
export function evidenceCanvas(source: CanvasImageSource, width: number, height: number, mirror = false) {
  const size = evidenceSize(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo procesar la foto.');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, size.width, size.height);
  if (mirror) { context.translate(size.width, 0); context.scale(-1, 1); }
  context.drawImage(source, 0, 0, width, height, 0, 0, size.width, size.height);
  return canvas;
}

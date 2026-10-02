export function squareCrop(width: number, height: number, maxSize = 1200) {
  if (width <= 0 || height <= 0) throw new Error('La imagen no tiene dimensiones válidas.');
  const side = Math.min(width, height);
  return { x: (width - side) / 2, y: (height - side) / 2, side, size: Math.min(side, maxSize) };
}

export function squareCanvas(source: CanvasImageSource, width: number, height: number, maxSize = 1200, mirror = false) {
  const crop = squareCrop(width, height, maxSize);
  const canvas = document.createElement('canvas');
  canvas.width = crop.size;
  canvas.height = crop.size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo procesar la imagen.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, crop.size, crop.size);
  if (mirror) { context.translate(crop.size, 0); context.scale(-1, 1); }
  context.drawImage(source, crop.x, crop.y, crop.side, crop.side, 0, 0, crop.size, crop.size);
  return canvas;
}

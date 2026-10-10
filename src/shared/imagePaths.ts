// Preserve cleanup of legacy JPEG thumbnails; new photos have only one file.
export function imagePaths(path: string) {
  return /\/full\.jpg$/.test(path) ? [path, path.replace('/full.jpg', '/thumb.jpg')] : [path];
}

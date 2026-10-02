// Include old thumbnails only when deleting a replaced photo.
export function imagePaths(path: string) {
  return path.endsWith('/full.jpg') ? [path, path.replace(/\/full\.jpg$/, '/thumb.jpg')] : [path];
}

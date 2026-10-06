export async function loadStartupFonts(fonts: Pick<FontFaceSet, 'load' | 'ready'>) {
  const faces = await Promise.all([
    fonts.load('400 16px "Hanken Grotesk"', 'Inventario turpial áñ'),
    fonts.load('400 16px "JetBrains Mono"', 'EST001'),
    fonts.load('400 24px "Material Symbols Outlined"', 'inventory_2'),
  ]);
  if (faces.some(face => !face.length)) throw new Error('No se pudieron cargar las fuentes de la aplicación.');
  await fonts.ready;
}
export async function loadStartupAssets() {
  const logo = new Image();
  logo.src = '/logo-completo.png';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all([loadStartupFonts(document.fonts), logo.decode()]),
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('La carga inicial tardó demasiado.')), 20_000); }),
    ]);
    document.documentElement.dataset.iconsReady = 'true';
  } finally { clearTimeout(timer); }
}

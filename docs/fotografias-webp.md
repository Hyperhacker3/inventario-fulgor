# Fotografías nuevas en WebP

Decisión del usuario, 10 de octubre de 2026: conservar las fotografías existentes y guardar las nuevas en WebP, usando el mismo archivo en tarjetas y ficha. No crear miniaturas de momento.

## Comportamiento

- Productos: recorte cuadrado centrado de hasta 1200 × 1200 píxeles. Salidas: encuadre completo y hasta 1200 píxeles en el lado mayor. No se amplían imágenes pequeñas.
- WebP se codifica con calidad 0,82. El peso final depende del contenido; el aumento de resolución no garantiza archivos menores que los JPG anteriores de 600 píxeles.
- Archivos JPG y referencias anteriores permanecen intactos, incluso al guardar una edición. No hay conversión masiva ni nuevas miniaturas. Añadir una foto nueva a un producto existente sí usa el nuevo procesamiento.
- El archivo original se carga en tarjetas, detalle y galería. Se conservan los enlaces temporales, almacenamiento privado, fotos múltiples y límite de entrada de 8 MB.
- La cámara solicita mayor resolución cuando el dispositivo la permite; su vista previa se mantiene en PNG en memoria hasta la conversión al guardar. La preferencia de lente y las capturas consecutivas permanecen.
- Si el navegador no codifica WebP o Supabase rechaza explícitamente ese MIME, se guarda JPEG. No se reintenta en otro formato un error de permisos o cuota. La extensión coincide siempre con el MIME real.
- Las fotos de salida mantienen carpeta por cuenta y solicitud, transacción, limpieza y referencias originales al reintentar. JPG y WebP pueden coexistir en la misma remisión. El PDF sigue separado.

## Activación en Supabase

El usuario ejecuta desde su cuenta el archivo completo [20261010000100_webp_photos.sql](../supabase/migrations/20261010000100_webp_photos.sql) en el SQL Editor, después de las migraciones anteriores. No basta publicar el frontend para dar por aplicada la migración.

El bloque transaccional comprueba que los dos buckets existen y son privados. Añade WebP y JPEG a los MIME permitidos conservando los otros formatos, límites y privacidad. Si la lista MIME es NULL, ya admite ambos y permanece NULL. Actualiza únicamente la validación de extensiones en la política de subida de salidas y su función interna; conserva propietario, roles, solicitud y permisos de ejecución de la RPC. No modifica filas de inventario, cantidades, referencias de fotos ni archivos existentes. Puede ejecutarse de nuevo.

Hasta aplicar el SQL, los buckets que solo admiten JPEG hacen que la aplicación guarde JPG automáticamente. No se cambia la validación de dueño ni se omiten permisos para activar el formato.

## Comprobación

Las pruebas locales cubren recorte y límites, MIME y extensión, compatibilidad del navegador y Storage, conservación de referencias existentes, un único archivo por foto, reintentos de salidas y la migración con PGlite. También comprueban que stock, privacidad, formatos previos y acceso a las RPC permanecen; admiten registros mixtos JPG/WebP y verifican la limpieza de fotos de productos.

No se utiliza automatización de navegador. Queda pendiente comprobar en Supabase real la activación y, por el usuario, cámara, calidad, tamaño de archivos y fluidez en móvil, tablet y PC. Las pruebas simuladas no miden rendimiento físico ni resolución entregada por cada cámara.

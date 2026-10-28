# Cambiar la unidad de medida de un producto

Actualizado el 28 de octubre de 2026.

Abra el producto → Editar → Unidad de medida. El selector comparte las opciones de Entradas: UND, MTS, RLL, KG, KL, PAR/PARES, JGO/JUEGO, CAJA y COSTALES, y conserva una unidad anterior que no figure en el catálogo. Las equivalencias de pares/juegos se normalizan con la función existente.

Peso y valor muestran la unidad seleccionada mientras se edita. Cambiar la unidad conserva las cantidades numéricas, el peso y el precio registrados: no realiza conversiones automáticas. Cancelar descarta el borrador; un error lo conserva para reintentar. El selector se bloquea durante operaciones pendientes y la edición sigue disponible solo para administración y productos activos.

Al guardar se actualiza la columna unidad, sin enviar cantidad. No se recalculan ni se reescriben unidades de movimientos, remisiones o informes anteriores. Las operaciones futuras consultan la unidad vigente.

## Activación en Supabase

El usuario debe ejecutar completo [20261028000200_edit_item_units.sql](../supabase/migrations/20261028000200_edit_item_units.sql) desde el SQL Editor del proyecto Supabase, después de las migraciones de seguridad existentes.

La migración repetible concede UPDATE exclusivamente a la columna unidad, manteniendo la política RLS de administración. No habilita la modificación directa de cantidad. Valida unidades modificadas (no vacías, hasta 40 caracteres), las guarda en mayúsculas y añade inventory_item_unit_edit_ready(). No transforma filas existentes, no importa productos ni modifica stock.

La aplicación comprueba disponibilidad solo al guardar una unidad distinta. Si falta activar la migración muestra un mensaje y conserva el formulario; editar otros datos sigue funcionando. La comprobación no sustituye la ejecución del SQL por el usuario.

Estado: migración ensayada localmente; aplicación en Supabase real pendiente del usuario. La prueba local no confirma el estado de producción.

## Comprobaciones

Verificación de edición de unidad y dos líneas del PDF (28 de octubre): typecheck, lint, 207 pruebas unitarias y 40 de integración (247), y build correctos con Node 22.23.3 / pnpm 11.19.0. Se añaden dos pruebas DOM de unidad y una prueba de permisos/cantidades/copias en PGlite. La prueba inicial detectó la falta del permiso de columna; la migración específica se ensayó de forma repetible, sin alterar datos existentes ni permitir cambios directos de cantidad. SQL de unidad en producción pendiente del usuario. Producto y Ubicación se limitan a dos líneas de 16 px dentro de la fila de 36 px; sin pruebas geométricas ni automatización de navegador, revisión visual con el usuario.

Las pruebas DOM cubren la unidad actual, selección, etiquetas de peso/valor, bloqueo y doble guardado, borradores fallidos, cancelación, unidades anteriores y ausencia de cambios de cantidad en el envío. PGlite comprueba permiso específico, RLS, repetición de migración sin alterar productos, rechazo de unidades inválidas, ausencia de conversión de cantidades, conservación de documentos/reintentos anteriores y uso de la unidad vigente en salidas nuevas. La revisión visual en dispositivos corresponde al usuario; no se utiliza automatización de navegador.

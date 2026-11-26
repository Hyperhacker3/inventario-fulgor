# Hoja de vida y mantenimiento de herramientas

Actualizado: 26 de noviembre de 2026.

## Uso

1. Los productos de las categorías **HERRAMIENTAS ELÉCTRICAS** y **HERRAMIENTAS A COMBUSTIÓN** muestran el icono **Ver hoja de vida** junto a las acciones de la ficha (color turquesa, plano en reposo, elevado en hover y hundido mientras la ventana está abierta). Las demás categorías no lo muestran. Para incluir una herramienta, asígnele una de esas categorías al editarla o con la edición en grupo; la migración no cambia la categoría de ningún producto.
2. La ventana se abre encima del detalle, que queda inerte debajo. Muestra los datos del producto (tipo, nombre, código, marca, categoría, estado, stock y valor por unidad) y tres secciones:
   - **Identificación:** modelo y número de serie.
   - **Adquisición:** fecha de adquisición, proveedor, factura o documento de compra y garantía hasta.
   - **Datos técnicos:** eléctricas — potencia, voltaje, corriente, frecuencia, velocidad (RPM), alimentación y batería; combustión — tipo de motor, cilindrada, potencia, combustible, capacidad del tanque, mezcla aceite-combustible, aceite de motor y arranque.
3. **Editar datos** (solo administración) abre el formulario. Los campos vacíos se guardan como sin registrar. Si la herramienta cambió de tipo, los datos técnicos del otro tipo se conservan sin mostrarse.
4. **Registrar mantenimiento** (administración y operadores, solo productos activos): fecha (hoy o anterior, hora de Colombia), tipo PREVENTIVO / CORRECTIVO / INSPECCIÓN, trabajo realizado, realizado por, repuestos o insumos, costo COP (hasta dos decimales), horas de uso (un decimal), próximo mantenimiento (igual o posterior a la fecha), observaciones y hasta 12 fotos tomadas con la cámara o subidas.
5. El historial se ordena del más reciente al más antiguo, en páginas de 10, con fotos que se abren en una pestaña nueva. Un aviso verde indica el próximo mantenimiento y uno rojo indica que está vencido, según el registro más reciente.

La consulta está disponible para administración, operadores y consulta. No modifica stock, movimientos, remisiones, informes ni documentos.

## Garantías

- **Hoja de vida con versión:** `save_tool_life_record` solo acepta administración y compara la versión leída. Si otra cuenta guardó antes, se rechaza con «La hoja de vida cambió en otra sesión» y el borrador queda en pantalla. Repetir los mismos datos no crea otra versión. Supabase valida longitudes (200/2000), fechas reales y año entre 1900 y 2100, y rechaza claves ajenas a la hoja de vida.
- **Mantenimientos inmutables:** `register_tool_maintenance` admite administración y operadores. La tabla no tiene permisos de INSERT/UPDATE/DELETE directos; solo lectura con RLS para los tres roles. Cada registro guarda copia del código y nombre del producto y no tiene clave foránea, por lo que se conserva si después se elimina un producto archivado.
- **Reintentos:** cada registro usa un UUID de solicitud. Un error incierto reutiliza el UUID y las mismas fotos; Supabase devuelve el registro confirmado sin duplicarlo. Un UUID con otros datos u otra cuenta se rechaza.
- **Fotos privadas:** bucket `maintenance-images` privado, JPG/WebP de hasta 8 MB en la carpeta `<cuenta>/<solicitud>/`. Se procesan como el registro fotográfico de salidas (foto completa, WebP con alternativa JPG). Se leen con URL firmada; las fotos sin registro solo las ve y borra su autor, y una foto ya vinculada no se puede borrar. Supabase comprueba que cada foto esté subida antes de confirmar.
- **Categorías:** se crean HERRAMIENTAS ELÉCTRICAS y HERRAMIENTAS A COMBUSTIÓN con código automático de tres letras. Si ya existe una con ese nombre (sin distinguir acentos ni mayúsculas), se reutiliza y se reactiva conservando su ID, código y productos.

## Activación

El usuario debe ejecutar completo, desde su cuenta de Supabase, `supabase/migrations/20261126000200_tool_life_records.sql`, después de `20261029000100_automatic_location_category_codes.sql` y `20261010000100_webp_photos.sql`. Es repetible: no duplica categorías, no borra registros y no modifica productos, stock ni documentos.

Hasta ejecutarla, ninguna categoría está marcada como herramienta y el botón no aparece. Si se marcara una categoría sin las tablas, la ventana muestra «Falta activar la hoja de vida en Supabase…» sin escribir nada.

Comprobación posterior sugerida (solo lectura):

```sql
SELECT id, codigo, nombre, activo, hoja_vida_tipo FROM public.inventario_categorias WHERE hoja_vida_tipo IS NOT NULL;
SELECT to_regclass('public.inventario_hojas_vida') AS hojas, to_regclass('public.inventario_mantenimientos') AS mantenimientos;
SELECT id, public FROM storage.buckets WHERE id = 'maintenance-images';
```

## Comprobaciones

PGlite comprueba la migración repetida, reutilización de una categoría existente con el mismo nombre, código automático de la nueva, permisos por rol (anon sin acceso, consulta solo lectura, operador sin editar la hoja de vida), conflicto de versión, idempotencia del guardado, validaciones de fechas/costos/horas/tipo, fotos de otra cuenta o solicitud, foto no subida, reintento por UUID sin duplicar, rechazo de un UUID con otros datos y conservación del historial al eliminar una herramienta archivada. Las pruebas DOM cubren el botón solo en herramientas, la ventana encima de la ficha, campos técnicos por tipo, roles de lectura sin acciones, edición con versión y borrador conservado ante conflicto, validación del formulario de mantenimiento, reutilización del UUID tras un error incierto, doble pulsación sin doble envío, historial actualizado con fotos y aviso de mantenimiento vencido. No se probó geometría visual, cámara física, subida real a Storage ni la ejecución en Supabase de producción.

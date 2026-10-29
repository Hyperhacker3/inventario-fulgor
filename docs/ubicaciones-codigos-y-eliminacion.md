# Ubicaciones: códigos y eliminación

Actualizado el 29 de octubre de 2026. La instrucción posterior del usuario conserva todos los números anteriores: solo cambia las letras y el formato, sin renumerar ubicaciones repetidas en padres distintos.

## Qué cambia

- Almacenes usan ALM, estanterías EST, niveles NIV y cajas CAJ. Ejemplos: CON-05 → ALM005, EST-A01 → EST001, NIV-007 → NIV007 y CAJA-005 → CAJ005. Se toma el grupo numérico final del primer bloque de código, antes de descripciones separadas por espacios. Por ejemplo, EST-001 SIN ESTANTERÍA → EST001 y CAJA-005 ZONA 99 → CAJ005, conservando 001 y 005 e ignorando los números de la descripción. Solo se completa su representación hasta un mínimo de tres cifras. Después de 999 se conserva el ancho necesario.
- No se cambian IDs, nombres, padres, productos, cantidades, fotos, movimientos, remisiones ni informes guardados. Las cajas de prueba no se eliminan ni se reubican automáticamente.
- Un número anterior puede repetirse en niveles distintos para cajas, estanterías distintas para niveles o almacenes distintos para estanterías. Se conservan ambas ubicaciones. El consecutivo nuevo sigue siendo global por tipo y continúa sobre el mayor número real o previamente reservado, aunque después se elimine una ubicación.
- Si dos códigos coincidirían en el mismo padre, o falta un número compatible en el bloque inicial del código, la normalización se detiene y revierte todos sus cambios. Informa códigos/IDs para revisar. No inventa ni cambia números para resolverlo.
- Caja no muestra ni pide estado de ocupación en el selector, tarjetas o edición. El campo antiguo de base de datos se conserva por compatibilidad; el frontend no lo envía al crear ni editar cajas.
- En Administración, cada tarjeta incorpora Eliminar para administración. La confirmación identifica código, nombre y ubicación. Supabase permite borrar únicamente ubicaciones sin productos asignados (también comprueba archivados) y sin hijos. Eliminar una caja vacía permite después eliminar su nivel vacío, estantería vacía y almacén vacío. Nunca hay eliminación en cascada.

## Activación desde la cuenta del usuario

Corrección del error EST-001 SIN ESTANTERÍA: vuelva a copiar y ejecutar completo el archivo de normalización actualizado (paso 3). La ejecución fallida se revierte; no hay que repetir importaciones ni renumerar datos. La tabla temporal del plan ahora declara RLS explícitamente. La lectura de códigos descritos también se actualizó en la auditoría y en el SQL de eliminación para preservar los máximos al borrar un código antiguo antes de normalizar.

El agente no tiene una sesión autenticada para consultar ni modificar el Supabase real. Las pruebas locales no confirman la aplicación de estas migraciones ni los números actuales de producción.

1. Si todavía falta, ejecute completo [20261029000100_automatic_location_category_codes.sql](../supabase/migrations/20261029000100_automatic_location_category_codes.sql). No repita importaciones ni las migraciones anteriores que ya estén aplicadas.
2. Ejecute completo [20261029000300_delete_empty_locations.sql](../supabase/migrations/20261029000300_delete_empty_locations.sql). Esta migración es independiente de la normalización y habilita Eliminar, también para retirar una ubicación de prueba que impida normalizar.
3. Ejecute completo [20261029000200_normalize_location_codes.sql](../supabase/migrations/20261029000200_normalize_location_codes.sql). Analiza las cuatro tablas reales, normaliza solo sus códigos y sincroniza sus contadores en una transacción. El resultado muestra cantidad de ubicaciones, códigos actualizados, mayor número actual, último reservado y siguiente código por tipo.
4. Recargue la aplicación. Revise los códigos y las nuevas opciones de Administración en móvil, tablet y PC. Los errores de eliminación conservan la confirmación para corregir o reintentar.

Si necesita revisar antes los datos, ejecute [audit_location_codes_readonly.sql](../supabase/audit_location_codes_readonly.sql): solo lee las cuatro tablas y muestra cada código actual, número, propuesta, padre, máximo por tipo y posibles conflictos. No elimina ni modifica nada. Ante un error, use este resultado para decidir manualmente qué ubicación de prueba eliminar o reubicar; no cambie números automáticamente.

## Conservación y reintentos

Ambas migraciones son repetibles. El bloqueo de edición de código se suspende únicamente dentro de la transacción administrativa de normalización y se restaura antes de terminar. Una tabla privada, `inventario_ubicacion_codigos_normalizados`, conserva las equivalencias de códigos anteriores/nuevos por ID y no es accesible al frontend.

Las solicitudes de creación anteriores mantienen actor, UUID y payload. Al reintentar devuelven la ubicación actual del mismo ID, con su código normalizado; no recuperan un código anterior de la respuesta almacenada. Si la ubicación se eliminó, el reintento de creación informa que ya no está disponible, sin recrearla. Repetir una eliminación confirmada del mismo ID devuelve confirmación y no borra otra ubicación.

La RPC de eliminación valida rol y tipo, bloquea la ubicación y comprueba sus referencias en Supabase, sin depender del listado paginado del frontend. No se concede DELETE directo a usuarios autenticados. El contador conserva como mínimo los números vistos antes de eliminar y no retrocede. Documentos históricos conservan sus textos anteriores.

## Comprobaciones

Corrección verificada del código con descripción (29 de octubre): typecheck, lint, 210 pruebas unitarias y 49 de integración (259), y build correctos con Node 22.23.3 / pnpm 11.19.0. La regresión reproduce EST-001 SIN ESTANTERÍA y códigos de los cuatro tipos con números en la descripción; conserva el número del bloque inicial, nombres y productos, y prueba repetición de migración y siguientes consecutivos. Las comprobaciones anteriores de rollback, reintentos y eliminación también pasan con el nuevo criterio. La tabla temporal declara RLS explícito. No hay cambios de interfaz ni ejecución de SQL en Supabase real. El usuario debe volver a copiar y ejecutar completo el archivo de normalización actualizado.

Verificación del 29 de octubre: typecheck, lint, 210 pruebas unitarias y 48 de integración (258), y build correctos con Node 22.23.3 / pnpm 11.19.0. Se actualizan las pruebas existentes de cajas/formularios y se añade una prueba DOM de eliminación para los cuatro tipos. Cinco pruebas nuevas de PGlite verifican números y referencias intactos, máximos, códigos repetidos en padres distintos, rollback, copias históricas, reintentos, permisos, dependencias y no reutilización tras eliminar un código antiguo. La primera comprobación SQL detectó que las etiquetas temporales de niveles deben estar en mayúsculas; se corrigió y pasó la suite completa. Sin SQL en Supabase real ni automatización de navegador; activación y revisión visual pendientes del usuario.

Las pruebas de PGlite comprueban conservación de todos los números, ubicaciones repetidas en padres distintos, máximos reales, valores superiores a 999, migración repetible, rollback ante conflictos, códigos bloqueados, reintentos con códigos actuales, permisos y eliminación sin cascadas ni reutilización. Los productos y sus referencias, historial, remisiones e informes permanecen intactos durante la normalización.

Las pruebas DOM comprueban etiquetas de cajas sin ocupación, identificación de la ubicación al eliminar, confirmación/cancelación, errores, guardado único, bloqueos mientras está pendiente, foco y ausencia de la acción para roles de lectura. No prueban concurrencia física, geometría o dispositivos reales. La activación de SQL y la revisión visual corresponden al usuario; no se usa computer use ni automatización de navegador.

# Daños por estado y productos para reparar

Actualizado el 29 de octubre de 2026, según la decisión del usuario: «Todas las unidades del producto deben contar como dañadas según su etiqueta».

Antes, Productos con daños y los valores dañados solo usaban Unidades dañadas, por lo que un producto marcado MALO con ese campo en cero no aparecía en el resumen. Ahora MALO, EN REPARACIÓN y PARA REPARAR consideran dañado todo el stock del producto. DAÑADO/DANADO, MAL ESTADO y OBSOLETO se normalizan como MALO; REPARACION se normaliza como EN REPARACIÓN. No se suman el daño por estado y el daño parcial: cada unidad se cuenta una vez.

BUENO, REGULAR, RETAZOS y estados desconocidos mantienen las unidades dañadas declaradas, limitadas al stock. No se inventan cantidades, pesos o precios. Los productos archivados se excluyen del resumen. Los registros pendientes de conteo conservan sus etiquetas y cuentan como referencias, pero sus cantidades y valores no se suman hasta verificarse. Precio sin definir continúa en cero COP.

## PARA REPARAR

Se añade al selector de estado de Entradas y edición y al filtro Estado del material. El usuario la asigna manualmente a las herramientas que necesitan reparación; no se aplica a todas las herramientas ni depende del nombre de la categoría. EN REPARACIÓN sigue disponible para distinguir las que ya están en proceso.

Inicio muestra Productos para reparar: número de referencias activas con PARA REPARAR dentro del almacén seleccionado, independientemente de cuántas unidades tenga cada una. También forman parte de Productos con daños. Para verlas, abra Inventario y seleccione PARA REPARAR en Estado del material.

El editor muestra automáticamente el stock completo en Unidades dañadas, como campo de solo lectura, cuando la condición aplica daño total. El conteo manual anterior permanece guardado y vuelve a mostrarse al cambiar a una condición de daño parcial. Cambiar la etiqueta no modifica existencias, precios ni documentos anteriores.

## Cálculos y salidas

Resumen, existencias por unidad, valor del material dañado, porcentaje, valores por almacén/estantería/nivel/caja y nuevas copias de informes comparten la misma regla. Las unidades disponibles restan el daño efectivo; un producto en esos tres estados no admite nuevas salidas. El stock total y su valor siguen incluyendo todo el material. Las unidades de medida diferentes se calculan por separado.

El frontend aplica estos cálculos sin SQL adicional. Para proteger también las nuevas salidas en el servidor, el usuario debe ejecutar completo [20261029000500_condition_damage_policy.sql](../supabase/migrations/20261029000500_condition_damage_policy.sql) desde su cuenta de Supabase, después de las migraciones anteriores.

La migración actualiza la comprobación de disponibilidad dentro de la transacción de salida, con los bloqueos de filas existentes. No cambia productos ni cantidades dañadas guardadas, movimientos, remisiones, informes o contadores. Los reintentos de salidas ya confirmadas conservan sus documentos originales incluso si el producto cambió de estado. Mantiene los permisos de las RPC existentes; la función base de salida sigue siendo interna. Repetir el archivo no modifica datos anteriores.

## Verificación

Pruebas unitarias y DOM cubren normalización, daño total/parcial, decimales, estados no dañados, contadores separados, exclusión de archivados/pendientes, valores por ubicación, disponibilidad y filtros, edición con reintento y copias de informes inmutables. PGlite comprueba la migración repetible, bloqueo de nuevas salidas según la etiqueta actual del servidor, datos históricos intactos, permisos, cantidades parciales y reintentos de operaciones confirmadas.

No se ejecutó SQL en Supabase real ni automatización de navegador. Las pruebas no demuestran concurrencia entre conexiones reales ni geometría de dispositivos. Activación y revisión visual pendientes del usuario.

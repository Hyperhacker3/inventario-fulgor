# Códigos automáticos de ubicaciones y categorías

Actualizado el 29 de octubre de 2026.

## Uso

- Crear almacén, estantería, nivel o caja asigna respectivamente ALM001, EST001, NIV001 o CAJ001. Cada tipo tiene un consecutivo global, compartido entre todos los padres. Después de EST999 sigue EST1000.
- Los formularios de creación de Administración piden únicamente Nombre y Ciudad para almacén, Nombre para estantería y nivel, y Nivel de estantería para caja. Se retiran Código y Descripción de esas altas, y Estado de la creación de cajas; los códigos siguen asignándose automáticamente al guardar. Las nuevas descripciones quedan vacías y las cajas se crean con el estado interno Parcial. La edición conserva sus campos y los datos existentes, con Código de solo lectura. Este ajuste se comparte en móvil, tablet y PC y no requiere SQL adicional.
- Las altas en línea desde Entradas y edición mantienen la indicación del prefijo y Se asigna al guardar; el número definitivo llega desde Supabase.
- Las ubicaciones existentes mantienen sus códigos, incluso los formatos anteriores. Los consecutivos parten del mayor número existente del mismo prefijo, con o sin un guion antes del número; nunca retroceden. Códigos de otros formatos quedan intactos.
- Categorías solicita solo nombre y disponibilidad. Código sustituye a Clave de categoría y muestra tres letras únicas, asignadas por Supabase. El nombre sigue siendo editable y no cambia al generar el código.
- La creación desde Entradas y la edición comparte estas reglas. Estantería y nivel piden nombre; Caja permite crear y elegir sin escribir código. Cambiar un padre limpia las selecciones dependientes.
- Se mantienen permisos de administración, bloqueos durante guardado, borradores y reintentos. Un fallo al actualizar la pantalla después de una escritura confirmada no obliga a crear otra ubicación.

## Activación

El usuario debe ejecutar completo [20261029000100_automatic_location_category_codes.sql](../supabase/migrations/20261029000100_automatic_location_category_codes.sql) en el SQL Editor de su proyecto Supabase, después de las migraciones existentes de seguridad, administración de datos y niveles. No repita importaciones ni las migraciones antiguas para activar este cambio. Luego recargue la aplicación.

La migración es transaccional y repetible. Crea contadores y solicitudes privados, instala la asignación/bloqueo de códigos y añade la columna codigo al catálogo de categorías. Los códigos actuales de ubicaciones no se renumeran. Solo las nuevas creaciones requieren la nueva RPC; editar nombres de ubicaciones o categorías existentes permanece disponible antes de activarla. Si falta la migración, las altas muestran un mensaje de activación y conservan el formulario.

Estado: preparada y ensayada localmente; aplicación en Supabase real pendiente de ejecución por el usuario. Las pruebas de PGlite no confirman su activación en producción.

## Categorías anteriores y referencias

El ID técnico de cada categoría permanece igual, aunque antes coincidiera con su nombre. Se añade un código visible separado. No se actualiza elementos.categoria ni se cambia stock, fotos, movimientos, remisiones o informes históricos. Cada categoría existente recibe su propio código; no se deduplican categorías anteriores por nombre.

Las categorías usadas por productos activos o archivados que falten en el catálogo se incorporan con el nombre que ya mostraba la aplicación (el identificador con guiones bajos convertidos en espacios), sin modificar esos productos. No se recortan nombres para superar la validación del catálogo.

Se proponen las primeras tres letras latinas del nombre, sin acentos. Los nombres cortos se completan con X y los nombres sin letras latinas parten de CAT. Si el código está ocupado, se busca la siguiente combinación alfabética libre; siempre son tres letras A–Z y hay 17.576 combinaciones. Una vez asignado, renombrar o desactivar la categoría conserva su código. Los códigos de categoría son independientes de los prefijos de productos.

## Reintentos, permisos y conservación

La base serializa la asignación por tipo y protege los contadores. Cada intención de creación conserva un UUID hasta recibir confirmación; reintentar los mismos datos devuelve la misma creación y no consume otro consecutivo. Cambiar los datos inicia otra intención. Una segunda creación deliberada de una ubicación después de una respuesta confirmada recibe otro código, aunque su nombre coincida.

Las categorías nuevas con el mismo nombre normalizado reutilizan la existente; una disponibilidad incompatible se corrige editando esa categoría. Los nombres existentes no se fusionan ni se alteran durante la migración. Una solicitud de otra cuenta o con otros datos no puede reutilizar el UUID original.

Los roles operador/consulta mantienen lectura y no pueden crear ubicaciones ni categorías. Las tablas de contadores y solicitudes no son accesibles directamente; las funciones internas no se conceden a esos roles. Un código no se puede sustituir mediante actualización directa ni mediante los formularios. Las validaciones de padres y los permisos anteriores se conservan.

## Comprobación

Verificación del 29 de octubre: typecheck, lint, 209 pruebas unitarias y 43 de integración (252), y build correctos con Node 22.23.3 / pnpm 11.19.0. Dos pruebas nuevas cubren solicitudes/reintentos y formularios de los cuatro tipos; se actualizan pruebas de categorías y altas en línea. Tres pruebas nuevas de PGlite comprueban migración repetible, datos existentes intactos, categorías faltantes, referencias de productos, códigos de tres letras sin colisiones, consecutivos globales mayores que 999, inmutabilidad, permisos, rollback y protección de solicitudes de otra cuenta. No se ejecutó SQL en Supabase real ni automatización de navegador. Activación y revisión visual pendientes del usuario; PGlite no demuestra concurrencia física entre conexiones reales.

Pruebas DOM de creación y edición de los cuatro tipos, códigos de solo lectura, categorías, errores, selección de la respuesta confirmada y bloqueos. Pruebas del coordinador de solicitudes tras una respuesta perdida. PGlite comprueba conservación de datos, códigos existentes, categorías faltantes, consecutivos globales y mayores que 999, colisiones de tres letras, renombrado, inmutabilidad, permisos, solicitudes repetidas o de otra cuenta y rollback sin consumir números.

Estas pruebas no verifican concurrencia física entre conexiones de Supabase ni geometría en dispositivos. La revisión visual corresponde al usuario. No se utiliza computer use ni automatización de navegador.

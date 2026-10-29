# Salidas internas y personal

Actualizado el 29 de octubre de 2026.

Salidas permite elegir Salidas externas o Salidas internas. Externas conserva el formulario, proyectos, fotografías, fechas y remisiones existentes. Ambas usan la misma selección de productos y cantidades; cambiar de tipo no vacía el carrito. Los formularios permanecen montados al cambiar entre esas opciones. Se bloquea el cambio de tipo durante un guardado o una captura pendiente.

## Personal

Administración de datos → Personal permite a administración agregar y editar nombre y cargo, y activar o desactivar trabajadores. No crea cuentas de acceso ni modifica roles de la aplicación. Operadores y consulta pueden leer el listado. No se eliminan trabajadores utilizados: desactivarlos los retira de las nuevas selecciones y mantiene sus entregas anteriores.

Los cambios comprueban la versión del trabajador para evitar sobrescribir una edición concurrente. Un error conserva el formulario. Una respuesta perdida conserva la solicitud original para reintentar sin duplicar trabajadores.

## Registrar una salida interna

1. Agregue productos mediante el carrito del inventario o el buscador compartido de Salidas.
2. Seleccione Salidas internas → Nueva salida.
3. Entrega muestra el nombre y cargo de la cuenta conectada, sin campos de escritura. Recibe selecciona un trabajador activo y completa su cargo.
4. Revise las cantidades y pulse Registrar salida interna.

Supabase vuelve a leer la identidad de la sesión, el trabajador y los productos. No acepta nombres/cargos de remitente o destinatario enviados por el navegador. Genera un código INT-AAAAMMDD-NNN con consecutivo anual propio y creciente, independiente de las remisiones. Guarda la entrega, los nombres/cargos originales, la empresa y los productos/cantidades/unidades/ubicaciones de ese momento. No pide proyecto, dirección, transporte o fotografías, ni abre un PDF automáticamente.

## Materiales sin regresar y devoluciones

En Salidas internas, Materiales sin regresar muestra las entregas pendientes o parciales, quién recibió, lo entregado, lo devuelto y lo pendiente por producto. Registrar devolución permite escribir cantidades parciales o elegir Devolver todo lo pendiente. No permite devolver más de lo entregado ni materiales de otra salida.

Cada devolución registra fecha, responsable de la sesión y cantidades. Los estados son Pendiente de devolución, Devolución parcial y Devuelta. Historial muestra todas las entregas con búsqueda y páginas de 20; también se consulta desde Historial → Salidas internas y devoluciones, incluidas las cuentas de consulta. Los lectores no pueden registrar entregas, devoluciones ni cambios de personal.

## Inventario y disponibilidad

Los materiales continúan dentro de las instalaciones: el préstamo no reduce cantidad ni valor total del inventario. Se reserva cantidad_prestada en cada producto y la disponibilidad resta unidades dañadas y prestadas, sin bajar de cero. Los préstamos no pueden despacharse otra vez, ni en salidas externas ni internas. La devolución libera esa reserva, conservando el stock total. La ficha muestra En uso interno cuando corresponde; las cifras disponibles excluyen préstamos.

Entradas y ajustes siguen funcionando. Un ajuste no puede dejar el total por debajo de lo prestado. Mientras haya préstamos pendientes, el producto no puede archivarse, eliminarse ni cambiar de unidad. Puede corregirse su nombre, ubicación y demás datos permitidos sin reescribir las entregas originales. Al terminar todas las devoluciones, se recuperan las operaciones habituales; si después se elimina un producto archivado, sus comprobantes conservan la copia original.

Se conservan las reglas de daño: MALO, EN REPARACIÓN y PARA REPARAR no tienen unidades utilizables para nuevos préstamos. Si el estado cambia mientras hay un préstamo, la devolución sigue admitida y conserva la condición actual.

## PDF opcional

Ver / Guardar PDF abre un comprobante de salida interna, separado de las remisiones. Incluye logo y empresa originales, fecha/código de entrega, remitente/destinatario y sus cargos, materiales, cantidades entregadas/devueltas/pendientes y registro de devoluciones consultado. No se suman cantidades de unidades distintas.

La vista previa conserva su copia mientras se imprime, aunque cambie la información actual. Reabrir el comprobante consulta los nuevos avances de devolución y conserva la entrega original. Usa el visor A4 y la paginación por alturas medidas, con Ajustar, 100 % e Imprimir / Guardar PDF. Para descargarlo se elige Guardar como PDF en el diálogo de impresión del dispositivo.

## Activación en Supabase

El usuario ejecuta completo [20261029000600_internal_dispatches.sql](../supabase/migrations/20261029000600_internal_dispatches.sql) desde SQL Editor de su cuenta, después de las migraciones existentes de seguridad, catálogos, niveles y empresa. Incluye la protección por estados dañados de la migración 005 y añade el descuento de préstamos a las salidas externas.

El archivo añade tablas de personal, entregas, líneas y devoluciones, con RLS y lectura para admin/operador/consulta. Las escrituras se hacen exclusivamente mediante RPC con permisos; solo administración gestiona personal. Contadores y solicitudes se mantienen privados sin acceso directo del frontend. La columna de reservas empieza en cero y no se concede su edición manual. La migración es repetible, no importa datos ni crea préstamos o trabajadores de ejemplo, no cambia stock total ni remisiones/movimientos anteriores. El historial interno utiliza su propio registro; no simula salidas externas ni ajustes.

Si falta la migración, la aplicación mantiene disponibles las funciones anteriores y muestra el archivo que debe activarse al acceder a Personal o internas. Las nuevas lecturas no bloquean el arranque. Las listas se actualizan después de las escrituras, al recuperar el foco y periódicamente mientras están visibles; la disponibilidad conserva la actualización de productos existente.

## Reintentos y conservación

Entregas, devoluciones y personal usan UUID por intención y serialización en Supabase. Una respuesta perdida congela los datos originales y conserva la solicitud en memoria y en almacenamiento local de esa cuenta; recargar permite reintentar sin repetir el efecto. No se permite cambiar sus materiales/destinatario y crear otra intención mientras la respuesta sea incierta. Una negativa confirmada de la base libera el borrador para corregirlo.

Los préstamos por confirmar bloquean el carrito y el cambio a salidas externas. Las devoluciones por confirmar siguen accesibles con Reintentar devolución aunque su entrega ya haya desaparecido de pendientes. Las solicitudes comprueban actor, operación y datos; otra cuenta no puede reutilizarlas. Repetir una entrega o devolución confirmada devuelve el estado actual de esa entrega y nunca vuelve a reservar o liberar unidades. Fallar al actualizar la pantalla después de una escritura confirmada no convierte esa escritura en una operación fallida.

## Verificación

Pruebas unitarias y DOM cubren disponibilidad sin reducir stock/valor, validación de cantidades, selección de personal y carrito, cargos automáticos, errores y doble envío, solicitudes inciertas/recarga, devoluciones parciales, editor de personal y contenido del PDF. Las pruebas de PGlite comprueban permisos y RLS, migración repetible, atomicidad, disponibilidad compartida con externas, reservas/devoluciones, protección de archivado/unidad, snapshots, versiones de personal, reintentos entre usuarios, paginación y 1001 productos en una entrega y devolución.

No se ejecuta SQL de producción por el agente ni se utiliza automatización de navegador. Las pruebas no demuestran concurrencia física entre conexiones reales, geometría en dispositivos ni impresión física. El usuario activa Supabase y revisa móvil, tablet y PC.

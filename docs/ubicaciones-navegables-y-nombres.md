# Ubicaciones navegables y nombres de cajas

Actualizado el 29 de octubre de 2026.

En la ficha del producto, pulse un almacén, estantería, nivel o caja para consultar todo su inventario. La selección usa los IDs y todos sus padres: CAJ007 de un nivel nunca incluye otra CAJ007 de un padre distinto. Una estantería llamada Sin estantería sigue siendo esa ubicación concreta, no el filtro de productos sin estantería asignada.

Se cierra la ficha, se abre Inventario en la primera página y se muestran los filtros elegidos. Se limpian la búsqueda, categorías, stock y condición anteriores para mostrar todos los productos activos de esa ubicación. Los filtros y la búsqueda se conservan al cambiar de pantalla durante la sesión; Limpiar los restablece. No cambia la preferencia de lista/cuadrícula. Los enlaces mantienen teclado, selección de texto y bloqueo mientras se guarda o se edita.

Las altas de estantería, nivel y caja desde Entradas y edición dejan de mostrar el cuadro de código. La asignación automática y los mensajes de confirmación se conservan.

Las cajas admiten Nombre opcional (hasta 100 caracteres) al crear desde Entradas, edición o Administración. Administración → Cajas → Editar permite cambiarlo después. Los selectores, la ubicación y Administración muestran código y nombre; si no hay nombre o es igual al código, solo se muestra el código. Ejemplo: CAJ007 · Herramientas. Ninguna caja existente se renombra automáticamente.

## Activación de nombres en Supabase

El usuario ejecuta **completo** [20261029000400_box_names.sql](../supabase/migrations/20261029000400_box_names.sql) desde SQL Editor de su cuenta, después de las migraciones de códigos y de los archivos de normalización que vaya a usar. Si vuelve a ejecutar uno de esos archivos anteriores, debe ejecutar de nuevo la migración de nombres al terminar.

La migración es repetible y utiliza el campo nombre ya existente. Actualiza la asignación automática para respetar nombres y conserva el código como alternativa cuando no se escribe uno. Mantiene códigos inmutables, contadores, permisos y validación de padres. Las solicitudes anteriores y los reintentos conservan sus IDs y payloads; una creación confirmada devuelve el registro actual sin duplicarlo ni consumir otro número.

El frontend comprueba inventory_box_names_ready antes de guardar nombres nuevos. Si falta la migración, muestra el archivo que se necesita y conserva el borrador para reintentar. Crear cajas sin nombre y las demás funciones continúan disponibles. La migración no cambia nombres existentes, IDs, padres, productos, cantidades, fotografías, remisiones o informes guardados.

## Comprobación

Pruebas DOM y unitarias cubren jerarquía por ID, nombres/códigos iguales en padres diferentes, limpieza de filtros, navegación desde otras pantallas y desde Inventario, conservación de selección de texto, bloqueo y errores de activación. Los formularios prueban nombres y ausencia de cuadros de código al crear. PGlite comprueba conservación de registros, nombres opcionales, edición, códigos automáticos/inmutables, reintentos, permisos y repetición del SQL.

Estas pruebas no comprueban la geometría en dispositivos ni la activación en Supabase real. La revisión visual en móvil/tablet/PC y la ejecución del SQL corresponden al usuario.

# Activar la administración de datos

1. En Supabase, abra SQL Editor y cree una consulta nueva.
2. Copie **todo** `supabase/migrations/20261006000100_data_administration.sql`, desde `BEGIN;` hasta `COMMIT;`.
3. Ejecute la consulta. El resultado esperado es `Success. No rows returned`.
4. Espere a que el despliegue más reciente de Vercel esté Ready.
5. Recargue la aplicación e ingrese a **Administración de datos**. En un teléfono, está en el menú superior.

La migración conserva los productos existentes, sus cantidades, fotografías y códigos. Crea catálogos en Supabase a partir de las categorías y prefijos existentes. No copia el inventario a archivos locales.

## Códigos

En **Códigos**, cree un prefijo de tres letras (por ejemplo, `MAT`) e indique su nombre. Puede editar las letras, el nombre y su disponibilidad para nuevas altas. Editar un prefijo conserva los códigos ya asignados y su consecutivo.

En **Entradas**, sin seleccionar un material existente, seleccione el prefijo. El formulario muestra un código estimado; Supabase asigna el definitivo al guardar. El consecutivo parte del mayor número registrado, incluidos productos archivados. Por ejemplo, después de `CAB100` corresponde `CAB101`. Después de `CAB999` corresponde `CAB1000`.

Dos solicitudes de alta se serializan en la base de datos para evitar códigos repetidos. Repetir una solicitud idéntica devuelve el mismo producto y conserva su entrada de stock original.

## Categorías

En **Categorías**, escriba una clave (letras, números o guion bajo, como `FERRETERIA`) y un nombre visible. El nombre y la disponibilidad se pueden editar. La clave permanece estable para conservar la relación con los productos. Desactivar una categoría impide nuevas altas con ella y conserva sus productos en el inventario y los filtros.

## Almacenes, estanterías, niveles, cajas y proyectos

La jerarquía actual es **almacén → estantería → nivel → caja**. Para activar los niveles y las marcas, aplique `supabase/migrations/20261006000600_storage_levels_and_brands.sql` después de las migraciones anteriores; consulte el orden completo en README.md. No vuelva a ejecutar importaciones para activar estas funciones.

- En **Almacenes**, cree o edite un almacén. Sus tarjetas muestran código, nombre, valor total, valor del material dañado y Editar, sin árbol ni listado de productos. Almacenes ya no tiene pantalla ni acceso lateral independiente.
- En **Estanterías**, seleccione un almacén y pulse **Crear estantería**.
- En **Niveles**, seleccione una estantería y pulse **Crear nivel**.
- En **Cajas**, seleccione un nivel de estantería y pulse **Crear caja**.
- En estas secciones puede editar los datos de las ubicaciones existentes y consultar su valor total y dañado. Las cajas antiguas sin nivel se conservan hasta asignarlo al editar.
- En **Proyectos** puede crear, editar, finalizar y reactivar los destinos de las salidas. Los proyectos actuales se conservan; la administración se ha integrado en esta pantalla.

Solo las cuentas con rol `admin` pueden modificar estos datos. Operadores y cuentas de consulta pueden leerlos.

## Registrar productos y crear ubicaciones desde Entradas

En **Entradas**, sin seleccionar un material existente, el selector **Caja** muestra primero **Seleccione una caja**, debajo **Crear nueva caja** y después las cajas existentes. Escriba su código y pulse **Crear y elegir caja**. Se guarda en Supabase dentro del nivel seleccionado y queda elegida para el componente. Es necesario seleccionar antes almacén, estantería y nivel. La caja creada también queda disponible en Administración de datos.

El selector **Categoría** muestra primero **Seleccione una categoría**, debajo **Crear nueva categoría** y después las categorías existentes. Escriba el nombre y pulse **Crear y elegir categoría**. Se guarda en Supabase y queda seleccionada para el componente; su clave se genera automáticamente. Puede seguir eligiendo categorías existentes. Las categorías inactivas requieren reactivarse en Administración de datos.

El selector **Estantería** sigue el mismo orden: **Seleccione una estantería**, **Crear nueva estantería** y las existentes del almacén elegido. Para crearla, escriba su código y nombre y pulse **Crear y elegir estantería**. Se guarda en Supabase en el almacén seleccionado y queda lista para asignarle niveles. El selector **Nivel** permite elegir uno de esa estantería o crearlo desde el alta. Cambiar de estantería invalida las selecciones de nivel y caja del padre anterior; cambiar de nivel invalida la caja anterior.

El prefijo también permite **Agregar nuevo código** desde el alta, limitado a tres letras; Supabase asigna los números definitivos al guardar el elemento. Editar abre una ventana independiente sobre el detalle, conservando su posición. Sus selectores también permiten crear estanterías, niveles y cajas; los cierres se bloquean durante operaciones pendientes y los errores conservan el borrador.

Después de guardar un componente, el formulario permanece abierto. Conserva el prefijo, categoría, almacén y estantería. Reinicia nombre, marca, descripción, nivel, caja, stock, unidad, peso, valor unitario, mínimo, estado, daños y fotografías. El código del siguiente componente sigue asignándose automáticamente al guardar.

Crear categorías, cajas y estanterías desde el alta utiliza las tablas existentes y no requiere ejecutar otro SQL.

La pestaña **Archivados** permite consultar productos archivados y eliminarlos individualmente con rol de administrador. Para activar esa eliminación, aplique la nueva migración `20261006000200_archived_inventory.sql`, descrita en `docs/entradas-y-archivados.md`. Esa migración no elimina los productos existentes.

La activación en Supabase y la comprobación visual del despliegue se realizan desde la cuenta del administrador; las pruebas locales no acceden a la base de datos real.

## Empresa y navegación

Administración reúne nueve secciones: Códigos, Categorías, Almacenes, Estanterías, Niveles, Cajas, Proyectos, Archivados y Empresa. Cada función tiene su color de icono y texto; los iconos se rellenan al seleccionar o pasar el mouse, manteniendo la selección hundida. Los colores de iconos se conservan en oscuro. No hay un botón adicional Actualizar códigos y categorías.

Empresa permite editar nombre, NIT, logo, dirección y teléfono. El NIT aparece debajo del logo en el PDF; las remisiones conservan una copia de los datos al emitirse. La activación está documentada en [Datos de empresa](datos-empresa.md). Archivados permite recuperar un producto con Desarchivar o eliminarlo con confirmación del código.

Uso completo actualizado: [Guía de funciones](guia-funciones.md).

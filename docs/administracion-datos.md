# Activar la administración de datos

1. En Supabase, abra SQL Editor y cree una consulta nueva.
2. Copie **todo** `supabase/migrations/20261006000100_data_administration.sql`, desde `BEGIN;` hasta `COMMIT;`.
3. Ejecute la consulta. El resultado esperado es `Success. No rows returned`.
4. Espere a que el despliegue más reciente de Vercel esté Ready.
5. Recargue la aplicación e ingrese a **Administración de datos**. En un teléfono, está en el menú superior.

La migración conserva los productos existentes, sus cantidades, fotografías y códigos. Crea catálogos en Supabase a partir de las categorías y prefijos existentes. No copia el inventario a archivos locales.

## Códigos

En **Códigos**, cree un prefijo de tres letras (por ejemplo, `MAT`) e indique su nombre. Puede editar las letras, el nombre y su disponibilidad para nuevas altas. Editar un prefijo conserva los códigos ya asignados y su consecutivo.

En **Nuevo ítem**, seleccione el prefijo. El formulario muestra un código estimado; Supabase asigna el definitivo al guardar. El consecutivo parte del mayor número registrado, incluidos productos archivados. Por ejemplo, después de `CAB100` corresponde `CAB101`. Después de `CAB999` corresponde `CAB1000`.

Dos solicitudes de alta se serializan en la base de datos para evitar códigos repetidos. Repetir una solicitud idéntica devuelve el mismo producto y conserva su entrada de stock original.

## Categorías

En **Categorías**, escriba una clave (letras, números o guion bajo, como `FERRETERIA`) y un nombre visible. El nombre y la disponibilidad se pueden editar. La clave permanece estable para conservar la relación con los productos. Desactivar una categoría impide nuevas altas con ella y conserva sus productos en el inventario y los filtros.

## Estanterías, cajas y proyectos

- En **Estanterías**, seleccione un almacén y pulse **Crear estantería**.
- En **Cajas**, seleccione una estantería y pulse **Crear caja**.
- En ambas pestañas puede editar los datos de las ubicaciones existentes.
- En **Proyectos** puede crear, editar, finalizar y reactivar los destinos de las salidas. Los proyectos actuales se conservan; la administración se ha integrado en esta pantalla.

Solo las cuentas con rol `admin` pueden modificar estos datos. Operadores y cuentas de consulta pueden leerlos.

## Registrar varios productos y crear cajas desde el alta

En **Nuevo ítem**, el selector **Caja** muestra primero **Seleccione una caja**, debajo **Crear nueva caja** y después las cajas existentes. Escriba su código y pulse **Crear y elegir caja**. Se guarda en Supabase dentro de la estantería seleccionada y queda elegida para el componente. Es necesario seleccionar primero una estantería. La caja creada también queda disponible en Administración de datos.

El selector **Categoría** muestra primero **Seleccione una categoría**, debajo **Crear nueva categoría** y después las categorías existentes. Escriba el nombre y pulse **Crear y elegir categoría**. Se guarda en Supabase y queda seleccionada para el componente; su clave se genera automáticamente. Puede seguir eligiendo categorías existentes. Las categorías inactivas requieren reactivarse en Administración de datos.

El selector **Estantería** sigue el mismo orden: **Seleccione una estantería**, **Crear nueva estantería** y las existentes del almacén elegido. Para crearla, escriba su código y nombre y pulse **Crear y elegir estantería**. Se guarda en Supabase en el almacén seleccionado y queda lista para asignarle una caja. Al cambiar de estantería se limpia la selección de caja.

Después de guardar un componente, el formulario permanece abierto. Conserva el prefijo, categoría, almacén y estantería. Reinicia nombre, descripción, caja, stock, unidad, peso, mínimo, estado, daños y fotografías. El código del siguiente componente sigue asignándose automáticamente al guardar.

Crear categorías, cajas y estanterías desde el alta utiliza las tablas existentes y no requiere ejecutar otro SQL.

La pestaña **Archivados** permite consultar productos archivados y eliminarlos individualmente con rol de administrador. Para activar esa eliminación, aplique la nueva migración `20261006000200_archived_inventory.sql`, descrita en `docs/entradas-y-archivados.md`. Esa migración no elimina los productos existentes.

La activación en Supabase y la comprobación visual del despliegue se realizan desde la cuenta del administrador; las pruebas locales no acceden a la base de datos real.

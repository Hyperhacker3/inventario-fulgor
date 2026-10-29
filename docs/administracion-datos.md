# Activar la administración de datos

Actualizado el 29 de octubre de 2026. Si Administración ya está activa, no repita migraciones antiguas para este cambio: aplique [Códigos automáticos](codigos-automaticos-ubicaciones-categorias.md) con el nuevo archivo SQL.

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

En **Categorías**, escriba el nombre visible. Supabase asigna un código único de tres letras, que se muestra como Código y no se puede cambiar. Los nombres e identificadores anteriores se conservan; el código nuevo se añade sin desvincular productos. El nombre y la disponibilidad se pueden editar. Desactivar una categoría impide nuevas altas con ella y conserva sus productos en el inventario y los filtros.

## Almacenes, estanterías, niveles, cajas y proyectos

Administración incorpora Eliminar para almacenes, estanterías, niveles y cajas, solo para administración y con confirmación. Supabase comprueba que no tengan productos activos o archivados ni ubicaciones dependientes; no elimina en cascada ni reutiliza números. Las cajas muestran solo su código, sin estado de ocupación en selectores, tarjetas o edición. La nueva normalización cambia las letras/formato de los códigos existentes a ALM/EST/NIV/CAJ conservando cada número, ID, nombre, padre y referencia. Los números iguales en padres distintos permanecen; ante coincidencias en el mismo padre o códigos sin número final, se revierte todo y se informa qué revisar, sin renumerar. Los contadores se sincronizan con el máximo real por tipo y nunca retroceden. Requiere ejecutar las dos nuevas migraciones desde la cuenta del usuario; no están aplicadas por el agente. [Activación y comprobaciones](ubicaciones-codigos-y-eliminacion.md).

La jerarquía actual es **almacén → estantería → nivel → caja**. Para activar los niveles y las marcas, aplique `supabase/migrations/20261006000600_storage_levels_and_brands.sql` después de las migraciones anteriores; consulte el orden completo en README.md. No vuelva a ejecutar importaciones para activar estas funciones.

- En **Almacenes**, cree o edite un almacén. Sus tarjetas muestran código, nombre, valor total, valor del material dañado y Editar, sin árbol ni listado de productos. Almacenes ya no tiene pantalla ni acceso lateral independiente.
- En **Estanterías**, seleccione un almacén y pulse **Crear estantería**.
- En **Niveles**, seleccione una estantería y pulse **Crear nivel**.
- En **Cajas**, seleccione un nivel de estantería y pulse **Crear caja**.
- En estas secciones puede editar los datos de las ubicaciones existentes y consultar su valor total y dañado. Las cajas antiguas sin nivel se conservan hasta asignarlo al editar.
- En **Proyectos** puede crear, editar, finalizar y reactivar los destinos de las salidas. Los proyectos actuales se conservan; la administración se ha integrado en esta pantalla.

Los formularios de creación de Administración piden únicamente Nombre y Ciudad para almacén, Nombre para estantería y nivel, y Nivel de estantería para caja. Se retiran Código y Descripción de esas altas, y Estado de la creación de cajas; los códigos siguen asignándose automáticamente al guardar. Las nuevas descripciones quedan vacías. Caja no muestra ni solicita estado de ocupación (Parcial, Completa o Vacía), tampoco al editar; ese metadato antiguo se conserva en la base por compatibilidad. La edición conserva los demás campos y los datos existentes, con Código de solo lectura. Este ajuste se comparte en móvil, tablet y PC y no requiere SQL adicional.

Solo las cuentas con rol `admin` pueden modificar estos datos. Operadores y cuentas de consulta pueden leerlos.

## Registrar productos y crear ubicaciones desde Entradas

En **Entradas**, sin seleccionar un material existente, el selector **Caja** muestra primero **Seleccione una caja**, debajo **Crear nueva caja** y después las cajas existentes. El código CAJ y su consecutivo se asignan al pulsar **Crear y elegir caja**. Se guarda en Supabase dentro del nivel seleccionado y queda elegida para el componente. Es necesario seleccionar antes almacén, estantería y nivel. La caja creada también queda disponible en Administración de datos.

El selector **Categoría** muestra primero **Seleccione una categoría**, debajo **Crear nueva categoría** y después las categorías existentes. Escriba el nombre y pulse **Crear y elegir categoría**. Se guarda en Supabase y queda seleccionada para el componente; su código visible de tres letras se asigna automáticamente. Puede seguir eligiendo categorías existentes. Las categorías inactivas requieren reactivarse en Administración de datos.

El selector **Estantería** sigue el mismo orden: **Seleccione una estantería**, **Crear nueva estantería** y las existentes del almacén elegido. Para crearla, escriba su nombre y pulse **Crear y elegir estantería**; el código EST y su consecutivo se asignan al guardar. Se guarda en Supabase en el almacén seleccionado y queda lista para asignarle niveles. El selector **Nivel** permite elegir uno de esa estantería o crearlo desde el alta. Cambiar de estantería invalida las selecciones de nivel y caja del padre anterior; cambiar de nivel invalida la caja anterior.

El prefijo también permite **Agregar nuevo código** desde el alta, limitado a tres letras; Supabase asigna los números definitivos al guardar el elemento. Editar abre una ventana independiente sobre el detalle, conservando su posición. Sus selectores también permiten crear estanterías, niveles y cajas; los cierres se bloquean durante operaciones pendientes y los errores conservan el borrador.

Después de guardar un componente, el formulario permanece abierto. Conserva el prefijo, categoría, almacén y estantería. Reinicia nombre, marca, descripción, nivel, caja, stock, unidad, peso, valor unitario, mínimo, estado, daños y fotografías. El código del siguiente componente sigue asignándose automáticamente al guardar.

Los consecutivos ALM/EST/NIV/CAJ y los códigos de categoría requieren aplicar la nueva migración de códigos automáticos. Las creaciones no calculan códigos desde el navegador; si falta activarla, se conserva el borrador y se muestra el paso pendiente. Los números de ubicaciones existentes no se renumeran; la migración posterior normaliza sus prefijos y formato y mantiene los códigos de solo lectura.

La pestaña **Archivados** permite consultar productos archivados y eliminarlos individualmente con rol de administrador. Para activar esa eliminación, aplique la nueva migración `20261006000200_archived_inventory.sql`, descrita en `docs/entradas-y-archivados.md`. Esa migración no elimina los productos existentes.

La activación en Supabase y la comprobación visual del despliegue se realizan desde la cuenta del administrador; las pruebas locales no acceden a la base de datos real.

## Empresa y navegación

Administración reúne nueve secciones: Códigos, Categorías, Almacenes, Estanterías, Niveles, Cajas, Proyectos, Archivados y Empresa. Cada función tiene su color de icono y texto; los iconos se rellenan al seleccionar o pasar el mouse, manteniendo la selección hundida. Los colores de iconos se conservan en oscuro. No hay un botón adicional Actualizar códigos y categorías.

Empresa permite editar nombre, NIT, logo, dirección y teléfono. El NIT aparece debajo del logo en el PDF; las remisiones conservan una copia de los datos al emitirse. La activación está documentada en [Datos de empresa](datos-empresa.md). Archivados permite recuperar un producto con Desarchivar o eliminarlo con confirmación del código.

Uso completo actualizado: [Guía de funciones](guia-funciones.md).

# Informes de inventario en PDF

Actualizado el 28 de octubre de 2026.

## Uso

1. Abra **Informes** en la barra lateral de PC o en el menú de móvil/tablet.
2. Busque por código, nombre o marca, y filtre por categoría, almacén, estantería, nivel o caja. Cambiar almacén limpia estantería/nivel/caja; cambiar estantería limpia nivel/caja; cambiar nivel limpia caja. Hay opciones para productos sin ubicación en cada tramo. Las opciones largas incluyen su ubicación superior para distinguirlas.
3. Marque los productos. **Seleccionar resultados** incluye todos los productos del filtro, no solo los 24 de la página actual; Quitar resultados los desmarca sin eliminar otras selecciones. Puede revisar **Ver solo seleccionados** o usar **Limpiar selección**.
4. Pulse **Generar informe PDF**. Primero se comprueba que el historial está activado. Se consultan otra vez los productos seleccionados, las ubicaciones y la empresa desde Supabase. El resultado se guarda en Supabase antes de abrir la vista previa. Un error conserva la selección y permite reintentar; si ya se había preparado la copia, se reenvían el mismo ID y los mismos datos, sin duplicar el informe. Cambiar la selección inicia una solicitud nueva. Las filas eliminadas, archivadas o no disponibles se deben quitar, para no emitir un informe que omita productos sin aviso.
5. En la vista previa, utilice Ajustar o 100 %. Pulse **Imprimir / Guardar PDF** y seleccione **Guardar como PDF** en la ventana de impresión del navegador. Escape, X y Retroceder cierran la vista previa con el ciclo existente de ventanas.

La selección y filtros se mantienen al cambiar de página o pantalla durante la sesión de la cuenta. No se guardan nuevas copias de productos en localStorage. Cerrar sesión o recargar reinicia ese borrador.

## Historial y activación

En **Informes → Historial de informes**, cada tarjeta muestra fecha/hora, referencia única, persona, número de productos, cantidades por unidad y valor conocido. **Ver / Imprimir PDF** abre la copia original. Se muestran 20 informes por página, del más reciente al más antiguo; Actualizar vuelve a consultar. El historial es compartido entre los tres roles autorizados y permanece al recargar, cerrar sesión o cambiar de dispositivo. Un informe queda registrado al generarlo aunque se cancele la ventana de impresión. Los informes generados antes de esta función no se recuperan automáticamente.

El usuario debe ejecutar completo [20261028000100_inventory_report_history.sql](../supabase/migrations/20261028000100_inventory_report_history.sql) en el SQL Editor del proyecto Supabase, después de las migraciones de seguridad y empresa existentes. La migración es repetible y solo añade la tabla `inventario_informes`, sus funciones/políticas e índice. No importa productos ni cambia stock. La comprobación `inventory_report_history_ready()` debe devolver true con una sesión autenticada autorizada; la aplicación la consulta antes de generar. La ausencia de migración se muestra con un mensaje de activación, sin sustituir el historial por almacenamiento local.

La aplicación conserva el ID y la copia de un guardado fallido durante la sesión para reintentarlo. Si se recarga durante una respuesta perdida, consulte primero el historial para comprobar si se guardó; ese borrador de reintento no sobrevive a una recarga.

**Estado:** migración preparada y ensayada localmente. Aplicación en Supabase real pendiente de ejecución por el usuario.

## Contenido y cálculos

La tabla del PDF de Informes usa ocho columnas, en este orden: # / CÓDIGO / PRODUCTO / MARCA / CANTIDAD / VALOR UND / PESO UND / UBICACIÓN. Los encabezados están en mayúsculas; código y marca tienen sus propias celdas. Producto conserva el nombre destacado a 11 px, con el 24 % del ancho y ajuste de textos largos. Se retiran categoría, peso total y valor de stock de las filas. PESO UND muestra el peso de una unidad en g/kg o — si no está declarado, y VALOR UND muestra el precio de una unidad en COP. Se conservan los totales y avisos de datos parciales en el resumen, la paginación medida y los datos de las copias guardadas. No requiere SQL adicional.

- Empresa, fecha/hora de generación en la zona horaria de Colombia y persona que genera el informe.
- Código, nombre destacado, marca, cantidad y unidad de medida por producto, en columnas propias, sin mostrar categoría ni condición/estado. Cada fila del inventario se conserva por su ID, aunque comparta nombre o marca con otra.
- PESO UND contiene el peso por unidad en g/kg; un peso ausente aparece como —. El resumen conserva el peso total convertido a kg con el cálculo compartido, sin columna de peso total por producto.
- VALOR UND muestra el valor de una unidad en COP. El resumen conserva el valor total de stock: cantidad total por valor de una unidad, redondeado a dos decimales. Se suman los importes registrados; los productos con precio unitario cero se identifican en el resumen.
- Ubicación completa: almacén → estantería → nivel → caja, o Sin ubicación asignada cuando no hay datos.
- Resumen de productos, cantidades por unidad, peso y valor. No se suman metros, unidades, rollos o kilos como si fueran una misma unidad.

El informe utiliza **stock total**, incluidas las unidades dañadas declaradas. No deduce daños de la condición. Un stock pendiente se imprime como Pendiente y no se incorpora como cero a los totales. Los pesos ausentes también quedan pendientes; el resumen distingue totales parciales y ausencia de pesos verificables. Se conservan los metadatos originales en Supabase.

## Lectura y conservación

Admin, operador y consulta pueden usar Informes según las políticas existentes de lectura de inventario, ubicaciones y empresa. Se mantienen los permisos de lectura de inventario. Estos tres roles pueden registrar y leer informes compartidos, únicamente mediante la nueva RPC de guardado y la política de lectura de historial. No pueden editar ni eliminar las copias. Requiere la migración de la sección Historial y activación. La aplicación no escribe stock, movimientos, salidas ni remisiones al generar el informe.

Las consultas de productos se realizan en lotes de hasta 100 IDs para evitar límites de URL o truncamientos del servidor en selecciones grandes. La selección del listado proviene del inventario completo cargado, no solo de una página remota limitada. Los datos se copian al generar: cambios posteriores no revalúan el PDF ya abierto. La copia se conserva en el historial del servidor. Las lecturas iniciales no forman una transacción simultánea entre todas las consultas; el informe refleja los datos obtenidos durante su generación. La fecha de la copia guardada la asigna Supabase; el nombre visible conserva el perfil de la cuenta y el registro incluye su ID autenticado.

Las fotografías no se incorporan ni se convierten. El PDF se guarda desde el navegador por decisión del usuario; el servidor no crea archivos públicos de informes. Una nueva generación consulta los datos vigentes. Reabrir desde el historial utiliza la copia guardada, sin releer ni recalcular los productos. Se guardan los datos del documento, no un archivo PDF binario; el formato de impresión puede evolucionar sin alterar esos datos.

Verificación del ajuste de nombres del 28 de octubre: typecheck, lint, 200 pruebas unitarias y 37 de integración (237), y build correctos con Node 22.23.3 / pnpm 11.19.0. La primera suite tuvo el fallo conocido de espera fija en dialogHistory; la repetición completa pasó. Sin pruebas nuevas para este cambio de presentación, automatización de navegador ni cambios en Supabase. La revisión visual de nombres largos y paginación queda con el usuario.

## Implementación y comprobación

Verificación de las ocho columnas del informe (28 de octubre): typecheck, lint, 205 pruebas unitarias y 39 de integración (244), y build correctos con Node 22.23.3 / pnpm 11.19.0. La primera suite tuvo el fallo conocido de espera fija en dialogHistory al usar Avanzar; la repetición completa pasó. Sin pruebas nuevas para este ajuste de presentación, automatización de navegador ni cambios en Supabase. La geometría y paginación física del PDF quedan para revisión del usuario.

Verificación de filtros e historial (28 de octubre): typecheck, lint, 203 pruebas unitarias y 39 de integración (242), y build correctos con Node 22.23.3 / pnpm 11.19.0. Las pruebas nuevas cubren cascada de ubicación, selección conservada, paginación/reapertura, errores, reintentos sin duplicados, permisos de los tres roles, acceso anónimo rechazado, inmutabilidad, repetición de migración, más de 1000 filas y stock/movimientos/remisiones intactos. Se corrigió la búsqueda del botón con icono en una prueba nueva; la suite completa posterior pasó. La migración se ensayó en PGlite, no se ejecutó en Supabase real. Revisión visual con el usuario, sin automatización de navegador.

- domain/inventoryReport: selección por ID, copia de filas, sumas por unidad, pesos y valores parciales.
- data/inventoryReport: lectura de productos seleccionados y catálogos/empresa existentes, guardado y consulta paginada de copias de informes; sin escrituras en inventario.
- InventoryReportsView: selección múltiple, búsqueda, filtros, paginación y protección de solicitudes repetidas.
- components/reports: contenido, medición/paginación A4 y visor imprimible, con el mismo tratamiento de foco y movimiento reducido.

Las pruebas locales cubren cálculos con decimales y unidades mixtas, daños declarados, pendientes, precios cero, copias estables, ubicación completa, selección al filtrar/paginar, errores/reintentos, doble generación, productos no disponibles y lecturas de más de 1000 IDs. Se comprueba contenido del PDF y conservación de filas en la paginación; no se prueban geometría, rendimiento físico ni un snapshot concurrente real. La revisión visual en móvil, tablet, PC e impresión corresponde al usuario. No se utiliza automatización de navegador ni se generan operaciones ficticias en Supabase real.

Verificación del 28 de octubre: typecheck, lint, 200 pruebas unitarias y 37 de integración (237 en total) y build correctos con Node 22.23.3 / pnpm 11.19.0. Se añadieron seis pruebas de informes y se amplió la navegación para los tres roles. Sin escrituras de prueba en Supabase ni automatización de navegador; revisión visual de PDF/dispositivos pendiente del usuario.

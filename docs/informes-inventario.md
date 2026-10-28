# Informes de inventario en PDF

Actualizado el 28 de octubre de 2026.

## Uso

1. Abra **Informes** en la barra lateral de PC o en el menú de móvil/tablet.
2. Busque por código, nombre o marca, y filtre por categoría o almacén si lo necesita.
3. Marque los productos. **Seleccionar resultados** incluye todos los productos del filtro, no solo los 24 de la página actual; Quitar resultados los desmarca sin eliminar otras selecciones. Puede revisar **Ver solo seleccionados** o usar **Limpiar selección**.
4. Pulse **Generar informe PDF**. Se consultan otra vez los productos seleccionados, las ubicaciones y la empresa desde Supabase. Un error conserva la selección y permite reintentar. Las filas eliminadas, archivadas o no disponibles se deben quitar, para no emitir un informe que omita productos sin aviso.
5. En la vista previa, utilice Ajustar o 100 %. Pulse **Imprimir / Guardar PDF** y seleccione **Guardar como PDF** en la ventana de impresión del navegador. Escape, X y Retroceder cierran la vista previa con el ciclo existente de ventanas.

La selección y filtros se mantienen al cambiar de página o pantalla durante la sesión de la cuenta. No se guardan nuevas copias de productos en localStorage. Cerrar sesión o recargar reinicia ese borrador.

## Contenido y cálculos

- Empresa, fecha/hora de generación en la zona horaria de Colombia y persona que genera el informe.
- Código, nombre, marca, categoría, condición, cantidad y unidad de medida por producto. Cada fila del inventario se conserva por su ID, aunque comparta nombre o marca con otra.
- Peso por unidad en g/kg y peso total convertido a kg con el cálculo compartido de la aplicación.
- Valor unitario COP y valor de stock: cantidad total por valor unitario, redondeado a dos decimales. Se suman los importes registrados; los productos con precio unitario cero se identifican en el resumen.
- Ubicación completa: almacén → estantería → nivel → caja, o Sin ubicación asignada cuando no hay datos.
- Resumen de productos, cantidades por unidad, peso y valor. No se suman metros, unidades, rollos o kilos como si fueran una misma unidad.

El informe utiliza **stock total**, incluidas las unidades dañadas declaradas. No deduce daños de la condición. Un stock pendiente se imprime como Pendiente y no se incorpora como cero a los totales. Los pesos ausentes también quedan pendientes; el resumen distingue totales parciales y ausencia de pesos verificables. Se conservan los metadatos originales en Supabase.

## Lectura y conservación

Admin, operador y consulta pueden usar Informes según las políticas existentes de lectura de inventario, ubicaciones y empresa. No se amplían permisos y no se necesita SQL adicional. La aplicación no escribe stock, movimientos, salidas ni remisiones al generar el informe.

Las consultas de productos se realizan en lotes de hasta 100 IDs para evitar límites de URL o truncamientos del servidor en selecciones grandes. La selección del listado proviene del inventario completo cargado, no solo de una página remota limitada. Los datos se copian al generar: cambios posteriores no revalúan el PDF ya abierto. No es un registro histórico persistido ni una transacción simultánea entre todas las consultas; el informe refleja los datos obtenidos durante su generación.

Las fotografías no se incorporan ni se convierten. El PDF se guarda desde el navegador por decisión del usuario; el servidor no crea archivos públicos de informes. Una nueva generación consulta los datos vigentes.

## Implementación y comprobación

- domain/inventoryReport: selección por ID, copia de filas, sumas por unidad, pesos y valores parciales.
- data/inventoryReport: lectura de productos seleccionados y catálogos/empresa existentes, sin escrituras.
- InventoryReportsView: selección múltiple, búsqueda, filtros, paginación y protección de solicitudes repetidas.
- components/reports: contenido, medición/paginación A4 y visor imprimible, con el mismo tratamiento de foco y movimiento reducido.

Las pruebas locales cubren cálculos con decimales y unidades mixtas, daños declarados, pendientes, precios cero, copias estables, ubicación completa, selección al filtrar/paginar, errores/reintentos, doble generación, productos no disponibles y lecturas de más de 1000 IDs. Se comprueba contenido del PDF y conservación de filas en la paginación; no se prueban geometría, rendimiento físico ni un snapshot concurrente real. La revisión visual en móvil, tablet, PC e impresión corresponde al usuario. No se utiliza automatización de navegador ni se generan operaciones ficticias en Supabase real.

Verificación del 28 de octubre: typecheck, lint, 200 pruebas unitarias y 37 de integración (237 en total) y build correctos con Node 22.23.3 / pnpm 11.19.0. Se añadieron seis pruebas de informes y se amplió la navegación para los tres roles. Sin escrituras de prueba en Supabase ni automatización de navegador; revisión visual de PDF/dispositivos pendiente del usuario.

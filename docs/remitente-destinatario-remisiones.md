# Salidas: proyecto, remitente, destinatario y transportador

Actualizado el 27 de octubre de 2026.

## Crear o elegir proyecto

Seleccione uno activo o escriba un nombre nuevo. Administración debe indicar también la ciudad antes de Crear y seleccionar; un error conserva el borrador y el guardado bloquea clics repetidos. El campo pide solo ciudad, sin dirección ni departamento. La dirección de entrega se indica en Lugar de destino. Los otros roles eligen proyectos existentes.

Los proyectos anteriores no se modifican ni se les inventa una dirección. Si Bogotá u otro proyecto ya creado quedó vacío, administración puede completar Ciudad del proyecto en Administración de datos → Proyectos → Editar. Las remisiones futuras toman esa ubicación; las ya emitidas conservan la copia anterior.

## Completar la salida

- Proyecto y salida: proyecto, lugar de remisión, lugar de destino y fechas de salida/devolución. Ubicación del proyecto y lugar de destino conservan su significado independiente.
- Remitente: Entrega en bodega, Cargo de quien entrega y Teléfono del remitente. Nombre y cargo siguen iniciando con los datos de la cuenta; pueden editarse como antes.
- Destinatario: nombre de la persona o entidad destinataria y teléfono. El nombre es obligatorio. No se pregunta cargo del destinatario.
- Transportador y vehículo: nombre, cédula, teléfono y placa. Los teléfonos del remitente/destinatario no vuelven a aparecer aquí.

Cliente / destinatario del PDF y el destinatario de la tarjeta de Remisiones usan el nombre escrito en Destinatario. Se elimina Entregar a duplicado. El teléfono acompaña al destinatario y su firma. El cliente del proyecto queda como metadato independiente y como alternativa para documentos sin recibido_por; no hay que crear otro cliente para que el documento muestre destinatario.

## Cabecera y bloques del PDF

Tres columnas iguales: logo totalmente a la izquierda dentro del margen imprimible; nombre, NIT, dirección y teléfono de empresa centrados respecto a la página; formato y fecha a la derecha. El bloque central tiene al menos 78 px de alto como el logo y distribuye verticalmente el texto, con fuente de 13 px y nombre a 14 px. No se añaden las líneas negras de referencia de la captura. El código completo ocupa debajo una fila completa, alineada a la izquierda, a 18 px, y puede ajustar líneas sin cortar texto.

Proyecto/salida tiene tres columnas: Proyecto de obra, Lugar de remisión y Ubicación del proyecto en la primera fila; Lugar de destino, Fecha de salida y Fecha de devolución en la segunda. Remitente y destinatario tienen contenedores independientes: el remitente coloca entrega y teléfono en dos columnas, con el cargo debajo; el destinatario conserva su lista. Transporte conserva su bloque y las tres firmas permanecen separadas. Se conserva A4, margen, medición del logo/cabecera, paginación dinámica, materiales, cantidades, pesos, valores y observaciones. La vista previa mantiene su escala en móvil, tablet y PC.

## Datos y verificación

La separación de remitente y destinatario no requiere SQL. El código con ciudad del proyecto requiere la migración adicional descrita en [Código por ciudad](ciudad-del-proyecto-remision.md). Se reutilizan recibido_por, cargo_entregado y telefonoRemite/telefonoRecibe del JSON datos_transporte, ya admitidos por las RPC. La app deja de enviar cargo_recibido desde el formulario nuevo; la RPC lo recibe vacío como antes cuando no se declaraba. No se eliminan columnas, datos ni mapeos históricos. No se alteran fotografías ni stock por este cambio y no se reconstruyen copias de empresa/proyecto a partir del estado actual.

Se prueban creación con ubicación, borradores y errores, doble guardado, roles, separación de teléfonos, conservación del resto de datos de transporte, receptor en tarjeta/PDF, cliente alternativo y reglas de alineación CSS. DOM y pruebas unitarias no miden geometría, cortes de página físicos ni contraste; la revisión visual e impresión quedan con el usuario. No se usa computer use ni automatización de navegador ni se generan salidas ficticias en producción.

Verificación del 27 de octubre: typecheck, lint, 193 pruebas unitarias y 35 de integración (228 en total), y build correctos con Node 22.23.3 / pnpm 11.19.0. La primera suite también detectó la espera fija de 30 ms de dialogHistory y una expectativa antigua de nombre/cargo en una línea; se actualizó esa expectativa para la nueva presentación y la repetición completa pasó. No cambió la navegación. Sin automatización de navegador ni operaciones de prueba en Supabase real; geometría e impresión pendientes de revisión del usuario.

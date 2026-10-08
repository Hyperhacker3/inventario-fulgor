export const helpGuide = [
  { title: 'Inicio y notificaciones', items: [
    'Consulte el resumen de existencias, valores del inventario, material dañado y proyectos. La campana reúne alertas de stock agotado o por debajo del mínimo configurado.',
    'Toque una alerta para abrir el producto. Ver más permite consultar todas las alertas; los nombres largos se muestran completos.',
  ] },
  { title: 'Buscar y filtrar el inventario', items: [
    'La búsqueda por código, nombre o marca se actualiza al escribir. La X borra el texto. Los productos con actividad más reciente aparecen primero, incluyendo ediciones, entradas y salidas.',
    'Junto al contador están los iconos de cuadrícula, lista y filtros. Los filtros empiezan ocultos; puede combinar categorías, estado, stock y almacén → estantería → nivel → caja. Ocultar el panel conserva los filtros; Limpiar filtros los restablece.',
    'Los estados son BUENO, REGULAR, MALO, EN REPARACIÓN y RETAZOS. Los estados antiguos MEDIO y OBSOLETO se presentan como REGULAR y MALO.',
    'Los nombres muestran hasta dos líneas. La lista móvil prioriza nombre, cantidad/unidad y salida; tablet y PC conservan el código. En cuadrícula aparecen MARCA, CÓDIGO y UBICACIÓN (solo almacén), con Sin especificar para datos vacíos.',
  ] },
  { title: 'Detalle y edición del producto', items: [
    'Abra un producto para consultar sus fotos, nombre completo, código, categoría, marca, estado, ubicación completa, peso, valor, comentarios y cifras de Stock, Disponible y Dañado.',
    'Las cinco acciones son Editar (lápiz azul), Entrada (verde), Ajuste (amarillo), Agregar a la salida (rojo) y Archivar (violeta), según permisos. El botón permanece hundido mientras su ventana está abierta.',
    'Editar abre una ventana encima de la ficha. Guardar, cancelar o cerrar vuelve al detalle conservando su posición. Puede crear estanterías, niveles y cajas; cambiar una ubicación superior limpia las selecciones dependientes.',
    'La X permanece visible al desplazarse. También puede cerrar tocando fuera, con Escape o con Retroceder: primero se cierra la ventana superior. Los cierres se bloquean durante un guardado pendiente.',
  ] },
  { title: 'Entradas: recibir y registrar materiales', items: [
    'Busque y seleccione un producto existente, indique cantidad y motivo y registre la entrada. Se suma al stock y se guarda responsable, fecha y movimiento, sin generar remisión.',
    'Sin selección, administración puede registrar un material nuevo en esta misma pantalla: código, categoría, nombre, marca, estado, ubicación, fotos, cantidad inicial, mínimo, daños, peso y valor. Quitar selección vuelve al alta.',
    'Puede crear prefijos, categorías, estanterías, niveles y cajas desde el formulario. El código estimado se confirma al guardar. Nombre y marca se guardan en mayúsculas.',
    'Si hay un error, la pantalla se desplaza al campo o mensaje y conserva el borrador. Tras guardar correctamente vuelve al inicio. Los botones −/+ cambian una unidad; el campo no tiene flechas internas.',
  ] },
  { title: 'Ajustes de stock', items: [
    'Ajuste permite registrar una variación positiva o negativa con motivo y responsable. Administradores y operadores pueden ajustar productos con stock conocido. Solo administración puede resolver stock pendiente indicando la cantidad comprobada. La operación queda en el historial.',
  ] },
  { title: 'Preparar una salida', items: [
    'Use el carrito rojo para agregar un producto a Salidas. En cuadrícula está sobre la foto, abajo a la derecha. Revise cantidades, disponibilidad y materiales; puede quitar productos antes de confirmar.',
    'Indique proyecto o destino, lugar de remisión, lugar de destino y los datos de entrega, recepción y transporte correspondientes. Las fechas usan el calendario de la aplicación. Los nombres y lugares se registran en mayúsculas.',
    'Las fotos son opcionales. Puede subir varios archivos o capturar varias seguidas: Capturar, revisar y Añadir y tomar otra; Añadir y terminar guarda la última y cierra. Repetir descarta solo la vista previa. Terminar conserva las fotos añadidas.',
    'Registrar salida y generar remisión confirma el descuento de stock y crea el documento. Agregar al carrito no descuenta unidades. Si falla la operación, se conservan los datos para corregir o reintentar.',
  ] },
  { title: 'Cámaras y fotografías', items: [
    'La cámara o lente elegido se recuerda en este navegador para las siguientes fotos de productos y salidas, incluso tras recargar. Si deja de estar disponible, se intenta abrir la predeterminada. En móviles se usan lentes traseros identificados; en PC puede elegir cámaras integradas o USB.',
    'Las fotos de productos usan un recorte cuadrado de 600 píxeles. Puede añadir fotos adicionales, cambiar la principal y quitar imágenes del borrador. Las fotos de salida conservan el encuadre completo, con un máximo de 600 píxeles en el lado mayor.',
    'Capturar ocupa toda su fila en móvil. Use Elegir archivo si la cámara no está disponible. Las imágenes pendientes se conservan durante la sesión; solo la elección de cámara se guarda como preferencia local.',
  ] },
  { title: 'Remisiones e historial', items: [
    'Remisiones muestra código, fecha, proyecto, destinatario y número de materiales de salida. La cabecera de cada tarjeta incluye PDF y Fotos. El código sigue REM-ORIGEN-DESTINO-AAAAMMDD-006, con consecutivo anual.',
    'El PDF se alinea arriba e incluye logo, NIT debajo del logo, empresa, origen, destino y todos los materiales, con columnas de peso unitario y total. Conserva los datos de emisión aunque después cambie el producto o la empresa.',
    'Historial permite consultar y filtrar movimientos. Los movimientos recientes del detalle también permiten abrir PDF y Fotos de sus salidas. El registro fotográfico tiene su propia galería y queda fuera del PDF.',
  ] },
  { title: 'Administración de datos', items: [
    'Reúne Códigos, Categorías, Almacenes, Estanterías, Niveles, Cajas, Proyectos, Archivados y Empresa. Cada sección tiene su propio color y la misma selección hundida que la navegación.',
    'Las ubicaciones usan tarjetas con código, nombre, valor total, valor del material dañado y Editar. Cree o edite almacén → estantería → nivel → caja. Las cajas anteriores sin nivel pueden asignarse al editar.',
    'Gestione prefijos y categorías para nuevas altas, y cree, edite, finalice o reactive proyectos. Empresa permite cambiar nombre, NIT, logo, dirección y teléfono; el logo también aparece en la navegación.',
  ] },
  { title: 'Archivar, recuperar y permisos', items: [
    'Archivar abre una confirmación con el estilo de la aplicación y retira el producto del inventario activo. En Administración de datos → Archivados puede abrirlo y Desarchivar conservando código, cantidades, fotos e historial.',
    'Administración puede eliminar definitivamente un producto archivado tras escribir su código exacto. Se conservan las remisiones y movimientos históricos.',
    'Administradores gestionan datos, altas, edición, ajustes y archivados; operadores registran entradas, salidas y ajustes de materiales existentes con stock conocido; las cuentas de consulta acceden a la información sin modificarla.',
  ] },
  { title: 'Navegación y apariencia', items: [
    'En móvil, el menú reúne las pantallas y la barra inferior muestra Inicio, Inventario, Entradas y Salidas según permisos. Los colores propios de los iconos se mantienen en claro y oscuro.',
    'Los iconos se rellenan al seleccionar, pulsar o pasar el mouse; la selección permanece hundida. Las ventanas cierran suavemente y Retroceder cierra primero la superior. La preferencia de reducir movimiento desactiva las animaciones.',
  ] },
];

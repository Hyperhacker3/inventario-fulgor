# Navegación y formularios en móvil y tablet

La ficha cierra al tocar el fondo exterior, conservando los clics interiores y desplegables; las operaciones pendientes bloquean X/Escape/cierre exterior. Editar usa un SVG para evitar que una fuente antigua muestre EDIT. Su formulario permite crear estantería, nivel y caja con los mismos controles que Nuevo ítem, adaptados al ancho y con IDs independientes. Menú móvil y sidebar comparten colores semánticos por función, manteniendo Entrada verde y Salida roja. Los accesos adicionales a Administración se retiran de Salidas y Nuevo ítem.

Estado de diseño al 7 de octubre de 2026: Neumorfismo es el único estilo. El usuario retiró Liquid Glass y su botón de Ayuda. La preferencia antigua de estilo se descarta al arrancar; claro/oscuro se conserva con transición de 1,5 segundos, salvo movimiento reducido. El logo de la cabecera compacta no tiene marco, fondo ni sombra. Navegación lateral, stock, pestañas de Administración y lista/cuadrícula comparten reposo plano y selección hundida. El menú móvil y la barra inferior comparten estos estados con escritorio. La revisión visual sigue pendiente y el despliegue se verifica por separado. Detalles en [estilos de interfaz](estilos-interfaz.md).

La navegación compacta se utiliza por debajo de 1280 px, para aprovechar también el ancho de las tablets en horizontal. La barra inferior conserva Inicio, Inventario, Entradas y Salidas según el rol de la cuenta. El menú reúne todas las pantallas permitidas, además de búsqueda, ayuda y cierre de sesión.

El menú es una capa fija: no desplaza el contenido. Tiene transición de apertura y cierre, botón de hamburguesa animado, cierre al tocar fuera, al elegir una pantalla, con Escape y al regresar con el navegador. El foco queda dentro del menú mientras está abierto y vuelve al botón al cerrarlo. Las notificaciones también se recogen al tocar fuera.

El menú se monta directamente en `body`, fuera de la capa de la cabecera. Su ancho máximo es de 300 px y su altura está limitada; solo la lista de opciones tiene desplazamiento, manteniendo visibles la búsqueda y los controles de ayuda y sesión. La barra inferior ocupa espacio dentro de la columna de la aplicación, en lugar de flotar encima de las listas y formularios.

Las ventanas y pantallas conservan animaciones de 180 ms y los botones responden visualmente al pulsarlos. Los 1,5 segundos se reservan para cambiar la paleta. La preferencia del sistema de reducir movimiento desactiva estos efectos. Los campos tienen un tamaño legible en pantallas compactas y los accesos principales tienen superficies táctiles de al menos 44 px. La cuadrícula del inventario calcula sus columnas con el espacio disponible; los filtros se pueden recoger por debajo de 1024 px.

Los campos de una línea y selectores comparten una altura de 44 px. Las descripciones siguen siendo multilínea, se redimensionan solo verticalmente y no se pueden reducir por debajo de 44 px. El foco de campos y selectores usa sombra interior sin contorno azul. Las categorías reservan espacio para sus sombras; stock queda plano cuando está inactivo y hundido al seleccionarlo. Las acciones usan fondo neutro y texto azul o semántico en ambas paletas. Ver elemento conserva una sola fila de acciones con iconos, separación adaptable y bloques separados por 24 px.

En Inventario, Historial y Almacenes se puede tocar toda la fila o tarjeta del producto para abrir el detalle. El nombre no se subraya ni tiene relieve propio y conserva acceso con teclado; el foco resalta el producto completo. La lista de Inventario elimina el ojo redundante y conserva salida; Cuadrícula retira Detalles y conserva la acción de salida con icono rojo. Los controles sin stock siguen deshabilitados. PDF/Fotos tienen altura de 44 px, columnas iguales y se apilan al faltar ancho. El desplazamiento de hover común a botones y productos se limita a dispositivos con puntero preciso y hover; no se activa con el toque y respeta movimiento reducido.

La cabecera ya no muestra Supabase Activo. El avatar utiliza el mismo tamaño de 44 × 44 px y relieve que notificaciones y claro/oscuro. El logo reduce su ancho por debajo de 380 px para dejar espacio a los controles. Nueva Remisión se eliminó de la barra lateral por duplicar Salidas. Lista/cuadrícula mantiene controles de al menos 44 × 44 px y selección hundida; Administración conserva su selector compacto sincronizado con las pestañas de escritorio.

Los campos numéricos compartidos ocultan las flechas internas del navegador y bloquean el incremento con arriba/abajo. Las cantidades siguen editándose directamente o mediante −/+ de una unidad, respetando stock disponible y límites. Se conservan entrada manual de decimales, campos vacíos y validación.

Administración → Empresa aparece también en el selector compacto. Nombre, NIT, dirección y teléfono se apilan en móvil; el logo mantiene proporciones sin recorte. La navegación usa el logo compartido, con altura limitada para conservar los controles de la cabecera. Las remisiones imprimen NIT 800.176.581 bajo el logo por defecto y conservan la empresa al emitir cada documento. Activación mediante la nueva migración en `docs/datos-empresa.md`.

Los controles del producto, almacenes y fotografías usan columnas que permiten ajustar el texto. Las secciones de administración usan una cuadrícula en escritorio y un selector con iconos en móvil. Las filas de búsqueda de Entradas separan la imagen, el texto y Seleccionar, y usan iconos compactos cuando no hay foto. Entradas y Salidas muestran sus cinco resultados por página sin una segunda zona de desplazamiento dentro de la lista.

El selector de fotos adapta las columnas al espacio de su propio contenedor: la principal queda centrada y las adicionales forman una cuadrícula. Quitar aparece sobre cada foto y Hacer principal debajo. Las fotos del registro de salida también se distribuyen según el ancho disponible.

La cuadrícula de Inventario coloca el botón rojo de salida sobre la fotografía, abajo a la derecha, con superficie táctil de 44 × 44 px. El contador de fotos queda abajo a la izquierda y el stock arriba a la derecha. Se elimina la fila inferior de acción; en lista se conserva la columna Acciones. Tocar salida no abre también la ficha.

Al tomar una foto principal, adicional o del registro de salida, **Capturar ocupa todo el ancho de su fila en móvil**, por debajo de 640 px. Elegir archivo y Cambiar cámara comparten la fila anterior. El botón se ajusta al contenedor y conserva al menos 44 px de altura; tras capturar, Repetir/Usar foto mantiene sus columnas. Revisar en ambas orientaciones del teléfono y paletas.

## Teclado

La ficha tiene una única X flotante de 44 px fuera del área de scroll, visible sobre la foto y al consultar los datos inferiores. No hay barras de código/categoría ni Cerrar; esos datos pasan al bloque ordenado bajo foto/nombre, junto a marca, estado, ubicación completa, peso, valor y comentarios. Una columna bajo 400 px y dos desde ese ancho. Las cifras de stock/disponible/dañado son mayores; las cinco acciones usan una sola fila de iconos con etiquetas accesibles, colores y superficies de al menos 44 px de alto. Guardar/Cancelar quedan en el formulario. La navegación inferior compacta quita palabras y mantiene iconos Inicio azul, Inventario violeta, Entradas verde y Salidas rojo, selección hundida, insignias y ocultación al abrir el teclado.

Lista de Inventario, por debajo de 640 px, muestra nombre, cantidad/unidad y el icono de salida dentro del ancho disponible, sin código/foto ni scroll horizontal. Desde 640 px recupera código/foto. Nombres de lista y cuadrícula reservan dos líneas con puntos suspensivos, también en PC; tocar el producto abre el nombre completo. Cuadrícula oculta código en móvil. La última modificación sitúa el producto al principio, incluyendo entradas/salidas y actualizaciones en tiempo real. Los buscadores no tienen Buscar/Limpiar; para abrir Inventario desde el menú se mantiene Enter del teclado y el acceso Inventario. Limpiar filtros se conserva.

Nuevo ítem, Entradas y Salidas hacen scroll al primer campo inválido o mensaje de error, también en altas de ubicaciones/categorías; conservan borradores y vuelven al inicio al confirmar el guardado. Movimiento reducido evita animar el desplazamiento. Nivel y Caja tienen claves independientes para no duplicarse al cambiar la ubicación.

El inventario muestra nombres en mayúsculas más grandes, en negrita y hasta dos líneas con elipsis. La lista deja solo el nombre debajo de la imagen; categoría queda en su columna y la unidad junto a Stock. Cuadrícula conserva marca/código/ubicación, sin peso/unidad/categoría ni Detalles, con una única acción de salida de icono rojo. Guardado en mayúsculas y activación del servidor en `formularios-y-nombres.md`.

Claro/oscuro usa un barrido suave de izquierda a derecha; en navegadores sin View Transitions se utiliza un fundido de 1,5 segundos. Neumorfismo muestra relieve mediante sombras y evita bordes delineados; el foco del teclado conserva su indicador visible. La barra inferior, el menú y las ventanas usan Neumorfismo.

Las ventanas conservan el foco al recibir actualizaciones de datos o nuevas funciones de cierre. En móvil, la selección de cantidad enfoca inicialmente el botón de cerrar; el teclado se abre cuando el usuario toca el campo. Guardar un nuevo ítem tampoco vuelve a abrirlo automáticamente.

Se utiliza la altura de `VisualViewport` para adaptar el espacio disponible en dispositivos móviles. La barra inferior se oculta si hay un campo de texto enfocado y la altura se reduce más de 150 px sin zoom. Cambiar entre campos espera al siguiente frame para evitar oscilaciones intermedias. Esta detección es una aproximación; depende del comportamiento del navegador y del teclado. Referencia: [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

## Verificación

- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` y `pnpm build`.
- Pruebas de DOM para permisos, montaje del menú fuera de la cabecera, cierre exterior, Escape, foco estable tras actualizar datos, ventanas superpuestas, apertura explícita del teclado, ocultación de la barra inferior y acciones de las fotografías.
- No se utilizaron navegadores automatizados ni computer use. La revisión visual y el teclado real quedan por comprobar en dispositivos físicos.

Tras el despliegue, probar desde un teléfono y una tablet:

1. Abrir y cerrar el menú desde cualquier pantalla; tocar fuera y elegir otra pantalla.
2. Editar un campo, pasar a otro y volver, comprobando que el teclado no se cierre sin motivo.
3. Abrir la selección de cantidad: el teclado debe esperar al toque en el número.
4. Abrir la cámara desde la ficha y cerrarla, conservando la ficha debajo.
5. Girar el dispositivo y comprobar la cuadrícula, el menú y la barra inferior.
6. Llegar al final de Entradas, Archivados y Almacenes: sus últimos botones y filas deben quedar por encima de la barra inferior.
7. Añadir varias fotos, cambiar la principal y quitar una adicional; verificar que los controles se mantienen separados.
8. Abrir Ayuda desde el menú y comprobar que ya no existe un cambio de estilo y que Cerrar sigue accesible. Revisar el logo sin marco y su acceso a Inicio.
9. Probar Neumorfismo claro y oscuro, incluyendo selectores desplegados y ventanas de cámara/fotografías. Verificar el barrido de aproximadamente 1,5 segundos y animaciones de navegación de 180 ms.
10. Recargar y comprobar que se conserva la paleta y se utiliza Neumorfismo incluso con una preferencia antigua de Glass; repetir con movimiento reducido para comprobar que el cambio no se anima.

Las reglas de navegación y controles no requieren SQL. La configuración compartida de empresa requiere `20261007000100_company_profile.sql`, sin cambiar productos ni existencias.

## Revisión de galerías, fechas y salidas

Salidas incorpora lugares de remisión y destino obligatorios, apilados en teléfonos y en dos columnas cuando hay ancho. El código de emisión largo se ajusta en las tarjetas de Remisiones sin desbordar junto a la fecha. El PDF conserva A4 rígido y escala adaptable, ahora alineado arriba, con NIT integrado en la tipografía y peso unitario/total en columnas separadas. La emisión requiere activar la migración de lugares; instrucciones en `lugares-y-codigos-remision.md`.

El menú y la barra inferior comparten los estados de escritorio: opción inactiva plana, selección hundida y hover elevado únicamente con mouse. Los puntos de las galerías no muestran marco, fondo ni sombra; conservan objetivos táctiles de 44 × 44 px. Movimientos recientes reserva espacio para las sombras. En Salidas, las tarjetas muestran nombres completos, cantidad y quitar separados y permiten abrir el producto desde su superficie. El encabezado de registro fotográfico está dentro del panel.

Las fechas abren un calendario de la aplicación en español, con paletas claro/oscuro, mes/año y semana desde lunes. El panel se adapta al viewport y permite desplazarse con poca altura, sin recurrir al calendario del sistema. En teléfono el foco inicial se coloca en Cerrar, evitando abrir el teclado; en PC se coloca en el día seleccionado. Escape cierra los niveles desde el más interno y devuelve el foco al control de fecha.

Revisión manual pendiente: comprobar estos estados en menú y barra inferior, cambiar fotos tocando los puntos, desplazarse por movimientos recientes, editar cantidades sin abrir accidentalmente un producto, revisar nombres largos/título fotográfico y elegir fechas con el teléfono en ambas orientaciones y paletas. Las pruebas DOM y CSS comprueban eventos/cascada; no sustituyen esta revisión de geometría real.

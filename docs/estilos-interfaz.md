# Neumorfismo y comportamiento de la interfaz

Actualizado el 7 de octubre de 2026. **Neumorfismo es el único estilo de la aplicación.** El usuario pidió retirar Liquid Glass y el botón de cambio de Ayuda. La implementación anterior queda registrada como historial en `reports/verification.md`; esta guía describe el estado vigente. La revisión visual se realiza con el usuario y el despliegue se comprueba por separado.

## Decisiones vigentes

- Superficies neutras, separadas por sombras, sin bordes delineados ni anillos decorativos. Los campos y selectores indican el foco con una sombra interior más profunda, sin contorno azul. Los botones conservan el indicador de teclado y se mantienen los bordes que dibujan símbolos.
- Claro/oscuro permanece disponible en cabecera de escritorio y menú móvil, con preferencia local. Sin elección explícita, sigue al dispositivo.
- El cambio claro/oscuro revela la paleta de izquierda a derecha durante **1,5 segundos**. Sin View Transitions o si la captura falla, utiliza un fundido de la misma duración. Movimiento reducido aplica el cambio directamente.
- Ayuda contiene las explicaciones y Cerrar; ya no ofrece un selector de estilo.
- El arranque fija `data-ui-style="neumorphism"`, descarta la antigua clave `el_turpial_ui_style` y conserva `el_turpial_theme`. Una preferencia de Glass guardada o recibida desde otra pestaña no puede cambiar el material. El almacenamiento bloqueado no impide el arranque.
- Se conservan el azul de EL TURPIAL, logo, favicon, fuentes locales, funciones de inventario y permisos. No se necesitan cambios SQL.
- Las remisiones imprimibles conservan contenido, paginación, colores y logo; los efectos de pantalla no se aplican al documento.

## Barra lateral del laboratorio

La barra lateral izquierda reproduce las capturas de referencia: botones **planos en reposo**, sin fondo propio, contorno ni sombra exterior permanente. La pantalla activa usa la superficie neutra, texto azul en negrita y **sombra interior**, con `aria-current="page"`.

Al pasar el mouse por una opción inactiva aparece un fondo sutil y **sombra de relieve**; al salir desaparecen. La pulsación y la opción activa mantienen la sombra interior. Se conserva el desplazamiento común de 2 px durante 180 ms, limitado a hover con puntero preciso y desactivado con movimiento reducido. Ayuda y Cerrar sesión comparten el reposo plano; el cierre de sesión utiliza texto rojo al pasar el mouse. **Nueva Remisión se eliminó** porque duplicaba el acceso Salidas; esa pantalla sigue permitiendo crear remisiones.

El logo de empresa conserva el acceso a Inicio, **sin marco, relleno ni sombra**, incluso al pasar el mouse o pulsarlo. Esto incluye el logo de la cabecera compacta. El foco del teclado permanece visible. Los recursos de imagen aprobados no se modifican.

`src/sidebar.css` se importa después de las reglas comunes y comparte el acabado plano con stock, el selector lista/cuadrícula y las siete pestañas de Administración mediante `ui-flat-choice`. Stock y vistas identifican la selección con `aria-pressed="true"`; las pestañas mantienen `role="tab"` y `aria-selected="true"`. La selección permanece hundida y en negrita; las opciones inactivas quedan planas y se elevan en hover. Todos representa la ausencia de restricción de stock. La vista de Inventario sigue recordándose y el selector compacto de Administración permanece sincronizado. El menú móvil conserva su tratamiento actual.

## Campos, botones y productos

Los campos de una línea y selectores comparten **44 px de altura**; las descripciones conservan varias líneas, redimensionamiento vertical y una altura mínima de 44 px, incluyendo el relleno. El foco de buscadores, cantidades, formularios de prefijos/categorías y selectores usa sombra interior sin contorno azul; los buscadores compuestos la dibujan en el contenedor. Las opciones largas se abrevian visualmente y conservan el texto completo en el título/desplegable. El peso reserva ancho para su unidad y se apila por debajo de 480 px. Stock inicial tiene un campo y dos botones −/+ separados. La lista de categorías seleccionadas reserva 12 px alrededor de las sombras dentro de su zona de desplazamiento.

`NumberInput` aplica `ui-number-input` para ocultar las flechas internas en Chromium/WebKit y Firefox. Bloquea el incremento nativo con ArrowUp/ArrowDown, manteniendo edición, foco y eventos personalizados. Las acciones laterales de cantidad siguen cambiando una unidad y respetando disponibilidad/límites. Se conserva `type="number"`, la escritura manual de decimales, campos vacíos y la validación de mínimo, máximo y precisión; no se convierten existencias fraccionarias en enteros.

Fuera de la excepción de barra lateral, las acciones mantienen el fondo neutro, forma y relieve de Anterior/Siguiente. El texto es azul `#3e4e9e` o rojo, verde o amarillo según el significado, con variantes claras en oscuro. Ver elemento separa sus bloques 24 px y sus acciones 16 px, usando más filas si falta espacio.

Botones y productos comparten el desplazamiento horizontal de hover de 2 px en 180 ms en dispositivos con mouse. En Inventario, Historial y Almacenes, toda la fila o tarjeta abre el detalle. El nombre no se subraya ni tiene un relieve propio: conserva un botón nativo para teclado y el foco resalta el producto completo. La lista de Inventario retira el ojo redundante y conserva salida; la cuadrícula conserva Detalles. Las acciones internas y los controles deshabilitados siguen siendo independientes. Seleccionar texto para copiarlo tampoco abre la ficha. Las tablas separan las filas y reservan espacio para las sombras.

Historial conserva los nombres, códigos y cantidades registrados en cada movimiento. Si el producto sigue disponible, abre su ficha actual; si fue eliminado, el movimiento sigue legible y sus documentos continúan accesibles. Almacenes aplica la misma superficie completa a productos en cajas, niveles, estanterías y sin asignación. PDF y Fotos comparten 44 px de altura y columnas de igual ancho que se apilan cuando falta espacio.

La cabecera retira el acceso Supabase Activo. El avatar conserva la identidad de la cuenta y comparte **44 × 44 px**, radio, superficie y sombra con las acciones de notificaciones y claro/oscuro. El logo compacto adapta su ancho en teléfonos pequeños para reservar espacio a estos controles; se mantiene el recurso de imagen aprobado.

## Implementación y verificación

- `src/appearance.css`: tokens de Neumorfismo, paletas, sombras y reglas sin bordes. Se retiraron las variantes de vidrio, desenfoque, reflejos registrados y fondos ambiente de Liquid Glass.
- `src/controls.css`: altura mínima, foco sin contorno, avatar, categorías y acciones de documentos.
- `src/interactions.css`: hover y superficies completas de productos; `src/shared/productInteraction.ts`: clic sin interferir con controles internos o copia de texto. `src/sidebar.css`: navegación, stock y logo.
- `index.html`, `src/shared/theme.ts` y `src/context/ThemeContext.tsx`: arranque fijo, limpieza de preferencia retirada y persistencia de claro/oscuro. El contexto expone únicamente tema y su acción; `UIStyleToggle.tsx` se eliminó.
- `src/shared/appearanceTransition.ts`: barrido, alternativa, cancelación y descarte de capturas obsoletas; mantiene formularios, foco y carrito sin remontar vistas. `APPEARANCE_TRANSITION_MS` es 1500 y `--theme-duration` es `1500ms`; conservar ambos coordinados.

Typecheck, lint, **134 pruebas unitarias y 25 de integración**, y build correctos. Las pruebas existentes amplían la cobertura a estados de Administración/lista/cuadrícula en ambas paletas, sincronización de pestañas y cantidades sin flechas nativas. Se comprueban −/+ de una unidad, bloqueo de arriba/abajo y escritura manual de decimales. Se mantienen las comprobaciones de foco, alturas mínimas, documentos, avatar, chips, productos completos, tema, permisos, navegación, valores por ubicación e impresión.

Las pruebas simuladas comprueban reglas, cascada y eventos; no miden movimiento, geometría, contraste ni rendimiento reales. Node 24.19.0 / pnpm 11.19.0 disponibles frente a Node 22.x declarado. No se utilizó computer use ni automatización de navegador, ni se modificó Supabase real.

## Revisión visual con el usuario

1. En claro y oscuro, revisar barra lateral, stock, pestañas de Administración y lista/cuadrícula en reposo, hover, pulsación y selección. La selección permanece hundida. Confirmar que Nueva Remisión ya no existe y Salidas conserva el acceso a emitir remisiones.
2. Revisar logo de escritorio y cabecera compacta, sin marco ni sombra; comprobar su acceso a Inicio y el foco de teclado.
3. Abrir Ayuda en escritorio/móvil: confirmar que ya no existe cambio de estilo. Recargar un navegador con preferencia antigua de Glass y comprobar Neumorfismo sin alterar su paleta guardada.
4. Alternar claro/oscuro y observar el barrido de 1,5 segundos; probar cambios rápidos, movimiento reducido y alternativa sin View Transitions. Conservar borradores, selector abierto y carrito.
5. Revisar Inicio, Inventario (lista/cuadrícula/filtros), Nuevo ítem, Entradas, Salidas, Historial, Administración, Almacenes y Remisiones. Incluir edición, alertas, cámaras y fotos. Comprobar hover/clic completo en productos, acciones independientes, copia de texto y teclado.
6. Comprobar foco sin contorno en búsquedas, cantidades y altas de prefijos/categorías; reducir una descripción hasta su límite de 44 px. Revisar chips, avatar y PDF/Fotos. En cantidades, confirmar ausencia de flechas internas y probar −/+ de una unidad, edición manual y límites de stock. En teléfono/tablet, comprobar menú, barra inferior, acciones visibles, campos, teclado y ausencia de hover persistente al tocar. Seguir también `docs/experiencia-movil.md`.
7. Revisar remisiones en pantalla e impresión/PDF, manteniendo contenido, paginación y logo.

La autorización permanente del usuario exige commit y push de cada cambio terminado y verificado. Confirmar el estado de Vercel y los recursos de la URL pública antes de afirmar que está publicado.

# Neumorfismo y comportamiento de la interfaz

Actualizado el 7 de octubre de 2026. **Neumorfismo es el único estilo de la aplicación.** El usuario pidió retirar Liquid Glass y el botón de cambio de Ayuda. La implementación anterior queda registrada como historial en `reports/verification.md`; esta guía describe el estado vigente. La revisión visual se realiza con el usuario y el despliegue se comprueba por separado.

## Decisiones vigentes

- Superficies neutras, separadas por sombras, sin bordes delineados ni anillos decorativos. Se conservan el foco visible del teclado y los bordes que dibujan símbolos.
- Claro/oscuro permanece disponible en cabecera de escritorio y menú móvil, con preferencia local. Sin elección explícita, sigue al dispositivo.
- El cambio claro/oscuro revela la paleta de izquierda a derecha durante **1,5 segundos**. Sin View Transitions o si la captura falla, utiliza un fundido de la misma duración. Movimiento reducido aplica el cambio directamente.
- Ayuda contiene las explicaciones y Cerrar; ya no ofrece un selector de estilo.
- El arranque fija `data-ui-style="neumorphism"`, descarta la antigua clave `el_turpial_ui_style` y conserva `el_turpial_theme`. Una preferencia de Glass guardada o recibida desde otra pestaña no puede cambiar el material. El almacenamiento bloqueado no impide el arranque.
- Se conservan el azul de EL TURPIAL, logo, favicon, fuentes locales, funciones de inventario y permisos. No se necesitan cambios SQL.
- Las remisiones imprimibles conservan contenido, paginación, colores y logo; los efectos de pantalla no se aplican al documento.

## Barra lateral del laboratorio

La barra lateral izquierda reproduce las capturas de referencia: botones **planos en reposo**, sin fondo propio, contorno ni sombra exterior permanente. La pantalla activa usa la superficie neutra, texto azul en negrita y **sombra interior**, con `aria-current="page"`.

Al pasar el mouse por una opción inactiva aparece un fondo sutil y **sombra de relieve**; al salir desaparecen. La pulsación y la opción activa mantienen la sombra interior. Se conserva el desplazamiento común de 2 px durante 180 ms, limitado a hover con puntero preciso y desactivado con movimiento reducido. Nueva Remisión, Ayuda y Cerrar sesión comparten el reposo plano; el cierre de sesión utiliza texto rojo al pasar el mouse.

El logo de empresa conserva el acceso a Inicio, **sin marco, relleno ni sombra**, incluso al pasar el mouse o pulsarlo. Esto incluye el logo de la cabecera compacta. El foco del teclado permanece visible. Los recursos de imagen aprobados no se modifican.

`src/sidebar.css` se importa después de las reglas comunes, para aplicar la excepción únicamente a los botones de la barra lateral y de marca. Los demás botones, el menú móvil y los productos conservan su tratamiento actual.

## Campos, botones y productos

Los campos de una línea y selectores comparten **44 px de altura**; las descripciones conservan varias líneas. Las opciones largas se abrevian visualmente y conservan el texto completo en el título/desplegable. El peso reserva ancho para su unidad y se apila por debajo de 480 px. Stock inicial tiene un campo y dos botones −/+ separados.

Fuera de la excepción de barra lateral, las acciones mantienen el fondo neutro, forma y relieve de Anterior/Siguiente. El texto es azul `#3e4e9e` o rojo, verde o amarillo según el significado, con variantes claras en oscuro. Ver elemento separa sus bloques 24 px y sus acciones 16 px, usando más filas si falta espacio.

Botones y productos comparten el desplazamiento horizontal de hover de 2 px en 180 ms en dispositivos con mouse. En Inventario, toda la fila o tarjeta abre el detalle: código, imagen, ubicación, stock y espacios interiores. El nombre no se subraya y conserva un botón nativo para teclado; el foco resalta el producto completo. Detalles y salida mantienen sus acciones independientes; una salida deshabilitada no abre la ficha. Seleccionar texto para copiarlo tampoco la abre. La lista separa las filas y reserva espacio para las sombras.

## Implementación y verificación

- `src/appearance.css`: tokens de Neumorfismo, paletas, sombras y reglas sin bordes. Se retiraron las variantes de vidrio, desenfoque, reflejos registrados y fondos ambiente de Liquid Glass.
- `src/controls.css`: altura común y superficies/colores de las acciones.
- `src/interactions.css`: hover común y productos clicables; `src/sidebar.css`: excepción de navegación y logo.
- `index.html`, `src/shared/theme.ts` y `src/context/ThemeContext.tsx`: arranque fijo, limpieza de preferencia retirada y persistencia de claro/oscuro. El contexto expone únicamente tema y su acción; `UIStyleToggle.tsx` se eliminó.
- `src/shared/appearanceTransition.ts`: barrido, alternativa, cancelación y descarte de capturas obsoletas; mantiene formularios, foco y carrito sin remontar vistas. `APPEARANCE_TRANSITION_MS` es 1500 y `--theme-duration` es `1500ms`; conservar ambos coordinados.

Typecheck, lint, **128 pruebas unitarias y 25 de integración**, y build correctos. Las pruebas de tema se actualizaron para cubrir preferencias retiradas, almacenamiento bloqueado, sincronización de paleta, conservación de formulario/selector y cambios rápidos. Dos pruebas CSS/DOM simulan estados de puntero para comprobar reposo plano, hover, selección/pulsación hundida, logo sin marco y botones exteriores conservados en ambas paletas. Se mantienen las pruebas de alturas, permisos, navegación y productos.

Las pruebas simuladas comprueban reglas, cascada y eventos; no miden movimiento, geometría, contraste ni rendimiento reales. Node 24.19.0 / pnpm 11.19.0 disponibles frente a Node 22.x declarado. No se utilizó computer use ni automatización de navegador, ni se modificó Supabase real.

## Revisión visual con el usuario

1. En claro y oscuro, revisar barra lateral en reposo, hover, pulsación y selección. Confirmar que únicamente la opción activa conserva sombra y que al salir el mouse desaparece el relieve de la opción inactiva.
2. Revisar logo de escritorio y cabecera compacta, sin marco ni sombra; comprobar su acceso a Inicio y el foco de teclado.
3. Abrir Ayuda en escritorio/móvil: confirmar que ya no existe cambio de estilo. Recargar un navegador con preferencia antigua de Glass y comprobar Neumorfismo sin alterar su paleta guardada.
4. Alternar claro/oscuro y observar el barrido de 1,5 segundos; probar cambios rápidos, movimiento reducido y alternativa sin View Transitions. Conservar borradores, selector abierto y carrito.
5. Revisar Inicio, Inventario (lista/cuadrícula/filtros), Nuevo ítem, Entradas, Salidas, Historial, Administración, Almacenes y Remisiones. Incluir edición, alertas, cámaras y fotos. Comprobar hover/clic completo en productos, acciones independientes, copia de texto y teclado.
6. En teléfono/tablet, comprobar menú, barra inferior, acciones visibles, campos, teclado y ausencia de hover persistente al tocar. Seguir también `docs/experiencia-movil.md`.
7. Revisar remisiones en pantalla e impresión/PDF, manteniendo contenido, paginación y logo.

La autorización permanente del usuario exige commit y push de cada cambio terminado y verificado. Confirmar el estado de Vercel y los recursos de la URL pública antes de afirmar que está publicado.

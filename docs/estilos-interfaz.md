# Liquid Glass y Neumorfismo

Fecha: 7 de octubre de 2026. **Estado: implementado y verificado; publicación solicitada por el usuario y revisión visual pendiente.** El resultado del despliegue se comprueba por separado. La demo de referencia se describe en `docs/CONTINUIDAD.md`.

## Decisiones confirmadas

1. Ofrecer **Liquid Glass** y **Neumorfismo** como dos estilos completos alternativos, elegidos mediante un botón. No mezclar aleatoriamente ambos tratamientos dentro de una misma selección.
2. Cambiar de estilo en tiempo real sin recargar la página, perder formularios, cerrar la sesión ni alterar el carrito de salidas.
3. Guardar la elección local para la siguiente visita. No requiere configuración ni tablas nuevas en Supabase.
4. Mantener claro/oscuro como una elección independiente: ambos estilos tienen que funcionar con ambas paletas. El modo de color sigue la preferencia del dispositivo cuando no hay elección explícita, como ocurre actualmente.
5. Aplicar el estilo a toda la UI: selectores y sus opciones, botones, campos, tarjetas, menús, notificaciones, avisos, ventanas de detalle, galerías y las demás pantallas.
6. Conservar el azul de EL TURPIAL, el logo y el favicon aprobados.
7. Conservar el formato de las remisiones PDF para impresión; cambiar la apariencia de la ventana de vista previa sin aplicar los efectos visuales al documento imprimible.

No forman parte del cambio Bento Grid, una importación de productos, la sustitución de la navegación ni modificaciones de permisos o reglas de stock.

## Decisiones adicionales del usuario

- **Neumorfismo predeterminado** para usuarios sin elección guardada o con almacenamiento bloqueado/inválido.
- Botón **al final del contenido de Ayuda y conexión**, después de las explicaciones y antes de Cerrar. Indica la acción «Cambiar a Liquid Glass» o «Cambiar a Neumorfismo» y muestra el estilo actual.
- Tanto el cambio de estilo como el cambio claro/oscuro duran **1,5 segundos**. Claro/oscuro revela la nueva paleta de izquierda a derecha con un borde suave; entre estilos se conserva el cambio gradual de superficies. Un segundo cambio cancela el efecto anterior y conserva la última elección; movimiento reducido elimina ambos efectos.
- Neumorfismo presenta superficies **sin bordes delineados**, separadas por sombras. Liquid Glass conserva sus contornos. El foco visible del teclado se mantiene como indicador temporal de accesibilidad.

La intensidad de sombras y transparencias adapta la demo a la interfaz existente; queda pendiente la evaluación visual del usuario.

## Uso y preferencias

En escritorio, abra **Ayuda y Guía** desde la barra lateral o **Ayuda** desde la cabecera. En móvil o tablet, abra el menú y elija **Ayuda**. Desplácese después de todas las explicaciones hasta **Estilo de la interfaz**; allí se muestra el estilo actual y el botón para pasar al otro. La ayuda permanece abierta durante el cambio.

El control claro/oscuro conserva su ubicación en la cabecera de escritorio y en el menú móvil. Al recargar se recuperan ambas elecciones; si no se ha elegido paleta, esta sigue la preferencia del dispositivo. Las preferencias pertenecen al navegador, no a la cuenta de Supabase.

| Preferencia | Valores guardados | Clave local | Comportamiento sin elección válida |
| --- | --- | --- | --- |
| Estilo | `neumorphism`, `glass` | `el_turpial_ui_style` | Neumorfismo |
| Paleta | `light`, `dark` | `el_turpial_theme` | Preferencia del dispositivo |

Las pestañas del mismo navegador reciben los cambios mediante el evento `storage`. Si el navegador bloquea el almacenamiento, se puede cambiar durante la sesión, pero la elección no queda guardada para la siguiente visita.

## Tratamiento visual

**Liquid Glass:** capas translúcidas, reflejos discretos y desenfoque sobre fondos con profundidad. Mantener suficiente opacidad detrás de texto y formularios; prever una alternativa opaca para navegadores sin soporte de `backdrop-filter`. Limitar superficies desenfocadas simultáneas, especialmente en móviles, para evitar efectos costosos al desplazarse. Es una adaptación web del estilo, no componentes nativos de iOS.

**Neumorfismo:** superficies de tono cercano al fondo, sombras de relieve y controles hundidos, sin bordes delineados ni anillos decorativos. Los bordes se hacen transparentes conservando su espacio, para evitar saltos de tamaño al alternar estilos. La regla cubre tarjetas, campos, avisos, separadores, marcos de fotos y ventanas, incluidos sus pseudo-elementos. Se mantienen las sombras, la forma, el texto y los estados para reconocer los controles. El indicador de foco de teclado sigue visible; las líneas que dibujan el icono del selector y el spinner, y el documento imprimible, conservan sus reglas independientes.

Estados comúnmente necesarios: reposo, hover, pulsado, seleccionado, foco de teclado, deshabilitado, carga, error y éxito. El estilo elegido debe ser coherente en todos ellos.

## Implementación

- Paleta y estilo separados: `data-theme="light|dark"` y `el_turpial_theme`; `data-ui-style="glass|neumorphism"` y `el_turpial_ui_style`. `ThemeProvider` gestiona ambos sin remontar el inventario.
- `index.html` inicializa ambas preferencias y el indicador de arranque antes de React. `initializeTheme()` en `src/shared/theme.ts` aplica las mismas elecciones y actualiza `color-scheme` y el color de la barra del navegador.
- `src/appearance.css` define tokens semánticos compartidos para fondo, superficies, campos, bordes, texto, marca, sombras y desenfoque. Las utilidades neutras existentes consumen esos tokens en todas las vistas; los colores de estado conservan su significado. La vista previa de remisiones utiliza la misma paleta, conservando el documento A4 independiente.
- `src/index.css` importa `appearance.css` después de `theme.css`, para que las variables de material prevalezcan sobre los colores neutros anteriores. Las reglas de estados de error, éxito y advertencia conservan sus colores.
- El CSS compartido adapta tarjetas, botones, campos y ventanas. Se conserva el selector personalizado, con su teclado, validación y opciones desplegadas; no se sustituye por un selector nativo. Las formas circulares de gráficos y controles se mantienen, y el fondo sin fotografía utiliza el material elegido.
- Los atributos y variables se aplican en `document.documentElement`, incluyendo los selectores, menús y modales que se montan en `document.body`.
- Las animaciones de apertura/cierre y transición de pantallas conservan **180 ms**. Entre estilos se animan colores, sombras, contornos, reflejos y filtros durante **1500 ms**; el fondo de vidrio se desvanece gradualmente. Se respeta `prefers-reduced-motion` y no se introduce un spinner entre pantallas.
- `src/shared/appearanceTransition.ts` utiliza `document.startViewTransition()` para claro/oscuro. La captura anterior permanece debajo mientras una máscara de borde suave revela la nueva paleta de izquierda a derecha durante **1500 ms**. `data-theme-sweeping` evita un fundido simultáneo debajo de la captura. El efecto no copia formularios ni remonta vistas; al terminar o cancelarse limpia sus atributos. Las actualizaciones obsoletas se descartan para conservar la última elección. Referencias: [startViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) y [skipTransition](https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition/skipTransition).
- Si el navegador no admite la API o la captura no puede iniciarse, se usa el cambio gradual de colores de **1,5 segundos**. Movimiento reducido aplica la elección directamente. Entre estilos se activa `data-theme-changing`; `APPEARANCE_TRANSITION_MS` es 1500 y `--theme-duration` es `1500ms`, con limpieza 50 ms después. Mantener ambos valores coordinados al modificarlos.
- El almacenamiento bloqueado o inválido no impide el arranque. El proveedor sincroniza cambios entre pestañas y vuelve a los valores predeterminados cuando se borran las preferencias.
- Las reglas visuales se limitan a pantalla y excluyen `.a4-print-container`, `.rm-measure` y sus descendientes. Se conserva `@media print`; solo se adapta la ventana que rodea al documento.
- El cambio modifica el contexto de apariencia y los atributos de raíz sin remontar las vistas ni el proveedor de inventario. No introduce consultas remotas ni datos de prueba.
- El subconjunto de Material Symbols es local. Si se añade un icono, verificar que existe en él; no descargar fuentes durante la compilación.

## Alcance de revisión

### Correcciones a partir de las cuatro capturas del usuario

- Navegación de escritorio y móvil: el área desplazable reserva espacio alrededor de los botones para evitar sombras recortadas en rectángulos; los botones no se encogen al faltar altura.
- Filtros: el material y la sombra pertenecen al contenedor exterior. Su interior conserva el recorte para abrir/cerrar el panel móvil, con la misma curvatura y sin cortar la sombra exterior.
- Selectores con clase `block`: utilizan `display: flex`, evitando que el `inline-flex` común los coloque junto a la etiqueta. Alcance dispone además la etiqueta sobre el selector; las tarjetas del dashboard tienen más separación.
- Stock inicial: un único relieve hundido envuelve los botones y el campo, evitando el doble efecto. Su altura coincide con los otros controles de stock y el foco de teclado se dibuja alrededor del grupo; los botones disponen de nombres accesibles y foco diferenciado.
- Peso: la unidad dispone de ancho intrínseco suficiente para su texto; por debajo de 480 px los controles se apilan. El campo numérico deja de estirarse por el texto partido del selector.

Estas correcciones se basan en las capturas y en la estructura/CSS. No implican una revisión visual automatizada de la aplicación y conservan preferencias, datos y transiciones.

Comprobar Inicio, Inventario (lista/cuadrícula/filtros), Nuevo ítem, Entradas, Salidas, Historial, Administración de datos (todas las secciones), Almacenes, Remisiones, inicio de sesión, ayuda y alertas. Incluir ventanas de edición, cantidades, cámara y fotos, además de selectores desplegados sobre ellas.

Mantener jerarquía almacén/estantería/nivel/caja, categorías múltiples, datos opcionales, estados importados, valores y pesos. Un cambio de estilo no debe modificar payloads de Supabase ni snapshots de las remisiones.

## Criterios de aceptación

- Las cuatro combinaciones (dos estilos × claro/oscuro) muestran todos los controles y tienen texto legible.
- La preferencia persiste al recargar y su actualización no altera la preferencia de color.
- Cambiar de estilo durante la edición conserva los datos escritos, el foco cuando sea posible y las cantidades del carrito.
- Selectores y portales tienen el mismo estilo que la pantalla; se mantienen teclado, Escape, cierre exterior y retorno del foco.
- En móvil y tablet no se ocultan acciones bajo la barra inferior, no hay desbordamiento horizontal y el teclado conserva su comportamiento actual.
- Liquid Glass dispone de alternativa sin desenfoque y conserva contornos. Neumorfismo utiliza sombras sin bordes delineados, conservando contraste, estados e indicador de foco de teclado.
- El arranque no muestra fuentes incompletas ni destellos de otro estilo. Solo el arranque inicial utiliza el spinner.
- Remisiones impresas conservan contenido, paginación, logo y legibilidad con cualquier estilo activo.
- Typecheck, lint, pruebas pertinentes y build pasan. No afirmar revisión visual o rendimiento real si únicamente se comprobaron CSS y DOM.

La implementación no requiere SQL. La comprobación visual real se realiza con el usuario, respetando la instrucción vigente de no usar computer use ni automatización de navegador.

## Revisión manual pendiente

1. En un navegador sin preferencia de estilo, confirmar que arranca Neumorfismo. Elegir Liquid Glass al final de Ayuda, cerrar y volver a abrir la ayuda, y recargar para verificar la persistencia.
2. Probar Neumorfismo claro, Neumorfismo oscuro, Liquid Glass claro y Liquid Glass oscuro. Revisar textos, controles, avisos, selección, foco de teclado y estados deshabilitados en las pantallas indicadas arriba.
3. Observar el barrido de izquierda a derecha al alternar claro/oscuro y el cambio gradual entre estilos, ambos de aproximadamente 1,5 segundos. Confirmar que Neumorfismo no conserva bordes delineados, incluidos los avisos y marcos de fotografías; Liquid Glass sí conserva contornos. Navegar o abrir/cerrar ventanas para comprobar que sus animaciones siguen siendo cortas. Repetir con movimiento reducido y, si se dispone de él, en un navegador sin View Transitions para comprobar la alternativa gradual.
4. Escribir un borrador y añadir cantidades al carrito; alternar el estilo y comprobar que se conservan. Abrir selectores y ventanas superpuestas para revisar su apariencia y el funcionamiento de Escape y del foco.
5. En teléfono y tablet, llegar al selector al final de Ayuda y comprobar acciones visibles, ausencia de desbordamiento horizontal y comportamiento del teclado. Seguir también `docs/experiencia-movil.md`.
6. Revisar una remisión en pantalla y en impresión/PDF con ambos estilos, comprobando paginación, logo y contenido. Comprobar Liquid Glass en un navegador sin soporte de desenfoque si se dispone de él.

Esta lista sigue pendiente de evaluación visual; las pruebas de DOM y la compilación no sustituyen la revisión de contraste, impresión y rendimiento en dispositivos reales.

## Verificación del ajuste a 1,5 segundos

Typecheck, lint, **116 pruebas unitarias y 25 de integración**, y build correctos. Se añadieron comprobaciones de captura diferida, cancelación y descarte de cambios anteriores, fallos de captura, ausencia de API, movimiento reducido, independencia del cambio de estilo y conservación de formulario/foco al cambiar de estilo mientras hay una captura pendiente. La revisión de selectores cubre bordes neutros, de estado y discontinuos, ventanas montadas en `body`, y exclusiones de impresión y símbolos. No se realizó verificación visual en navegador ni en dispositivos físicos.

## Verificación inicial del 7 de octubre (antes del ajuste a 1,5 segundos)

Typecheck, lint, 109 pruebas unitarias, 25 de integración y build correctos. Las comprobaciones DOM cubren arranque con las cuatro combinaciones, Neumorfismo por defecto, almacenamiento bloqueado/inválido, persistencia, sincronización entre pestañas, independencia de paleta, conservación de campos y selector portaled abierto. Se comprueba que la transición sigue activa después de los antiguos 320 ms y durante casi 3 segundos tras una segunda elección, y que termina posteriormente. La revisión de CSS preservó formas circulares de gráficos y la separación del documento imprimible.

Ejecución con Node 24.19.0 / pnpm 11.19.0 del entorno disponible; `package.json` solicita Node 22.x. No se revisó visualmente en navegador ni se midió rendimiento en dispositivos físicos. No se ejecutaron operaciones en Supabase real. Estas comprobaciones preceden a la publicación solicitada posteriormente por el usuario.

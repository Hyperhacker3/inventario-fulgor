# Navegación y formularios en móvil y tablet

La navegación compacta se utiliza por debajo de 1280 px, para aprovechar también el ancho de las tablets en horizontal. La barra inferior conserva Inicio, Inventario, Entradas y Salidas según el rol de la cuenta. El menú reúne todas las pantallas permitidas, además de búsqueda, ayuda y cierre de sesión.

El menú es una capa fija: no desplaza el contenido. Tiene transición de apertura y cierre, botón de hamburguesa animado, cierre al tocar fuera, al elegir una pantalla, con Escape y al regresar con el navegador. El foco queda dentro del menú mientras está abierto y vuelve al botón al cerrarlo. Las notificaciones también se recogen al tocar fuera.

Las ventanas y pantallas tienen animaciones cortas y los botones responden visualmente al pulsarlos. La preferencia del sistema de reducir movimiento desactiva estos efectos. Los campos tienen un tamaño legible en pantallas compactas y los accesos principales tienen superficies táctiles de al menos 44 px. La cuadrícula del inventario calcula sus columnas con el espacio disponible; los filtros se pueden recoger por debajo de 1024 px.

## Teclado

Las ventanas conservan el foco al recibir actualizaciones de datos o nuevas funciones de cierre. En móvil, la selección de cantidad enfoca inicialmente el botón de cerrar; el teclado se abre cuando el usuario toca el campo. Guardar un nuevo ítem tampoco vuelve a abrirlo automáticamente.

Se utiliza la altura de `VisualViewport` para adaptar el espacio disponible en dispositivos móviles. La barra inferior se oculta si hay un campo de texto enfocado y la altura se reduce más de 150 px sin zoom. Cambiar entre campos espera al siguiente frame para evitar oscilaciones intermedias. Esta detección es una aproximación; depende del comportamiento del navegador y del teclado. Referencia: [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

## Verificación

- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` y `pnpm build`.
- Pruebas de DOM para permisos, cierre exterior, Escape, foco estable tras actualizar datos, ventanas superpuestas, apertura explícita del teclado y ocultación de la barra inferior.
- No se utilizaron navegadores automatizados ni computer use. La revisión visual y el teclado real quedan por comprobar en dispositivos físicos.

Tras el despliegue, probar desde un teléfono y una tablet:

1. Abrir y cerrar el menú desde cualquier pantalla; tocar fuera y elegir otra pantalla.
2. Editar un campo, pasar a otro y volver, comprobando que el teclado no se cierre sin motivo.
3. Abrir la selección de cantidad: el teclado debe esperar al toque en el número.
4. Abrir la cámara desde la ficha y cerrarla, conservando la ficha debajo.
5. Girar el dispositivo y comprobar la cuadrícula, el menú y la barra inferior.

Esta actualización no requiere SQL ni modifica el inventario de Supabase.

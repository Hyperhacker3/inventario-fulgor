# Navegación y formularios en móvil y tablet

Estado de diseño al 7 de octubre de 2026: Liquid Glass y Neumorfismo están implementados, conservando los comportamientos descritos aquí. Neumorfismo es el predeterminado. El selector aparece al final del contenido de Ayuda, accesible desde el menú móvil. Estilo y claro/oscuro se guardan por separado y cambian con transiciones de 1,5 segundos, salvo movimiento reducido. El usuario solicitó la publicación; la revisión visual sigue pendiente y el despliegue se verifica por separado. Detalles en [estilos de interfaz](estilos-interfaz.md).

La navegación compacta se utiliza por debajo de 1280 px, para aprovechar también el ancho de las tablets en horizontal. La barra inferior conserva Inicio, Inventario, Entradas y Salidas según el rol de la cuenta. El menú reúne todas las pantallas permitidas, además de búsqueda, ayuda y cierre de sesión.

El menú es una capa fija: no desplaza el contenido. Tiene transición de apertura y cierre, botón de hamburguesa animado, cierre al tocar fuera, al elegir una pantalla, con Escape y al regresar con el navegador. El foco queda dentro del menú mientras está abierto y vuelve al botón al cerrarlo. Las notificaciones también se recogen al tocar fuera.

El menú se monta directamente en `body`, fuera de la capa de la cabecera. Su ancho máximo es de 300 px y su altura está limitada; solo la lista de opciones tiene desplazamiento, manteniendo visibles la búsqueda y los controles de ayuda y sesión. La barra inferior ocupa espacio dentro de la columna de la aplicación, en lugar de flotar encima de las listas y formularios.

Las ventanas y pantallas conservan animaciones de 180 ms y los botones responden visualmente al pulsarlos. Los 1,5 segundos se reservan para cambiar el estilo o la paleta. La preferencia del sistema de reducir movimiento desactiva estos efectos. Los campos tienen un tamaño legible en pantallas compactas y los accesos principales tienen superficies táctiles de al menos 44 px. La cuadrícula del inventario calcula sus columnas con el espacio disponible; los filtros se pueden recoger por debajo de 1024 px.

Los controles del producto, almacenes y fotografías usan columnas que permiten ajustar el texto. Las secciones de administración usan una cuadrícula en escritorio y un selector con iconos en móvil. Las filas de búsqueda de Entradas separan la imagen, el texto y Seleccionar, y usan iconos compactos cuando no hay foto. Entradas y Salidas muestran sus cinco resultados por página sin una segunda zona de desplazamiento dentro de la lista.

El selector de fotos adapta las columnas al espacio de su propio contenedor: la principal queda centrada y las adicionales forman una cuadrícula. Quitar aparece sobre cada foto y Hacer principal debajo. Las fotos del registro de salida también se distribuyen según el ancho disponible.

## Teclado

Claro/oscuro usa un barrido suave de izquierda a derecha; en navegadores sin View Transitions se utiliza un fundido de 1,5 segundos. Neumorfismo muestra relieve mediante sombras y evita bordes delineados; el foco del teclado conserva su indicador visible. La barra inferior, el menú y las ventanas comparten el material elegido.

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
8. Abrir Ayuda desde el menú, llegar al final del texto y alternar ambos estilos; comprobar que el botón y Cerrar siguen accesibles.
9. Probar los dos estilos en claro y oscuro, incluyendo selectores desplegados y ventanas de cámara/fotografías. Verificar transiciones graduales de aproximadamente 1,5 segundos y animaciones de navegación de 180 ms.
10. Recargar y comprobar que se conservan ambas preferencias; repetir con movimiento reducido para comprobar que el cambio no se anima.

Esta actualización no requiere SQL ni modifica el inventario de Supabase.

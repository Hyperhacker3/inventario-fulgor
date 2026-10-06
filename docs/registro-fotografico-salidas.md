# Registro fotográfico de salidas

## Activación

1. Abra `supabase/migrations/20261006000300_outgoing_photos.sql` y copie todo el contenido.
2. En el proyecto de Supabase, abra SQL Editor → New query, pegue el SQL y pulse Run.
3. El resultado esperado es `Success. No rows returned`.
4. Espere a que Vercel muestre Ready en el despliegue del nuevo commit y recargue la aplicación.

Requiere las migraciones anteriores, incluida la de elementos archivados. No modifica las cantidades ni las remisiones existentes; las salidas anteriores quedan con un registro de fotos vacío.

## Registrar fotos

En **Salidas**, la sección **Registro fotográfico de la salida** permite tomar fotos con la cámara o seleccionar varios archivos. Puede quitar cualquier foto del borrador antes de guardar. El registro es opcional; una salida puede tener varias fotografías o ninguna.

Las fotos conservan el encuadre completo y se comprimen en JPEG con un máximo de 600 píxeles en el lado mayor. Las vistas previas usan la misma foto, sin generar archivos de miniatura. Las fotos de productos mantienen su recorte cuadrado habitual.

En teléfonos y tablets, el selector de cámara y Cambiar cámara utilizan únicamente lentes traseros identificados por el navegador. Las cámaras frontales no aparecen y no se usan como alternativa. Si solo hay un lente trasero, el botón de cambio queda deshabilitado; si no se puede abrir una cámara trasera, se puede usar Elegir archivo. Los lentes con nombres genéricos solo se incluyen después de que el navegador confirme que son traseros.

En computadoras se abre la cámara predeterminada y el selector muestra todas las cámaras que permita el navegador, incluida la integrada de la laptop y las conectadas por USB. La detección contempla Android, iPhone, iPad y tablets; no depende del tamaño de la ventana ni considera móvil una laptop Windows solo porque tenga pantalla táctil. Este comportamiento se aplica también a las fotos de productos.

Al pulsar **Registrar salida y generar remisión**, primero se suben las fotos a un bucket privado de Supabase. La transacción comprueba que los archivos existen y corresponden a la cuenta y solicitud de salida, descuenta el stock y asocia el registro a la remisión. Si falla la subida, no se descuenta stock. Si la base de datos devuelve un rechazo confirmado del primer intento, se retiran los archivos temporales y se permite corregir el formulario. Si se pierde la respuesta y no se puede confirmar el resultado, se conservan los archivos y se reutilizan las mismas referencias al reintentar.

Los borradores de imagen y las referencias preparadas se mantienen solo en memoria de la sesión; no se guardan en localStorage ni se incluyen en los archivos publicados de la web. Una subida o limpieza interrumpida puede dejar un archivo temporal sin asociar; no se elimina un archivo que pudiera haber quedado asociado tras una respuesta perdida.

## Consultar

En **Historial**, cada movimiento asociado a una remisión muestra dos acciones:

- **PDF** abre la remisión habitual.
- **Fotos** abre el registro fotográfico de la salida, con navegación y contador.

Los materiales de una misma salida comparten el registro completo. Estas acciones también aparecen en los movimientos recientes del detalle del producto. El visor consulta la remisión por su identificador, por lo que funciona para salidas antiguas que no estén entre las últimas cargadas en memoria. Si una salida no tiene fotos, se indica expresamente.

Las fotos se almacenan separadas de la plantilla de impresión: **no aparecen en el PDF**. La galería se carga al abrirla y obtiene una imagen a la vez mediante enlaces temporales de Supabase.

## Permisos y conservación

Administradores y operadores pueden subir fotos para sus propias salidas. Las cuentas de consulta pueden ver las fotografías ya asociadas a una salida, pero no los archivos temporales de otros usuarios. El bucket `outgoing-images` es privado; las políticas impiden sobrescribir o borrar fotos ya asociadas. Las fotos de productos siguen en `item-images` con sus permisos anteriores.

Archivar o eliminar un producto conserva las remisiones, sus movimientos y el registro fotográfico de las salidas. Esta actualización no añade edición ni eliminación de fotografías de salidas ya confirmadas.

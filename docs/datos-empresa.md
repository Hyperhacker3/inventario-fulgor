# Datos de empresa y NIT en remisiones

Actualizado el 7 de octubre de 2026. El NIT indicado por el usuario es **800.176.581**, y aparece inmediatamente debajo del logo en todas las páginas de la remisión de salida, tanto en la vista previa como en impresión/PDF. Se conserva EL TURPIAL y el logo aprobado como valores iniciales; dirección y teléfono quedan vacíos hasta declararlos.

## Activación en Supabase

La edición compartida requiere `supabase/migrations/20261007000100_company_profile.sql`, después de las migraciones anteriores. Conserve el respaldo y ejecute **el archivo completo** en el SQL Editor de su proyecto Supabase. La migración es transaccional y puede repetirse: no cambia productos, stock, movimientos ni partidas de remisión. Añade la configuración de empresa y una copia de sus datos en los documentos. El agente ensayó el SQL en PostgreSQL embebido; no lo ejecutó en producción.

Después, recargue la aplicación y abra **Administración de datos → Empresa**. Si la sección estaba abierta durante la activación, pulse Comprobar de nuevo. La app sigue permitiendo consultar inventario y mostrar el NIT inicial en remisiones antes de activar esta migración; la edición de empresa requiere la tabla y las funciones nuevas.

## Edición

1. Escriba nombre de empresa y NIT. Puede utilizar puntos y guion en el NIT; se conserva como texto.
2. Complete dirección y teléfono si los conoce. Ambos son opcionales; no se inventan datos de contacto.
3. Suba un logo PNG, JPG o WebP de hasta 5 MB. La app reduce su tamaño manteniendo la proporción y transparencia. Restaurar logo original recupera el recurso de EL TURPIAL sin borrar los archivos aprobados.
4. Pulse Guardar datos de empresa. El nombre y logo se utilizan en la navegación; los cinco campos se utilizan en las próximas remisiones. Otras cuentas leen la misma configuración al recargar, volver a la ventana o actualizar los datos.

Solo el rol `admin` puede guardar. `operador` y `consulta` ven los datos con los campos deshabilitados. Si falla el guardado, el borrador permanece y no aparece una confirmación falsa. El logo se prepara antes del guardado; elegir una imagen no la publica todavía.

Los borradores no se reemplazan cuando llegan datos actualizados de otra cuenta. Si otra persona guardó primero, se rechaza la versión antigua para evitar sobrescribirla. Conserve los cambios que necesite, pulse Actualizar datos guardados y luego Descartar cambios para cargar la versión vigente antes de editar de nuevo.

## Documentos históricos

Cada remisión nueva captura en el servidor el nombre, NIT, dirección, teléfono y logo vigentes al emitirla, independientemente de datos enviados desde el navegador. Una edición posterior de la empresa no modifica esos documentos. Reintentar la misma salida conserva la copia original y no vuelve a descontar existencias.

Las remisiones anteriores reciben los valores iniciales EL TURPIAL / 800.176.581 / logo aprobado, sin atribuirles direcciones o teléfonos no conocidos. Esos valores permanecen después de editar la empresa. No se realizan reconstrucciones de datos históricos a partir de la configuración actual.

## Implementación y verificación

- `src/domain/company.ts`: valores iniciales, mapeo, validación y fuentes permitidas para logos.
- `src/state/useCompanyProfile.ts`: lectura compartida y guardado mediante RPC, caché por cuenta y control de versión.
- `src/components/administration/CompanyProfileEditor.tsx`: formulario adaptable, errores, permisos y carga de logo.
- `src/shared/companyLogo.ts`: PNG proporcionado, hasta 480 × 240 px y 160.000 caracteres codificados; el logo queda incluido en el documento para conservarlo sin enlaces temporales.
- La migración crea `inventario_empresa`, funciones de lectura/guardado y el trigger de copia inmutable en `remisiones.empresa`. No concede acceso directo a la tabla a usuarios ni acceso anónimo a las funciones.
- `RemissionHeader` imprime el bloque de empresa. La medición de paginación espera fuentes/logo y considera su altura antes de habilitar Imprimir / PDF.

Se verifican permisos, validación, conflictos de versión, conservación de documentos/stock, reintentos, repetición de la migración, NIT debajo del logo, borradores y preparación de imágenes. La revisión visual en PDF y dispositivos queda a cargo del usuario; no se usó computer use ni automatización de navegador.

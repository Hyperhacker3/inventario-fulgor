export const errorMessage = (error: unknown) => error instanceof Error
  ? error.message.replace(/Despacho vacío/g, 'Salida vacía').replace(/anterior al despacho/g, 'anterior a la salida')
  : 'No se pudo completar la operación.';

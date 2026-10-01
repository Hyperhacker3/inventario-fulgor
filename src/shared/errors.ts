export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

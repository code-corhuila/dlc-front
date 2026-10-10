/** C06: the single place that decides the message a person sees for a failure. */
export function userMessage(
  status: number,
  error: string,
  isPublic: boolean,
): string {
  if (error === 'CANCELLED') return ''; // Obsolete output is discarded silently.
  if (error === 'SESSION_UNAVAILABLE')
    return 'No pudimos verificar tu sesión. Inicia sesión de nuevo.';
  if (error === 'INVALID_REQUEST')
    return 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.';
  if (status === 401)
    return isPublic
      ? 'No se pudo completar la autenticación.'
      : 'Tu sesión terminó. Inicia sesión de nuevo.';
  if (status === 403) return 'No tienes permiso para realizar esta operación.';
  if (status === 404) return 'El recurso solicitado no está disponible.';
  if (status === 400 || status === 422) return 'Revisa los datos ingresados.';
  if (status === 409)
    return 'Actualiza y revisa el conflicto antes de continuar.';
  if (status === 429)
    return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
  return 'El servicio no está disponible en este momento. Si estabas guardando, verifica el resultado antes de repetir.';
}

/**
 * Cliente HTTP de la API Machan Store (fetch).
 * Base URL configurable con VITE_API_URL (por defecto el backend local).
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/** Clave de localStorage para la sesión (token + usuario). */
export const CLAVE_SESION = 'machan_sesion_activa';

async function pedir(ruta, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error(`No se pudo conectar con el servidor (${API_URL}). Verifica que el backend esté activo.`);
  }

  if (respuesta.status === 204) return null;

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    // Respuesta sin cuerpo JSON
  }

  if (!respuesta.ok) {
    throw new Error(datos?.mensaje || `Error ${respuesta.status}: no se pudo completar la operación.`);
  }
  return datos;
}

export const apiGet = (ruta, token) => pedir(ruta, { token });
export const apiPost = (ruta, body, token) => pedir(ruta, { method: 'POST', body, token });
export const apiPut = (ruta, body, token) => pedir(ruta, { method: 'PUT', body, token });
export const apiDelete = (ruta, token) => pedir(ruta, { method: 'DELETE', token });

// ---------- Persistencia de sesión (sobrevive a recargas de página) ----------

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

export function borrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
}

export { API_URL };

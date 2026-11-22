import { createContext, useState, useEffect, useContext } from 'react';
import { CartContext } from './CartContext';
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  leerSesion,
  guardarSesion,
  borrarSesion
} from '../services/api';

export const AuthContext = createContext();

/** Normaliza el rol del backend (ADMIN) a minúsculas ('admin') para el frontend. */
const rolFrontend = (rol) => (rol || '').toLowerCase();

export const AuthProvider = ({ children }) => {
  const cart = useContext(CartContext);
  const mostrarNotificacion = cart?.mostrarNotificacion;

  const [sesion, setSesion] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  // Solo hay "cargando" si existe una sesión guardada que restaurar desde el backend
  const [cargando, setCargando] = useState(() => {
    const guardada = leerSesion();
    return Boolean(guardada?.token) && import.meta.env.MODE !== 'test';
  });

  const notificar = (mensaje, tipo = 'success') => {
    if (mostrarNotificacion) mostrarNotificacion(mensaje, tipo);
  };

  // ---------- Gestión de usuarios (solo ADMIN, vía API) ----------

  const cargarUsuarios = async (token) => {
    try {
      const lista = await apiGet('/api/v1/usuarios', token);
      setUsuarios((lista || []).map((u) => ({ ...u, rol: rolFrontend(u.rol) })));
    } catch {
      // Sin permisos o sin conexión: se mantiene la lista actual
    }
  };

  // ---------- Restauración de sesión al cargar/recargar la página ----------

  useEffect(() => {
    const guardada = leerSesion();
    if (!guardada?.token || import.meta.env.MODE === 'test') return;

    (async () => {
      try {
        // 1) Validar el token con el backend
        const usuario = await apiGet('/api/v1/auth/me', guardada.token);
        const normalizado = { ...usuario, rol: rolFrontend(usuario.rol) };
        setSesion(normalizado);
        if (normalizado.rol === 'admin') await cargarUsuarios(guardada.token);
      } catch {
        // 2) Token expirado: intentar renovación segura
        try {
          const renovado = await apiPost('/api/v1/auth/refresh', null, guardada.token);
          guardarSesion({ token: renovado.token });
          const normalizado = { ...renovado.usuario, rol: rolFrontend(renovado.usuario.rol) };
          setSesion(normalizado);
          if (normalizado.rol === 'admin') await cargarUsuarios(renovado.token);
        } catch {
          // 3) Ya no es válido: cerrar sesión
          borrarSesion();
          setSesion(null);
        }
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  // ---------- Autenticación ----------

  const login = async (email, password) => {
    try {
      const respuesta = await apiPost('/api/v1/auth/login', { email, password });
      guardarSesion({ token: respuesta.token });
      const usuario = { ...respuesta.usuario, rol: rolFrontend(respuesta.usuario.rol) };
      setSesion(usuario);
      if (usuario.rol === 'admin') await cargarUsuarios(respuesta.token);
      notificar(`¡Bienvenido de nuevo, ${usuario.nombre}!`, 'success');
      return { exito: true, usuario };
    } catch (error) {
      notificar('Credenciales incorrectas.', 'danger');
      return {
        exito: false,
        mensaje: error.message || 'Correo o contraseña incorrectos. Intenta nuevamente.'
      };
    }
  };

  const registrar = async (nombre, email, password) => {
    try {
      await apiPost('/api/v1/auth/registro', { nombre, email, password });
      notificar('¡Cuenta creada con éxito!', 'success');
      return { exito: true };
    } catch (error) {
      return { exito: false, mensaje: error.message || 'No se pudo crear la cuenta.' };
    }
  };

  const logout = () => {
    borrarSesion();
    setSesion(null);
    setUsuarios([]);
    notificar('Sesión cerrada correctamente.', 'info');
  };

  const token = () => leerSesion()?.token;

  // ---------- Gestión de usuarios (panel Admin) ----------

  const crearUsuarioAdmin = async ({ nombre, email, password, rol }) => {
    try {
      await apiPost(
        '/api/v1/usuarios',
        { nombre, email, password, rol: (rol || 'cliente').toUpperCase() },
        token()
      );
      await cargarUsuarios(token());
      return { exito: true, mensaje: `Usuario "${nombre}" creado con éxito.` };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  };

  const editarUsuarioAdmin = async ({ id, nombre, email, password, rol }) => {
    try {
      const body = { nombre, email, rol: (rol || 'cliente').toUpperCase() };
      if (password && password.trim() !== '') body.password = password;
      await apiPut(`/api/v1/usuarios/${id}`, body, token());
      await cargarUsuarios(token());

      // Si el usuario editado es la sesión activa, refrescar los datos locales
      const guardada = leerSesion();
      if (guardada && sesion && sesion.id === id) {
        setSesion((prev) => ({
          ...prev,
          nombre: nombre.trim(),
          email: email.trim(),
          rol: rolFrontend(rol)
        }));
      }
      return { exito: true, mensaje: `Usuario "${nombre}" modificado exitosamente.` };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  };

  const eliminarUsuarioAdmin = async (id) => {
    try {
      await apiDelete(`/api/v1/usuarios/${id}`, token());
      await cargarUsuarios(token());
      notificar('Usuario eliminado correctamente.', 'danger');
      return { exito: true };
    } catch (error) {
      notificar(error.message, 'danger');
      return { exito: false, mensaje: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuarios,
        sesion,
        cargando,
        token,
        login,
        registrar,
        logout,
        crearUsuarioAdmin,
        editarUsuarioAdmin,
        eliminarUsuarioAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

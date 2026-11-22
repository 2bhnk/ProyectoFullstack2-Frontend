import { useContext, useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiGet } from '../services/api';

/**
 * Lista de órdenes (boletas) consumida desde el backend:
 *  - ADMIN / VENDEDOR: ven todas las órdenes (GET /api/v1/boletas).
 *  - CLIENTE: el backend filtra y devuelve solo las suyas.
 * El detalle de cada orden se carga bajo demanda (GET /api/v1/boletas/{id}).
 */
export const Pedidos = () => {
  const { sesion, token } = useContext(AuthContext);
  const jwt = token ? token() : null;
  const esStaff = sesion?.rol === 'admin' || sesion?.rol === 'vendedor';

  // Solo hay "cargando" si hay token disponible para consultar el backend
  const [cargando, setCargando] = useState(() => Boolean(jwt) && import.meta.env.MODE !== 'test');
  const [ordenes, setOrdenes] = useState([]);
  const [error, setError] = useState('');
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    if (!jwt || import.meta.env.MODE === 'test') return;

    (async () => {
      try {
        const lista = await apiGet('/api/v1/boletas', jwt);
        setOrdenes(Array.isArray(lista) ? lista : []);
      } catch (e) {
        setError(e.message || 'No se pudieron cargar las órdenes.');
      } finally {
        setCargando(false);
      }
    })();
  }, [jwt]);

  const abrirDetalle = async (id) => {
    if (detalleAbierto === id) {
      setDetalleAbierto(null);
      setDetalle(null);
      return;
    }
    setDetalleAbierto(id);
    setDetalle(null);
    try {
      const data = await apiGet(`/api/v1/boletas/${id}`, jwt);
      setDetalle(data);
    } catch (e) {
      setDetalle({ error: e.message || 'No se pudo cargar el detalle.' });
    }
  };

  const formatearCLP = (valor) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(valor || 0);

  const formatearFecha = (fecha) => {
    try {
      return new Date(fecha).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return fecha;
    }
  };

  const badgeEstado = (estado) => {
    switch ((estado || '').toUpperCase()) {
      case 'PENDIENTE':
        return <span className="badge bg-warning text-dark">Pendiente</span>;
      case 'PAGADA':
        return <span className="badge bg-success">Pagada</span>;
      case 'ANULADA':
        return <span className="badge bg-danger">Anulada</span>;
      default:
        return <span className="badge bg-secondary">{estado || '—'}</span>;
    }
  };

  if (!sesion) {
    return (
      <main className="container my-5 flex-grow-1">
        <div className="alert alert-warning text-center">
          Inicia sesión para ver tus órdenes. <Link to="/login" className="fw-bold">Iniciar sesión</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container my-5 flex-grow-1">
      <h2 className="fw-bold mb-1">{esStaff ? '📋 Órdenes de la tienda' : '📦 Mis Pedidos'}</h2>
      <p className="text-muted small mb-4">
        {esStaff
          ? 'Visualización habilitada para roles ADMIN y VENDEDOR (lista y detalle).'
          : 'Aquí encuentras el historial de tus compras realizadas en MachanStore.'}
      </p>

      {cargando && <div className="text-center py-5 text-muted">Cargando órdenes…</div>}

      {!cargando && error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}

      {!cargando && !error && ordenes.length === 0 && (
        <div className="bg-white p-5 rounded border shadow-sm text-center">
          <p className="fs-5 mb-3">Aún no hay órdenes registradas.</p>
          <Link to="/productos" className="btn text-white" style={{ backgroundColor: '#5b4b7a' }}>
            Explorar figuras
          </Link>
        </div>
      )}

      {!cargando && !error && ordenes.length > 0 && (
        <div className="table-responsive bg-white rounded shadow-sm border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="text-center">N° Orden</th>
                <th>Fecha</th>
                {esStaff && <th>Cliente</th>}
                <th className="text-center">Ítems</th>
                <th className="text-center">Total</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <Fragment key={o.id}>
                  <tr>
                    <td className="text-center fw-bold">#{o.id}</td>
                    <td className="small">{formatearFecha(o.fecha)}</td>
                    {esStaff && <td className="small">{o.cliente}<br /><code>{o.emailCliente}</code></td>}
                    <td className="text-center">{o.detalles?.length || 0}</td>
                    <td className="text-center fw-bold">{formatearCLP(o.total)}</td>
                    <td className="text-center">{badgeEstado(o.estado)}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => abrirDetalle(o.id)}
                      >
                        {detalleAbierto === o.id ? 'Ocultar' : 'Ver detalle'}
                      </button>
                    </td>
                  </tr>
                  {detalleAbierto === o.id && (
                    <tr>
                      <td colSpan={esStaff ? 7 : 6} className="bg-light">
                        {!detalle && <span className="text-muted small">Cargando detalle…</span>}
                        {detalle?.error && <span className="text-danger small">{detalle.error}</span>}
                        {detalle && !detalle.error && (
                          <div className="p-2">
                            <div className="d-flex flex-wrap gap-3 small mb-2">
                              <span><strong>Subtotal:</strong> {formatearCLP(detalle.subtotal)}</span>
                              <span><strong>Descuento:</strong> -{formatearCLP(detalle.descuento)}</span>
                              <span><strong>Cupón:</strong> {detalle.cupon || 'Sin cupón'}</span>
                              <span className="fw-bold text-success"><strong>Total:</strong> {formatearCLP(detalle.total)}</span>
                            </div>
                            <ul className="mb-0 small">
                              {(detalle.detalles || []).map((d, i) => (
                                <li key={i}>
                                  {d.nombreProducto} × {d.cantidad} — {formatearCLP(d.subtotal)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

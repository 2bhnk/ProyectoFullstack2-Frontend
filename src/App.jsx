import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { CartProvider } from './context/CartContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Blog } from './pages/Blog';
import { Productos } from './pages/Productos';
import { DetalleProducto } from './pages/DetalleProducto';
import { Carrito } from './pages/Carrito';
import { Contacto } from './pages/Contacto';
import { Login } from './pages/Login';
import { Registro } from './pages/Registro';
import { Admin } from './pages/Admin';
import { Pedidos } from './pages/Pedidos';
import './index.css';

/**
 * Protege rutas según rol (restricciones de acceso en el frontend):
 *  - Sin sesión → redirige a /login.
 *  - Rol no permitido → redirige a la tienda (/).
 *  - Mientras se restaura la sesión (recarga) muestra un indicador de carga.
 */
function RutaProtegida({ children, rolesPermitidos }) {
  const { sesion, cargando } = useContext(AuthContext);

  if (cargando) {
    return (
      <main className="container my-5 text-center text-muted flex-grow-1">
        <div className="spinner-border" role="status" style={{ color: '#5b4b7a' }}>
          <span className="visually-hidden">Cargando sesión…</span>
        </div>
        <p className="small mt-3 mb-0">Verificando sesión…</p>
      </main>
    );
  }

  if (!sesion) return <Navigate to="/login" replace />;

  if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <CartProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="d-flex flex-column min-vh-100">
            <Navbar />
           <div className="flex-grow-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/productos" element={<Productos />} />
                <Route path="/producto/:id" element={<DetalleProducto />} />
                <Route path="/carrito" element={<Carrito />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />
                <Route
                  path="/admin"
                  element={
                    <RutaProtegida rolesPermitidos={['admin']}>
                      <Admin />
                    </RutaProtegida>
                  }
                />
                <Route
                  path="/pedidos"
                  element={
                    <RutaProtegida rolesPermitidos={['admin', 'vendedor', 'cliente']}>
                      <Pedidos />
                    </RutaProtegida>
                  }
                />
              </Routes>
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </CartProvider>
  );
}

export default App;
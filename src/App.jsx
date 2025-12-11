import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Inventario from './components/Inventario'
import Scanner from './components/Scanner'
import Auth from './components/Auth'
import UserProfile from './components/UserProfile'
import UserManagement from './components/UserManagement'
import SalesView from './components/SalesView'
import Reports from './components/Reports'
import Providers from './components/Providers'
import Expenses from './components/Expenses'
import { onAuthChange } from './services/authService'
import './App.css'

function App() {
  const [view, setView] = useState('home')
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Observar cambios en el estado de autenticación
    const unsubscribe = onAuthChange(({ user, role }) => {
      setUser(user)
      setRole(role)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleAuthSuccess = (authenticatedUser, userRole) => {
    setUser(authenticatedUser)
    setRole(userRole)
  }

  const handleLogout = () => {
    setUser(null)
    setRole(null)
    setView('home')
  }

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <div>
            <h1>Bienvenido a Maquillarte</h1>
            <p>Selecciona una opción del menú.</p>
            {role && (
              <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '10px' }}>
                <h3>Permisos de tu rol: {role === 'admin' ? 'Administrador' : role === 'employee' ? 'Empleado' : 'Usuario'}</h3>
                <ul style={{ marginTop: '10px' }}>
                  {role === 'admin' && (
                    <>
                      <li>✅ Acceso completo al inventario</li>
                      <li>✅ Puede agregar, editar y eliminar productos</li>
                      <li>✅ Puede usar el escáner de códigos</li>
                      <li>✅ Gestión completa del sistema</li>
                    </>
                  )}
                  {role === 'employee' && (
                    <>
                      <li>✅ Acceso al inventario</li>
                      <li>✅ Puede ver productos</li>
                      <li>✅ Puede usar el escáner de códigos</li>
                      <li>❌ No puede eliminar productos</li>
                    </>
                  )}
                  {role === 'user' && (
                    <>
                      <li>✅ Acceso limitado al inventario</li>
                      <li>✅ Puede ver productos</li>
                      <li>❌ No puede editar ni eliminar</li>
                      <li>❌ No tiene acceso al escáner</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        )
      case 'inventory':
        return <Inventario userRole={role} />
      case 'scanner':
        // Solo admin y employee pueden acceder al scanner
        if (role === 'admin' || role === 'employee') {
          // Renderizamos Scanner en modo ventas (sin onScan)
          return <Scanner role={role} user={user} />
        } else {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Acceso Denegado</h2>
              <p>No tienes permisos para acceder al escáner.</p>
            </div>
          )
        }
      case 'sales':
        // Solo admin y employee pueden ver ventas
        if (role === 'admin' || role === 'employee') {
          return <SalesView userRole={role} onNavigate={setView} user={user} />
        } else {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Acceso Denegado</h2>
              <p>No tienes permisos para acceder a las ventas.</p>
            </div>
          )
        }
      case 'reports':
        // Solo admin y employee pueden ver reportes
        if (role === 'admin' || role === 'employee') {
          return <Reports role={role} />
        } else {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Acceso Denegado</h2>
              <p>No tienes permisos para acceder a los reportes.</p>
            </div>
          )
        }
      case 'users':
        // Solo admin puede acceder a la gestión de usuarios
        if (role === 'admin') {
          return <UserManagement />
        } else {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Acceso Denegado</h2>
              <p>No tienes permisos para acceder a la gestión de usuarios.</p>
            </div>
          )
        }
      case 'providers':
        // Solo admin puede acceder a proveedores
        if (role === 'admin') {
          return <Providers user={user} />
        } else {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Acceso Denegado</h2>
              <p>No tienes permisos para acceder a los proveedores.</p>
            </div>
          )
        }
      case 'expenses':
        // Solo admin y employee pueden acceder a gastos
        if (role === 'admin' || role === 'employee') {
          return <Expenses user={user} />
        } else {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Acceso Denegado</h2>
              <p>No tienes permisos para acceder a los gastos.</p>
            </div>
          )
        }
      default:
        return <div><h1>Inicio</h1></div>
    }
  }

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#FFB6C1'
      }}>
        <h2 style={{ color: '#fff' }}>Cargando...</h2>
      </div>
    )
  }

  // Si no hay usuario autenticado, mostrar pantalla de login
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  // Usuario autenticado, mostrar aplicación
  return (
    <div style={{ 
      display: 'flex', 
      width: '100vw',
      height: '100vh', 
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      <Sidebar setView={setView} user={user} role={role} onLogout={handleLogout} />
      <div className="main-content" style={{ 
        flex: 1, 
        width: '100%',
        height: '100vh',
        overflow: 'auto',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          minHeight: '100%',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {renderView()}
        </div>
      </div>
    </div>
  )
}

export default App

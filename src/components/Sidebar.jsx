import { FaHome, FaList, FaBarcode, FaTimes, FaBars, FaUsers, FaSignOutAlt, FaUser } from 'react-icons/fa'
import { useState } from 'react'

function Sidebar({ setView, user, role, onLogout }) {
  const [isVisible, setIsVisible] = useState(true)

  const toggleSidebar = () => {
    setIsVisible(!isVisible)
  }

  // Verificar si el usuario puede acceder al escáner
  const canAccessScanner = role === 'admin' || role === 'employee'
  // Solo admin puede acceder a la gestión de usuarios
  const canManageUsers = role === 'admin'

  return (
    <>
      {!isVisible && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1001,
            background: '#FFB6C1',
            borderRadius: '0px',
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '20px',
            width: '60px',
            height: '100vh',
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <button 
            onClick={() => setView('home')} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}
            title="Inicio"
          >
            <FaHome />
          </button>
          <button 
            onClick={() => setView('inventory')} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}
            title="Inventario"
          >
            <FaList />
          </button>
          {canAccessScanner && (
            <button 
              onClick={() => setView('scanner')} 
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}
              title="Escáner"
            >
              <FaBarcode />
            </button>
          )}
          {canManageUsers && (
            <button 
              onClick={() => setView('users')} 
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}
              title="Gestión de Usuarios"
            >
              <FaUsers />
            </button>
          )}
          <button 
            onClick={toggleSidebar} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px', marginTop: 'auto', marginBottom: '10px' }}
            title="Expandir menú"
          >
            <FaBars />
          </button>
        </div>
      )}
      {isVisible && (
        <div className="sidebar" style={{ width: '200px', backgroundColor: '#FFB6C1', height: '100vh', padding: '20px', boxSizing: 'border-box', position: 'fixed', left: 0, top: 0, zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: '#fff', margin: 0 }}>Maquillarte</h2>
            <button 
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Expanded: show only role (no email) */}
          {user && (
            <div style={{ background: 'transparent', color: '#fff', padding: '8px 0', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: '#fff', fontWeight: 700 }}>Rol: {role === 'admin' ? 'Administrador' : role === 'employee' ? 'Empleado' : 'Usuario'}</div>
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>
              <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', fontSize: '16px' }}>
                <FaHome style={{ marginRight: '10px' }} /> Inicio
              </button>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <button onClick={() => setView('inventory')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', fontSize: '16px' }}>
                <FaList style={{ marginRight: '10px' }} /> Inventario
              </button>
            </li>
            {canAccessScanner && (
              <li style={{ marginBottom: '10px' }}>
                <button onClick={() => setView('scanner')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', fontSize: '16px' }}>
                  <FaBarcode style={{ marginRight: '10px' }} /> Escáner
                </button>
              </li>
            )}
            {canManageUsers && (
              <li style={{ marginBottom: '10px' }}>
                <button onClick={() => setView('users')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', fontSize: '16px' }}>
                  <FaUsers style={{ marginRight: '10px' }} /> Usuarios
                </button>
              </li>
            )}
          </ul>

          {/* Footer icons: place at bottom inside expanded sidebar */}
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <FaUser style={{ color: '#fff', fontSize: '18px' }} />
              {user && <span style={{ color: '#fff', fontSize: '13px' }}>{role === 'admin' ? 'Admin' : role === 'employee' ? 'Empleado' : 'Usuario'}</span>}
            </div>
            <button onClick={() => onLogout && onLogout()} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }} title="Cerrar sesión">
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
import { FaHome, FaList, FaBarcode, FaTimes, FaBars, FaUsers, FaSignOutAlt, FaUser, FaChartBar, FaFileAlt, FaTruck, FaDollarSign } from 'react-icons/fa'
import { useState, useEffect } from 'react'

function Sidebar({ setView, user, role, onLogout }) {
  const [isVisible, setIsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  const toggleSidebar = () => {
    setIsVisible(!isVisible)
  }

  // Verificar si el usuario puede acceder al escáner
  const canAccessScanner = role === 'admin' || role === 'employee'
  // Solo admin puede acceder a la gestión de usuarios
  const canManageUsers = role === 'admin'
  // Solo admin y empleado pueden ver ventas
  const canViewSales = role === 'admin' || role === 'employee'
  // Solo admin puede acceder a proveedores
  const canAccessProviders = role === 'admin'
  // Solo admin y empleado pueden acceder a gastos
  const canAccessExpenses = role === 'admin' || role === 'employee'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    // Ajustar el margen del contenido principal
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      if (isMobile) {
        // En móvil, cuando está cerrado necesita espacio para el navbar (60px), cuando está abierto no
        mainContent.style.marginLeft = '0px'
        mainContent.style.marginTop = isVisible ? '0px' : '60px'
      } else {
        // En desktop, siempre deja espacio según el estado del sidebar
        mainContent.style.marginLeft = isVisible ? '220px' : '60px'
        mainContent.style.marginTop = '0px'
      }
      mainContent.style.transition = 'margin-left 0.3s ease, margin-top 0.3s ease'
    }
  }, [isVisible, isMobile])

  useEffect(() => {
    const updateScrollbarStyle = () => {
      const sidebarElement = document.querySelector('.sidebar');
      if (sidebarElement) {
        sidebarElement.style.scrollbarWidth = 'none'; // Ocultar barra de scroll en navegadores modernos
        sidebarElement.style.overflowY = 'scroll'; // Asegurar que el scroll funcione
        sidebarElement.style.msOverflowStyle = 'none'; // Ocultar barra de scroll en IE y Edge
      }
    };

    updateScrollbarStyle();

    // Verificar cambios cada vez que se actualiza el estado de visibilidad
    const timeoutId = setTimeout(updateScrollbarStyle, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isVisible]);

  return (
    <>
      {/* Sidebar minimizado */}
      {!isVisible && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 100,
            background: '#FFB6C1',
            borderRadius: '0px',
            padding: '15px 0',
            display: isMobile ? 'none' : 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '25px',
            width: '60px',
            height: '100vh',
            boxShadow: '2px 0 10px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <button 
            onClick={toggleSidebar} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px', marginBottom: '10px' }}
            title="Expandir menú"
          >
            <FaBars />
          </button>
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
          {canViewSales && (
            <button 
              onClick={() => setView('sales')} 
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}
              title="Ventas"
            >
              <FaChartBar />
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
        </div>
      )}
      {/* Sidebar expandido */}
      {isVisible && (
        <div className="sidebar" style={{ 
          width: isMobile ? '85vw' : '220px', 
          maxWidth: isMobile ? '320px' : '220px',
          backgroundColor: '#FFB6C1', 
          height: '100vh', 
          padding: '25px 20px', 
          boxSizing: 'border-box', 
          position: 'fixed', 
          left: 0, 
          top: 0, 
          zIndex: isMobile ? 200 : 100,
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isMobile ? '4px 0 20px rgba(0, 0, 0, 0.3)' : '2px 0 10px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <h2 style={{ color: '#fff', margin: 0, fontSize: isMobile ? '20px' : '22px', fontWeight: '600' }}>Maquillarte</h2>
            <button 
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px', padding: '5px', borderRadius: '4px', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaTimes />
            </button>
          </div>

          {/* Expanded: show email and logout button based on role */}
          {user && (
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', padding: '12px 16px', marginBottom: '20px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              {/* Show role for admin and employee, hide for regular user */}
              {(role === 'admin' || role === 'employee') && (
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FaUser style={{ fontSize: '12px' }} />
                  Rol: {role === 'admin' ? 'Administrador' : 'Empleado'}
                </div>
              )}
              
              {/* Show email for all users */}
              <div style={{ fontSize: '10px', color: '#fff', fontWeight: '400', marginBottom: '12px' }}>
                {user.email}
              </div>
              
              {/* Logout button for all users */}
              <button 
                onClick={() => onLogout && onLogout()} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontSize: '14px', 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  transition: 'all 0.2s ease',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }} 
                title="Cerrar sesión"
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              >
                <FaSignOutAlt style={{ fontSize: '12px' }} />
                Cerrar sesión
              </button>
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
            <li style={{ marginBottom: '8px' }}>
              <button 
                onClick={() => setView('home')} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%', 
                  fontSize: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              >
                <FaHome style={{ marginRight: '12px', fontSize: '18px' }} /> Inicio
              </button>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <button 
                onClick={() => setView('inventory')} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%', 
                  fontSize: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              >
                <FaList style={{ marginRight: '12px', fontSize: '18px' }} /> Inventario
              </button>
            </li>
            {canAccessScanner && (
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setView('scanner')} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%', 
                    fontSize: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                >
                  <FaBarcode style={{ marginRight: '12px', fontSize: '18px' }} /> Escáner
                </button>
              </li>
            )}
            {canViewSales && (
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setView('sales')} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%', 
                    fontSize: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                >
                  <FaChartBar style={{ marginRight: '12px', fontSize: '18px' }} /> Ventas
                </button>
              </li>
            )}
            {canViewSales && (
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setView('reports')} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%', 
                    fontSize: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                >
                  <FaFileAlt style={{ marginRight: '12px', fontSize: '18px' }} /> Reportes
                </button>
              </li>
            )}
            {canAccessProviders && (
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setView('providers')} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%', 
                    fontSize: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                >
                  <FaTruck style={{ marginRight: '12px', fontSize: '18px' }} /> Proveedores
                </button>
              </li>
            )}
            {canAccessExpenses && (
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setView('expenses')} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%', 
                    fontSize: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                >
                  <FaDollarSign style={{ marginRight: '12px', fontSize: '18px' }} /> Gastos
                </button>
              </li>
            )}
            {canManageUsers && (
              <li style={{ marginBottom: '8px' }}>
                <button 
                  onClick={() => setView('users')} 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    width: '100%', 
                    fontSize: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                >
                  <FaUsers style={{ marginRight: '12px', fontSize: '18px' }} /> Usuarios
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Overlay para móvil cuando el sidebar está expandido */}
      {isMobile && isVisible && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 150
          }}
          onClick={toggleSidebar}
        />
      )}
      
      {/* Header/Navbar para móvil cuando el sidebar está cerrado */}
      {isMobile && !isVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(135deg, #FFB6C1 0%, #FF91A4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            zIndex: 300,
            backdropFilter: 'blur(10px)'
          }}
        >
          <button
            onClick={toggleSidebar}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              width: '44px',
              height: '44px'
            }}
            onTouchStart={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onTouchEnd={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            <FaBars />
          </button>
          
          <div style={{ 
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <h1 style={{ 
              color: 'white', 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '600',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              letterSpacing: '0.5px'
            }}>
              Maquillarte
            </h1>
          </div>
          
          <div style={{ width: '44px', height: '44px' }}></div>
        </div>
      )}
    </>
  )
}

export default Sidebar
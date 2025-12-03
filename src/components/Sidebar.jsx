import { FaHome, FaList, FaBarcode, FaTimes, FaBars } from 'react-icons/fa'
import { useState } from 'react'

function Sidebar({ setView }) {
  const [isVisible, setIsVisible] = useState(true)

  const toggleSidebar = () => {
    setIsVisible(!isVisible)
  }

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
            width: '60px',
            height: '100vh',
            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <button 
            onClick={() => setView('home')} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <FaHome />
          </button>
          <button 
            onClick={() => setView('inventory')} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <FaList />
          </button>
          <button 
            onClick={() => setView('scanner')} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <FaBarcode />
          </button>
          <button 
            onClick={toggleSidebar} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <FaBars />
          </button>
        </div>
      )}
      {isVisible && (
        <div className="sidebar" style={{ width: '200px', backgroundColor: '#FFB6C1', height: '100vh', padding: '20px', boxSizing: 'border-box', position: 'fixed', left: 0, top: 0, zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#fff', margin: 0 }}>Maquillarte</h2>
            <button 
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
            >
              <FaTimes />
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>
              <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <FaHome style={{ marginRight: '10px' }} /> Inicio
              </button>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <button onClick={() => setView('inventory')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <FaList style={{ marginRight: '10px' }} /> Inventario
              </button>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <button onClick={() => setView('scanner')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <FaBarcode style={{ marginRight: '10px' }} /> Escáner
              </button>
            </li>
          </ul>
        </div>
      )}
    </>
  )
}

export default Sidebar
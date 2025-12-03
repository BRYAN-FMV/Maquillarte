import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Inventario from './components/Inventario'
import Scanner from './components/Scanner'
import './App.css'

function App() {
  const [view, setView] = useState('home')

  const renderView = () => {
    switch (view) {
      case 'home':
        return <div><h1>Bienvenido a Maquillarte</h1><p>Selecciona una opción del menú.</p></div>
      case 'inventory':
        return <Inventario />
      case 'scanner':
        return <Scanner onScan={(data) => console.log('Escaneado:', data)} />
      default:
        return <div><h1>Inicio</h1></div>
    }
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar setView={setView} />
      <div className="main-content" style={{ flex: 1, padding: '20px', marginLeft: '0px', transition: 'margin-left 0.3s ease' }}>
        {renderView()}
      </div>
    </div>
  )
}

export default App
